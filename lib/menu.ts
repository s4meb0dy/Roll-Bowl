import type { BowlComponent, ReadyMadeItem, SizeOption, BaseOption, BowlSize, BuilderOption } from "./types";

export const BASES: BowlComponent[] = [
  {
    id: "brown-rice",
    name: "Brown Rice",
    emoji: "🍚",
    price: 2.0,
    description: "Whole grain, nutty & filling",
    calories: 215,
    isVegan: true,
    isGlutenFree: true,
  },
  {
    id: "quinoa",
    name: "Quinoa",
    emoji: "🌾",
    price: 2.5,
    description: "Complete protein, light & fluffy",
    calories: 180,
    isVegan: true,
    isGlutenFree: true,
  },
  {
    id: "mixed-greens",
    name: "Mixed Greens",
    emoji: "🥗",
    price: 1.5,
    description: "Spinach, arugula & lettuce",
    calories: 35,
    isVegan: true,
    isGlutenFree: true,
  },
  {
    id: "cauli-rice",
    name: "Cauliflower Rice",
    emoji: "🥦",
    price: 2.0,
    description: "Low-carb, light & delicious",
    calories: 85,
    isVegan: true,
    isGlutenFree: true,
  },
];

export const PROTEINS: BowlComponent[] = [
  {
    id: "chicken",
    name: "Grilled Chicken",
    emoji: "🍗",
    price: 4.5,
    description: "Herb-marinated, free-range",
    calories: 220,
    isGlutenFree: true,
  },
  {
    id: "falafel",
    name: "Falafel",
    emoji: "🧆",
    price: 3.5,
    description: "Crispy chickpea bites (×3)",
    calories: 180,
    isVegan: true,
  },
  {
    id: "tuna",
    name: "Wild Tuna",
    emoji: "🐟",
    price: 4.0,
    description: "Line-caught, light & lean",
    calories: 150,
    isGlutenFree: true,
  },
  {
    id: "tofu",
    name: "Sesame Tofu",
    emoji: "🫘",
    price: 3.0,
    description: "Crispy, sesame-glazed",
    calories: 140,
    isVegan: true,
    isGlutenFree: true,
  },
  {
    id: "salmon",
    name: "Smoked Salmon",
    emoji: "🍣",
    price: 5.5,
    description: "Cold-smoked, rich in omega-3",
    calories: 200,
    isGlutenFree: true,
  },
  {
    id: "shrimp",
    name: "Grilled Shrimp",
    emoji: "🦐",
    price: 5.0,
    description: "Garlic-butter, wild-caught",
    calories: 170,
    isGlutenFree: true,
  },
];

export const TOPPINGS: BowlComponent[] = [
  {
    id: "avocado",
    name: "Avocado",
    emoji: "🥑",
    price: 1.5,
    description: "Creamy & fresh",
    calories: 80,
    isVegan: true,
    isGlutenFree: true,
  },
  {
    id: "tomatoes",
    name: "Cherry Tomatoes",
    emoji: "🍅",
    price: 0.75,
    description: "Sweet & vibrant",
    calories: 25,
    isVegan: true,
    isGlutenFree: true,
  },
  {
    id: "cucumber",
    name: "Cucumber",
    emoji: "🥒",
    price: 0.75,
    description: "Cool & crisp",
    calories: 15,
    isVegan: true,
    isGlutenFree: true,
  },
  {
    id: "edamame",
    name: "Edamame",
    emoji: "🫛",
    price: 1.0,
    description: "Protein-packed pods",
    calories: 100,
    isVegan: true,
    isGlutenFree: true,
  },
  {
    id: "red-cabbage",
    name: "Red Cabbage",
    emoji: "🟣",
    price: 0.75,
    description: "Crunchy & colorful",
    calories: 25,
    isVegan: true,
    isGlutenFree: true,
  },
  {
    id: "sweet-potato",
    name: "Sweet Potato",
    emoji: "🍠",
    price: 1.0,
    description: "Roasted & caramelized",
    calories: 90,
    isVegan: true,
    isGlutenFree: true,
  },
  {
    id: "corn",
    name: "Sweet Corn",
    emoji: "🌽",
    price: 0.75,
    description: "Grilled & sweet",
    calories: 65,
    isVegan: true,
    isGlutenFree: true,
  },
  {
    id: "red-onion",
    name: "Pickled Red Onion",
    emoji: "🧅",
    price: 0.75,
    description: "Tangy & vibrant",
    calories: 20,
    isVegan: true,
    isGlutenFree: true,
  },
  {
    id: "carrots",
    name: "Julienne Carrots",
    emoji: "🥕",
    price: 0.75,
    description: "Crisp & lightly spiced",
    calories: 25,
    isVegan: true,
    isGlutenFree: true,
  },
  {
    id: "mango",
    name: "Fresh Mango",
    emoji: "🥭",
    price: 1.25,
    description: "Tropical & sweet",
    calories: 55,
    isVegan: true,
    isGlutenFree: true,
  },
];

export const SAUCES: BowlComponent[] = [
  {
    id: "tahini",
    name: "Tahini Lemon",
    emoji: "🫙",
    price: 0.75,
    description: "Creamy, nutty & zesty",
    calories: 90,
    isVegan: true,
    isGlutenFree: true,
  },
  {
    id: "miso-ginger",
    name: "Miso Ginger",
    emoji: "🥢",
    price: 0.75,
    description: "Umami, warm & aromatic",
    calories: 65,
    isVegan: true,
    isGlutenFree: true,
  },
  {
    id: "sriracha-mayo",
    name: "Sriracha Mayo",
    emoji: "🌶️",
    price: 0.75,
    description: "Creamy heat with a kick",
    calories: 120,
    isGlutenFree: true,
  },
  {
    id: "lemon-herb",
    name: "Lemon Herb",
    emoji: "🌿",
    price: 0.75,
    description: "Light, bright & refreshing",
    calories: 55,
    isVegan: true,
    isGlutenFree: true,
  },
  {
    id: "peanut",
    name: "Peanut Sauce",
    emoji: "🥜",
    price: 0.75,
    description: "Rich, silky & subtly spiced",
    calories: 145,
    isVegan: true,
    isGlutenFree: true,
  },
];

