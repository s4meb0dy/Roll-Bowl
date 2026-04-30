import "@/lib/orders/ensureKvEnv";
import type { Order, OrderLightspeedMeta, OrderStatus } from "@/lib/types";
import { getInboxRedis, isWrongTypeError } from "./inboxRedis";

/**
 * Server-side order store.
 *
 * Layout (per project on the connected Upstash/Vercel KV instance):
 *
 *   order:byId:<id>       — JSON-serialized Order (single source of truth).
 *   order:recent          — ZSET, score = createdAt-ms, member = id. Used to
 *                           list recent orders without scanning every key.
 *   order:version         — INCR counter, bumped on every write. Used by SSE
 *                           subscribers to short-circuit "no new data" loops.
 *   order:inbox (legacy)  — old per-message JSON list, transparently drained
 *                           into the new layout on first read.
 */
const KEY_BY_ID = (id: string) => `order:byId:${id}`;
const KEY_RECENT = "order:recent";
const KEY_VERSION = "order:version";
const KEY_LEGACY_LIST = "order:inbox";

/**
 * How many recent ids the kitchen keeps in the `order:recent` ZSET. With ~200
 * orders/day this gives ≈25 days of history in the index — enough that an
 * operator can scroll back through last week/month if needed.
 */
const RECENT_KEEP = 5_000;

/**
 * Per-order body retention in Redis. After 90 days of no writes the JSON body
 * is auto-expired by Upstash, preventing the storage from growing forever.
 * Every `set(KEY_BY_ID, …)` site in this module re-applies this TTL so that
 * any patch effectively "touches" the order and resets the clock.
 */
const ORDER_TTL_S = 90 * 24 * 60 * 60;

function isObject(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === "object" && !Array.isArray(v);
}

/**
 * @vercel/kv auto-parses JSON when the stored value was an object. Old entries
 * stored as raw strings come back as strings — handle both.
 */
function parseOrder(raw: unknown): Order | null {
  if (!raw) return null;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return isObject(parsed) ? (parsed as unknown as Order) : null;
    } catch {
      return null;
    }
  }
  return isObject(raw) ? (raw as unknown as Order) : null;
}

function createdAtMs(o: Order): number {
  const t = Date.parse(o.createdAt);
  return Number.isFinite(t) ? t : Date.now();
}

/** Atomically increment + return the new global write counter. */
export async function bumpVersion(): Promise<number> {
  const redis = getInboxRedis();
  const v = (await redis.incr(KEY_VERSION)) as number;
  return v;
}

export async function getVersion(): Promise<number> {
  const redis = getInboxRedis();
  const v = (await redis.get<number>(KEY_VERSION)) ?? 0;
  return Number(v) || 0;
}

/**
 * One-shot migration: pull entries from the legacy `order:inbox` list and
 * write them into the new key-by-id + zset layout. Idempotent — safe to call
 * on every read; bails out fast when the list is gone.
 */
async function drainLegacyList(): Promise<void> {
  const redis = getInboxRedis();
  let raw: string[];
  try {
    raw = (await redis.lrange(KEY_LEGACY_LIST, 0, -1)) as string[];
  } catch (e) {
    if (isWrongTypeError(e)) {
      try {
        await redis.del(KEY_LEGACY_LIST);
      } catch {
        /* ignore */
      }
    }
    return;
  }
  if (!raw || raw.length === 0) return;

  for (const j of raw) {
    const order = parseOrder(j);
    if (!order?.id) continue;
    const ms = createdAtMs(order);
    try {
      // Don't clobber a server-updated copy with the original snapshot.
      await redis.set(KEY_BY_ID(order.id), order, { nx: true, ex: ORDER_TTL_S });
      await redis.zadd(KEY_RECENT, { score: ms, member: order.id });
    } catch (e) {
      console.error("[orders] drain legacy entry failed", order.id, e);
    }
  }
  try {
    await redis.del(KEY_LEGACY_LIST);
  } catch {
    /* leave it; next call retries the drain */
  }
  await bumpVersion();
}

