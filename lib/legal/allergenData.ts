import {
  BURRITOS,
  BUILDER_BASES,
  BUILDER_MIXINS,
  BUILDER_PROTEINS,
  BUILDER_SAUCES,
  BUILDER_TOPPINGS,
  BURRITO_MIXINS,
  BURRITO_PROTEINS,
  CLASSIC_ROLL_MIXINS,
  CLASSIC_ROLL_PROTEINS,
  CLASSIC_ROLL_SAUCES,
  DESSERTEN,
  DRANKEN,
  EXTRAS,
  INSIDE_OUT_ROLL_TOPPINGS,
  READY_MADE,
  SIGNATURE_ROLLS,
  SMOOTHIES,
  SMOOTHIE_BASES,
  SMOOTHIE_BOWLS,
  SMOOTHIE_MIXINS,
  SMOOTHIE_PROTEIN_SCOOPS,
} from "@/lib/menu";
import type { AllergenChartSection, AllergenId } from "./types";

type AllergenMap = Record<string, AllergenId[]>;

/** EU 14 allergen mapping per menu item id. Verify with kitchen when recipes change. */
const CORE_ALLERGENS: AllergenMap = {
  // ── Poké bowl suggesties ──
  "hawaiian-style": ["fish", "eggs", "sesame", "soy"],
  "delicious-chicken": ["milk", "soy", "sesame", "eggs"],
  "hot-tuna": ["fish", "eggs", "sesame", "soy"],
  "tasty-tofu": ["soy", "sesame"],
  "very-vegan-chicken": ["soy"],
  "savoury-steak": ["milk", "eggs", "sesame"],
  "super-smoked-salmon": ["fish", "milk", "eggs"],
  "garlic-chicken": ["milk", "eggs"],
  "vegan-garlic-chicken": ["soy"],
  "mexican-chicken": ["milk", "eggs", "gluten"],
  "chicken-salad": ["milk", "nuts"],
  "spicy-shrimp": ["crustaceans", "gluten", "eggs", "soy"],
  "tuna-revolution": ["fish", "eggs", "sesame", "soy"],

  // ── Poké burrito suggesties (wrap = gluten) ──
  "hawaiian-burrito": ["fish", "eggs", "sesame", "soy", "gluten"],
  "delicious-chicken-burrito": ["milk", "soy", "sesame", "eggs", "gluten"],
  "hot-tuna-burrito": ["fish", "eggs", "sesame", "soy", "gluten"],
  "spicy-shrimp-burrito": ["crustaceans", "eggs", "soy", "gluten"],
  "super-smoked-salmon-burrito": ["fish", "milk", "gluten"],
  "tuna-revolution-burrito": ["fish", "eggs", "sesame", "soy", "gluten"],
  "tasty-tofu-burrito": ["soy", "sesame", "gluten"],
  "very-vegan-chicken-burrito": ["soy", "gluten"],
  "vegan-garlic-chicken-burrito": ["soy", "gluten"],
  "garlic-chicken-burrito": ["milk", "eggs", "gluten"],
  "mexican-chicken-burrito": ["eggs", "gluten"],
  "savoury-steak-burrito": ["milk", "eggs", "sesame", "gluten"],

  // ── Sushi Push Pop ──
  "california-roll-surimi": ["fish", "gluten", "eggs", "soy"],
  "california-roll-zalm": ["fish"],
  "spicy-tuna-roll": ["fish", "eggs", "soy"],
  "california-roll-vegan": ["soy", "sesame"],
  "philadelphia-roll": ["fish", "milk"],
  "teriyaki-chicken-roll": ["eggs", "soy", "sesame", "gluten"],
  "tuna-roll": ["fish"],

  // ── Smoothies suggesties ──
  "hawaiian-smoothie": [],
  "smoothie-pink-panther": [],
  "smoothie-green-magic": [],
  "smoothie-power-up": [],
  "smoothie-breakfast-boost": ["milk"],
  "smoothie-morning-glory": ["soy", "gluten"],
  "smoothie-happy-feeling": ["milk", "nuts"],
  "smoothie-proteine-fuel": ["milk", "peanuts", "gluten"],

  // ── Smoothie bowls ──
  "acai-smoothie-bowl": ["nuts", "gluten"],
  "dragon-fruit-smoothie-bowl": ["nuts", "gluten"],
  "passion-fruit-smoothie-bowl": ["nuts", "gluten"],

  // ── Extra's ──
  "nachos-supreme": ["gluten", "milk"],
  "bakje-zeewiersalade": [],
  "bakje-witte-rijst": [],
  "bakje-bruine-rijst": [],
  "bakje-nachos": ["gluten"],
  "bakje-quinoa": [],
  "bakje-couscous": ["gluten"],
  "bakje-feta": ["milk"],

  // ── Desserten (indicatief — check verpakking/leverancier) ──
  "apple-pie": ["gluten", "eggs", "milk"],
  "red-velvet-cake": ["gluten", "eggs", "milk"],
  "classic-cheesecake": ["gluten", "eggs", "milk"],
  "carrot-cake": ["gluten", "eggs", "milk", "nuts"],
  "raspberry-cheesecake": ["gluten", "eggs", "milk"],
  "chocolate-cake": ["gluten", "eggs", "milk"],
  "salted-caramel-cheesecake": ["gluten", "eggs", "milk"],
  "pecan-pie": ["gluten", "eggs", "milk", "nuts"],
  "lemon-cheesecake": ["gluten", "eggs", "milk"],
  "dubai-cheesecake": ["gluten", "eggs", "milk", "nuts"],
  "vegan-apple-pie": ["gluten"],
  "vegan-banana-cake": ["gluten", "nuts"],
  "tiramisu-choc-karamel": ["gluten", "eggs", "milk", "soy"],
  "tiramisu-bueno": ["gluten", "eggs", "milk", "nuts", "soy"],
  "tiramisu-raffaello": ["gluten", "eggs", "milk", "nuts", "soy"],
  "tiramisu-speculoos-karamel": ["gluten", "eggs", "milk", "soy"],
  "tiramisu-cookies-cream": ["gluten", "eggs", "milk", "soy"],
  "tiramisu-speculoos-choc-hazel": ["gluten", "eggs", "milk", "nuts", "soy"],

  // ── Dranken (geprepackte producten — zie verpakking) ──
  "spa-plat": [],
  "spa-bruis": [],
  "coca-cola": [],
  "coca-cola-zero": [],
  "fanta-orange": [],
  "fanta-lemon": [],
  "fanta-exotic": [],
  "lipton-original": [],
  "lipton-peach": [],
  "lipton-green": [],
  "red-bull": [],
  "red-bull-sugar-free": [],
  "mangajo-goji": [],
  "mangajo-acai": [],
  "mangajo-pomegranate": [],
  "mangajo-lemon": [],
  "mangajo-red-grape": [],
  "mocktail-mojito": [],
  "mocktail-passion": [],
  "mocktail-ginger-mule": [],
  "grannys-secret": [],

  // ── Bowl builder — proteïnen ──
  kipfilet: [],
  steak: [],
  "verse-zalm": ["fish"],
  "gemarineerde-zalm": ["fish", "soy"],
  "gerookte-zalm": ["fish"],
  "gebakken-zalm": ["fish"],
  "verse-tonijn": ["fish"],
  "gemarineerde-tonijn": ["fish", "soy"],
  "gebakken-tonijn": ["fish"],
  garnalen: ["crustaceans"],
  tofu: ["soy"],
  "vegan-kip": ["soy"],
  surimi: ["fish", "gluten", "eggs", "soy"],

  // ── Bowl builder — sauzen ──
  "spicy-sriracha": [],
  "sriracha-mayo": ["eggs"],
  "chili-mayo": ["eggs"],
  "sweet-chili": [],
  "goma-dressing": ["sesame", "soy"],
  "yoghurt-dressing": ["milk"],
  "cheesy-lemon-flavour": ["milk", "eggs"],
  "wasabi-mayo-mild": ["eggs"],
  "wasabi-mayo-strong": ["eggs"],
  "garlic-lover": ["eggs", "milk"],
  "garlic-lover-vegan": [],
  "sweet-teriyaki": ["soy", "gluten"],
  soya: ["soy", "gluten"],
  "sweet-soya": ["soy", "gluten"],
  "vegan-lover": [],
  vinaigrette: ["mustard"],
  "mango-mayo": ["eggs"],

  // ── Bowl builder — mix-ins ──
  edamame: ["soy"],
  feta: ["milk"],
  "vegan-feta": ["soy"],
  "cream-cheese": ["milk"],
  mozzarella: ["milk"],
  hummus: ["sesame"],
  "mix-noten": ["nuts"],
  "peanut-crumble": ["peanuts"],
  "wasabi-noten": ["nuts", "mustard"],

  // ── Bowl builder — toppings ──
  kroepoek: ["gluten"],
  "nachos-topping": ["gluten"],
  "sesam-mix": ["sesame"],
  "sesam-wasabi": ["sesame", "mustard"],
  "sesam-bbq": ["sesame", "soy"],
  "sesam-garlic": ["sesame"],
  "sesam-soy": ["sesame", "soy"],
  masago: ["fish"],
  furikake: ["fish", "sesame"],

  // ── Classic roll builder ──
  "cr-zalm": ["fish"],
  "cr-gebakken-zalm": ["fish"],
  "cr-gerookte-zalm": ["fish"],
  "cr-spicy-zalm": ["fish", "eggs"],
  "cr-tonijn": ["fish"],
  "cr-spicy-tonijn": ["fish", "eggs", "soy"],
  "cr-kipfilet": [],
  "cr-surimi": ["fish", "gluten", "eggs", "soy"],
  "cr-surimi-gemarineerd": ["fish", "gluten", "eggs", "soy"],
  "cr-tofu": ["soy"],
  "cr-tamago": ["eggs"],
  "cr-feta": ["milk"],
  "cr-cream-cheese": ["milk"],
  "cr-unagi": ["fish", "soy", "gluten"],
  "cr-spicy-sriracha": [],
  "cr-sriracha-mayo": ["eggs"],
  "cr-spicy-wasabi": ["mustard"],
  "cr-wasabi-mayo": ["eggs"],
  "cr-teriyaki": ["soy", "gluten"],
  "cr-sweet-soya": ["soy", "gluten"],
  "cr-goma-dressing": ["sesame", "soy"],

  // ── Inside-out roll toppings ──
  "ior-masago-groen": ["fish"],
  "ior-masago-oranje": ["fish"],
  "ior-masago-rood": ["fish"],
  "ior-masago-zwart": ["fish"],
  "ior-furikake": ["fish", "sesame"],
  "ior-sesam-mix": ["sesame"],
  "ior-sesam-garlic": ["sesame"],
  "ior-sesam-soy": ["sesame", "soy"],
  "ior-sesam-wasabi": ["sesame", "mustard"],
  "ior-sesam-bbq": ["sesame", "soy"],

  // ── Smoothie builder ──
  "sb-melk": ["milk"],
  "sb-sojamelk": ["soy"],
  "sb-yoghurt": ["milk"],
  "sm-havermout": ["gluten"],
  "sm-mix-noten": ["nuts"],
  "sm-pindakaas": ["peanuts"],
  "sp-chocolade": ["milk", "soy"],
  "sp-cookies-cream": ["gluten", "eggs", "milk"],
  "sp-vanille": ["milk"],
};

