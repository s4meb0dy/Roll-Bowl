"use client";

import type { Order, OrderLightspeedMeta, OrderStatus } from "@/lib/types";

export interface OrderInboxSnapshot {
  orders: Order[];
  version: number;
  inboxEnabled: boolean;
}

export interface OrderPatchBody {
  status?: OrderStatus;
  lightspeed?: OrderLightspeedMeta | null;
  kitchenPrinted?: boolean;
}

/** Fire-and-forget: errors are logged but don't block the optimistic UI. */
export async function patchOrderRemote(
  id: string,
  patch: OrderPatchBody,
  opts?: { signal?: AbortSignal }
): Promise<{ ok: boolean; order?: Order; error?: string }> {
  try {
    const res = await fetch(
      `${typeof window !== "undefined" ? window.location.origin : ""}/api/orders/${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
        signal: opts?.signal,
      }
    );
    if (!res.ok) {
      // 503 = inbox not configured (offline mode is fine).
      // 404 = order not yet visible to the server (hasn't been ingested yet).
      if (res.status === 503 || res.status === 404) {
        return { ok: false, error: `http_${res.status}` };
      }
      const txt = await res.text().catch(() => "");
      console.error("[orders/patch] HTTP", res.status, txt);
      return { ok: false, error: `http_${res.status}` };
    }
    const data = (await res.json()) as { order?: Order; error?: string };
    return { ok: true, order: data.order };
  } catch (e) {
    if ((e as Error)?.name === "AbortError") {
      return { ok: false, error: "aborted" };
    }
    console.error("[orders/patch] network", e);
    return { ok: false, error: "network" };
  }
}

export interface OrderStreamHandlers {
  /** Initial dump on (re)connect — also fires after reconnect. */
  onSnapshot: (snap: OrderInboxSnapshot) => void;
  /** Incremental update when the server bumps the version. */
  onUpdate: (snap: OrderInboxSnapshot) => void;
  /** Called when the underlying transport drops (with auto-reconnect coming). */
  onDisconnect?: () => void;
  /** Called when reconnect attempts continuously fail and we fall back to polling. */
  onFallbackToPolling?: () => void;
}

/**
 * Subscribe to the kitchen order stream. Uses native EventSource (auto-
 * reconnects on transient failures) with a polling fallback if EventSource
 * keeps failing — older Safari versions and corporate proxies sometimes
 * strip the `Content-Type: text/event-stream` upgrade.
 */
export function subscribeToOrderStream(
  handlers: OrderStreamHandlers
): () => void {
  if (typeof window === "undefined") return () => {};

  let cancelled = false;
  let es: EventSource | null = null;
  let pollTimer: number | null = null;
  let consecutiveErrors = 0;
  let lastVersion = -1;

  const cleanup = () => {
    if (es) {
      es.close();
      es = null;
    }
    if (pollTimer !== null) {
      window.clearInterval(pollTimer);
      pollTimer = null;
    }
  };

  const startPollingFallback = () => {
    if (cancelled || pollTimer !== null) return;
    handlers.onFallbackToPolling?.();
    const tick = async () => {
      if (cancelled) return;
      try {
        const res = await fetch(`${window.location.origin}/api/orders/inbox`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as OrderInboxSnapshot;
        if (data.version !== lastVersion) {
          lastVersion = data.version;
          handlers.onUpdate(data);
        }
      } catch (e) {
        console.error("[orders/stream] poll fallback", e);
      }
    };
    void tick();
    pollTimer = window.setInterval(tick, 4_000);
  };

  const connect = () => {
    if (cancelled) return;
    try {
      es = new EventSource("/api/orders/stream");
    } catch (e) {
      console.error("[orders/stream] cannot open EventSource", e);
      startPollingFallback();
      return;
    }

    es.addEventListener("snapshot", (ev) => {
      try {
        const data = JSON.parse((ev as MessageEvent).data) as OrderInboxSnapshot;
        consecutiveErrors = 0;
        lastVersion = data.version;
        handlers.onSnapshot(data);
      } catch (e) {
        console.error("[orders/stream] snapshot parse", e);
      }
    });

    es.addEventListener("orders", (ev) => {
      try {
        const data = JSON.parse((ev as MessageEvent).data) as OrderInboxSnapshot;
        lastVersion = data.version;
        handlers.onUpdate(data);
      } catch (e) {
        console.error("[orders/stream] orders parse", e);
      }
    });

    // Default handler — older Safari ignores `event:` headers entirely and
    // delivers everything as `message`. Re-dispatch via the body we sent.
    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data) as OrderInboxSnapshot;
        lastVersion = data.version;
        handlers.onUpdate(data);
      } catch {
        /* ignore non-JSON pings */
      }
    };

    es.onerror = () => {
      handlers.onDisconnect?.();
      consecutiveErrors += 1;
      // Browser auto-reconnects EventSource on transient errors. After three
      // hard failures (e.g. proxy stripped the stream), fall back to polling.
      if (consecutiveErrors >= 3) {
        cleanup();
        startPollingFallback();
      }
    };
  };

  connect();

  return () => {
    cancelled = true;
    cleanup();
  };
}
