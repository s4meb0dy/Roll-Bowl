import "@/lib/orders/ensureKvEnv";
import { getInboxRedis } from "./inboxRedis";

/**
 * Server-side print queue for Epson **Server Direct Print** (SDP).
 *
 * The TM-m30III at the venue periodically polls `/api/print/poll`; this queue
 * holds the order ids waiting to be printed. Because the printer pulls the jobs
 * itself, an order can be accepted from *any* device (e.g. the owner's phone,
 * off-site) and the receipt still prints at the restaurant — no direct
 * browser→printer connection, no self-signed-certificate prompt.
 *
 * Single printer ⇒ single FIFO queue + one in-flight slot. The in-flight job is
 * only cleared when the printer reports its result (SetResponse), or re-queued
 * after a timeout if the printer never answers.
 */
const KEY_QUEUE = "print:queue";
const KEY_INFLIGHT = "print:inflight";
const KEY_SEEN = (id: string) => `print:seen:${id}`;
const KEY_ATTEMPTS = (id: string) => `print:attempts:${id}`;

/** Re-send an in-flight job if the printer hasn't reported a result in this long. */
const INFLIGHT_TIMEOUT_MS = 60_000;
const MAX_PRINT_ATTEMPTS = 6;
const SEEN_TTL_S = 3600;
const ATTEMPTS_TTL_S = 3600;

type Inflight = { orderId: string; sentAt: number };

/** True when Server Direct Print is enabled (the printer ID env is configured). */
export function isServerDirectPrintEnabled(): boolean {
  return Boolean(process.env.SERVER_DIRECT_PRINT_ID?.trim());
}

/** The shared secret / printer ID the TM printer sends in every SDP request. */
export function serverDirectPrintId(): string | null {
  const id = process.env.SERVER_DIRECT_PRINT_ID?.trim();
  return id || null;
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
 */
export async function completePrintJob(
  orderId: string,
  success: boolean
): Promise<void> {
  const redis = getInboxRedis();

  const inflight = await readInflight();
  if (inflight && inflight.orderId === orderId) {
    await redis.del(KEY_INFLIGHT);
  }

  if (success) {
    await redis.del(KEY_ATTEMPTS(orderId));
    await redis.del(KEY_SEEN(orderId));
    return;
  }

  const attempts = (await redis.incr(KEY_ATTEMPTS(orderId))) as number;
  await redis.expire(KEY_ATTEMPTS(orderId), ATTEMPTS_TTL_S);
  if (attempts < MAX_PRINT_ATTEMPTS) {
    await redis.rpush(KEY_QUEUE, orderId);
  }
}
