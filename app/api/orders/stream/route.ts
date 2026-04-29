import "@/lib/orders/ensureKvEnv";
import type { NextRequest } from "next/server";
import { isOrderInboxConfigured } from "@/lib/orders/inboxConfig";
import { isInboxUnreachableError } from "@/lib/orders/inboxRedis";
import {
  getRecentOrders,
  getVersion,
} from "@/lib/orders/inboxStore";

const POLL_INTERVAL_MS = 1500;
const KEEPALIVE_INTERVAL_MS = 25_000;
const MAX_LIFETIME_MS = 55_000;
const READ_LIMIT = 200;

function sseEvent(event: string, data: unknown): string {
  const payload = typeof data === "string" ? data : JSON.stringify(data);
  return `event: ${event}\ndata: ${payload}\n\n`;
}

/**
 * Server-Sent Events stream for the kitchen terminal.
 *
 *   event: snapshot   — initial dump of recent orders + current version.
 *   event: orders     — followed by the same shape whenever the global
 *                       version changes (any POST or PATCH bumps it).
 *   event: ping       — periodic keepalive so proxies don't drop the conn.
 *
 * The handler self-terminates after ~55s (under Vercel's serverless limit) so
 * the client's `EventSource` cleanly auto-reconnects without hitting a hard
 * gateway timeout.
 */
export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();

  const inboxOn = isOrderInboxConfigured();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const startedAt = Date.now();

      const safeEnqueue = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          closed = true;
        }
      };

      const close = () => {
        if (closed) return;
        closed = true;
        try {
          controller.close();
        } catch {
          /* ignore */
        }
      };

      const onAbort = () => {
        closed = true;
        try {
          controller.close();
        } catch {
          /* ignore */
        }
      };
      req.signal.addEventListener("abort", onAbort);

      // Initial snapshot. If the inbox isn't configured yet, return an empty
      // snapshot and a hint so the client doesn't sit on a busy retry loop.
      let lastVersion = 0;
      // Track whether the inbox is *actually* talking to us this session. We
      // start optimistic; the first failed fetch flips this off and the loop
      // below will skip polling so we don't spam the dev console.
      let inboxLive = inboxOn;
      try {
        if (inboxLive) {
          const [orders, version] = await Promise.all([
            getRecentOrders(READ_LIMIT),
            getVersion(),
          ]);
          lastVersion = version;
          safeEnqueue(
            sseEvent("snapshot", { orders, version, inboxEnabled: true })
          );
        } else {
          safeEnqueue(
            sseEvent("snapshot", {
              orders: [],
              version: 0,
              inboxEnabled: false,
            })
          );
        }
      } catch (e) {
        if (isInboxUnreachableError(e)) {
          // Treat unreachable Upstash exactly like "not configured" — the
          // kitchen UI keeps working off localStorage in offline mode.
          inboxLive = false;
          safeEnqueue(
            sseEvent("snapshot", {
              orders: [],
              version: 0,
              inboxEnabled: false,
            })
          );
        } else {
          console.error("[orders/stream] initial snapshot", e);
          safeEnqueue(
            sseEvent("error", {
              message: e instanceof Error ? e.message : "snapshot_failed",
            })
          );
        }
      }

      let lastKeepalive = Date.now();

      while (!closed) {
        if (Date.now() - startedAt > MAX_LIFETIME_MS) break;
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        if (closed) break;

        if (inboxLive) {
          try {
            const v = await getVersion();
            if (v !== lastVersion) {
              const orders = await getRecentOrders(READ_LIMIT);
              lastVersion = v;
              safeEnqueue(
                sseEvent("orders", { orders, version: v, inboxEnabled: true })
              );
              lastKeepalive = Date.now();
              continue;
            }
          } catch (e) {
            if (isInboxUnreachableError(e)) {
              // Lost the link to Upstash mid-stream. Stop polling; the SSE
              // socket will close at MAX_LIFETIME and the client reconnects.
              inboxLive = false;
            } else {
              console.error("[orders/stream] poll", e);
              safeEnqueue(
                sseEvent("error", {
                  message: e instanceof Error ? e.message : "poll_failed",
                })
              );
            }
          }
        }

        if (Date.now() - lastKeepalive >= KEEPALIVE_INTERVAL_MS) {
          safeEnqueue(sseEvent("ping", { ts: Date.now() }));
          lastKeepalive = Date.now();
        }
      }

      req.signal.removeEventListener("abort", onAbort);
      close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Help reverse proxies (e.g. nginx) and Vercel keep the stream raw.
      "X-Accel-Buffering": "no",
    },
  });
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
