import {
  BOWL_SIZES,
  BUILDER_BASES,
  BUILDER_SAUCES,
  BUILDER_MIXINS,
  BUILDER_EXTRA_MIXINS,
  BUILDER_PROTEINS,
  BUILDER_EXTRA_PROTEINS,
  BUILDER_TOPPINGS,
  BUILDER_EXTRA_TOPPINGS,
  CLASSIC_ROLL_BASE_PRICE,
  CLASSIC_ROLL_PROTEINS,
  CLASSIC_ROLL_MIXINS,
  CLASSIC_ROLL_SAUCES,
  INSIDE_OUT_ROLL_BASE_PRICE,
  INSIDE_OUT_ROLL_TOPPINGS,
  BURRITO_BASE_PRICE,
  BURRITO_PROTEINS,
  BURRITO_MIXINS,
  BURRITO_EXTRA_MIXINS,
  BURRITO_EXTRA_TOPPINGS,
  SMOOTHIE_BASE_PRICE,
  SMOOTHIE_BASES,
  SMOOTHIE_MIXINS,
  SMOOTHIE_EXTRA_MIXINS,
  SMOOTHIE_PROTEIN_SCOOPS,
  SIZE_OPTIONS,
  BASE_OPTIONS,
  BASES,
  PROTEINS,
  TOPPINGS,
  SAUCES,
  findReadyMadeById,
} from "@/lib/menu";
import { ZIP_CODES, TAKEAWAY_DELIVERY_FEE, TAKEAWAY_MIN_ORDER } from "@/lib/deliveryConfig";
import type { CartItem, Order } from "@/lib/types";

/**
 * Server-side price validation.
 *
 * The customer's cart lives in the browser (localStorage / Zustand), so every
 * price sent to the server is untrusted. This module recomputes each cart
 * line — and the order totals — straight from the menu catalog and rejects any
 * order whose declared amounts don't match. This closes the "edit localStorage
 * and pay €0.50 for a €40 order" hole for both online (Stripe) and cash orders.
 */

type PricedOption = { id: string; priceExtra: number };

function buildPriceMap(...lists: PricedOption[][]): Map<string, number> {
  const map = new Map<string, number>();
  for (const list of lists) {
    for (const opt of list) {
      if (!map.has(opt.id)) map.set(opt.id, opt.priceExtra);
    }
  }
  return map;
}

// Per-builder id → surcharge lookups. Ids are unique within each builder
// (the "extra" variants carry a prefix), so a single merged map is safe.
const POKE_MAP = buildPriceMap(
  BUILDER_BASES,
  BUILDER_SAUCES,
  BUILDER_MIXINS,
  BUILDER_EXTRA_MIXINS,
  BUILDER_PROTEINS,
  BUILDER_EXTRA_PROTEINS,
  BUILDER_TOPPINGS,
  BUILDER_EXTRA_TOPPINGS
);
const CLASSIC_MAP = buildPriceMap(
  CLASSIC_ROLL_PROTEINS,
  CLASSIC_ROLL_MIXINS,
  CLASSIC_ROLL_SAUCES
);
const IOR_MAP = buildPriceMap(
  CLASSIC_ROLL_PROTEINS,
  CLASSIC_ROLL_MIXINS,
  CLASSIC_ROLL_SAUCES,
  INSIDE_OUT_ROLL_TOPPINGS
);
const BURRITO_MAP = buildPriceMap(
  BURRITO_PROTEINS,
  BUILDER_SAUCES,
  BURRITO_MIXINS,
  BURRITO_EXTRA_MIXINS,
  BUILDER_TOPPINGS,
  BURRITO_EXTRA_TOPPINGS
);
const SMOOTHIE_MAP = buildPriceMap(
  SMOOTHIE_BASES,
  SMOOTHIE_MIXINS,
  SMOOTHIE_EXTRA_MIXINS,
  SMOOTHIE_PROTEIN_SCOOPS
);

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Sum the catalog surcharges of every selected option in a builder selection
 * object. Returns `null` if any picked option id is not in the catalog map
 * (i.e. the payload was tampered with), which forces the order to be rejected.
 */
