import type {
  InventoryState,
  InventoryUpdateRequest,
  InventoryStreamEvent,
} from "./types";
import { PROTECTED_CATEGORIES } from "./config";
import {
  isInventoryRedisConfigured,
  loadInventoryState,
  saveInventoryState,
} from "./persistence";

/**
 * Server-side inventory source of truth. Persists to Redis (production) or
 * data/inventory.json (local dev without KV) and broadcasts patches via SSE.
 *
 * NOTE: this module must never be imported from client code.
 */

type Subscriber = (event: InventoryStreamEvent) => void;

const g = globalThis as unknown as {
  __rb_inventory_state?: InventoryState;
  __rb_inventory_subs?: Set<Subscriber>;
  __rb_inventory_loaded?: boolean;
};

g.__rb_inventory_subs ??= new Set<Subscriber>();

async function ensureLoaded(): Promise<void> {
  // With Redis, always reload so every serverless instance sees the same stock.
  if (isInventoryRedisConfigured()) {
    g.__rb_inventory_state = await loadInventoryState();
    return;
  }

  if (g.__rb_inventory_loaded) return;
  g.__rb_inventory_state = await loadInventoryState();
  g.__rb_inventory_loaded = true;
}

async function persist(state: InventoryState): Promise<void> {
  await saveInventoryState(state);
}

function broadcast(event: InventoryStreamEvent): void {
  g.__rb_inventory_subs!.forEach((sub) => {
    try {
      sub(event);
    } catch (err) {
      console.error("[inventory] subscriber threw", err);
    }
  });
}

export async function readInventory(): Promise<InventoryState> {
  await ensureLoaded();
  return g.__rb_inventory_state!;
}

export async function applyUpdate(update: InventoryUpdateRequest): Promise<InventoryState> {
  await ensureLoaded();
  const state = g.__rb_inventory_state!;

  if (update.kind === "category") {
    if (PROTECTED_CATEGORIES.has(update.id as never) && !update.available) {
      throw new Error(`Category "${update.id}" is protected and cannot be disabled.`);
    }
    state.categories = {
      ...state.categories,
      [update.id]: update.available,
    };
  } else {
    if (update.available) {
      const copy = { ...state.items };
      delete copy[update.id];
      state.items = copy;
    } else {
      state.items = { ...state.items, [update.id]: false };
    }
  }
  state.updatedAt = new Date().toISOString();

  await persist(state);
  broadcast({ type: "patch", update, state });
  return state;
}

export async function applyBulk(updates: InventoryUpdateRequest[]): Promise<InventoryState> {
  await ensureLoaded();
  const state = g.__rb_inventory_state!;
  for (const u of updates) {
    if (u.kind === "category" && PROTECTED_CATEGORIES.has(u.id as never) && !u.available) {
      continue;
    }
    if (u.kind === "category") {
      state.categories = { ...state.categories, [u.id]: u.available };
    } else if (u.available) {
      const copy = { ...state.items };
      delete copy[u.id];
      state.items = copy;
    } else {
      state.items = { ...state.items, [u.id]: false };
    }
  }
  state.updatedAt = new Date().toISOString();
  state.lastSynced = state.updatedAt;
  await persist(state);
  broadcast({ type: "snapshot", state });
  return state;
}

export function subscribe(sub: Subscriber): () => void {
  g.__rb_inventory_subs!.add(sub);
  return () => {
    g.__rb_inventory_subs!.delete(sub);
  };
}

export { isInventoryRedisConfigured };