export const READY_MADE: ReadyMadeItem[] = [
  {
    id: "hawaiian-style",
    name: "Hawaiian Style",
    emoji: "🌺",
    price: 13.90,
    image: "/bowls/hawaiian-style.png",
    description: "Tropische bowl met verse zalm, avocado en een huisgemaakte wasabi mayo touch.",
    ingredients: "Basis naar keuze · Verse zalm · Avocado · Zeewiersalade · Edamame · Komkommer · Mango · Kerstomaten · Wasabi mayo mild · Masago · Sesam mix",
    tags: ["Popular", "GF"],
  },
  {
    id: "delicious-chicken",
    name: "Delicious Chicken",
    emoji: "🍗",
    price: 12.90,
    image: "/bowls/delicious-chicken.png",
    description: "Onze bestseller met sappige kipfilet, feta en een zoete teriyaki saus.",
    ingredients: "Basis naar keuze · Huisgemarineerde kipfilet · Kerstomaten · Rode ui · Augurk · Maïs · Feta · Ananas · Sweet teriyaki · Gefrituurde ui · Sesam bbq",
    tags: ["Popular", "GF"],
  },
  {
    id: "hot-tuna",
    name: "Hot Tuna",
    emoji: "🌶️",
    price: 14.90,
    image: "/bowls/hot-tuna.png",
    description: "Verse tonijn met een pittige chili mayo en frisse Aziatische toppings.",
    ingredients: "Basis naar keuze · Huisgemarineerde verse tonijn · Avocado · Edamame · Zeewiersalade · Komkommer · Wortel op Koreaanse wijze · Chili mayo · Lente ui · Sesam mix",
    tags: ["GF"],
  },
  {
    id: "tasty-tofu",
    name: "Tasty Tofu",
    emoji: "🫘",
    price: 12.90,
    image: "/bowls/tasty-tofu.png",
    description: "100% plantaardig, vol van smaak met huisgemarineerde tofu en vegan lover saus.",
    ingredients: "Basis naar keuze · Huisgemarineerde tofu · Avocado · Zeewiersalade · Komkommer · Wortel op Koreaanse wijze · Kerstomaten · Vegan lover saus · Sesam mix",
    tags: ["Vegan", "GF"],
  },
  {
    id: "very-vegan-chicken",
    name: "Very Vegan Chicken",
    emoji: "🌿",
    price: 14.90,
    image: "/bowls/very-vegan-chicken.png",
    description: "Volledig plantaardig met zoete aardappel, edamame en sweet soya.",
    ingredients: "Basis naar keuze · Vegan kip · Avocado · Edamame · Komkommer · Zoete aardappel · Kerstomaten · Sweet soya · Garlic flakes · Chili flakes",
    tags: ["Vegan", "GF"],
  },
  {
    id: "savoury-steak",
    name: "Savoury Steak",
    emoji: "🥩",
    price: 14.90,
    image: "/bowls/savoury-steak.png",
    description: "Huisgemarineerde steak met champignons, kikkererwten en een cheesy lemon mayo.",
    ingredients: "Basis naar keuze · Fijngesneden huisgemarineerde steak · Huisgemarineerde champignons · Wortel op Koreaanse wijze · Kikkererwten · Paprika · Huisgemarineerde courgette · Cheesy lemon mayo · Gefrituurde ui · Sesam garlic",
    tags: ["GF"],
  },
  {
    id: "super-smoked-salmon",
    name: "Super Smoked Salmon",
    emoji: "🐟",
    price: 13.90,
    image: "/bowls/super-smoked-salmon.png",
    description: "Gerookte zalm met cream cheese, avocado en een frisse vinaigrette.",
    ingredients: "Basis naar keuze · Gerookte zalm · Avocado · Edamame · Komkommer · Kerstomaten · Cream cheese · Vinaigrette · Schijfje citroen · Furikake",
    tags: ["GF", "Popular"],
  },
  {
    id: "garlic-chicken",
    name: "Garlic Chicken",
    emoji: "🧄",
    price: 12.90,
    image: "/bowls/garlic-chicken.png",
    description: "Knoflook kipfilet met feta, olijven en een huisgemaakte garlic lover saus.",
    ingredients: "Basis naar keuze · Huisgemarineerde kipfilet · Kerstomaten · Paprika · Augurk · Feta · Olijven · Huisgemarineerde witte kool · Garlic lover saus · Gefrituurde ui",
    tags: ["GF"],
  },
  {
    id: "vegan-garlic-chicken",
    name: "Vegan Garlic Chicken",
    emoji: "🌱",
    price: 15.40,
    image: "/bowls/vegan-garlic-chicken.png",
    description: "Plantaardige knoflook kip met vegan feta, olijven en garlic lover vegan saus.",
    ingredients: "Basis naar keuze · Vegan kip · Kerstomaten · Paprika · Augurk · Vegan feta · Olijven · Huisgemarineerde witte kool · Vegan garlic lover · Gefrituurde ui",
    tags: ["Vegan", "GF"],
  },
  {
    id: "mexican-chicken",
    name: "Mexican Chicken",
    emoji: "🌮",
    price: 12.90,
    image: "/bowls/mexican-chicken.png",
    description: "Mexicaanse kipfilet met guacamole, jalapeños en een pittige chili mayo.",
    ingredients: "Basis naar keuze · Huisgemarineerde kipfilet · Huisgemaakte guacamole · Jalapeños · Maïs · Rode bonen · Paprika · Cream cheese · Chili mayo · Nacho's · Chili flakes",
    tags: ["GF"],
  },
  {
    id: "chicken-salad",
    name: "Chicken Salad",
    emoji: "🥗",
    price: 12.90,
    image: "/bowls/chicken-salad.png",
    description: "Frisse sla bowl met kipfilet, feta en een romige yoghurt dressing.",
    ingredients: "Sla · Huisgemarineerde kipfilet · Maïs · Feta · Paprika · Kerstomaten · Komkommer · Yoghurt dressing · Mix van noten",
    tags: ["GF"],
  },
  {
    id: "spicy-shrimp",
    name: "Spicy Shrimp",
    emoji: "🦐",
    price: 13.90,
    image: "/bowls/spicy-shrimp.png",
    description: "Pittige garnalen op rijst met nacho's, sriracha mayo en pink ginger.",
    ingredients: "Witte rijst en nacho's · Garnalen · Avocado · Zeewiersalade · Komkommer · Wortel op Koreaanse wijze · Rode biet · Huisgemaakte sriracha mayo · Pink ginger · Chili flakes",
    tags: ["GF"],
  },
  {
    id: "tuna-revolution",
    name: "Tuna Revolution",
    emoji: "🌊",
    price: 14.90,
    image: "/bowls/tuna-revolution.png",
    description: "Gebakken tonijn met mediterrane groenten, guacamole en goma dressing.",
    ingredients: "Basis naar keuze · Gebakken tonijn · Huisgestoofde mediterrane groentenmix · Broccoli · Zoete aardappel · Huisgemaakte guacamole · Goma dressing · Garlic flakes · Lente ui",
    tags: ["GF", "New"],
  },
];

export const SIZE_OPTIONS: SizeOption[] = [
  { id: "medium", label: "Medium", priceExtra: 0 },
  { id: "large", label: "Large", priceExtra: 3.0 },
];

export const BASE_OPTIONS: BaseOption[] = [
  { id: "witte-rijst", name: "Witte rijst", priceExtra: 0 },
  { id: "bruine-rijst", name: "Bruine rijst", priceExtra: 0 },
  { id: "sla", name: "Sla", priceExtra: 0 },
  { id: "nachos", name: "Nachos", priceExtra: 0 },
  { id: "quinoa", name: "Quinoa", priceExtra: 1.5 },
  { id: "couscous", name: "Couscous", priceExtra: 0 },
  { id: "mix-witte-bruine-rijst", name: "Mix witte en bruine rijst", priceExtra: 0 },
  { id: "witte-rijst-sla", name: "Witte rijst en sla", priceExtra: 0 },
  { id: "witte-rijst-nachos", name: "Witte rijst en nacho's", priceExtra: 0 },
  { id: "witte-rijst-quinoa", name: "Witte rijst en quinoa", priceExtra: 0.75 },
  { id: "witte-rijst-couscous", name: "Witte rijst en couscous", priceExtra: 0 },
  { id: "bruine-rijst-sla", name: "Bruine rijst en sla", priceExtra: 0 },
  { id: "bruine-rijst-nachos", name: "Bruine rijst en nacho's", priceExtra: 0 },
  { id: "bruine-rijst-quinoa", name: "Bruine rijst en quinoa", priceExtra: 0.75 },
  { id: "bruine-rijst-couscous", name: "Bruine rijst en couscous", priceExtra: 0 },
  { id: "sla-nachos", name: "Sla en nacho's", priceExtra: 0 },
  { id: "sla-quinoa", name: "Sla en quinoa", priceExtra: 0.75 },
  { id: "sla-couscous", name: "Sla en couscous", priceExtra: 0 },
  { id: "nachos-quinoa", name: "Nacho's en quinoa", priceExtra: 0.75 },
  { id: "nachos-couscous", name: "Nacho's en couscous", priceExtra: 0 },
];

export const MAX_TOPPINGS = 4;

// ─── Custom Poké Bowl Builder ────────────────────────────────────────────────

export const BOWL_SIZES: BowlSize[] = [
  { id: "medium", label: "Medium poké bowl", basePrice: 12.90 },
  { id: "large", label: "Large poké bowl", basePrice: 15.90 },
];

export const BUILDER_BASES: BuilderOption[] = [
  { id: "witte-rijst", name: "Witte rijst", priceExtra: 0 },
  { id: "bruine-rijst", name: "Bruine rijst", priceExtra: 0 },
  { id: "sla", name: "Sla", priceExtra: 0 },
  { id: "nachos", name: "Nachos", priceExtra: 0 },
  { id: "quinoa", name: "Quinoa", priceExtra: 1.5 },
  { id: "couscous", name: "Couscous", priceExtra: 0 },
  { id: "mix-witte-bruine-rijst", name: "Mix witte en bruine rijst", priceExtra: 0 },
  { id: "witte-rijst-sla", name: "Witte rijst en sla", priceExtra: 0 },
  { id: "witte-rijst-nachos", name: "Witte rijst en nacho's", priceExtra: 0 },
  { id: "witte-rijst-quinoa", name: "Witte rijst en quinoa", priceExtra: 0.75 },
  { id: "witte-rijst-couscous", name: "Witte rijst en couscous", priceExtra: 0 },
  { id: "bruine-rijst-sla", name: "Bruine rijst en sla", priceExtra: 0 },
  { id: "bruine-rijst-nachos", name: "Bruine rijst en nacho's", priceExtra: 0 },
  { id: "bruine-rijst-quinoa", name: "Bruine rijst en quinoa", priceExtra: 0.75 },
  { id: "bruine-rijst-couscous", name: "Bruine rijst en couscous", priceExtra: 0 },
  { id: "sla-nachos", name: "Sla en nacho's", priceExtra: 0 },
  { id: "sla-quinoa", name: "Sla en quinoa", priceExtra: 0.75 },
  { id: "sla-couscous", name: "Sla en couscous", priceExtra: 0 },
  { id: "nachos-quinoa", name: "Nacho's en quinoa", priceExtra: 0.75 },
  { id: "nachos-couscous", name: "Nacho's en couscous", priceExtra: 0 },
  { id: "quinoa-couscous", name: "Quinoa en couscous", priceExtra: 0.75 },
];

