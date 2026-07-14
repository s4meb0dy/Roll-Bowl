import { getStripe } from "@/lib/stripe/server";
import { isStripeConfigured } from "@/lib/stripe/config";
import { validateScheduledFulfillment } from "@/lib/deliveryConfig";
import { validateOrderPricing } from "@/lib/orders/priceValidation";
import type { Order } from "@/lib/types";

export type OrderSubmissionCheck =
  | { ok: true }
  | { ok: false; reason: string };

function countDigits(value: string | undefined): number {
  if (!value) return 0;
  return (value.match(/\d/g) ?? []).length;
}

/**
 * Basic sanity on the customer block. Blocks obviously fabricated cash orders
 * (empty name/phone, junk phone) from spamming the kitchen board.
 */
function validateCustomer(order: Order): OrderSubmissionCheck {
  const info = order.customerInfo;
  if (!info || typeof info !== "object") {
    return { ok: false, reason: "missing_customer_info" };
  }
  if (!info.name?.trim() || info.name.trim().length > 120) {
    return { ok: false, reason: "invalid_name" };
  }
  if (countDigits(info.phone) < 6) {
    return { ok: false, reason: "invalid_phone" };
  }
  if (order.orderType === "delivery" && !info.address?.trim()) {
    return { ok: false, reason: "missing_address" };
  }
  return { ok: true };
}

/** Server-side gate for customer POST paths (inbox / POS push). */
export async function validateOrderSubmission(
  order: Order
): Promise<OrderSubmissionCheck> {
  if (order.fulfillmentTime?.mode === "scheduled") {
    const slotCheck = validateScheduledFulfillment(
      order.fulfillmentTime.scheduledFor
    );
    if (!slotCheck.ok) return slotCheck;
  }

  const customerCheck = validateCustomer(order);
  if (!customerCheck.ok) return customerCheck;

  // Untrusted client prices — recompute everything from the menu catalog and
  // reject any order whose amounts don't add up (covers cash + online).
  const pricingCheck = validateOrderPricing(order);
  if (!pricingCheck.ok) {
    return { ok: false, reason: `pricing:${pricingCheck.reason}` };
  }

  if (order.paymentMethod === "online") {
    if (order.status !== "paid") {
      return { ok: false, reason: "online_must_be_paid" };
    }
    if (!order.stripePaymentIntentId?.trim()) {
      return { ok: false, reason: "missing_payment_intent" };
    }
    if (!isStripeConfigured()) {
      return { ok: false, reason: "stripe_not_configured" };
    }

    const stripe = getStripe();
    const pi = await stripe.paymentIntents.retrieve(order.stripePaymentIntentId);
    if (pi.status !== "succeeded") {
      return { ok: false, reason: "payment_not_succeeded" };
    }
    if (pi.metadata?.orderId !== order.id) {
      return { ok: false, reason: "order_id_mismatch" };
    }
    const expectedCents = Math.round(order.total * 100);
    if (pi.amount !== expectedCents) {
      return { ok: false, reason: "amount_mismatch" };
    }
    return { ok: true };
  }

  if (order.paymentMethod === "cash") {
    if (order.status !== "pending") {
      return { ok: false, reason: "cash_must_be_pending" };
    }
    return { ok: true };
  }

  return { ok: false, reason: "invalid_payment_method" };
}
