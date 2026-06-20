import { promises as fs } from "fs";
import path from "path";
import { getInboxRedis } from "@/lib/orders/inboxRedis";
import { isOrderInboxConfigured } from "@/lib/orders/inboxConfig";
import type { InventoryState } from "./types";

const REDIS_KEY = "inventory:state";
const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "inventory.json");

function emptyState(): InventoryState {
  return {
    categories: {},
    items: {},
    lastSynced: null,
    updatedAt: new Date().toISOString(),
  };
}

function normalizeState(raw: Partial<InventoryState>): InventoryState {
  return {
    categories: raw.categories ?? {},
    items: raw.items ?? {},
    lastSynced: raw.lastSynced ?? null,
    updatedAt: raw.updatedAt ?? new Date().toISOString(),
  };
}

function hasOverrides(state: InventoryState): boolean {
  return (
    Object.keys(state.categories).length > 0 ||
    Object.keys(state.items).length > 0 ||
    state.lastSynced != null
  );
}

async function loadFromFile(): Promise<InventoryState> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    return normalizeState(JSON.parse(raw) as Partial<InventoryState>);
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code !== "ENOENT") {
      console.error("[inventory] failed to read", DATA_FILE, err);
    }
    return emptyState();
  }
}

async function saveToFile(state: InventoryState): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(DATA_FILE, JSON.stringify(state, null, 2), "utf8");
  } catch (err) {
    console.error("[inventory] failed to persist", DATA_FILE, err);
  }
}

/** Same Redis/Upstash store as the order inbox — survives Vercel redeploys. */
export function isInventoryRedisConfigured(): boolean {
  return isOrderInboxConfigured();
}

export async function loadInventoryState(): Promise<InventoryState> {
  if (isInventoryRedisConfigured()) {
    try {
      const redis = getInboxRedis();
      const raw = await redis.get<InventoryState | string>(REDIS_KEY);
      if (raw) {
        if (typeof raw === "string") {
          return normalizeState(JSON.parse(raw) as Partial<InventoryState>);
        }
        return normalizeState(raw);
      }

      // One-time migration from local data/inventory.json (dev → prod).
      const fromFile = await loadFromFile();
      if (hasOverrides(fromFile)) {
        await redis.set(REDIS_KEY, fromFile);
        return fromFile;
      }
      return emptyState();
    } catch (err) {
      console.error("[inventory] Redis load failed, falling back to file", err);
      return loadFromFile();
    }
  }

  return loadFromFile();
}

export async function saveInventoryState(state: InventoryState): Promise<void> {
  if (isInventoryRedisConfigured()) {
    try {
      const redis = getInboxRedis();
      await redis.set(REDIS_KEY, state);
      return;
    } catch (err) {
      console.error("[inventory] Redis save failed, falling back to file", err);
    }
  }

  await saveToFile(state);
}