export const BUILDER_SAUCES: BuilderOption[] = [
  { id: "geen-saus", name: "Geen saus", priceExtra: 0 },
  { id: "spicy-sriracha", name: "Spicy sriracha", priceExtra: 0, isVegan: true, isGlutenFree: true },
  { id: "sriracha-mayo", name: "Sriracha mayo", priceExtra: 0 },
  { id: "chili-mayo", name: "Chili mayo", priceExtra: 0 },
  { id: "sweet-chili", name: "Sweet chili", priceExtra: 0, isVegan: true, isGlutenFree: true },
  { id: "goma-dressing", name: "Goma dressing", priceExtra: 0, isVegan: true },
  { id: "yoghurt-dressing", name: "Yoghurt dressing", priceExtra: 0, isGlutenFree: true },
  { id: "cheesy-lemon-flavour", name: "Cheesy lemon flavour", priceExtra: 0 },
  { id: "wasabi-mayo-mild", name: "Wasabi mayo mild", priceExtra: 0 },
  { id: "wasabi-mayo-strong", name: "Wasabi mayo strong", priceExtra: 0 },
  { id: "garlic-lover", name: "Garlic lover", priceExtra: 0 },
  { id: "garlic-lover-vegan", name: "Garlic lover vegan", priceExtra: 0.5, isVegan: true, isGlutenFree: true },
  { id: "sweet-teriyaki", name: "Sweet teriyaki", priceExtra: 0, isVegan: true },
  { id: "soya", name: "Soya", priceExtra: 0, isVegan: true },
  { id: "sweet-soya", name: "Sweet soya", priceExtra: 0, isVegan: true },
  { id: "vegan-lover", name: "Vegan lover", priceExtra: 0, isVegan: true, isGlutenFree: true },
  { id: "vinaigrette", name: "Vinaigrette", priceExtra: 0, isVegan: true, isGlutenFree: true },
  { id: "mango-mayo", name: "Mango mayo", priceExtra: 0.5, isVegan: true, isGlutenFree: true },
];

export const BUILDER_MIXINS: BuilderOption[] = [
  { id: "avocado", name: "Avocado", priceExtra: 0 },
  { id: "guacamole", name: "Huisgemaakte guacamole", priceExtra: 0 },
  { id: "edamame", name: "Edamame", priceExtra: 0 },
  { id: "zeewiersalade", name: "Zeewiersalade", priceExtra: 0 },
  { id: "mango", name: "Mango", priceExtra: 0 },
  { id: "ananas", name: "Ananas", priceExtra: 0 },
  { id: "augurk", name: "Augurk", priceExtra: 0 },
  { id: "olijven", name: "Olijven", priceExtra: 0 },
  { id: "jalapenos", name: "Jalapeños", priceExtra: 0 },
  { id: "mais", name: "Maïs", priceExtra: 0 },
  { id: "kerstomaten", name: "Kerstomaten", priceExtra: 0 },
  { id: "komkommer", name: "Komkommer", priceExtra: 0 },
  { id: "paprika", name: "Paprika", priceExtra: 0 },
  { id: "courgette", name: "Huisgemarineerde courgette", priceExtra: 0 },
  { id: "wortel", name: "Wortel", priceExtra: 0 },
  { id: "wortel-koreaans", name: "Huisgemarineerde wortel op koreaanse wijze", priceExtra: 0 },
  { id: "witte-kool", name: "Huisgemarineerde witte kool", priceExtra: 0 },
  { id: "rode-kool", name: "Huisgemarineerde rode kool", priceExtra: 0 },
  { id: "rode-ui", name: "Rode ui", priceExtra: 0 },
  { id: "zoete-ui", name: "Gemarineerde zoete ui", priceExtra: 0 },
  { id: "zilveruitjes", name: "Zilveruitjes", priceExtra: 0 },
  { id: "tauge", name: "Tauge", priceExtra: 0 },
  { id: "feta", name: "Feta", priceExtra: 0 },
  { id: "vegan-feta", name: "Vegan feta", priceExtra: 0.5 },
  { id: "cream-cheese", name: "Cream cheese", priceExtra: 0.5 },
  { id: "mozzarella", name: "Mozzarella balletjes", priceExtra: 0.5 },
  { id: "rode-bonen", name: "Rode bonen", priceExtra: 0 },
  { id: "rode-biet", name: "Rode biet", priceExtra: 0 },
  { id: "japanse-radijs", name: "Japanse radijs", priceExtra: 0 },
  { id: "zoete-aardappel", name: "Zoete aardappel", priceExtra: 0 },
  { id: "kikkererwten", name: "Kikkererwten", priceExtra: 0 },
  { id: "hummus", name: "Huisgemaakte hummus", priceExtra: 0 },
  { id: "champignons", name: "Huisgemarineerde champignons", priceExtra: 0 },
  { id: "mediterrane-groenten", name: "Huisgestoofde mediterrane groentenmix", priceExtra: 0 },
  { id: "broccoli", name: "Broccoli", priceExtra: 0 },
  { id: "surimi", name: "Surimi", priceExtra: 0 },
];

export const BUILDER_PROTEINS: BuilderOption[] = [
  { id: "geen-proteine", name: "Geen proteine", priceExtra: 0 },
  { id: "kipfilet", name: "Huisgemarineerde kipfilet", priceExtra: 0 },
  { id: "steak", name: "Fijngesneden huisgemarineerde steak", priceExtra: 2.0 },
  { id: "verse-zalm", name: "Verse zalm", priceExtra: 1.0 },
  { id: "gemarineerde-zalm", name: "Verse gemarineerde zalm", priceExtra: 1.0 },
  { id: "gerookte-zalm", name: "Gerookte zalm", priceExtra: 1.0 },
  { id: "gebakken-zalm", name: "Gebakken zalm", priceExtra: 1.0 },
  { id: "verse-tonijn", name: "Verse tonijn", priceExtra: 2.0 },
  { id: "gemarineerde-tonijn", name: "Verse gemarineerde tonijn", priceExtra: 2.0 },
  { id: "gebakken-tonijn", name: "Gebakken tonijn", priceExtra: 2.0 },
  { id: "garnalen", name: "Garnalen", priceExtra: 1.0 },
  { id: "tofu", name: "Tofu", priceExtra: 0 },
  { id: "vegan-kip", name: "Vegan kip", priceExtra: 2.0 },
];

export const BUILDER_EXTRA_MIXIN_PRICE = 0.5;
export const BUILDER_EXTRA_PROTEIN_PRICE = 3.0;
export const BUILDER_EXTRA_TOPPING_PRICE = 0.3;

export const BUILDER_EXTRA_MIXINS: BuilderOption[] = withFlatPrice(
  BUILDER_MIXINS,
  BUILDER_EXTRA_MIXIN_PRICE,
  "extra",
);

export const BUILDER_EXTRA_PROTEINS: BuilderOption[] = withFlatPrice(
  BUILDER_PROTEINS.filter((p) => p.id !== "geen-proteine"),
  BUILDER_EXTRA_PROTEIN_PRICE,
  "extra",
);

