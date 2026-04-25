import "@/lib/orders/ensureKvEnv";
import { NextResponse } from "next/server";
import type { Order } from "@/lib/types";
import { isOrderInboxConfigured } from "@/lib/orders/inboxConfig";
import { getInboxRedis, isWrongTypeError } from "@/lib/orders/inboxRedis";

const LIST_KEY = "order:inbox";
const MAX_LEN = 200;

function isValidOrderBody(o: unknown): o is Order {
  if (!o || typeof o !== "object") return false;
  const x = o as Record<string, unknown>;
  if (typeof x.id !== "string" || !x.id) return false;
  if (!Array.isArray(x.items) || !x.createdAt) return false;
  if (!x.customerInfo || typeof x.customerInfo !== "object") return false;
  return true;
}

/**
 * GET — recent orders for the kitchen / admin to merge (cross-device).
 * POST — append a new order after checkout (so PC kitchen sees phone orders).
 */
export async function GET() {
  if (!isOrderInboxConfigured()) {
    return NextResponse.json({ orders: [] as Order[], inboxEnabled: false });
  }
  const redis = getInboxRedis();
  const read = async () => {
    return (await redis.lrange(LIST_KEY, 0, MAX_LEN - 1)) as string[];
  };

  try {
    let raw: string[];
    try {
      raw = await read();
    } catch (e) {
      if (isWrongTypeError(e)) {
        // Key was e.g. a string from a bug or manual set — make it a list again.
        await redis.del(LIST_KEY);
        raw = [];
      } else {
        throw e;
      }
    }
    const byId = new Map<string, Order>();
    for (const j of raw) {
      try {
        const o = JSON.parse(j) as Order;
        if (o?.id) byId.set(o.id, o);
      } catch {
        /* skip */
      }
    }
    const orders = [...byId.values()].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return NextResponse.json({ orders, inboxEnabled: true });
  } catch (e) {
    console.error("[orders/inbox] GET", e);
    const debug = process.env.ORDER_INBOX_DEBUG === "1";
    const errMsg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      {
        orders: [] as Order[],
        inboxEnabled: true,
        error: "read_failed",
        ...(debug ? { read_error: errMsg } : {}),
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  if (!isOrderInboxConfigured()) {
    return NextResponse.json({ ok: true, stored: false, reason: "inbox_not_configured" });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const order = (body as { order?: Order }).order;
  if (!isValidOrderBody(order)) {
    const o = order && typeof order === "object" ? (order as Record<string, unknown>) : null;
    console.error("[orders/inbox] reject", {
      hasOrder: Boolean(order),
      id: o && typeof o.id,
      items: o && Array.isArray(o.items),
      createdAt: o && Boolean(o.createdAt),
      customerInfo: o && o.customerInfo && typeof o.customerInfo,
    });
    return NextResponse.json({ error: "Missing or invalid order" }, { status: 400 });
  }
  try {
    const redis = getInboxRedis();
    await redis.lpush(LIST_KEY, JSON.stringify(order));
    await redis.ltrim(LIST_KEY, 0, MAX_LEN - 1);
    return NextResponse.json({ ok: true, stored: true });
  } catch (e) {
    if (isWrongTypeError(e)) {
      const redis = getInboxRedis();
      try {
        await redis.del(LIST_KEY);
        await redis.lpush(LIST_KEY, JSON.stringify(order));
        await redis.ltrim(LIST_KEY, 0, MAX_LEN - 1);
        return NextResponse.json({ ok: true, stored: true, recovered: "wrongtype" });
      } catch (e2) {
        console.error("[orders/inbox] POST after wrongtype del", e2);
      }
    }
    console.error("[orders/inbox] POST", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Store failed" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
