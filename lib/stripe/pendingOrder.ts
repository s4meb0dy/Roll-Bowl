import type { CartItem, CustomerInfo, FulfillmentTime, OrderType } from "@/lib/types";

const KEY_PREFIX = "rollenbowl_stripe_pending_";

export interface PendingStripeCheckout {
  orderId: string;
  items: CartItem[];
  customerInfo: CustomerInfo;
  generalNote: string;
  orderType: OrderType;
  fulfillmentTime: FulfillmentTime;
  amountCents: number;
}

export function savePendingStripeCheckout(data: PendingStripeCheckout): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(KEY_PREFIX + data.orderId, JSON.stringify(data));
}

export function loadPendingStripeCheckout(
  orderId: string
): PendingStripeCheckout | null {
  if (typeof sessionStorage === "undefined") return null;
  const raw = sessionStorage.getItem(KEY_PREFIX + orderId);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PendingStripeCheckout;
  } catch {
    return null;
  }
}

export function clearPendingStripeCheckout(orderId: string): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(KEY_PREFIX + orderId);
}