export const BUILDER_TOPPINGS: BuilderOption[] = [
  { id: "geen-toppings", name: "Geen toppings", priceExtra: 0 },
  { id: "kroepoek", name: "Kroepoek", priceExtra: 0 },
  { id: "nachos-topping", name: "Nacho's", priceExtra: 0 },
  { id: "gefrituurde-ui", name: "Gefrituurde ui", priceExtra: 0 },
  { id: "lente-ui", name: "Lente ui", priceExtra: 0 },
  { id: "mix-noten", name: "Mix van noten", priceExtra: 0 },
  { id: "peanut-crumble", name: "Peanut crumble", priceExtra: 0 },
  { id: "wasabi-noten", name: "Wasabi noten", priceExtra: 0 },
  { id: "sesam-mix", name: "Sesam mix", priceExtra: 0 },
  { id: "sesam-wasabi", name: "Sesam wasabi", priceExtra: 0 },
  { id: "sesam-bbq", name: "Sesam bbq", priceExtra: 0 },
  { id: "sesam-garlic", name: "Sesam garlic", priceExtra: 0 },
  { id: "sesam-soy", name: "Sesam soy", priceExtra: 0 },
  { id: "furikake", name: "Furikake", priceExtra: 0 },
  { id: "garlic-flakes", name: "Garlic flakes", priceExtra: 0 },
  { id: "chili-flakes", name: "Chili flakes", priceExtra: 0 },
  { id: "pink-ginger", name: "Pink ginger", priceExtra: 0 },
  { id: "masago", name: "Masago", priceExtra: 0 },
  { id: "citroen", name: "Schijfje citroen", priceExtra: 0 },
];

export const BUILDER_EXTRA_TOPPINGS: BuilderOption[] = withFlatPrice(
  BUILDER_TOPPINGS.filter((t) => t.id !== "geen-toppings"),
  BUILDER_EXTRA_TOPPING_PRICE,
  "extra",
);

// ─── Poké Burrito's ──────────────────────────────────────────────────────────

export const BURRITOS: ReadyMadeItem[] = [
  {
    id: "hawaiian-burrito",
    name: "Hawaiian Burrito",
    emoji: "🌺",
    price: 11.90,
    image: "/burritos/hawaiian-burrito.png",
    description: "Tropische burrito met verse zalm, avocado en wasabi mayo.",
    ingredients: "Verse zalm · Avocado · Edamame · Zeewiersalade · Wasabi mayo mild · Sesam mix",
    tags: ["Popular", "GF"],
  },
  {
    id: "delicious-chicken-burrito",
    name: "Delicious Chicken Burrito",
    emoji: "🍗",
    price: 10.90,
    image: "/burritos/delicious-chicken-burrito.png",
    description: "Sappige kipburrito met feta, ananas en sweet teriyaki saus.",
    ingredients: "Huisgemarineerde kipfilet · Feta · Rode ui · Maïs · Ananas · Sweet teriyaki · Sesam bbq",
    tags: ["Popular", "GF"],
  },
  {
    id: "hot-tuna-burrito",
    name: "Hot Tuna Burrito",
    emoji: "🌶️",
    price: 12.90,
    image: "/burritos/hot-tuna-burrito.png",
    description: "Verse tonijn burrito met edamame, zeewiersalade en chili mayo.",
    ingredients: "Huisgemarineerde verse tonijn · Avocado · Edamame · Zeewiersalade · Wortel op Koreaanse wijze · Chili mayo · Sesam mix",
    tags: ["GF"],
  },
  {
    id: "spicy-shrimp-burrito",
    name: "Spicy Shrimp Burrito",
    emoji: "🦐",
    price: 11.90,
    image: "/burritos/spicy-shrimp-burrito.png",
    description: "Pittige garnalenburrito met sriracha mayo en pink ginger.",
    ingredients: "Garnalen · Avocado · Edamame · Wortel op Koreaanse wijze · Sriracha mayo · Pink ginger",
    tags: ["GF"],
  },
  {
    id: "super-smoked-salmon-burrito",
    name: "Super Smoked Salmon Burrito",
    emoji: "🐟",
    price: 11.90,
    image: "/burritos/super-smoked-salmon-burrito.png",
    description: "Gerookte zalm burrito met cream cheese, avocado en vinaigrette.",
    ingredients: "Gerookte zalm · Avocado · Edamame · Komkommer · Cream cheese · Vinaigrette · Furikake",
    tags: ["GF", "Popular"],
  },
  {
    id: "tuna-revolution-burrito",
    name: "Tuna Revolution Burrito",
    emoji: "🌊",
    price: 12.90,
    image: "/burritos/tuna-revolution-burrito.png",
    description: "Gebakken tonijn met mediterrane groenten, guacamole en goma dressing.",
    ingredients: "Gebakken tonijn · Huisgemaakte guacamole · Mediterrane groentenmix · Zoete aardappel · Goma dressing · Lente ui",
    tags: ["GF", "New"],
  },
  {
    id: "tasty-tofu-burrito",
    name: "Tasty Tofu Burrito",
    emoji: "🫘",
    price: 10.90,
    image: "/burritos/tasty-tofu-burrito.png",
    description: "Plantaardige tofu burrito met vegan lover saus en sesam mix.",
    ingredients: "Huisgemarineerde tofu · Avocado · Edamame · Wortel op Koreaanse wijze · Kerstomaten · Vegan lover saus · Sesam mix",
    tags: ["Vegan", "GF"],
  },
  {
    id: "very-vegan-chicken-burrito",
    name: "Very Vegan Chicken Burrito",
    emoji: "🌿",
    price: 12.90,
    image: "/burritos/very-vegan-chicken-burrito.png",
    description: "Volledig vegan burrito met zoete aardappel en sweet soya.",
    ingredients: "Vegan kip · Avocado · Zoete aardappel · Kerstomaten · Sweet soya · Chili flakes",
    tags: ["Vegan", "GF"],
  },
  {
    id: "vegan-garlic-chicken-burrito",
    name: "Vegan Garlic Chicken Burrito",
    emoji: "🌱",
    price: 12.90,
    image: "/burritos/vegan-garlic-chicken-burrito.png",
    description: "Vegan knoflook kip met witte kool, augurk en garlic lover vegan.",
    ingredients: "Vegan kip · Gemarineerde witte kool · Paprika · Augurk · Vegan garlic lover · Gefrituurde ui",
    tags: ["Vegan", "GF"],
  },
  {
    id: "garlic-chicken-burrito",
    name: "Garlic Chicken Burrito",
    emoji: "🧄",
    price: 10.90,
    image: "/burritos/garlic-chicken-burrito.png",
    description: "Kipburrito met feta, gemarineerde witte kool en garlic lover saus.",
    ingredients: "Huisgemarineerde kipfilet · Feta · Gemarineerde witte kool · Paprika · Augurk · Garlic lover saus · Gefrituurde ui",
    tags: ["GF"],
  },
  {
    id: "mexican-chicken-burrito",
    name: "Mexican Chicken Burrito",
    emoji: "🌮",
    price: 10.90,
    image: "/burritos/mexican-chicken-burrito.png",
    description: "Mexicaanse kipburrito met guacamole, jalapeños en chili mayo.",
    ingredients: "Huisgemarineerde kipfilet · Huisgemaakte guacamole · Jalapeños · Maïs · Rode bonen · Chili mayo · Chili flakes",
    tags: ["GF"],
  },
  {
    id: "savoury-steak-burrito",
    name: "Savoury Steak Burrito",
    emoji: "🥩",
    price: 12.90,
    image: "/burritos/savoury-steak-burrito.png",
    description: "Huisgemarineerde steak met champignons en cheesy lemon mayo.",
    ingredients: "Fijngesneden huisgemarineerde steak · Huisgemarineerde champignons · Wortel op Koreaanse wijze · Paprika · Cheesy lemon flavour saus · Sesam garlic",
    tags: ["GF"],
  },
];

// ─── Custom Poké Burrito Builder ─────────────────────────────────────────────

export const BURRITO_BASE_PRICE = 10.90;

