import {
  READY_MADE,
  SIGNATURE_ROLLS,
  SMOOTHIES,
  SMOOTHIE_BOWLS,
  BURRITOS,
  EXTRAS,
  DESSERTEN,
  DRANKEN,
  CLASSIC_ROLL_PROTEINS,
  CLASSIC_ROLL_MIXINS,
  CLASSIC_ROLL_SAUCES,
  INSIDE_OUT_ROLL_TOPPINGS,
  BUILDER_BASES,
  BUILDER_PROTEINS,
  BUILDER_MIXINS,
  BUILDER_SAUCES,
  BUILDER_TOPPINGS,
  BURRITO_PROTEINS,
  BURRITO_MIXINS,
  SMOOTHIE_BASES,
  SMOOTHIE_MIXINS,
  SMOOTHIE_PROTEIN_SCOOPS,
} from "@/lib/menu";
import type { BuilderOption, ReadyMadeItem } from "@/lib/types";
import type { InventoryCategoryId } from "./types";

/**
 * Categories the admin may NEVER globally disable — even through the API.
 * These are the three menu cornerstones the brief calls out: Bowls, Burritos,
 * and Sushi. The admin UI keeps the toggle visible but locks it, and the
 * server-side writer also rejects category-level writes against them.
 */
export const PROTECTED_CATEGORIES: ReadonlySet<InventoryCategoryId> = new Set([
  "bowls",
  "burritos",
  "sushi",
]);

export interface InventoryItemEntry {
  id: string;
  name: string;
  /** Tiny hint string rendered under the toggle in the admin UI. */
  hint?: string;
}

export interface InventoryItemGroup {
  /** Stable identifier used for ARIA / keys. */
  id: string;
  label: string;
  /** Shown as a small caption above the group in the admin UI. */
  caption?: string;
  items: InventoryItemEntry[];
}

export interface InventoryCategoryConfig {
  id: InventoryCategoryId;
  label: string;
  description: string;
  /** Items rendered as a flat list of ready-made products. */
  readyMade?: ReadyMadeItem[];
  /** Optional builder option sub-sections (proteins, mix-ins, …). */
  builderGroups?: InventoryItemGroup[];
  /** `true` when this category is structurally protected from being disabled. */
  protected: boolean;
}

function toBuilderEntries(opts: BuilderOption[]): InventoryItemEntry[] {
  return opts.map((o) => ({
    id: o.id,
    name: o.name,
    hint: o.priceExtra > 0 ? `+€${o.priceExtra.toFixed(2)}` : undefined,
  }));
}

/**
 * Full inventory catalog rendered by the admin screen. Each builder option
 * is listed under its natural category — e.g. the Classic-Roll salmon sits
 * under "sushi" because `CLASSIC_ROLL_PROTEINS` is only used by roll builders.
 */
export const INVENTORY_CATALOG: InventoryCategoryConfig[] = [
  {
    id: "bowls",
    label: "Poké bowls",
    description:
      "Chef-bowls + de volledige 'Stel je poké bowl samen'-flow. Deze categorie is beschermd en kan niet globaal uit.",
    protected: true,
    readyMade: READY_MADE,
    builderGroups: [
      { id: "bowl-bases",    label: "Basis",       items: toBuilderEntries(BUILDER_BASES) },
      { id: "bowl-proteins", label: "Proteïnes",   items: toBuilderEntries(BUILDER_PROTEINS) },
      { id: "bowl-mixins",   label: "Mix-ins",     items: toBuilderEntries(BUILDER_MIXINS) },
      { id: "bowl-sauces",   label: "Sauzen",      items: toBuilderEntries(BUILDER_SAUCES) },
      { id: "bowl-toppings", label: "Toppings",    items: toBuilderEntries(BUILDER_TOPPINGS) },
    ],
  },
  {
    id: "burritos",
    label: "Poké burrito's",
    description:
      "Burrito-suggesties + 'Stel je poké burrito samen'. Beschermd tegen globaal uitschakelen.",
    protected: true,
    readyMade: BURRITOS,
    builderGroups: [
      { id: "burrito-proteins", label: "Proteïnes", items: toBuilderEntries(BURRITO_PROTEINS) },
      { id: "burrito-mixins",   label: "Mix-ins",   items: toBuilderEntries(BURRITO_MIXINS) },
    ],
  },
  {
    id: "sushi",
    label: "Sushi rolls",
    description:
      "Signature rolls + 'Stel zelf samen (Classic Roll / Inside-Out Roll)'. Beschermd tegen globaal uitschakelen.",
    protected: true,
    readyMade: SIGNATURE_ROLLS,
    builderGroups: [
      { id: "roll-proteins", label: "Proteïnes (Classic & Inside-Out)", items: toBuilderEntries(CLASSIC_ROLL_PROTEINS) },
      { id: "roll-mixins",   label: "Mix-ins (Classic & Inside-Out)",    items: toBuilderEntries(CLASSIC_ROLL_MIXINS) },
      { id: "roll-sauces",   label: "Sauzen",                             items: toBuilderEntries(CLASSIC_ROLL_SAUCES) },
      { id: "roll-toppings", label: "Toppings (Inside-Out)",              items: toBuilderEntries(INSIDE_OUT_ROLL_TOPPINGS) },
    ],
  },
  {
    id: "smoothies",
    label: "Smoothies",
    description: "Smoothie-suggesties + 'Stel je eigen smoothie samen'.",
    protected: false,
    readyMade: SMOOTHIES,
    builderGroups: [
      { id: "smoothie-bases",   label: "Basis",          items: toBuilderEntries(SMOOTHIE_BASES) },
      { id: "smoothie-mixins",  label: "Mix-ins",        items: toBuilderEntries(SMOOTHIE_MIXINS) },
      { id: "smoothie-scoops",  label: "Proteïne-scoops", items: toBuilderEntries(SMOOTHIE_PROTEIN_SCOOPS) },
    ],
  },
  {
    id: "smoothie-bowls",
    label: "Smoothie bowls",
    description: "Kant-en-klare smoothie bowls.",
    protected: false,
    readyMade: SMOOTHIE_BOWLS,
  },
  {
    id: "extras",
    label: "Extra's",
    description: "Zijde-extra's (edamame, salades, loempia's…).",
    protected: false,
    readyMade: EXTRAS,
  },
  {
    id: "desserten",
    label: "Desserten",
    description: "Huisgemaakte desserten.",
    protected: false,
    readyMade: DESSERTEN,
  },
  {
    id: "dranken",
    label: "Dranken",
    description: "Frisdranken, water, bier, wijn.",
    protected: false,
    readyMade: DRANKEN,
  },
];

/**
 * Reverse index from an arbitrary item/option ID to the category it belongs
 * to. Used by the client to quickly figure out "is the whole category off?"
 * without iterating the catalog every render.
 */
export const ITEM_TO_CATEGORY: Record<string, InventoryCategoryId> = (() => {
  const map: Record<string, InventoryCategoryId> = {};
  for (const cat of INVENTORY_CATALOG) {
    (cat.readyMade ?? []).forEach((it) => { map[it.id] = cat.id; });
    (cat.builderGroups ?? []).forEach((g) => {
      g.items.forEach((it) => { map[it.id] = cat.id; });
    });
  }
  return map;
})();

export const ALL_CATEGORY_IDS: InventoryCategoryId[] = INVENTORY_CATALOG.map((c) => c.id);
