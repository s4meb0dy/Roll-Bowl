"use client";

import { create } from "zustand";
import { useEffect } from "react";
import type {
  InventoryCategoryId,
  InventoryState,
  InventoryUpdateRequest,
} from "./types";
import { ITEM_TO_CATEGORY, PROTECTED_CATEGORIES } from "./config";

const EMPTY: InventoryState = {
  categories: {},
  items: {},
  lastSynced: null,
  updatedAt: new Date(0).toISOString(),
};

/** Menu visitors poll every 30 s; admin inventory page every 15 s. */
const POLL_INTERVAL_MENU_MS = 30_000;
const POLL_INTERVAL_ADMIN_MS = 15_000;

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

export interface InventorySyncOptions {
  /** Shorter interval on the admin inventory page. */
  admin?: boolean;
}

/**
 * Polls /api/inventory on an interval and pushes updates into the client store.
 *
 * SSE was removed: every menu visitor previously held a long-lived serverless
 * function open, which dominated Vercel Fluid memory usage. Stock changes are
 * infrequent, so a 30 s poll is plenty for the public menu.
 */
export function useInventorySync(opts?: InventorySyncOptions): void {
  const setState = useInventoryStore((s) => s.setState);
  const setConnected = useInventoryStore((s) => s.setConnected);
  const intervalMs = opts?.admin ? POLL_INTERVAL_ADMIN_MS : POLL_INTERVAL_MENU_MS;

  useEffect(() => {
    let pollTimer: number | null = null;
    let cancelled = false;
    let consecutiveErrors = 0;

    const fetchSnapshot = async () => {
      try {
        const res = await fetch("/api/inventory", { cache: "no-store" });
        if (!res.ok) {
          consecutiveErrors += 1;
          if (consecutiveErrors >= 3) setConnected(false);
          return;
        }
        const s = (await res.json()) as InventoryState;
        if (cancelled) return;
        consecutiveErrors = 0;
        setState(s);
        setConnected(true);
      } catch {
        consecutiveErrors += 1;
        if (consecutiveErrors >= 3) setConnected(false);
      }
    };

    void fetchSnapshot();
    pollTimer = window.setInterval(fetchSnapshot, intervalMs);

    return () => {
      cancelled = true;
      if (pollTimer !== null) window.clearInterval(pollTimer);
      setConnected(false);
    };
  }, [setState, setConnected, intervalMs]);
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
