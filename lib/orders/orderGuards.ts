import type { CustomerInfo, FulfillmentTime, Order, OrderStatus } from "@/lib/types";

const ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "paid",
  "preparing",
  "ready",
  "delivered",
];

function isRecord(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === "object" && !Array.isArray(v);
}

function hasCustomerInfo(v: unknown): v is CustomerInfo {
  if (!isRecord(v)) return false;
  return typeof v.name === "string" && typeof v.phone === "string";
}

function hasFulfillmentTime(v: unknown): v is FulfillmentTime {
  if (!isRecord(v)) return false;
  if (v.mode === "asap") return true;
  return v.mode === "scheduled" && typeof v.scheduledFor === "string";
}

/** Coerce unknown persisted status values to a safe enum member. */
export function coerceOrderStatus(status: unknown): OrderStatus {
  return ORDER_STATUSES.includes(status as OrderStatus)
    ? (status as OrderStatus)
    : "pending";
}

/**
 * Lenient structural check so admin / confirmation UIs do not crash on partial
 * or legacy persisted orders.
 */
export function isRenderableOrder(v: unknown): v is Order {
  if (!isRecord(v)) return false;
  if (typeof v.id !== "string" || !v.id.trim()) return false;
  if (!Array.isArray(v.items)) return false;
  if (typeof v.createdAt !== "string" || !v.createdAt.trim()) return false;
  if (!hasCustomerInfo(v.customerInfo)) return false;
  if (v.fulfillmentTime != null && !hasFulfillmentTime(v.fulfillmentTime)) {
    return false;
  }
  return true;
}

/** Fill missing fields so render paths can use optional chaining sparingly. */
export function normalizeOrderForDisplay(order: Order): Order {
  const total = Number.isFinite(order.total) ? order.total : 0;
  const subtotal = Number.isFinite(order.subtotal) ? order.subtotal : total;
  const deliveryFee = Number.isFinite(order.deliveryFee) ? order.deliveryFee : 0;

  return {
    ...order,
    items: Array.isArray(order.items) ? order.items : [],
    customerInfo: {
      name: order.customerInfo?.name ?? "",
      phone: order.customerInfo?.phone ?? "",
      address: order.customerInfo?.address ?? "",
      zipCode: order.customerInfo?.zipCode ?? "",
    },
    fulfillmentTime: hasFulfillmentTime(order.fulfillmentTime)
      ? order.fulfillmentTime
      : { mode: "asap" },
    orderType: order.orderType === "takeaway" ? "takeaway" : "delivery",
    paymentMethod: order.paymentMethod === "cash" ? "cash" : "online",
    status: coerceOrderStatus(order.status),
    subtotal,
    deliveryFee,
    total,
    generalNote: typeof order.generalNote === "string" ? order.generalNote : "",
    createdAt:
      typeof order.createdAt === "string" && order.createdAt.trim()
        ? order.createdAt
        : new Date().toISOString(),
  };
}

/** Filter + normalize a list for UI consumption. */
export function sanitizeOrdersForDisplay(orders: unknown[]): Order[] {
  const out: Order[] = [];
  for (const o of orders) {
    if (!isRenderableOrder(o)) continue;
    out.push(normalizeOrderForDisplay(o));
  }
  return out;
}