function uniq(ids: AllergenId[]): AllergenId[] {
  return [...new Set(ids)];
}

function mergeGlutenBases(map: AllergenMap): void {
  for (const base of BUILDER_BASES) {
    if (base.id.includes("nachos") || base.id.includes("couscous")) {
      map[base.id] = uniq([...(map[base.id] ?? []), "gluten"]);
    } else if (!map[base.id]) {
      map[base.id] = [];
    }
  }
}

function alias(map: AllergenMap, from: string, to: string): void {
  map[to] = map[from] ?? [];
}

function aliasMany(map: AllergenMap, from: string, toIds: string[]): void {
  for (const to of toIds) alias(map, from, to);
}

function buildAllergenMap(): AllergenMap {
  const map: AllergenMap = { ...CORE_ALLERGENS };

  // Burrito builder proteins mirror bowl proteins
  aliasMany(map, "kipfilet", ["b-kipfilet"]);
  aliasMany(map, "steak", ["b-steak"]);
  aliasMany(map, "verse-zalm", ["b-verse-zalm"]);
  aliasMany(map, "gemarineerde-zalm", ["b-gemarineerde-zalm"]);
  aliasMany(map, "gerookte-zalm", ["b-gerookte-zalm"]);
  aliasMany(map, "gebakken-zalm", ["b-gebakken-zalm"]);
  aliasMany(map, "verse-tonijn", ["b-verse-tonijn"]);
  aliasMany(map, "gemarineerde-tonijn", ["b-gemarineerde-tonijn"]);
  aliasMany(map, "gebakken-tonijn", ["b-gebakken-tonijn"]);
  aliasMany(map, "garnalen", ["b-garnalen"]);
  aliasMany(map, "tofu", ["b-tofu"]);
  aliasMany(map, "vegan-kip", ["b-vegan-kip"]);
  aliasMany(map, "surimi", ["b-surimi"]);

  // Burrito builder mix-ins mirror bowl mix-ins
  for (const mixin of BUILDER_MIXINS) {
    alias(map, mixin.id, `b-${mixin.id}`);
  }

  mergeGlutenBases(map);

  // Ensure every sellable id has an entry (empty = none of EU 14)
  const allItems = [
    ...READY_MADE,
    ...BURRITOS,
    ...SIGNATURE_ROLLS,
    ...SMOOTHIES,
    ...SMOOTHIE_BOWLS,
    ...EXTRAS,
    ...DESSERTEN,
    ...DRANKEN,
    ...BUILDER_PROTEINS.filter((p) => p.id !== "geen-proteine"),
    ...BUILDER_SAUCES.filter((s) => s.id !== "geen-saus"),
    ...BUILDER_MIXINS,
    ...BUILDER_TOPPINGS.filter((t) => t.id !== "geen-toppings"),
    ...BUILDER_BASES,
    ...BURRITO_PROTEINS.filter((p) => p.id !== "b-geen-proteine"),
    ...BURRITO_MIXINS,
    ...CLASSIC_ROLL_PROTEINS,
    ...CLASSIC_ROLL_MIXINS,
    ...CLASSIC_ROLL_SAUCES.filter((s) => s.id !== "cr-geen-saus"),
    ...INSIDE_OUT_ROLL_TOPPINGS.filter((t) => t.id !== "ior-geen-topping"),
    ...SMOOTHIE_BASES,
    ...SMOOTHIE_MIXINS,
    ...SMOOTHIE_PROTEIN_SCOOPS,
  ];

  for (const item of allItems) {
    if (!(item.id in map)) map[item.id] = [];
  }

  return map;
}

