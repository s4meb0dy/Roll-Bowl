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
  /** The snapshot holds every order the server has (it was not truncated). */
  complete?: boolean;
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
  /** Called when polling stops succeeding for a while. */
  onDisconnect?: () => void;
  /** @deprecated SSE fallback removed — kept for API compatibility. */
  onFallbackToPolling?: () => void;
}

/** Refresh the admin session cookie at most this often during polling. */
const SESSION_REFRESH_INTERVAL_MS = 30 * 60_000;
/** Re-issue the cookie when the tab becomes visible after this idle gap. */
const SESSION_REFRESH_ON_VISIBLE_MS = 10 * 60_000;
/** Visible tab: poll every 4 s. Background tab: every 15 s to cut serverless load. */
const POLL_INTERVAL_VISIBLE_MS = 4_000;
const POLL_INTERVAL_HIDDEN_MS = 15_000;
/** Mark disconnected if no successful poll within this window. */
const DISCONNECT_AFTER_MS = 15_000;

function pollIntervalMs(): number {
  if (typeof document === "undefined") return POLL_INTERVAL_VISIBLE_MS;
  return document.visibilityState === "hidden"
    ? POLL_INTERVAL_HIDDEN_MS
    : POLL_INTERVAL_VISIBLE_MS;
}

/**
 * Subscribe to kitchen order updates via short polling requests.
 *
 * Previously this opened a long-lived SSE connection (~55 s per invocation),
 * which kept Vercel serverless functions provisioned 24/7 on the kitchen tablet
 * and burned Fluid memory-hours. Short GET /api/orders/inbox polls (~200 ms each)
 * deliver the same UX with ~95 % less function memory-time.
 */
export function subscribeToOrderStream(
  handlers: OrderStreamHandlers
): () => void {
  if (typeof window === "undefined") return () => {};

  let cancelled = false;
  let pollTimer: number | null = null;
  let lastVersion = -1;
  let gotSnapshot = false;
  let lastSuccessAt = 0;
  let consecutiveErrors = 0;
  let lastSessionRefreshAt = 0;

  const maybeRefreshSession = async (force = false) => {
    const now = Date.now();
    if (
      !force &&
      lastSessionRefreshAt > 0 &&
      now - lastSessionRefreshAt < SESSION_REFRESH_INTERVAL_MS
    ) {
      return;
    }
    const ok = await refreshAdminSessionCookie().catch(() => false);
    if (ok) lastSessionRefreshAt = now;
  };

  const scheduleNext = () => {
    if (cancelled || pollTimer !== null) return;
    pollTimer = window.setTimeout(() => {
      pollTimer = null;
      void tick().finally(scheduleNext);
    }, pollIntervalMs());
  };

  const tick = async () => {
    if (cancelled) return;
    try {
      if (cancelled) return;

      let res = await fetch(`${window.location.origin}/api/orders/inbox`, {
        cache: "no-store",
        credentials: "same-origin",
        headers: adminOrderHeaders(),
      });

      if (res.status === 401) {
        await maybeRefreshSession(true);
        if (cancelled) return;
        res = await fetch(`${window.location.origin}/api/orders/inbox`, {
          cache: "no-store",
          credentials: "same-origin",
          headers: adminOrderHeaders(),
        });
      } else {
        const now = Date.now();
        if (
          lastSessionRefreshAt === 0 ||
          now - lastSessionRefreshAt >= SESSION_REFRESH_INTERVAL_MS
        ) {
          void maybeRefreshSession();
        }
      }

      if (!res.ok) {
        consecutiveErrors += 1;
        if (
          consecutiveErrors >= 3 &&
          (lastSuccessAt === 0 || Date.now() - lastSuccessAt > DISCONNECT_AFTER_MS)
        ) {
          handlers.onDisconnect?.();
        }
        return;
      }

      const data = (await res.json()) as OrderInboxSnapshot;
      consecutiveErrors = 0;
      lastSuccessAt = Date.now();

      if (!gotSnapshot) {
        gotSnapshot = true;
        lastVersion = data.version;
        handlers.onSnapshot(data);
        return;
      }

      if (data.version !== lastVersion) {
        lastVersion = data.version;
        handlers.onUpdate(data);
      }
    } catch (e) {
      consecutiveErrors += 1;
      console.error("[orders/poll]", e);
      if (
        consecutiveErrors >= 3 &&
        (lastSuccessAt === 0 || Date.now() - lastSuccessAt > DISCONNECT_AFTER_MS)
      ) {
        handlers.onDisconnect?.();
      }
    }
  };

  const onVisibility = () => {
    if (cancelled) return;
    if (document.visibilityState === "visible") {
      const idleMs = Date.now() - lastSuccessAt;
      if (
        lastSuccessAt > 0 &&
        idleMs >= SESSION_REFRESH_ON_VISIBLE_MS
      ) {
        void maybeRefreshSession(true);
      }
      if (pollTimer !== null) {
        window.clearTimeout(pollTimer);
        pollTimer = null;
      }
      void tick().finally(scheduleNext);
    }
  };

  void maybeRefreshSession(true).finally(() => {
    if (!cancelled) void tick().finally(scheduleNext);
  });
  document.addEventListener("visibilitychange", onVisibility);

  return () => {
    cancelled = true;
    document.removeEventListener("visibilitychange", onVisibility);
    if (pollTimer !== null) {
      window.clearTimeout(pollTimer);
      pollTimer = null;
    }
  };
}