export const BURRITO_PROTEINS: BuilderOption[] = [
  { id: "b-geen-proteine",        name: "Geen proteine",                          priceExtra: 0 },
  { id: "b-kipfilet",             name: "Huisgemarineerde kipfilet",               priceExtra: 0 },
  { id: "b-steak",                name: "Fijngesneden huisgemarineerde steak",     priceExtra: 2.0 },
  { id: "b-verse-zalm",           name: "Verse zalm",                             priceExtra: 1.0 },
  { id: "b-gemarineerde-zalm",    name: "Verse gemarineerde zalm",                priceExtra: 1.0 },
  { id: "b-gerookte-zalm",        name: "Gerookte zalm",                          priceExtra: 1.0 },
  { id: "b-gebakken-zalm",        name: "Gebakken zalm",                          priceExtra: 1.0 },
  { id: "b-verse-tonijn",         name: "Verse tonijn",                           priceExtra: 2.0 },
  { id: "b-gemarineerde-tonijn",  name: "Verse gemarineerde tonijn",              priceExtra: 2.0 },
  { id: "b-gebakken-tonijn",      name: "Gebakken tonijn",                        priceExtra: 2.0 },
  { id: "b-garnalen",             name: "Garnalen",                               priceExtra: 1.0 },
  { id: "b-tofu",                 name: "Tofu",                                   priceExtra: 0 },
  { id: "b-vegan-kip",            name: "Vegan kip",                              priceExtra: 2.0 },
];

export const BURRITO_MIXINS: BuilderOption[] = [
  { id: "b-avocado",                 name: "Avocado",                                        priceExtra: 0 },
  { id: "b-guacamole",               name: "Huisgemaakte guacamole",                         priceExtra: 0 },
  { id: "b-edamame",                 name: "Edamame",                                        priceExtra: 0 },
  { id: "b-zeewiersalade",           name: "Zeewiersalade",                                  priceExtra: 0 },
  { id: "b-mango",                   name: "Mango",                                          priceExtra: 0 },
  { id: "b-ananas",                  name: "Ananas",                                         priceExtra: 0 },
  { id: "b-augurk",                  name: "Augurk",                                         priceExtra: 0 },
  { id: "b-olijven",                 name: "Olijven",                                        priceExtra: 0 },
  { id: "b-jalapenos",               name: "Jalapeños",                                      priceExtra: 0 },
  { id: "b-mais",                    name: "Maïs",                                           priceExtra: 0 },
  { id: "b-kerstomaten",             name: "Kerstomaten",                                    priceExtra: 0 },
  { id: "b-komkommer",               name: "Komkommer",                                      priceExtra: 0 },
  { id: "b-paprika",                 name: "Paprika",                                        priceExtra: 0 },
  { id: "b-courgette",               name: "Huisgemarineerde courgette",                     priceExtra: 0 },
  { id: "b-wortel",                  name: "Wortel",                                         priceExtra: 0 },
  { id: "b-wortel-koreaans",         name: "Huisgemarineerde wortel op koreaanse wijze",     priceExtra: 0 },
  { id: "b-witte-kool",              name: "Huisgemarineerde witte kool",                    priceExtra: 0 },
  { id: "b-rode-kool",               name: "Huisgemarineerde rode kool",                     priceExtra: 0 },
  { id: "b-rode-ui",                 name: "Rode ui",                                        priceExtra: 0 },
  { id: "b-zoete-ui",                name: "Gemarineerde zoete ui",                          priceExtra: 0 },
  { id: "b-zilveruitjes",            name: "Zilveruitjes",                                   priceExtra: 0 },
  { id: "b-tauge",                   name: "Tauge",                                          priceExtra: 0 },
  { id: "b-feta",                    name: "Feta",                                           priceExtra: 0 },
  { id: "b-vegan-feta",              name: "Vegan feta",                                     priceExtra: 0.5 },
  { id: "b-cream-cheese",            name: "Cream cheese",                                   priceExtra: 0.5 },
  { id: "b-mozzarella",              name: "Mozzarella balletjes",                           priceExtra: 0.5 },
  { id: "b-rode-bonen",              name: "Rode bonen",                                     priceExtra: 0 },
  { id: "b-rode-biet",               name: "Rode biet",                                      priceExtra: 0 },
  { id: "b-japanse-radijs",          name: "Japanse radijs",                                 priceExtra: 0 },
  { id: "b-zoete-aardappel",         name: "Zoete aardappel",                                priceExtra: 0 },
  { id: "b-kikkererwten",            name: "Kikkererwten",                                   priceExtra: 0 },
  { id: "b-hummus",                  name: "Huisgemaakte hummus",                            priceExtra: 0 },
  { id: "b-champignons",             name: "Huisgemarineerde champignons",                   priceExtra: 0 },
  { id: "b-mediterrane-groenten",    name: "Huisgestoofde mediterrane groentenmix",          priceExtra: 0 },
  { id: "b-broccoli",                name: "Broccoli",                                       priceExtra: 0 },
  { id: "b-surimi",                  name: "Surimi",                                         priceExtra: 0 },
];

export const BURRITO_EXTRA_MIXIN_PRICE = 0.5;
export const BURRITO_EXTRA_TOPPING_PRICE = 0.3;

export const BURRITO_EXTRA_MIXINS: BuilderOption[] = withFlatPrice(
  BURRITO_MIXINS,
  BURRITO_EXTRA_MIXIN_PRICE,
  "b-extra",
);

export const BURRITO_EXTRA_TOPPINGS: BuilderOption[] = withFlatPrice(
  BUILDER_TOPPINGS.filter((t) => t.id !== "geen-toppings"),
  BURRITO_EXTRA_TOPPING_PRICE,
  "b-extra",
);

// ─── Builder helpers ─────────────────────────────────────────────────────────

/**
 * Derive an "extra" variant of a list of builder options by overriding each
 * option's individual surcharge with a single flat fee. Used to generate
 * the "Extra proteïne" / "Extra mix-in" / "Extra topping" lists where the
 * customer pays one flat price for any pick (e.g. €3,00 for any extra
 * protein in the bowl, regardless of which protein).
 *
 * Ids are prefixed so extras don't collide with their base counterparts.
 */
export function withFlatPrice(
  options: BuilderOption[],
  flatPrice: number,
  idPrefix: string,
): BuilderOption[] {
  return options.map((opt) => ({
    ...opt,
    id: `${idPrefix}-${opt.id}`,
    priceExtra: Math.round(flatPrice * 100) / 100,
  }));
}

// ─── Sushi Push Pop (signature rolls) ───────────────────────────────────────

export const SIGNATURE_ROLLS: ReadyMadeItem[] = [
  {
    id: "california-roll-surimi",
    name: "California Roll Surimi",
    emoji: "🍣",
    price: 12.90,
    description: "Klassieke California roll met surimi, avocado en rode masago.",
    ingredients: "Surimi · Komkommer · Avocado · Rode masago",
    tags: ["Popular"],
    image: "/sushi-push-pop/california-surimi.png",
  },
  {
    id: "california-roll-zalm",
    name: "California Roll Zalm",
    emoji: "🍣",
    price: 13.90,
    description: "California roll met verse zalm, komkommer, avocado en rode masago.",
    ingredients: "Verse zalm · Komkommer · Avocado · Rode masago",
    tags: ["Popular", "GF"],
    image: "/sushi-push-pop/california-zalm.png",
  },
  {
    id: "spicy-tuna-roll",
    name: "Spicy Tuna",
    emoji: "🌶️",
    price: 14.90,
    description: "Pittige tonijn met komkommer, avocado en lente ui.",
    ingredients: "Spicy tonijn · Komkommer · Avocado · Lente ui",
    tags: ["GF"],
    image: "/sushi-push-pop/spicy-tuna.png",
  },
  {
    id: "california-roll-vegan",
    name: "California Roll Vegan",
    emoji: "🌱",
    price: 12.90,
    description: "Plantaardige California roll met tofu, komkommer, avocado en sesam mix.",
    ingredients: "Tofu · Komkommer · Avocado · Sesam mix",
    tags: ["Vegan"],
    image: "/sushi-push-pop/california-vegan.png",
  },
  {
    id: "philadelphia-roll",
    name: "Philadelphia Roll (Classic Roll)",
    emoji: "🐟",
    price: 13.40,
    description: "Gerookte zalm met komkommer, sla en romige cream cheese.",
    ingredients: "Gerookte zalm · Komkommer · Sla · Cream cheese",
    tags: ["GF"],
    image: "/sushi-push-pop/philadelphia.png",
  },
  {
    id: "teriyaki-chicken-roll",
    name: "Teriyaki Chicken Roll (Inside-Out)",
    emoji: "🍗",
    price: 13.90,
    description: "Gegrilde kipfilet met tamago, avocado en een zoete teriyaki glaze.",
    ingredients: "Kipfilet · Tamago · Komkommer · Avocado · Teriyaki · Sesam bbq",
    tags: [],
    image: "/sushi-push-pop/teriyaki-chicken.png",
  },
  {
    id: "tuna-roll",
    name: "Tuna Roll",
    emoji: "🐟",
    price: 14.90,
    description: "Verse tonijn met Japanse radijs, zeewiersalade en zwarte masago.",
    ingredients: "Verse tonijn · Japanse radijs · Zeewiersalade · Zwarte masago",
    tags: ["GF", "New"],
  },
];

