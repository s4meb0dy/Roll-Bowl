import type { CartItem, BuilderOption } from "@/lib/types";
import { findReadyMadeById } from "@/lib/menu";

/**
 * Single line in the kitchen breakdown of a cart item.
 *
 * `accent: true` is meant for "+ Extra ..." rows (paid extras) so the UI/print
 * layer can highlight them — those are the ingredients the kitchen is most
 * likely to overlook.
 */
export interface KitchenLine {
  label: string;
  value: string;
  accent?: boolean;
}

/** Builder options whose name encodes "no choice" — should be hidden. */
const NONE_NAMES = new Set([
  "Geen saus",
  "Geen toppings",
  "Geen topping",
  "Geen proteine",
  "Geen proteïne",
  "Geen mix-in",
]);

function isReal(opt: BuilderOption | null | undefined): opt is BuilderOption {
  return !!opt && !NONE_NAMES.has(opt.name);
}

function joinNames(opts: Array<BuilderOption | null | undefined>): string {
  return opts.filter(isReal).map((o) => o.name).join(" · ");
}

/**
 * Returns a structured breakdown of a built/customized cart item so the
 * kitchen knows exactly what to put in the bowl/burrito/roll/smoothie.
 *
 * For ready-made items, returns at most a single line for size/base when set.
 * For unrecognized item types, returns an empty array.
 */
export function describeCartItemForKitchen(item: CartItem): KitchenLine[] {
  const lines: KitchenLine[] = [];

  switch (item.type) {
    case "poke-builder": {
      const s = item.pokeSelections;
      if (!s) break;
      lines.push({ label: "Maat", value: s.size.label });
      if (s.basis) lines.push({ label: "Basis", value: s.basis.name });
      const sauces = joinNames([s.saus1, s.saus2]);
      if (sauces) lines.push({ label: "Saus", value: sauces });
      if (isReal(s.protein)) lines.push({ label: "Proteïne", value: s.protein.name });
      if (s.extraProtein)
        lines.push({ label: "+ Extra proteïne", value: s.extraProtein.name, accent: true });
      const mixins = joinNames([s.mixin1, s.mixin2, s.mixin3, s.mixin4, s.mixin5]);
      if (mixins) lines.push({ label: "Mix-ins", value: mixins });
      if (s.extraMixin)
        lines.push({ label: "+ Extra mix-in", value: s.extraMixin.name, accent: true });
      const toppings = joinNames([s.topping1, s.topping2, s.topping3]);
      if (toppings) lines.push({ label: "Toppings", value: toppings });
      if (s.extraTopping)
        lines.push({ label: "+ Extra topping", value: s.extraTopping.name, accent: true });
      break;
    }

    case "burrito-builder": {
      const s = item.burritoSelections;
      if (!s) break;
      if (isReal(s.protein)) lines.push({ label: "Proteïne", value: s.protein.name });
      if (isReal(s.saus)) lines.push({ label: "Saus", value: s.saus.name });
      const mixins = joinNames([s.mixin1, s.mixin2, s.mixin3]);
      if (mixins) lines.push({ label: "Mix-ins", value: mixins });
      if (s.extraMixin)
        lines.push({ label: "+ Extra mix-in", value: s.extraMixin.name, accent: true });
      const toppings = joinNames([s.topping1, s.topping2]);
      if (toppings) lines.push({ label: "Toppings", value: toppings });
      if (s.extraTopping)
        lines.push({ label: "+ Extra topping", value: s.extraTopping.name, accent: true });
      break;
    }

    case "classic-roll-builder": {
      const s = item.classicRollSelections;
      if (!s) break;
      if (isReal(s.protein)) lines.push({ label: "Proteïne", value: s.protein.name });
      const mixins = joinNames([s.mixin1, s.mixin2]);
      if (mixins) lines.push({ label: "Mix-ins", value: mixins });
      if (isReal(s.sauce)) lines.push({ label: "Saus", value: s.sauce.name });
      break;
    }

    case "inside-out-roll-builder": {
      const s = item.insideOutRollSelections;
      if (!s) break;
      if (isReal(s.protein)) lines.push({ label: "Proteïne", value: s.protein.name });
      const mixins = joinNames([s.mixin1, s.mixin2]);
      if (mixins) lines.push({ label: "Mix-ins", value: mixins });
      if (isReal(s.sauce)) lines.push({ label: "Saus", value: s.sauce.name });
      if (isReal(s.topping)) lines.push({ label: "Topping", value: s.topping.name });
      break;
    }

    case "smoothie-builder": {
      const s = item.smoothieSelections;
      if (!s) break;
      if (s.basis) lines.push({ label: "Basis", value: s.basis.name });
      const mixins = joinNames([s.mixin1, s.mixin2, s.mixin3]);
      if (mixins) lines.push({ label: "Mix-ins", value: mixins });
      if (s.extraMixin)
        lines.push({ label: "+ Extra mix-in", value: s.extraMixin.name, accent: true });
      if (s.proteinScoop)
        lines.push({ label: "Proteïne scoop", value: s.proteinScoop.name });
      break;
    }

    case "custom": {
      const c = item.components;
      if (!c) break;
      if (c.base) lines.push({ label: "Basis", value: c.base.name });
      if (c.protein) lines.push({ label: "Proteïne", value: c.protein.name });
      if (c.toppings.length)
        lines.push({ label: "Toppings", value: c.toppings.map((t) => t.name).join(" · ") });
      if (c.sauce) lines.push({ label: "Saus", value: c.sauce.name });
      break;
    }

    case "ready-made":
    case "burrito":
    case "smoothie":
    case "item": {
      if (item.selectedSize?.label)
        lines.push({ label: "Maat", value: item.selectedSize.label });
      if (item.selectedBase?.name)
        lines.push({ label: "Basis", value: item.selectedBase.name });
      const masterRecord = findReadyMadeById(item.menuItemId);
      const ingredients = masterRecord?.ingredients?.trim();
      if (ingredients) {
        lines.push({ label: "Inhoud", value: ingredients });
      }
      break;
    }
  }

  return lines;
}

/** Single-line summary (used in legacy spots like the cart preview). */
export function summarizeCartItemForKitchen(item: CartItem): string {
  return describeCartItemForKitchen(item)
    .map((l) => `${l.label}: ${l.value}`)
    .join(" · ");
}