export const ALLERGEN_BY_ITEM_ID: AllergenMap = buildAllergenMap();

function mapMenuItems(items: { id: string; name: string }[]): AllergenChartSection["items"] {
  return items.map((item) => ({
    id: item.id,
    name: item.name,
    allergens: ALLERGEN_BY_ITEM_ID[item.id] ?? [],
  }));
}

export const ALLERGEN_CHART_SECTIONS: AllergenChartSection[] = [
  { titleKey: "legal.allergen_section_bowls", items: mapMenuItems(READY_MADE) },
  { titleKey: "legal.allergen_section_burritos", items: mapMenuItems(BURRITOS) },
  { titleKey: "legal.allergen_section_rolls", items: mapMenuItems(SIGNATURE_ROLLS) },
  { titleKey: "legal.allergen_section_smoothies", items: mapMenuItems(SMOOTHIES) },
  { titleKey: "legal.allergen_section_smoothie_bowls", items: mapMenuItems(SMOOTHIE_BOWLS) },
  { titleKey: "legal.allergen_section_extras", items: mapMenuItems(EXTRAS) },
  { titleKey: "legal.allergen_section_desserts", items: mapMenuItems(DESSERTEN) },
  { titleKey: "legal.allergen_section_drinks", items: mapMenuItems(DRANKEN) },
  {
    titleKey: "legal.allergen_section_proteins",
    items: mapMenuItems(BUILDER_PROTEINS.filter((p) => p.id !== "geen-proteine")),
  },
  {
    titleKey: "legal.allergen_section_sauces",
    items: mapMenuItems(BUILDER_SAUCES.filter((s) => s.id !== "geen-saus")),
  },
  { titleKey: "legal.allergen_section_mixins", items: mapMenuItems(BUILDER_MIXINS) },
  {
    titleKey: "legal.allergen_section_toppings",
    items: mapMenuItems(BUILDER_TOPPINGS.filter((t) => t.id !== "geen-toppings")),
  },
  { titleKey: "legal.allergen_section_bases", items: mapMenuItems(BUILDER_BASES) },
  {
    titleKey: "legal.allergen_section_burrito_proteins",
    items: mapMenuItems(BURRITO_PROTEINS.filter((p) => p.id !== "b-geen-proteine")),
  },
  { titleKey: "legal.allergen_section_burrito_mixins", items: mapMenuItems(BURRITO_MIXINS) },
  { titleKey: "legal.allergen_section_roll_proteins", items: mapMenuItems(CLASSIC_ROLL_PROTEINS) },
  { titleKey: "legal.allergen_section_roll_mixins", items: mapMenuItems(CLASSIC_ROLL_MIXINS) },
  {
    titleKey: "legal.allergen_section_roll_sauces",
    items: mapMenuItems(CLASSIC_ROLL_SAUCES.filter((s) => s.id !== "cr-geen-saus")),
  },
  {
    titleKey: "legal.allergen_section_roll_toppings",
    items: mapMenuItems(INSIDE_OUT_ROLL_TOPPINGS.filter((t) => t.id !== "ior-geen-topping")),
  },
  { titleKey: "legal.allergen_section_smoothie_bases", items: mapMenuItems(SMOOTHIE_BASES) },
  { titleKey: "legal.allergen_section_smoothie_mixins", items: mapMenuItems(SMOOTHIE_MIXINS) },
  { titleKey: "legal.allergen_section_smoothie_protein", items: mapMenuItems(SMOOTHIE_PROTEIN_SCOOPS) },
];

/** Burrito wraps contain gluten — note shown in chart intro via i18n. */
export const BURRITO_WRAP_ALLERGENS: AllergenId[] = ["gluten"];
