import { getStripe } from "@/lib/stripe/server";
import { isStripeConfigured } from "@/lib/stripe/config";
import { validateScheduledFulfillment } from "@/lib/deliveryConfig";
import type { Order } from "@/lib/types";

export type OrderSubmissionCheck =
  | { ok: true }
  | { ok: false; reason: string };

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