// ─── Custom Classic Roll Builder ─────────────────────────────────────────────

export const CLASSIC_ROLL_BASE_PRICE = 12.40;

export const CLASSIC_ROLL_PROTEINS: BuilderOption[] = [
  { id: "cr-zalm",               name: "Zalm",               priceExtra: 1.0, isGlutenFree: true },
  { id: "cr-gebakken-zalm",      name: "Gebakken zalm",      priceExtra: 1.0, isGlutenFree: true },
  { id: "cr-gerookte-zalm",      name: "Gerookte zalm",      priceExtra: 1.0, isGlutenFree: true },
  { id: "cr-spicy-zalm",         name: "Spicy zalm",         priceExtra: 1.0, isGlutenFree: true },
  { id: "cr-tonijn",              name: "Tonijn",             priceExtra: 2.0, isGlutenFree: true },
  { id: "cr-spicy-tonijn",       name: "Spicy tonijn",       priceExtra: 2.0, isGlutenFree: true },
  { id: "cr-kipfilet",           name: "Kipfilet",           priceExtra: 0 },
  { id: "cr-surimi",             name: "Surimi",             priceExtra: 0 },
  { id: "cr-surimi-gemarineerd", name: "Surimi gemarineerd", priceExtra: 0 },
  { id: "cr-tofu",               name: "Tofu (gebakken)",    priceExtra: 0, isVegan: true },
  { id: "cr-tamago",             name: "Tamago (omelet)",    priceExtra: 0 },
];

export const CLASSIC_ROLL_MIXINS: BuilderOption[] = [
  { id: "cr-komkommer",      name: "Komkommer",      priceExtra: 0, isVegan: true, isGlutenFree: true },
  { id: "cr-avocado",        name: "Avocado",        priceExtra: 0, isVegan: true, isGlutenFree: true },
  { id: "cr-zeewiersalade",  name: "Zeewiersalade",  priceExtra: 0, isVegan: true, isGlutenFree: true },
  { id: "cr-wortel",         name: "Wortel",         priceExtra: 0, isVegan: true, isGlutenFree: true },
  { id: "cr-mango",          name: "Mango",          priceExtra: 0, isVegan: true, isGlutenFree: true },
  { id: "cr-ananas",         name: "Ananas",         priceExtra: 0, isVegan: true, isGlutenFree: true },
  { id: "cr-japanse-radijs", name: "Japanse radijs", priceExtra: 0, isVegan: true, isGlutenFree: true },
  { id: "cr-paprika",        name: "Paprika",        priceExtra: 0, isVegan: true, isGlutenFree: true },
  { id: "cr-sla",            name: "Sla",            priceExtra: 0, isVegan: true, isGlutenFree: true },
  { id: "cr-feta",           name: "Feta",           priceExtra: 0, isGlutenFree: true },
  { id: "cr-lente-ui",       name: "Lente ui",       priceExtra: 0, isVegan: true, isGlutenFree: true },
];

export const CLASSIC_ROLL_SAUCES: BuilderOption[] = [
  { id: "cr-geen-saus",      name: "Geen saus",      priceExtra: 0 },
  { id: "cr-cream-cheese",   name: "Cream cheese",   priceExtra: 0 },
  { id: "cr-unagi",          name: "Unagi",          priceExtra: 0 },
  { id: "cr-spicy-sriracha", name: "Spicy sriracha", priceExtra: 0, isVegan: true },
  { id: "cr-sriracha-mayo",  name: "Sriracha mayo",  priceExtra: 0 },
  { id: "cr-spicy-wasabi",   name: "Spicy wasabi",   priceExtra: 0, isVegan: true },
  { id: "cr-wasabi-mayo",    name: "Wasabi mayo",    priceExtra: 0 },
  { id: "cr-teriyaki",       name: "Teriyaki",       priceExtra: 0, isVegan: true },
  { id: "cr-sweet-soya",     name: "Sweet soya",     priceExtra: 0, isVegan: true },
  { id: "cr-goma-dressing",  name: "Goma dressing",  priceExtra: 0, isVegan: true },
];

// ─── Custom Inside-Out Roll Builder ──────────────────────────────────────────
//
// Proteïne / mix-in / saus lists are identical to the classic roll, so we
// re-export them under IOR_* aliases for readability and future divergence
// without adding dead data. Only the base price and the topping list differ.

export const INSIDE_OUT_ROLL_BASE_PRICE = 12.90;

export const INSIDE_OUT_ROLL_PROTEINS = CLASSIC_ROLL_PROTEINS;
export const INSIDE_OUT_ROLL_MIXINS = CLASSIC_ROLL_MIXINS;
export const INSIDE_OUT_ROLL_SAUCES = CLASSIC_ROLL_SAUCES;

export const INSIDE_OUT_ROLL_TOPPINGS: BuilderOption[] = [
  { id: "ior-geen-topping",   name: "Geen topping",        priceExtra: 0 },
  { id: "ior-masago-groen",   name: "Masago groen (wasabi)", priceExtra: 0 },
  { id: "ior-masago-oranje",  name: "Masago oranje",       priceExtra: 0 },
  { id: "ior-masago-rood",    name: "Masago rood",         priceExtra: 0 },
  { id: "ior-masago-zwart",   name: "Masago zwart",        priceExtra: 0 },
  { id: "ior-furikake",       name: "Furikake",            priceExtra: 0, isVegan: true, isGlutenFree: true },
  { id: "ior-sesam-mix",      name: "Sesam mix",           priceExtra: 0, isVegan: true, isGlutenFree: true },
  { id: "ior-sesam-garlic",   name: "Sesam garlic",        priceExtra: 0, isVegan: true, isGlutenFree: true },
  { id: "ior-sesam-soy",      name: "Sesam soy",           priceExtra: 0, isVegan: true },
  { id: "ior-sesam-wasabi",   name: "Sesam wasabi",        priceExtra: 0, isVegan: true, isGlutenFree: true },
  { id: "ior-sesam-bbq",      name: "Sesam bbq",           priceExtra: 0, isVegan: true, isGlutenFree: true },
];

// ─── Smoothies suggesties ─────────────────────────────────────────────────────

export const SMOOTHIES: ReadyMadeItem[] = [
  {
    id: "hawaiian-smoothie",
    name: "Hawaiian Smoothie",
    emoji: "🍹",
    price: 5.90,
    image: "/smoothies/hawaiian-smoothie.png",
    description: "Tropische blend vol zonnige smaken.",
    ingredients: "Vers sinaasappelsap · Mango · Ananas · Banaan",
    tags: [],
  },
  {
    id: "smoothie-pink-panther",
    name: "Smoothie Pink Panther",
    emoji: "🍓",
    price: 5.90,
    image: "/smoothies/smoothie-pink-panther.png",
    description: "Fruitig en fris met een roze twist.",
    ingredients: "Vers appelsap · Framboos · Mango · Banaan",
    tags: [],
  },
  {
    id: "smoothie-green-magic",
    name: "Smoothie Green Magic",
    emoji: "🥑",
    price: 5.90,
    image: "/smoothies/smoothie-green-magic.png",
    description: "Verfrissende groene kracht-smoothie.",
    ingredients: "Vers sinaasappelsap · Mango · Avocado · Spinazie",
    tags: ["Vegan"],
  },
  {
    id: "smoothie-power-up",
    name: "Smoothie Power Up",
    emoji: "🍊",
    price: 5.90,
    description: "Bomvol vitamine C en natuurlijke energie.",
    ingredients: "Vers sinaasappelsap · Ananas · Kiwi · Aardbei",
    tags: [],
  },
  {
    id: "smoothie-breakfast-boost",
    name: "Smoothie Breakfast Boost",
    emoji: "🫐",
    price: 5.90,
    image: "/smoothies/smoothie-breakfast-boost.png",
    description: "Voedzame yoghurt-smoothie voor een vliegende start.",
    ingredients: "Yoghurt · Banaan · Framboos · Chiazaad",
    tags: [],
  },
  {
    id: "smoothie-morning-glory",
    name: "Smoothie Morning Glory",
    emoji: "🌅",
    price: 5.90,
    image: "/smoothies/smoothie-morning-glory.png",
    description: "Romige sojamelk-basis met langdurige energie.",
    ingredients: "Sojamelk · Banaan · Mango · Havermout",
    tags: [],
  },
  {
    id: "smoothie-happy-feeling",
    name: "Smoothie Happy Feeling",
    emoji: "😊",
    price: 5.90,
    image: "/smoothies/smoothie-happy-feeling.png",
    description: "Yoghurt, kiwi en aardbei voor een gelukkig gevoel.",
    ingredients: "Yoghurt · Kiwi · Aardbei · Mix van noten · Honing",
    tags: [],
  },
  {
    id: "smoothie-proteine-fuel",
    name: "Smoothie Proteine Fuel",
    emoji: "💪",
    price: 7.40,
    description: "Eiwitrijke shake met volle melk en salted caramel whey.",
    ingredients: "Volle melk · Banaan · Pindakaas · Havermout · Salted caramel whey",
    tags: [],
  },
];