/**
 * Idempotent create: stores the order only if a record with this id does not
 * already exist (so retries from flaky mobile networks never overwrite a
 * server-updated copy with the original snapshot).
 *
 * Returns:
 *   `{ created: true }`  — fresh insert
 *   `{ created: false }` — id already existed; nothing changed
 */
export async function storeNewOrder(
  order: Order
): Promise<{ created: boolean; version: number }> {
  await drainLegacyList();
  const redis = getInboxRedis();
  const ms = createdAtMs(order);
  const enriched: Order = {
    ...order,
    updatedAt: order.updatedAt ?? new Date().toISOString(),
    version: order.version,
  };
  const setRes = (await redis.set(KEY_BY_ID(order.id), enriched, {
    nx: true,
    ex: ORDER_TTL_S,
  })) as "OK" | null;
  const created = setRes === "OK";
  if (created) {
    await redis.zadd(KEY_RECENT, { score: ms, member: order.id });
    // Keep the recent set bounded so admins always paginate over a known cap.
    try {
      await redis.zremrangebyrank(KEY_RECENT, 0, -RECENT_KEEP - 1);
    } catch {
      /* no big deal if trim fails */
    }
  }
  const version = await bumpVersion();
  if (created) {
    // Persist the assigned version on the stored order so subscribers can
    // tell apart "this is the version I already have" from "newer".
    const stored = await getOrderById(order.id);
    if (stored) {
      stored.version = version;
      // Re-apply TTL — a plain SET without `ex` clears the expiry that the
      // previous NX-SET established.
      await redis.set(KEY_BY_ID(order.id), stored, { ex: ORDER_TTL_S });
    }
  }
  return { created, version };
}

export async function getOrderById(id: string): Promise<Order | null> {
  const redis = getInboxRedis();
  const raw = await redis.get(KEY_BY_ID(id));
  return parseOrder(raw);
}

export interface OrderPatch {
  status?: OrderStatus;
  lightspeed?: OrderLightspeedMeta;
  kitchenPrinted?: boolean;
}

/**
 * Non-destructive merge of the listed fields into the existing record. Returns
 * the updated order, or null if no record exists for this id.
 */
export async function patchOrderFields(
  id: string,
  patch: OrderPatch
): Promise<{ order: Order; version: number } | null> {
  const redis = getInboxRedis();
  const current = await getOrderById(id);
  if (!current) return null;

  const next: Order = { ...current };
  if (patch.status !== undefined) next.status = patch.status;
  if (patch.lightspeed !== undefined) next.lightspeed = patch.lightspeed;
  if (patch.kitchenPrinted !== undefined) next.kitchenPrinted = patch.kitchenPrinted;
  next.updatedAt = new Date().toISOString();

  const version = await bumpVersion();
  next.version = version;

  // Re-apply TTL on every patch so an active order keeps its 90-day window
  // measured from the most recent update, not from creation.
  await redis.set(KEY_BY_ID(id), next, { ex: ORDER_TTL_S });
  return { order: next, version };
}

/**
 * Returns up to `limit` most-recent orders, newest-first. Drains the legacy
 * list opportunistically so the first request after a deploy still surfaces
 * any pending orders from before the migration.
 */
export async function getRecentOrders(limit = 200): Promise<Order[]> {
  await drainLegacyList();
  const redis = getInboxRedis();

  let ids: string[];
  try {
    ids = (await redis.zrange(KEY_RECENT, 0, limit - 1, {
      rev: true,
    })) as string[];
  } catch (e) {
    if (isWrongTypeError(e)) {
      try {
        await redis.del(KEY_RECENT);
      } catch {
        /* ignore */
      }
      return [];
    }
    throw e;
  }
  if (!ids || ids.length === 0) return [];

  // Fetch all bodies in one round-trip when possible.
  const keys = ids.map((id) => KEY_BY_ID(id));
  const rows = (await redis.mget(...keys)) as unknown[];

  const orders: Order[] = [];
  for (const raw of rows) {
    const o = parseOrder(raw);
    if (o?.id) orders.push(o);
  }
  orders.sort(
    (a, b) => createdAtMs(b) - createdAtMs(a)
  );
  return orders;
}