function sumSelections(
  selections: Record<string, unknown>,
  map: Map<string, number>,
  skipKeys: string[] = []
): number | null {
  let extra = 0;
  for (const [key, value] of Object.entries(selections)) {
    if (skipKeys.includes(key)) continue;
    if (value == null) continue;
    if (typeof value !== "object") continue;
    const id = (value as { id?: unknown }).id;
    if (typeof id !== "string") return null;
    const price = map.get(id);
    if (price == null) return null;
    extra += price;
  }
  return extra;
}

/**
 * Recompute the authoritative unit price of a cart line from the menu catalog.
 * Returns `null` when the item references an unknown product/option, which the
 * caller must treat as a rejection.
 */
export function recomputeUnitPrice(item: CartItem): number | null {
  switch (item.type) {
    case "item":
    case "smoothie":
    case "burrito": {
      const found = findReadyMadeById(item.menuItemId);
      return found ? round2(found.price) : null;
    }

    case "ready-made": {
      const found = findReadyMadeById(item.menuItemId);
      if (!found) return null;
      let total = found.price;
      if (item.selectedSize) {
        const size = SIZE_OPTIONS.find((o) => o.id === item.selectedSize!.id);
        if (!size) return null;
        total += size.priceExtra;
      }
      if (item.selectedBase) {
        const base = BASE_OPTIONS.find((o) => o.id === item.selectedBase!.id);
        if (!base) return null;
        total += base.priceExtra;
      }
      return round2(total);
    }

    case "poke-builder": {
      const sel = item.pokeSelections;
      if (!sel || !sel.size) return null;
      const size = BOWL_SIZES.find((s) => s.id === sel.size.id);
      if (!size) return null;
      const extra = sumSelections(
        sel as unknown as Record<string, unknown>,
        POKE_MAP,
        ["size"]
      );
      if (extra == null) return null;
      return round2(size.basePrice + extra);
    }

    case "classic-roll-builder": {
      const sel = item.classicRollSelections;
      if (!sel) return null;
      const extra = sumSelections(
        sel as unknown as Record<string, unknown>,
        CLASSIC_MAP
      );
      if (extra == null) return null;
      return round2(CLASSIC_ROLL_BASE_PRICE + extra);
    }

    case "inside-out-roll-builder": {
      const sel = item.insideOutRollSelections;
      if (!sel) return null;
      const extra = sumSelections(
        sel as unknown as Record<string, unknown>,
        IOR_MAP
      );
      if (extra == null) return null;
      return round2(INSIDE_OUT_ROLL_BASE_PRICE + extra);
    }

    case "burrito-builder": {
      const sel = item.burritoSelections;
      if (!sel) return null;
      const extra = sumSelections(
        sel as unknown as Record<string, unknown>,
        BURRITO_MAP
      );
      if (extra == null) return null;
      return round2(BURRITO_BASE_PRICE + extra);
    }

    case "smoothie-builder": {
      const sel = item.smoothieSelections;
      if (!sel) return null;
      const extra = sumSelections(
        sel as unknown as Record<string, unknown>,
        SMOOTHIE_MAP
      );
      if (extra == null) return null;
      return round2(SMOOTHIE_BASE_PRICE + extra);
    }

    case "custom": {
      const c = item.components;
      if (!c) return null;
      let total = 0;
      if (c.base) {
        const base = BASES.find((b) => b.id === c.base!.id);
        if (!base) return null;
        total += base.price;
      }
      if (c.protein) {
        const protein = PROTEINS.find((p) => p.id === c.protein!.id);
        if (!protein) return null;
        total += protein.price;
      }
      for (const top of c.toppings ?? []) {
        const found = TOPPINGS.find((x) => x.id === top.id);
        if (!found) return null;
        total += found.price;
      }
      if (c.sauce) {
        const sauce = SAUCES.find((s) => s.id === c.sauce!.id);
        if (!sauce) return null;
        total += sauce.price;
      }
      return round2(total);
    }

    default:
      return null;
  }
}

