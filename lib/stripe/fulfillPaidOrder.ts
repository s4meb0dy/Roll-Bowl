import type Stripe from "stripe";
import { storeNewOrder } from "@/lib/orders/inboxStore";
import { isInboxUnreachableError } from "@/lib/orders/inboxRedis";
import { pushOrderToPosOnce } from "@/lib/orders/pushOrderOnce";
import type { Order } from "@/lib/types";
import {
  deletePendingStripeOrder,
  loadPendingStripeOrder,
} from "@/lib/stripe/pendingOrderStore";

export type FulfillPaidOrderResult =
  | { ok: true; orderId: string; created: boolean; alreadyPaid: boolean }
  | { ok: false; retry: boolean; reason: string; orderId?: string };

function orderFromPending(
  pending: Awaited<ReturnType<typeof loadPendingStripeOrder>>,
  paymentIntentId: string
): Order | null {
  if (!pending) return null;
  return {
    id: pending.orderId,
    items: pending.items,
    subtotal: pending.subtotal,
    deliveryFee: pending.deliveryFee,
    total: pending.total,
    customerInfo: pending.customerInfo,
    generalNote: pending.generalNote,
    paymentMethod: "online",
    stripePaymentIntentId: paymentIntentId,
    orderType: pending.orderType,
    fulfillmentTime: pending.fulfillmentTime,
    status: "paid",
    createdAt: pending.createdAt,
  };
}

/**
 * Webhook (or server verify) path: persist a paid Stripe order to the kitchen
 * inbox from the Redis pending snapshot. Idempotent by order id.
 */
export async function fulfillPaidStripeOrder(
  paymentIntent: Stripe.PaymentIntent
): Promise<FulfillPaidOrderResult> {
  const orderId =
    typeof paymentIntent.metadata?.orderId === "string"
      ? paymentIntent.metadata.orderId.trim()
      : "";
  if (!orderId) {
    return { ok: false, retry: false, reason: "missing_order_id" };
  }

  if (paymentIntent.status !== "succeeded") {
    return { ok: false, retry: false, reason: "payment_not_succeeded", orderId };
  }

  const pending = await loadPendingStripeOrder(orderId);
  if (!pending) {
    console.error("[stripe/fulfill] pending order not found", {
      orderId,
      paymentIntentId: paymentIntent.id,
    });
    return { ok: false, retry: false, reason: "pending_not_found", orderId };
  }

  if (!pending.customerInfo.name.trim() || !pending.customerInfo.phone.trim()) {
    console.error("[stripe/fulfill] pending order missing customer", { orderId });
    return { ok: false, retry: false, reason: "incomplete_customer", orderId };
  }

  if (
    pending.orderType === "delivery" &&
    !pending.customerInfo.address.trim()
  ) {
    console.error("[stripe/fulfill] pending order missing address", { orderId });
    return { ok: false, retry: false, reason: "incomplete_address", orderId };
  }

  if (paymentIntent.amount !== pending.amountCents) {
    console.error("[stripe/fulfill] amount mismatch", {
      orderId,
      expected: pending.amountCents,
      actual: paymentIntent.amount,
    });
    return { ok: false, retry: false, reason: "amount_mismatch", orderId };
  }

  const order = orderFromPending(pending, paymentIntent.id);
  if (!order) {
    return { ok: false, retry: false, reason: "invalid_pending", orderId };
  }

  try {
    const { created, blocked } = await storeNewOrder(order);

    if (blocked) {
      // Removed by the kitchen — drop the snapshot so webhook retries stop
      // instead of re-creating the order behind their back.
      await deletePendingStripeOrder(orderId);
      console.warn("[stripe/fulfill] order was removed, not re-created", {
        orderId,
      });
      return { ok: true, orderId, created: false, alreadyPaid: true };
    }

    if (created) {
      try {
        await pushOrderToPosOnce(order);
      } catch (e) {
        console.error("[stripe/fulfill] POS push failed", order.id, e);
      }
    }

    await deletePendingStripeOrder(orderId);

    console.info("[stripe/fulfill] order stored", {
      orderId,
      created,
      paymentIntentId: paymentIntent.id,
    });

    return { ok: true, orderId, created, alreadyPaid: !created };
  } catch (e) {
    console.error("[stripe/fulfill] inbox write failed", orderId, e);
    return {
      ok: false,
      retry: isInboxUnreachableError(e),
      reason: "inbox_write_failed",
      orderId,
    };
  }
}
