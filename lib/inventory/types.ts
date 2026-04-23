/**
 * Category IDs group related menu sections for the global availability toggle.
 * Protected categories (see `PROTECTED_CATEGORIES`) cannot be disabled via the
 * admin UI — they are structural menu cornerstones.
 */
export type InventoryCategoryId =
  | "bowls"
  | "burritos"
  | "sushi"
  | "smoothies"
  | "smoothie-bowls"
  | "extras"
  | "desserten"
  | "dranken";

export interface InventoryState {
  /** Per-category availability. Missing key = available. */
  categories: Partial<Record<InventoryCategoryId, boolean>>;
  /** Per-item availability for ready-made items and BYO option IDs. Missing = available. */
  items: Record<string, boolean>;
  /** ISO timestamp of the last successful Lightspeed sync. */
  lastSynced: string | null;
  /** ISO timestamp of the last local write. */
  updatedAt: string;
}

export interface InventoryUpdateRequest {
  kind: "item" | "category";
  id: string;
  available: boolean;
}

/** SSE event payloads pushed by `/api/inventory/stream`. */
export type InventoryStreamEvent =
  | { type: "snapshot"; state: InventoryState }
  | { type: "patch"; update: InventoryUpdateRequest; state: InventoryState };
