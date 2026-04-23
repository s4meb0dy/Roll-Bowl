import { promises as fs } from "fs";
import path from "path";
import type {
  InventoryState,
  InventoryUpdateRequest,
  InventoryStreamEvent,
} from "./types";
import { PROTECTED_CATEGORIES } from "./config";

/**
 * Server-side inventory source of truth. Persists state to disk and broadcasts
 * patches to subscribers (used by the SSE endpoint) so that every connected
 * browser — customer or admin — sees availability changes within milliseconds.
 *
 * NOTE: this module must never be imported from client code. It uses `fs` and
 * holds an in-memory subscriber list that only makes sense inside the Next.js
 * Node.js runtime.
 */

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "inventory.json");

type Subscriber = (event: InventoryStreamEvent) => void;

// Module-scope singletons survive across route-handler invocations within the
// same Node.js process. In dev (`next dev`) the HMR boundary resets them only
// on full server restarts.
const g = globalThis as unknown as {
  __rb_inventory_state?: InventoryState;
  __rb_inventory_subs?: Set<Subscriber>;
  __rb_inventory_loaded?: boolean;
};

g.__rb_inventory_subs ??= new Set<Subscriber>();

function emptyState(): InventoryState {
  return {
    categories: {},
    items: {},
    lastSynced: null,
    updatedAt: new Date().toISOString(),
  };
}

async function ensureLoaded(): Promise<void> {
  if (g.__rb_inventory_loaded) return;
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<InventoryState>;
    g.__rb_inventory_state = {
      categories: parsed.categories ?? {},
      items: parsed.items ?? {},
      lastSynced: parsed.lastSynced ?? null,
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
    };
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code !== "ENOENT") {
      console.error("[inventory] failed to read", DATA_FILE, err);
    }
    g.__rb_inventory_state = emptyState();
  }
  g.__rb_inventory_loaded = true;
}

async function persist(): Promise<void> {
  if (!g.__rb_inventory_state) return;
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(
      DATA_FILE,
      JSON.stringify(g.__rb_inventory_state, null, 2),
      "utf8",
    );
  } catch (err) {
    console.error("[inventory] failed to persist", DATA_FILE, err);
  }
}

function broadcast(event: InventoryStreamEvent): void {
  g.__rb_inventory_subs!.forEach((sub) => {
    try { sub(event); } catch (err) {
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
      // Removing the key keeps the JSON file compact (default = available).
      const copy = { ...state.items };
      delete copy[update.id];
      state.items = copy;
    } else {
      state.items = { ...state.items, [update.id]: false };
    }
  }
  state.updatedAt = new Date().toISOString();

  await persist();
  broadcast({ type: "patch", update, state });
  return state;
}

export async function applyBulk(updates: InventoryUpdateRequest[]): Promise<InventoryState> {
  await ensureLoaded();
  const state = g.__rb_inventory_state!;
  for (const u of updates) {
    if (u.kind === "category" && PROTECTED_CATEGORIES.has(u.id as never) && !u.available) {
      continue; // silently skip protected-category disable attempts in bulk mode
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
  await persist();
  // Broadcast as a snapshot so every client fully re-hydrates after a sync.
  broadcast({ type: "snapshot", state });
  return state;
}

export function subscribe(sub: Subscriber): () => void {
  g.__rb_inventory_subs!.add(sub);
  return () => { g.__rb_inventory_subs!.delete(sub); };
}
