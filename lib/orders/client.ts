"use client";

import type { Order, OrderLightspeedMeta, OrderStatus } from "@/lib/types";
import { getStoredAdminPin, refreshAdminSessionCookie } from "@/lib/admin/pinClient";

function adminOrderHeaders(): HeadersInit {
  const headers: Record<string, string> = {};
  const pin = getStoredAdminPin();
  if (pin) headers["x-admin-pin"] = pin;
  return headers;
}

export interface OrderInboxSnapshot {
  orders: Order[];
  version: number;
  inboxEnabled: boolean;
}

export interface OrderPatchBody {
  status?: OrderStatus;
  lightspeed?: OrderLightspeedMeta | null;
  kitchenPrinted?: boolean;
  prepMinutes?: number;
  expectedReadyAt?: string;
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
        headers: {
          "Content-Type": "application/json",
          ...adminOrderHeaders(),
        },
        credentials: "same-origin",
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
  let disconnectTimer: number | null = null;
  let sseRetryTimer: number | null = null;
  let consecutiveErrors = 0;
  let lastVersion = -1;
  let connecting = false;

  const clearDisconnectTimer = () => {
    if (disconnectTimer !== null) {
      window.clearTimeout(disconnectTimer);
      disconnectTimer = null;
    }
  };

  const clearPollTimers = () => {
    if (pollTimer !== null) {
      window.clearInterval(pollTimer);
      pollTimer = null;
    }
    if (sseRetryTimer !== null) {
      window.clearInterval(sseRetryTimer);
      sseRetryTimer = null;
    }
  };

  const cleanup = () => {
    clearDisconnectTimer();
    if (es) {
      es.close();
      es = null;
    }
    clearPollTimers();
  };

  const startPollingFallback = () => {
    if (cancelled) return;
    if (pollTimer === null) {
      handlers.onFallbackToPolling?.();
      const tick = async () => {
        if (cancelled) return;
        try {
          const res = await fetch(`${window.location.origin}/api/orders/inbox`, {
            cache: "no-store",
            credentials: "same-origin",
            headers: adminOrderHeaders(),
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
    }
    // Keep trying to restore the live SSE link in the background; a recovered
    // `snapshot` tears the polling fallback back down (see the snapshot handler).
    if (sseRetryTimer === null) {
      sseRetryTimer = window.setInterval(() => {
        if (cancelled || es !== null || connecting) return;
        consecutiveErrors = 0;
        connect();
      }, 20_000);
    }
  };

  const connect = () => {
    if (cancelled || connecting || es !== null) return;
    connecting = true;
    void (async () => {
      // EventSource can only authenticate via the `rb_admin` cookie, which may
      // be absent or expired. Refresh it from the stored PIN first so the live
      // link comes up on the very first attempt in every case.
      await refreshAdminSessionCookie().catch(() => false);
      if (cancelled) {
        connecting = false;
        return;
      }

      let source: EventSource;
      try {
        source = new EventSource("/api/orders/stream", { withCredentials: true });
      } catch (e) {
        console.error("[orders/stream] cannot open EventSource", e);
        connecting = false;
        startPollingFallback();
        return;
      }
      es = source;
      connecting = false;

      source.onopen = () => {
        // A healthy (re)connect: clear the transient "disconnected" grace timer
        // and reset the error streak so a normal ~55s recycle never trips the
        // polling fallback.
        consecutiveErrors = 0;
        clearDisconnectTimer();
      };

      source.addEventListener("snapshot", (ev) => {
        try {
          const data = JSON.parse((ev as MessageEvent).data) as OrderInboxSnapshot;
          consecutiveErrors = 0;
          clearDisconnectTimer();
          // Live stream is (back) up — retire any polling fallback.
          clearPollTimers();
          lastVersion = data.version;
          handlers.onSnapshot(data);
        } catch (e) {
          console.error("[orders/stream] snapshot parse", e);
        }
      });

      source.addEventListener("orders", (ev) => {
        try {
          const data = JSON.parse((ev as MessageEvent).data) as OrderInboxSnapshot;
          lastVersion = data.version;
          handlers.onUpdate(data);
        } catch (e) {
          console.error("[orders/stream] orders parse", e);
        }
      });

      attachLooseHandlers(source);
    })();
  };

  // Default handlers — older Safari ignores `event:` headers entirely and
  // delivers everything as `message`. Re-dispatch via the body we sent.
  const attachLooseHandlers = (source: EventSource) => {
    source.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data) as OrderInboxSnapshot;
        lastVersion = data.version;
        handlers.onUpdate(data);
      } catch {
        /* ignore non-JSON pings */
      }
    };

    source.onerror = () => {
      consecutiveErrors += 1;
      // Our stream recycles itself every ~55s, which the browser sees as an
      // error right before it auto-reconnects (a fresh `snapshot` clears this).
      // Only surface "disconnected" if no reconnect lands within a short grace
      // window, so the live pill doesn't flicker on every healthy recycle.
      if (disconnectTimer === null) {
        disconnectTimer = window.setTimeout(() => {
          disconnectTimer = null;
          handlers.onDisconnect?.();
        }, 4_000);
      }
      // After several back-to-back failures (proxy stripped the stream, etc.)
      // give up on SSE and fall back to polling so orders keep coming in.
      if (consecutiveErrors >= 5) {
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
