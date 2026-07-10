export interface ZipCodeConfig {
  area: string;
  minOrder: number;
  deliveryFee: number;
}

export interface BowlComponent {
  id: string;
  name: string;
  price: number;
  emoji: string;
  description?: string;
  calories?: number;
  isVegan?: boolean;
  isGlutenFree?: boolean;
}

export type BowlStep = "base" | "protein" | "toppings" | "sauce";

export interface CustomBowlSelections {
  base: BowlComponent | null;
  protein: BowlComponent | null;
  toppings: BowlComponent[];
  sauce: BowlComponent | null;
}

export interface SizeOption {
  id: string;
  label: string;
  priceExtra: number;
}

export interface BaseOption {
  id: string;
  name: string;
  priceExtra: number;
}

export interface ReadyMadeItem {
  id: string;
  name: string;
  description: string;
  price: number;
  calories?: number;
  ingredients: string;
  tags: string[];
  emoji: string;
  /** Optional hero image served from /public. Falls back to emoji + gradient when absent. */
  image?: string;
  info?: string;
  unavailable?: boolean;
  /**
   * When true, this bowl has a fixed base baked into the recipe (e.g. a salad),
   * so the customer only picks a size — no base picker is shown and no base is
   * attached to the cart item.
   */
  fixedBase?: boolean;
}

export interface BuilderOption {
  id: string;
  name: string;
  priceExtra: number;
  isVegan?: boolean;
  isGlutenFree?: boolean;
}

export interface BowlSize {
  id: "medium" | "large";
  label: string;
  basePrice: number;
}

export interface PokeBuilderSelections {
  size: BowlSize;
  basis: BuilderOption | null;
  saus1: BuilderOption | null;
  saus2: BuilderOption | null;
  mixin1: BuilderOption | null;
  mixin2: BuilderOption | null;
  mixin3: BuilderOption | null;
  mixin4: BuilderOption | null;
  mixin5: BuilderOption | null;
  extraMixin: BuilderOption | null;
  protein: BuilderOption | null;
  extraProtein: BuilderOption | null;
  topping1: BuilderOption | null;
  topping2: BuilderOption | null;
  topping3: BuilderOption | null;
  extraTopping: BuilderOption | null;
}

export interface BurritoBuilderSelections {
  protein: BuilderOption | null;
  saus: BuilderOption | null;
  mixin1: BuilderOption | null;
  mixin2: BuilderOption | null;
  mixin3: BuilderOption | null;
  extraMixin: BuilderOption | null;
  topping1: BuilderOption | null;
  topping2: BuilderOption | null;
  extraTopping: BuilderOption | null;
}

export interface SmoothieBuilderSelections {
  basis: BuilderOption | null;
  mixin1: BuilderOption | null;
  mixin2: BuilderOption | null;
  mixin3: BuilderOption | null;
  extraMixin: BuilderOption | null;
  proteinScoop: BuilderOption | null;
}

export interface ClassicRollBuilderSelections {
  protein: BuilderOption | null;
  mixin1: BuilderOption | null;
  mixin2: BuilderOption | null;
  sauce: BuilderOption | null;
}

export interface InsideOutRollBuilderSelections {
  protein: BuilderOption | null;
  mixin1: BuilderOption | null;
  mixin2: BuilderOption | null;
  sauce: BuilderOption | null;
  topping: BuilderOption | null;
}

export interface CartItem {
  cartId: string;
  type:
    | "custom"
    | "poke-builder"
    | "ready-made"
    | "burrito"
    | "burrito-builder"
    | "smoothie"
    | "smoothie-builder"
    | "classic-roll-builder"
    | "inside-out-roll-builder"
    | "item";
  name: string;
  price: number;
  quantity: number;
  note: string;
  components?: CustomBowlSelections;
  menuItemId?: string;
  selectedSize?: SizeOption;
  selectedBase?: BaseOption;
  pokeSelections?: PokeBuilderSelections;
  burritoSelections?: BurritoBuilderSelections;
  smoothieSelections?: SmoothieBuilderSelections;
  classicRollSelections?: ClassicRollBuilderSelections;
  insideOutRollSelections?: InsideOutRollBuilderSelections;
}

export interface CustomerInfo {
  name: string;
  phone: string;
  address: string;
  zipCode: string;
}

export type OrderStatus = "pending" | "paid" | "preparing" | "ready" | "delivered";

export type PaymentMethod = "online" | "cash";

/** Delivery = courier drops off at address. Takeaway = customer picks up. */
export type OrderType = "delivery" | "takeaway";

/**
 * When should the order be ready?
 *  - `asap`: kitchen prepares immediately (default).
 *  - `scheduled`: customer picked a later time-slot. `scheduledFor` is an ISO datetime.
 */
export type FulfillmentTime =
  | { mode: "asap" }
  | { mode: "scheduled"; scheduledFor: string };

/** Result of POST to Lightspeed / POS (kitchen) — shown on order + admin. */
export interface OrderLightspeedMeta {
  state: "success" | "failed" | "skipped";
  pushedAt: string;
  /** POS / Lightspeed sale or ticket id (when success). */
  saleId?: string;
  accountIdentifier?: string;
  errorMessage?: string;
  httpStatus?: number;
  dryRun?: boolean;
}

export interface Order {
  id: string;
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  customerInfo: CustomerInfo;
  generalNote: string;
  paymentMethod: PaymentMethod;
  /** Set when paid via Stripe Payment Intent. */
  stripePaymentIntentId?: string;
  cashDenomination?: number;
  orderType: OrderType;
  fulfillmentTime: FulfillmentTime;
  status: OrderStatus;
  createdAt: string;
  /** When set, the web order was pushed to the POS (or skip/fail recorded). */
  lightspeed?: OrderLightspeedMeta;
  /**
   * True when this is the first completed order for this phone number
   * in the device’s order history (see `isNewCustomerByPhone`).
   */
  isFirstTimeCustomer?: boolean;
  /**
   * Server bookkeeping: monotonically increasing per-order version, set when
   * an order is upserted or PATCHed via /api/orders. Local-only orders
   * (no Redis) leave this undefined.
   */
  version?: number;
  /** ISO time of the most recent server-side update to this order. */
  updatedAt?: string;
  /** Marker that the order has been auto-printed on the kitchen terminal. */
  kitchenPrinted?: boolean;
  /**
   * Preparation time in minutes chosen by the kitchen when the order is
   * accepted (max 60). Drives the expected ready/delivery time.
   */
  prepMinutes?: number;
  /**
   * ISO time the kitchen expects the order to be ready (takeaway) or delivered
   * (delivery). Set when the kitchen accepts the order and picks a prep time.
   */
  expectedReadyAt?: string;
}
