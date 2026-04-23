"use client";

import { create } from "zustand";
import { useEffect } from "react";
import type {
  InventoryCategoryId,
  InventoryState,
  InventoryStreamEvent,
  InventoryUpdateRequest,
} from "./types";
import { ITEM_TO_CATEGORY, PROTECTED_CATEGORIES } from "./config";

const EMPTY: InventoryState = {
  categories: {},
  items: {},
  lastSynced: null,
  updatedAt: new Date(0).toISOString(),
};

interface InventoryStore {
  state: InventoryState;
  connected: boolean;
  setState: (s: InventoryState) => void;
  setConnected: (b: boolean) => void;
}

export const useInventoryStore = create<InventoryStore>((set) => ({
  state: EMPTY,
  connected: false,
  setState: (s) => set({ state: s }),
  setConnected: (b) => set({ connected: b }),
}));

/** Pure reader – returns `true` if the item is available. Missing key = available. */
export function selectItemAvailable(state: InventoryState, id: string): boolean {
  // Explicit item override wins.
  if (state.items[id] === false) return false;
  // Fall back to the containing category's override.
  const cat = ITEM_TO_CATEGORY[id];
  if (cat && state.categories[cat] === false) return false;
  return true;
}

/** Pure reader – returns `true` if the category is available. */
export function selectCategoryAvailable(
  state: InventoryState,
  catId: InventoryCategoryId,
): boolean {
  if (PROTECTED_CATEGORIES.has(catId)) return true; // protected = always on
  return state.categories[catId] !== false;
}

/** React hook returning stable selector helpers. Subscribes to store updates. */
export function useInventory() {
  const state = useInventoryStore((s) => s.state);
  const connected = useInventoryStore((s) => s.connected);
  return {
    state,
    connected,
    isItemAvailable: (id: string) => selectItemAvailable(state, id),
    isCategoryAvailable: (catId: InventoryCategoryId) => selectCategoryAvailable(state, catId),
  };
}

/**
 * Mounts an SSE subscription that pushes inventory patches into the client store
 * in real time. Automatically reconnects with polling fallback if the stream
 * drops (e.g. because the page sits behind a proxy that kills long-lived GETs).
 *
 * Render this ONCE near the top of any tree that cares about inventory — menu
 * root + admin pages — then consume through `useInventory()` elsewhere.
 */
export function useInventorySync(): void {
  const setState = useInventoryStore((s) => s.setState);
  const setConnected = useInventoryStore((s) => s.setConnected);

  useEffect(() => {
    let source: EventSource | null = null;
    let pollTimer: number | null = null;
    let cancelled = false;

    const applyEvent = (payload: InventoryStreamEvent) => {
      setState(payload.state);
    };

    const fetchSnapshot = async () => {
      try {
        const res = await fetch("/api/inventory", { cache: "no-store" });
        if (!res.ok) return;
        const s = (await res.json()) as InventoryState;
        if (!cancelled) setState(s);
      } catch {
        /* network failure – next poll will retry */
      }
    };

    const startPolling = () => {
      if (pollTimer !== null) return;
      pollTimer = window.setInterval(fetchSnapshot, 15_000);
    };

    const stopPolling = () => {
      if (pollTimer !== null) {
        window.clearInterval(pollTimer);
        pollTimer = null;
      }
    };

    // Kick off with a one-shot snapshot so the UI shows accurate stock even if
    // the SSE handshake is still completing.
    void fetchSnapshot();

    try {
      source = new EventSource("/api/inventory/stream");
      source.addEventListener("snapshot", (ev: MessageEvent) => {
        try { applyEvent(JSON.parse(ev.data) as InventoryStreamEvent); } catch { /* noop */ }
      });
      source.addEventListener("patch", (ev: MessageEvent) => {
        try { applyEvent(JSON.parse(ev.data) as InventoryStreamEvent); } catch { /* noop */ }
      });
      source.onopen = () => {
        setConnected(true);
        stopPolling();
      };
      source.onerror = () => {
        setConnected(false);
        // Browser will auto-reconnect; start polling in the meantime so the
        // UI doesn't show stale stock for more than ~15 s.
        startPolling();
      };
    } catch {
      // EventSource not supported – go straight to polling.
      startPolling();
    }

    return () => {
      cancelled = true;
      source?.close();
      stopPolling();
      setConnected(false);
    };
  }, [setState, setConnected]);
}

/** Flip a single switch on the server. Returns the new inventory state. */
export async function postInventoryUpdate(
  pin: string,
  update: InventoryUpdateRequest,
): Promise<InventoryState> {
  const res = await fetch("/api/inventory", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-admin-pin": pin },
    body: JSON.stringify(update),
  });
  if (!res.ok) {
    const { error } = (await res.json().catch(() => ({ error: "unknown" }))) as { error?: string };
    throw new Error(error || `inventory_update_failed_${res.status}`);
  }
  return (await res.json()) as InventoryState;
}

export async function triggerLightspeedSync(pin: string): Promise<{
  ok: boolean;
  reason?: string;
  message?: string;
  applied?: number;
}> {
  const res = await fetch("/api/inventory/sync", {
    method: "POST",
    headers: { "x-admin-pin": pin },
  });
  return res.json();
}
