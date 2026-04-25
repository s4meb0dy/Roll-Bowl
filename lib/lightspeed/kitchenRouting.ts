import type { CartItem, PaymentMethod } from "@/lib/types";

/**
 * Maps in-app line types to Lightspeed / POS station routing.
 * Set env per deployment so Burritos, Bowls, and Sushi land on the right printers.
 *
 * - LIGHTSPEED_CATEGORY_*_ID — category in POS (may drive kitchen routing)
 * - LIGHTSPEED_PRINTER_*_ID  — target printer / printer group; falls back to category id if missing
 */
export function getLightspeedKitchenRouting(item: CartItem): {
  categoryId: string;
  printerGroupId: string;
} {
  const catBowls = process.env.LIGHTSPEED_CATEGORY_BOWLS_ID ?? "";
  const catBurritos = process.env.LIGHTSPEED_CATEGORY_BURRITOS_ID ?? "";
  const catSushi = process.env.LIGHTSPEED_CATEGORY_SUSHI_ID ?? "";
  const catSmoothies = process.env.LIGHTSPEED_CATEGORY_SMOOTHIES_ID ?? "";
  const catExtras = process.env.LIGHTSPEED_CATEGORY_EXTRAS_ID ?? "";

  const prBowls = process.env.LIGHTSPEED_PRINTER_BOWLS_ID || catBowls;
  const prBurritos = process.env.LIGHTSPEED_PRINTER_BURRITOS_ID || catBurritos;
  const prSushi = process.env.LIGHTSPEED_PRINTER_SUSHI_ID || catSushi;
  const prSmoothies = process.env.LIGHTSPEED_PRINTER_SMOOTHIES_ID || catSmoothies;
  const prExtras = process.env.LIGHTSPEED_PRINTER_EXTRAS_ID || catExtras;

  switch (item.type) {
    case "poke-builder":
    case "ready-made":
    case "custom":
      return { categoryId: catBowls, printerGroupId: prBowls };
    case "burrito":
    case "burrito-builder":
      return { categoryId: catBurritos, printerGroupId: prBurritos };
    case "classic-roll-builder":
    case "inside-out-roll-builder":
      return { categoryId: catSushi, printerGroupId: prSushi };
    case "smoothie":
    case "smoothie-builder":
      return { categoryId: catSmoothies, printerGroupId: prSmoothies };
    case "item":
    default:
      return { categoryId: catExtras, printerGroupId: prExtras };
  }
}

/** POS order status: online → PAID; cash → ACCEPTED (both trigger kitchen printer in typical POS setups). */
export function getLightspeedPosOrderStatus(payment: PaymentMethod): "PAID" | "ACCEPTED" {
  return payment === "online" ? "PAID" : "ACCEPTED";
}