// ─── Custom Smoothie Builder ──────────────────────────────────────────────────

export const SMOOTHIE_BASE_PRICE = 5.90;

export const SMOOTHIE_BASES: BuilderOption[] = [
  { id: "sb-sinaasappelsap", name: "Vers sinaasappelsap", priceExtra: 0 },
  { id: "sb-appelsap",       name: "Vers appelsap",       priceExtra: 0 },
  { id: "sb-melk",           name: "Melk",                priceExtra: 0 },
  { id: "sb-sojamelk",       name: "Sojamelk",            priceExtra: 0.5, isVegan: true },
  { id: "sb-yoghurt",        name: "Yoghurt",             priceExtra: 0 },
];

export const SMOOTHIE_MIXINS: BuilderOption[] = [
  { id: "sm-avocado",       name: "Avocado",       priceExtra: 0 },
  { id: "sm-mango",         name: "Mango",         priceExtra: 0 },
  { id: "sm-banaan",        name: "Banaan",        priceExtra: 0 },
  { id: "sm-framboos",      name: "Framboos",      priceExtra: 0 },
  { id: "sm-ananas",        name: "Ananas",        priceExtra: 0 },
  { id: "sm-aardbei",       name: "Aardbei",       priceExtra: 0 },
  { id: "sm-kiwi",          name: "Kiwi",          priceExtra: 0 },
  { id: "sm-spinazie",      name: "Spinazie",      priceExtra: 0 },
  { id: "sm-blauwe-bessen", name: "Blauwe bessen", priceExtra: 0 },
  { id: "sm-chiazaad",      name: "Chiazaad",      priceExtra: 0 },
  { id: "sm-havermout",     name: "Havermout",     priceExtra: 0 },
  { id: "sm-mix-noten",     name: "Mix van noten", priceExtra: 0 },
  { id: "sm-pindakaas",     name: "Pindakaas",     priceExtra: 0 },
  { id: "sm-honing",        name: "Honing",        priceExtra: 0 },
  { id: "sm-agavesiroop",   name: "Agavesiroop",   priceExtra: 0 },
];

export const SMOOTHIE_EXTRA_MIXINS: BuilderOption[] = [
  { id: "se-avocado", name: "Avocado", priceExtra: 1.5 },
  { id: "se-mango",   name: "Mango",   priceExtra: 1.5 },
  { id: "se-banaan",  name: "Banaan",  priceExtra: 1.5 },
];

export const SMOOTHIE_PROTEIN_SCOOPS: BuilderOption[] = [
  { id: "sp-chocolade",     name: "Chocolade",       priceExtra: 1.0 },
  { id: "sp-cookies-cream", name: "Cookies & Cream", priceExtra: 1.0 },
  { id: "sp-vanille",       name: "Vanille",          priceExtra: 1.0 },
];

// ─── Smoothie Bowls ───────────────────────────────────────────────────────────

export const SMOOTHIE_BOWLS: ReadyMadeItem[] = [
  {
    id: "acai-smoothie-bowl",
    name: "Açaí Smoothie Bowl",
    emoji: "🫐",
    price: 12.90,
    description: "Rijke açaí-basis met vers fruit en krokante toppings.",
    ingredients: "Açaí · Banaan · Mango · Mix van rood fruit · Kokos · Mix van noten · Chiazaad · Havermout · Agave siroop",
    tags: ["Vegan"],
  },
  {
    id: "dragon-fruit-smoothie-bowl",
    name: "Dragon Fruit Smoothie Bowl",
    emoji: "🐉",
    price: 12.90,
    description: "Levendige dragon fruit-basis met vers fruit en krokante toppings.",
    ingredients: "Dragon fruit · Banaan · Mango · Aardbei · Framboos · Kokos · Mix van noten · Chiazaad · Havermout · Agave siroop",
    tags: ["Vegan"],
  },
  {
    id: "passion-fruit-smoothie-bowl",
    name: "Passion Fruit Smoothie Bowl",
    emoji: "🥭",
    price: 12.90,
    description: "Tropische passievrucht-basis met vers fruit en krokante toppings.",
    ingredients: "Passievrucht · Banaan · Mango · Ananas · Kokos · Mix van noten · Chiazaad · Havermout · Agave siroop",
    tags: ["Vegan"],
  },
];

// ─── Extra's ──────────────────────────────────────────────────────────────────

export const EXTRAS: ReadyMadeItem[] = [
  {
    id: "nachos-supreme",
    name: "Nacho's Supreme",
    emoji: "🌮",
    price: 7.50,
    description: "Knapperige nacho's met guacamole, cream cheese, jalapeños, rode ui en chili flakes.",
    ingredients: "Nacho's · Huisgemaakte guacamole · Cream cheese · Jalapeños · Rode ui · Chili flakes",
    tags: [],
  },
  {
    id: "bakje-zeewiersalade",
    name: "Bakje zeewiersalade",
    emoji: "🌿",
    price: 5.00,
    description: "",
    ingredients: "",
    tags: ["Vegan", "GF"],
  },
  {
    id: "bakje-witte-rijst",
    name: "Bakje witte sushi rijst",
    emoji: "🍚",
    price: 3.00,
    description: "",
    ingredients: "",
    tags: ["Vegan", "GF"],
  },
  {
    id: "bakje-bruine-rijst",
    name: "Bakje bruine rijst",
    emoji: "🌾",
    price: 3.00,
    description: "",
    ingredients: "",
    tags: ["Vegan", "GF"],
  },
  {
    id: "bakje-nachos",
    name: "Bakje nacho's",
    emoji: "🌮",
    price: 2.50,
    description: "",
    ingredients: "",
    tags: ["Vegan"],
  },
  {
    id: "bakje-quinoa",
    name: "Bakje quinoa",
    emoji: "🌾",
    price: 4.00,
    description: "",
    ingredients: "",
    tags: ["Vegan", "GF"],
  },
  {
    id: "bakje-couscous",
    name: "Bakje couscous",
    emoji: "🍲",
    price: 3.00,
    description: "",
    ingredients: "",
    tags: ["Vegan"],
  },
  {
    id: "bakje-feta",
    name: "Bakje feta",
    emoji: "🧀",
    price: 4.50,
    description: "",
    ingredients: "",
    tags: ["GF"],
  },
];

// ─── Desserten ────────────────────────────────────────────────────────────────