function computeDeliveryFeeCents(
  orderType: Order["orderType"],
  zipCode: string | null | undefined
): number {
  if (orderType === "takeaway") return Math.round(TAKEAWAY_DELIVERY_FEE * 100);
  if (zipCode && ZIP_CODES[zipCode]) {
    return Math.round(ZIP_CODES[zipCode].deliveryFee * 100);
  }
  return 0;
}

function minOrderCents(
  orderType: Order["orderType"],
  zipCode: string | null | undefined
): number {
  if (orderType === "takeaway") return Math.round(TAKEAWAY_MIN_ORDER * 100);
  if (zipCode && ZIP_CODES[zipCode]) {
    return Math.round(ZIP_CODES[zipCode].minOrder * 100);
  }
  return 0;
}

export interface PricingCheck {
  ok: boolean;
  reason?: string;
}

/**
 * Tolerance (in cents) when comparing the client's declared totals against the
 * server recomputation. Prices are clean 2-decimal values, so drift is
 * effectively zero; a small buffer absorbs any float rounding.
 */
const TOTALS_TOLERANCE_CENTS = 2;

/**
 * Validate that an order's item prices and totals match the menu catalog and
 * delivery config. Applies to both cash and online orders.
 */
export function validateOrderPricing(order: Order): PricingCheck {
  if (!Array.isArray(order.items) || order.items.length === 0) {
    return { ok: false, reason: "no_items" };
  }
  if (order.items.length > 100) {
    return { ok: false, reason: "too_many_items" };
  }

  let subtotalCents = 0;
  for (const item of order.items) {
    const qty = item.quantity;
    if (typeof qty !== "number" || !Number.isInteger(qty) || qty < 1 || qty > 99) {
      return { ok: false, reason: "invalid_quantity" };
    }
    const clientUnit = item.price;
    if (typeof clientUnit !== "number" || !Number.isFinite(clientUnit) || clientUnit < 0) {
      return { ok: false, reason: "invalid_price" };
    }
    const unit = recomputeUnitPrice(item);
    if (unit == null) {
      return { ok: false, reason: `unknown_item:${item.type}` };
    }
    const unitCents = Math.round(unit * 100);
    if (Math.abs(unitCents - Math.round(clientUnit * 100)) > 1) {
      return { ok: false, reason: `price_mismatch:${item.type}` };
    }
    subtotalCents += unitCents * qty;
  }

  const orderType: Order["orderType"] = order.orderType === "takeaway" ? "takeaway" : "delivery";
  const zip = order.customerInfo?.zipCode?.trim() || null;

  // A delivery order must target a postcode we actually serve.
  if (orderType === "delivery" && (!zip || !ZIP_CODES[zip])) {
    return { ok: false, reason: "unknown_delivery_zip" };
  }

  if (subtotalCents < minOrderCents(orderType, zip)) {
    return { ok: false, reason: "below_minimum_order" };
  }

  const deliveryFeeCents = computeDeliveryFeeCents(orderType, zip);
  const totalCents = subtotalCents + deliveryFeeCents;

  const declaredSubtotal = Math.round((order.subtotal ?? 0) * 100);
  const declaredDelivery = Math.round((order.deliveryFee ?? 0) * 100);
  const declaredTotal = Math.round((order.total ?? 0) * 100);

  if (Math.abs(declaredSubtotal - subtotalCents) > TOTALS_TOLERANCE_CENTS) {
    return { ok: false, reason: "subtotal_mismatch" };
  }
  if (Math.abs(declaredDelivery - deliveryFeeCents) > TOTALS_TOLERANCE_CENTS) {
    return { ok: false, reason: "delivery_fee_mismatch" };
  }
  if (Math.abs(declaredTotal - totalCents) > TOTALS_TOLERANCE_CENTS) {
    return { ok: false, reason: "total_mismatch" };
  }
  if (totalCents <= 0) {
    return { ok: false, reason: "total_not_positive" };
  }

  return { ok: true };
}
