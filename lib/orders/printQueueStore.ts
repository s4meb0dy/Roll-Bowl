import "@/lib/orders/ensureKvEnv";
import { getInboxRedis } from "./inboxRedis";

/**
 * Server-side print queue for Epson **Server Direct Print** (SDP).
 *
 * The TM-m30III periodically polls `/api/print/poll`. We also store lightweight
 * telemetry (last poll / last ID mismatch) so the kitchen UI can fall back to
 * local ePOS when the printer is not actually reaching the server — that was
 * the silent failure mode when SDP was "configured" but nothing printed.
 */

const KEY_QUEUE = "print:queue";
const KEY_INFLIGHT = "print:inflight";
const KEY_SEEN = (id: string) => `print:seen:${id}`;
const KEY_ATTEMPTS = (id: string) => `print:attempts:${id}`;
const KEY_TELEMETRY = "print:telemetry";

/** Re-send an in-flight job if the printer hasn't reported a result in this long. */
const INFLIGHT_TIMEOUT_MS = 60_000;
const MAX_PRINT_ATTEMPTS = 6;
const SEEN_TTL_S = 3600;
const ATTEMPTS_TTL_S = 3600;
/** Printer is considered "live" if it polled within this window. */
export const SDP_HEALTHY_MS = 120_000;

type Inflight = { orderId: string; sentAt: number };

export type PrintTelemetry = {
  lastPollAt: number | null;
  lastPollId: string | null;
  lastIdMatch: boolean | null;
  lastConnectionType: string | null;
  lastJobServedAt: number | null;
  lastJobOrderId: string | null;
  pollCount: number;
};

const EMPTY_TELEMETRY: PrintTelemetry = {
  lastPollAt: null,
  lastPollId: null,
  lastIdMatch: null,
  lastConnectionType: null,
  lastJobServedAt: null,
  lastJobOrderId: null,
  pollCount: 0,
};

/** True when Server Direct Print is enabled (the printer ID env is configured). */
export function isServerDirectPrintEnabled(): boolean {
  return Boolean(process.env.SERVER_DIRECT_PRINT_ID?.trim());
}

/** The shared secret / printer ID the TM printer sends in every SDP request. */
export function serverDirectPrintId(): string | null {
  const id = process.env.SERVER_DIRECT_PRINT_ID?.trim();
  return id || null;
}

/** Case-insensitive, trimmed ID compare — common Web Config typos. */
export function idsMatch(received: string, configured: string): boolean {
  return received.trim().toLowerCase() === configured.trim().toLowerCase();
}

async function readInflight(): Promise<Inflight | null> {
  const redis = getInboxRedis();
  const raw = await redis.get(KEY_INFLIGHT);
  if (!raw) return null;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as Inflight;
    } catch {
      return null;
    }
  }
  return raw as Inflight;
}

export async function readPrintTelemetry(): Promise<PrintTelemetry> {
  try {
    const redis = getInboxRedis();
    const raw = await redis.get(KEY_TELEMETRY);
    if (!raw) return { ...EMPTY_TELEMETRY };
    if (typeof raw === "string") {
      return { ...EMPTY_TELEMETRY, ...(JSON.parse(raw) as Partial<PrintTelemetry>) };
    }
    return { ...EMPTY_TELEMETRY, ...(raw as Partial<PrintTelemetry>) };
  } catch {
    return { ...EMPTY_TELEMETRY };
  }
}

async function writePrintTelemetry(patch: Partial<PrintTelemetry>): Promise<void> {
  try {
    const redis = getInboxRedis();
    const prev = await readPrintTelemetry();
    await redis.set(KEY_TELEMETRY, { ...prev, ...patch });
  } catch (e) {
    console.error("[print] telemetry write failed", e);
  }
}

/** Record every printer poll (matched or not) so the kitchen can diagnose SDP. */
export async function recordPrinterPoll(opts: {
  id: string;
  connectionType: string;
  matched: boolean;
}): Promise<void> {
  const prev = await readPrintTelemetry();
  await writePrintTelemetry({
    lastPollAt: Date.now(),
    lastPollId: opts.id.slice(0, 64),
    lastIdMatch: opts.matched,
    lastConnectionType: opts.connectionType.slice(0, 40),
    pollCount: (prev.pollCount ?? 0) + 1,
  });
}