export const DESSERTEN: ReadyMadeItem[] = [
  { id: "apple-pie",                     name: "Apple Pie",                                emoji: "🥧", price: 4.90, description: "", ingredients: "", tags: [] },
  { id: "red-velvet-cake",               name: "Red Velvet Cake",                          emoji: "❤️", price: 4.90, image: "/desserts/red-velvet-cake.png", description: "", ingredients: "", tags: [] },
  { id: "classic-cheesecake",            name: "Classic Cheesecake",                       emoji: "🧀", price: 4.90, description: "", ingredients: "", tags: [] },
  { id: "carrot-cake",                   name: "Carrot Cake",                              emoji: "🥕", price: 4.90, description: "", ingredients: "", tags: [] },
  { id: "raspberry-cheesecake",          name: "Raspberry Cheesecake",                     emoji: "🍓", price: 4.90, image: "/desserts/raspberry-cheesecake.png", description: "", ingredients: "", tags: [] },
  { id: "chocolate-cake",                name: "Chocolate Cake",                           emoji: "🍫", price: 4.90, image: "/desserts/chocolate-cake.png", description: "", ingredients: "", tags: [] },
  { id: "salted-caramel-cheesecake",     name: "Salted Caramel Cheesecake",                emoji: "🧁", price: 4.90, description: "", ingredients: "", tags: [] },
  { id: "pecan-pie",                     name: "Pecan Pie",                                emoji: "🥧", price: 4.90, image: "/desserts/pecan-pie.png", description: "", ingredients: "", tags: [] },
  { id: "lemon-cheesecake",              name: "Lemon Cheesecake",                         emoji: "🍋", price: 4.90, image: "/desserts/lemon-cheesecake.png", description: "", ingredients: "", tags: [] },
  { id: "dubai-cheesecake",              name: "Dubai Cheesecake",                         emoji: "🌰", price: 5.40, image: "/desserts/dubai-cheesecake.png", description: "", ingredients: "", tags: [] },
  { id: "vegan-apple-pie",               name: "Vegan Apple Pie",                          emoji: "🥧", price: 4.90, description: "", ingredients: "", tags: ["Vegan"] },
  { id: "vegan-banana-cake",             name: "Vegan Banana Cake",                        emoji: "🍌", price: 4.90, image: "/desserts/vegan-banana-cake.png", description: "", ingredients: "", tags: ["Vegan"] },
  { id: "tiramisu-choc-karamel",         name: "Tiramisu Chocolate & Caramel",             emoji: "🤎", price: 4.90, description: "", ingredients: "", tags: [] },
  { id: "tiramisu-bueno",                name: "Tiramisu Bueno",                           emoji: "🍬", price: 4.90, description: "", ingredients: "", tags: [] },
  { id: "tiramisu-raffaello",            name: "Tiramisu Raffaello",                       emoji: "🍥", price: 4.90, description: "", ingredients: "", tags: [] },
  { id: "tiramisu-speculoos-karamel",    name: "Tiramisu Speculoos & Caramel",             emoji: "🍮", price: 4.90, description: "", ingredients: "", tags: [] },
  { id: "tiramisu-cookies-cream",        name: "Tiramisu Cookies & Cream",                 emoji: "🍪", price: 4.90, description: "", ingredients: "", tags: [] },
  { id: "tiramisu-speculoos-choc-hazel", name: "Tiramisu Speculoos & Hazelnut Chocolate",  emoji: "☕", price: 4.90, description: "", ingredients: "", tags: [] },
];

// ─── Dranken ──────────────────────────────────────────────────────────────────

export const DRANKEN: ReadyMadeItem[] = [
  { id: "spa-plat",               name: "Spa plat",                        emoji: "💧", price: 2.20, image: "/drinks/spa-plat.png", description: "", ingredients: "", tags: [] },
  { id: "spa-bruis",              name: "Spa bruis",                       emoji: "💦", price: 2.20, image: "/drinks/spa-bruis.png", description: "", ingredients: "", tags: [] },
  { id: "coca-cola",              name: "Coca-Cola 33cl",                  emoji: "🥤", price: 2.50, image: "/drinks/coca-cola.png", description: "", ingredients: "", tags: [] },
  { id: "coca-cola-zero",         name: "Coca-Cola Zero 33cl",             emoji: "🥤", price: 2.50, image: "/drinks/coca-cola-zero.png", description: "", ingredients: "", tags: [] },
  { id: "fanta-orange",           name: "Fanta Orange 33cl",               emoji: "🍊", price: 2.50, image: "/drinks/fanta-orange.png", description: "", ingredients: "", tags: [] },
  { id: "fanta-lemon",            name: "Fanta Lemon",                     emoji: "🍋", price: 2.50, image: "/drinks/fanta-lemon.png", description: "", ingredients: "", tags: [] },
  { id: "fanta-exotic",           name: "Fanta Exotic",                    emoji: "🍹", price: 2.50, image: "/drinks/fanta-exotic.png", description: "", ingredients: "", tags: [] },
  { id: "lipton-original",        name: "Lipton Ice Tea Original",         emoji: "🧊", price: 2.50, image: "/drinks/lipton-original.png", description: "", ingredients: "", tags: [] },
  { id: "lipton-peach",           name: "Lipton Ice Tea Peach",            emoji: "🍑", price: 2.50, image: "/drinks/lipton-peach.png", description: "", ingredients: "", tags: [] },
  { id: "lipton-green",           name: "Lipton Ice Tea Green",            emoji: "🍃", price: 2.50, image: "/drinks/lipton-green.png", description: "", ingredients: "", tags: [] },
  { id: "red-bull",               name: "Red Bull",                        emoji: "⚡", price: 3.50, image: "/drinks/red-bull.png", description: "", ingredients: "", tags: [] },
  { id: "red-bull-sugar-free",    name: "Red Bull Sugar Free",             emoji: "⚡", price: 3.50, image: "/drinks/red-bull-sugar-free.png", description: "", ingredients: "", tags: [] },
  { id: "mangajo-goji",           name: "Mangajo Goji Berry & Green Tea",  emoji: "🍵", price: 4.00, image: "/drinks/mangajo-goji.png", description: "", ingredients: "", tags: [], info: "Geen toegevoegde suikers." },
  { id: "mangajo-acai",           name: "Mangajo Açaí Berry & Green Tea",  emoji: "🍵", price: 4.00, image: "/drinks/mangajo-acai.png", description: "", ingredients: "", tags: [], info: "Geen toegevoegde suikers." },
  { id: "mangajo-pomegranate",    name: "Mangajo Pomegranate & Green Tea", emoji: "🍵", price: 4.00, image: "/drinks/mangajo-pomegranate.png", description: "", ingredients: "", tags: [], info: "Geen toegevoegde suikers." },
  { id: "mangajo-lemon",          name: "Mangajo Lemon & Green Tea",       emoji: "🍵", price: 4.00, image: "/drinks/mangajo-lemon.png", description: "", ingredients: "", tags: [], info: "Geen toegevoegde suikers." },
  { id: "mangajo-red-grape",      name: "Mangajo Red Grape & Rooibos",     emoji: "🍵", price: 4.00, image: "/drinks/mangajo-red-grape.png", description: "", ingredients: "", tags: [], info: "Geen toegevoegde suikers." },
  { id: "mocktail-mojito",        name: "Mocktail Mojito",                 emoji: "🌿", price: 4.50, image: "/drinks/mocktail-mojito.png", description: "", ingredients: "", tags: [] },
  { id: "mocktail-passion",       name: "Mocktail Passion Fruit Martini",  emoji: "🍸", price: 4.50, image: "/drinks/mocktail-passion.png", description: "", ingredients: "", tags: [] },
  { id: "mocktail-ginger-mule",   name: "Mocktail Ginger Mule",            emoji: "🫚", price: 4.50, image: "/drinks/mocktail-ginger-mule.png", description: "", ingredients: "", tags: [] },
  { id: "grannys-secret",         name: "Granny's Secret",                 emoji: "🍷", price: 3.00, description: "Huisgemaakte drank van rood fruit.", ingredients: "", tags: [] },
];

// ─── Lookup helpers ───────────────────────────────────────────────────────────

/**
 * All ready-made / fixed-recipe items in one flat list. Builders are excluded
 * since their composition lives on the cart-item itself.
 */
const ALL_READY_MADE_ITEMS: ReadyMadeItem[] = [
  ...READY_MADE,
  ...BURRITOS,
  ...SIGNATURE_ROLLS,
  ...SMOOTHIES,
  ...SMOOTHIE_BOWLS,
  ...EXTRAS,
  ...DESSERTEN,
  ...DRANKEN,
];

let _readyMadeIndex: Map<string, ReadyMadeItem> | null = null;

/**
 * O(1) lookup of a ready-made menu item by id (used by the kitchen receipt
 * + admin order card to print ingredient lists for fixed-recipe positions).
 *
 * Lazy: builds the index on first call so module load stays cheap.
 */
export function findReadyMadeById(id: string | undefined | null): ReadyMadeItem | null {
  if (!id) return null;
  if (!_readyMadeIndex) {
    _readyMadeIndex = new Map();
    for (const item of ALL_READY_MADE_ITEMS) {
      _readyMadeIndex.set(item.id, item);
    }
  }
  return _readyMadeIndex.get(id) ?? null;
}
