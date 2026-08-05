import type { CartItem, CustomerInfo, FulfillmentTime, OrderType } from "@/lib/types";

const KEY_PREFIX = "rollenbowl_stripe_pending_";
/** localStorage survives some in-app browsers that wipe sessionStorage on bank redirect. */
const LS_KEY_PREFIX = "rollenbowl_stripe_pending_ls_";

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
  if (typeof window === "undefined") return;
  const json = JSON.stringify(data);
  try {
    sessionStorage.setItem(KEY_PREFIX + data.orderId, json);
  } catch {
    /* ignore */
  }
  try {
    localStorage.setItem(LS_KEY_PREFIX + data.orderId, json);
  } catch {
    /* quota / private mode */
  }
}

export function loadPendingStripeCheckout(
  orderId: string
): PendingStripeCheckout | null {
  if (typeof window === "undefined") return null;
  const raw =
    sessionStorage.getItem(KEY_PREFIX + orderId) ??
    localStorage.getItem(LS_KEY_PREFIX + orderId);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PendingStripeCheckout;
  } catch {
    return null;
  }
}

export function clearPendingStripeCheckout(orderId: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(KEY_PREFIX + orderId);
  } catch {
    /* ignore */
  }
  try {
    localStorage.removeItem(LS_KEY_PREFIX + orderId);
  } catch {
    /* ignore */
  }
}
