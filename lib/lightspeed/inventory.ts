import type { InventoryUpdateRequest } from "@/lib/inventory/types";

/**
 * Stub for Lightspeed POS inventory synchronization.
 *
 * Real integration requires:
 *   LIGHTSPEED_API_URL       e.g. "https://api.lightspeedapp.com/API/Account/<id>"
 *   LIGHTSPEED_API_TOKEN     OAuth bearer token
 *   LIGHTSPEED_ITEM_MAPPING  JSON map { "<lightspeedItemID>": "<local menu/option id>" }
 *
 * Until credentials are configured this function is a no-op that returns an
 * empty update list. Wire up the real fetch when the restaurant provides
 * access.
 *
 * Example real implementation:
 *
 *   const res = await fetch(`${apiUrl}/Items.json?load_relations=["ItemShops"]`, {
 *     headers: { Authorization: `Bearer ${token}` },
 *     cache: "no-store",
 *   });
 *   const { Item } = await res.json();
 *   return Item
 *     .filter(it => mapping[it.itemID])
 *     .map(it => ({
 *       kind: "item" as const,
 *       id: mapping[it.itemID],
 *       available: Number(it.ItemShops.ItemShop.qoh) > 0,
 *     }));
 */
export async function fetchLightspeedAvailability(): Promise<InventoryUpdateRequest[]> {
  const apiUrl = process.env.LIGHTSPEED_API_URL;
  const token = process.env.LIGHTSPEED_API_TOKEN;

  if (!apiUrl || !token) {
    // Credentials missing — feature intentionally disabled.
    return [];
  }

  // Intentional placeholder. Real fetch logic goes here.
  // Return type is already correct: an array of updates to apply in bulk.
  return [];
}

/** `true` when Lightspeed credentials are present so the admin UI can hint it. */
export function isLightspeedConfigured(): boolean {
  return Boolean(process.env.LIGHTSPEED_API_URL && process.env.LIGHTSPEED_API_TOKEN);
}
