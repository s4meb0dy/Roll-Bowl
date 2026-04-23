import { readInventory, subscribe } from "@/lib/inventory/server";
import type { InventoryStreamEvent } from "@/lib/inventory/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Server-Sent Events endpoint. Every connected browser (menu + admin) opens
 * a long-lived GET here and receives:
 *  - an initial `snapshot` event with the current inventory,
 *  - a `patch` event every time the admin flips a toggle,
 *  - a `snapshot` event after a Lightspeed sync.
 *
 * A 25-second keep-alive comment prevents intermediate proxies from timing
 * out idle connections. Writes are guarded by a `closed` flag so that any
 * subscriber broadcast or keep-alive tick arriving AFTER the client has
 * disconnected does not call `enqueue` on an already-closed controller
 * (which throws `ERR_INVALID_STATE` in Node).
 */
export async function GET() {
  const encoder = new TextEncoder();

  let closed = false;
  let teardown: (() => void) | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      const safeEnqueue = (chunk: Uint8Array) => {
        if (closed) return;
        try {
          controller.enqueue(chunk);
        } catch {
          // The stream was closed between our `closed` check and `enqueue`
          // (e.g. client just disconnected). Mark it and run teardown.
          closed = true;
          teardown?.();
        }
      };

      const send = (event: InventoryStreamEvent) => {
        safeEnqueue(
          encoder.encode(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`),
        );
      };

      // Client may disconnect during this await — bail early if that happened.
      const initial = await readInventory();
      if (closed) return;
      send({ type: "snapshot", state: initial });

      const unsubscribe = subscribe((e) => send(e));

      const keepAlive = setInterval(() => {
        safeEnqueue(encoder.encode(`: keep-alive ${Date.now()}\n\n`));
      }, 25_000);

      teardown = () => {
        clearInterval(keepAlive);
        unsubscribe();
        try { controller.close(); } catch { /* already closed */ }
      };

      // If cancel() fired while we were awaiting, run teardown immediately.
      if (closed) teardown();
    },
    cancel() {
      closed = true;
      teardown?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // disable nginx buffering
    },
  });
}
