import type { Order } from "./types";

/** Digits only — compare phones regardless of spaces/format. */
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

/** Need enough digits to treat phone as a stable id (avoids false “first time” on typos/empty). */
const MIN_PHONE_DIGITS = 6;

/**
 * `true` when this phone has never appeared on a previous order in `orders`
 * (the list should be existing orders only, not including the new one).
 */
export function isNewCustomerByPhone(orders: Order[], phone: string): boolean {
  const key = normalizePhone(phone);
  if (key.length < MIN_PHONE_DIGITS) return false;
  return !orders.some((o) => normalizePhone(o.customerInfo.phone) === key);
}