export async function recordJobServed(orderId: string): Promise<void> {
  await writePrintTelemetry({
    lastJobServedAt: Date.now(),
    lastJobOrderId: orderId,
  });
}

export async function getPrintQueueDepth(): Promise<number> {
  try {
    const redis = getInboxRedis();
    const n = await redis.llen(KEY_QUEUE);
    return typeof n === "number" ? n : 0;
  } catch {
    return 0;
  }
}

/** True when the venue printer has polled recently with a matching ID. */
export function isSdpHealthy(telemetry: PrintTelemetry): boolean {
  if (!telemetry.lastPollAt || !telemetry.lastIdMatch) return false;
  return Date.now() - telemetry.lastPollAt < SDP_HEALTHY_MS;
}

/**
 * Queue an order for printing. De-duplicated for a short window so a retried
 * "accept" PATCH doesn't enqueue twice. Pass `force` for a manual re-print.
 */
export async function enqueuePrintJob(
  orderId: string,
  opts?: { force?: boolean }
): Promise<void> {
  const redis = getInboxRedis();
  if (opts?.force) {
    await redis.del(KEY_ATTEMPTS(orderId));
    await redis.del(KEY_SEEN(orderId));
  } else {
    const fresh = (await redis.set(KEY_SEEN(orderId), 1, {
      nx: true,
      ex: SEEN_TTL_S,
    })) as "OK" | null;
    if (fresh !== "OK") return; // already enqueued recently
  }
  await redis.rpush(KEY_QUEUE, orderId);
}

/**
 * Claim the next order id to print, moving it to the in-flight slot. Returns
 * null when nothing is ready (queue empty, or a job is already in flight and
 * hasn't timed out yet).
 */
export async function claimNextPrintJob(): Promise<string | null> {
  const redis = getInboxRedis();

  const inflight = await readInflight();
  if (inflight) {
    if (Date.now() - inflight.sentAt < INFLIGHT_TIMEOUT_MS) {
      return null; // still waiting for the printer's result
    }
    // Timed out — the printer never confirmed. Put it back at the front.
    await redis.del(KEY_INFLIGHT);
    await redis.lpush(KEY_QUEUE, inflight.orderId);
  }

  const orderId = (await redis.lpop(KEY_QUEUE)) as string | null;
  if (!orderId) return null;
  await redis.set(KEY_INFLIGHT, { orderId, sentAt: Date.now() } satisfies Inflight);
  return orderId;
}

/**
 * Record the result the printer reported for a job. On success the in-flight
 * slot is cleared; on failure the job is re-queued (bounded by MAX attempts).
 * Returns the order id that was completed (or null).
 */
export async function completePrintJob(
  orderId: string,
  success: boolean
): Promise<string | null> {
  const redis = getInboxRedis();

  const inflight = await readInflight();
  const resolvedId =
    inflight && (inflight.orderId === orderId || !orderId)
      ? inflight.orderId
      : orderId || inflight?.orderId || null;

  if (inflight && (!orderId || inflight.orderId === orderId)) {
    await redis.del(KEY_INFLIGHT);
  } else if (inflight && resolvedId === inflight.orderId) {
    await redis.del(KEY_INFLIGHT);
  }

  if (!resolvedId) return null;

  if (success) {
    await redis.del(KEY_ATTEMPTS(resolvedId));
    await redis.del(KEY_SEEN(resolvedId));
    return resolvedId;
  }

  const attempts = (await redis.incr(KEY_ATTEMPTS(resolvedId))) as number;
  await redis.expire(KEY_ATTEMPTS(resolvedId), ATTEMPTS_TTL_S);
  if (attempts < MAX_PRINT_ATTEMPTS) {
    await redis.rpush(KEY_QUEUE, resolvedId);
  }
  return resolvedId;
}
