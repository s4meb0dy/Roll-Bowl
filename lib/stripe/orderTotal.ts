import { ZIP_CODES, TAKEAWAY_DELIVERY_FEE } from "@/lib/deliveryConfig";
import type { CartItem, OrderType } from "@/lib/types";

export interface OrderAmounts {
  subtotal: number;
  deliveryFee: number;
  total: number;
  amountCents: number;
}

export function computeOrderAmounts(
  items: CartItem[],
  orderType: OrderType,
  zipCode: string | null | undefined
): OrderAmounts {
  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const isTakeaway = orderType === "takeaway";
  const deliveryFee = isTakeaway
    ? TAKEAWAY_DELIVERY_FEE
    : zipCode && ZIP_CODES[zipCode]
      ? ZIP_CODES[zipCode].deliveryFee
      : 0;
  const total = subtotal + deliveryFee;
  const amountCents = Math.round(total * 100);
  return { subtotal, deliveryFee, total, amountCents };
}
