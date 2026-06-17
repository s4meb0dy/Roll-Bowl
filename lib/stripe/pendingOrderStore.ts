import { getInboxRedis } from "@/lib/orders/inboxRedis";
import { isOrderInboxConfigured } from "@/lib/orders/inboxConfig";
import { computeOrderAmounts, getMinOrderAmount } from "@/lib/stripe/orderTotal";
import type {
  CartItem,
  CustomerInfo,
  FulfillmentTime,
  OrderType,
} from "@/lib/types";

const KEY_PREFIX = "stripe:pending:";
/** Keep pending checkout data long enough for async redirect + webhook retries. */
const PENDING_TTL_S = 86_400;

export interface PendingStripeOrder {
  orderId: string;
  items: CartItem[];
  customerInfo: CustomerInfo;
  generalNote: string;
  orderType: OrderType;
  fulfillmentTime: FulfillmentTime;
  subtotal: number;
  deliveryFee: number;
  total: number;
  amountCents: number;
  paymentIntentId?: string;
  createdAt: string;
}

export interface PendingStripeOrderInput {
  orderId: string;
  items: CartItem[];
  customerInfo: CustomerInfo;
  generalNote?: string;
  orderType: OrderType;
  fulfillmentTime: FulfillmentTime;
  zipCode?: string | null;
  paymentIntentId?: string;
}

function parseFulfillmentTime(raw: unknown): FulfillmentTime | null {
  if (!raw || typeof raw !== "object") return null;
  const x = raw as Record<string, unknown>;
  if (x.mode === "asap") return { mode: "asap" };
  if (
    x.mode === "scheduled" &&
    typeof x.scheduledFor === "string" &&
    x.scheduledFor.trim()
  ) {
    return { mode: "scheduled", scheduledFor: x.scheduledFor.trim() };
  }
  return null;
}

function parseCustomerInfo(
  raw: unknown,
  orderType: OrderType
): CustomerInfo | null {
  if (!raw || typeof raw !== "object") return null;
  const x = raw as Record<string, unknown>;
  const name = typeof x.name === "string" ? x.name.trim() : "";
  const phone = typeof x.phone === "string" ? x.phone.trim() : "";
  const address = typeof x.address === "string" ? x.address.trim() : "";
  const zip = typeof x.zipCode === "string" ? x.zipCode.trim() : "";
  if (!name || !phone) return null;
  if (orderType === "delivery" && !address) return null;
  return { name, phone, address, zipCode: zip };
}

function parseCartItems(raw: unknown): CartItem[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const items: CartItem[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") return null;
    const x = row as Record<string, unknown>;
    if (typeof x.cartId !== "string" || !x.cartId.trim()) return null;
    if (typeof x.name !== "string" || !x.name.trim()) return null;
    if (typeof x.type !== "string") return null;
    if (typeof x.price !== "number" || !Number.isFinite(x.price)) return null;
    if (typeof x.quantity !== "number" || x.quantity < 1) return null;
    items.push(row as CartItem);
  }
  return items;
}

/**
 * Parse and validate a pending Stripe checkout payload from the client.
 */
export function parsePendingStripeOrderInput(
  body: unknown,
  options?: { strict?: boolean }
):
  | { ok: true; input: PendingStripeOrderInput }
  | { ok: false; reason: string } {
  const strict = options?.strict ?? false;
  if (!body || typeof body !== "object") {
    return { ok: false, reason: "not_an_object" };
  }
  const x = body as Record<string, unknown>;
  const orderId = typeof x.orderId === "string" ? x.orderId.trim() : "";
  if (!orderId) return { ok: false, reason: "order_id" };

  const orderType = x.orderType === "takeaway" ? "takeaway" : "delivery";
  const items = parseCartItems(x.items);
  if (!items) return { ok: false, reason: "items" };

  let customerInfo: CustomerInfo | null;
  if (strict) {
    customerInfo = parseCustomerInfo(x.customerInfo, orderType);
    if (!customerInfo) return { ok: false, reason: "customer_info" };
  } else {
    customerInfo = parseCustomerInfo(x.customerInfo, orderType);
    if (!customerInfo) {
      const raw = x.customerInfo;
      const partial =
        raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
      customerInfo = {
        name: typeof partial.name === "string" ? partial.name.trim() : "",
        phone: typeof partial.phone === "string" ? partial.phone.trim() : "",
        address:
          typeof partial.address === "string" ? partial.address.trim() : "",
        zipCode:
          typeof partial.zipCode === "string" ? partial.zipCode.trim() : "",
      };
    }
  }

  let fulfillmentTime = parseFulfillmentTime(x.fulfillmentTime);
  if (!fulfillmentTime) {
    if (strict) return { ok: false, reason: "fulfillment_time" };
    fulfillmentTime = { mode: "asap" };
  }

  const zipCode =
    typeof x.zipCode === "string"
      ? x.zipCode.trim()
      : customerInfo.zipCode || null;

  const generalNote =
    typeof x.generalNote === "string" ? x.generalNote.trim() : "";

  const paymentIntentId =
    typeof x.paymentIntentId === "string" ? x.paymentIntentId.trim() : undefined;

  return {
    ok: true,
    input: {
      orderId,
      items,
      customerInfo,
      generalNote,
      orderType,
      fulfillmentTime,
      zipCode,
      paymentIntentId,
    },
  };
}

export function buildPendingStripeOrder(
  input: PendingStripeOrderInput,
  existing?: PendingStripeOrder | null
): PendingStripeOrder | { error: string; minOrder?: number; subtotal?: number } {
  const { subtotal, deliveryFee, total, amountCents } = computeOrderAmounts(
    input.items,
    input.orderType,
    input.zipCode ?? input.customerInfo.zipCode
  );

  const minOrder = getMinOrderAmount(
    input.orderType,
    input.zipCode ?? input.customerInfo.zipCode
  );
  if (subtotal < minOrder) {
    return { error: "below_minimum_order", minOrder, subtotal };
  }
  if (amountCents < 50) {
    return { error: "amount_too_low" };
  }

  return {
    orderId: input.orderId,
    items: input.items,
    customerInfo: input.customerInfo,
    generalNote: input.generalNote ?? "",
    orderType: input.orderType,
    fulfillmentTime: input.fulfillmentTime,
    subtotal,
    deliveryFee,
    total,
    amountCents,
    paymentIntentId: input.paymentIntentId ?? existing?.paymentIntentId,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  };
}

export async function savePendingStripeOrder(
  pending: PendingStripeOrder
): Promise<boolean> {
  if (!isOrderInboxConfigured()) return false;
  try {
    const redis = getInboxRedis();
    await redis.set(KEY_PREFIX + pending.orderId, pending, { ex: PENDING_TTL_S });
    return true;
  } catch (e) {
    console.error("[stripe/pending] save failed", pending.orderId, e);
    return false;
  }
}

export async function loadPendingStripeOrder(
  orderId: string
): Promise<PendingStripeOrder | null> {
  if (!isOrderInboxConfigured()) return null;
  try {
    const redis = getInboxRedis();
    const raw = await redis.get(KEY_PREFIX + orderId);
    if (!raw || typeof raw !== "object") return null;
    return raw as PendingStripeOrder;
  } catch (e) {
    console.error("[stripe/pending] load failed", orderId, e);
    return null;
  }
}

export async function deletePendingStripeOrder(orderId: string): Promise<void> {
  if (!isOrderInboxConfigured()) return;
  try {
    const redis = getInboxRedis();
    await redis.del(KEY_PREFIX + orderId);
  } catch (e) {
    console.error("[stripe/pending] delete failed", orderId, e);
  }
}
