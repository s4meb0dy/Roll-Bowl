import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/server";
import { isStripeConfigured } from "@/lib/stripe/config";
import { fulfillPaidStripeOrder } from "@/lib/stripe/fulfillPaidOrder";
import { retrieveSettledPaymentIntent } from "@/lib/stripe/paymentStatus";
import {
  loadPendingStripeOrder,
  type PendingStripeOrder,
} from "@/lib/stripe/pendingOrderStore";
import { isOrderInboxConfigured } from "@/lib/orders/inboxConfig";
import { getOrderById } from "@/lib/orders/inboxStore";

interface RecoverBody {
  orderId?: string;
  paymentIntentId?: string;
}

function pendingPayload(pending: PendingStripeOrder) {
  return {
    orderId: pending.orderId,
    items: pending.items,
    customerInfo: pending.customerInfo,
    generalNote: pending.generalNote,
    orderType: pending.orderType,
    fulfillmentTime: pending.fulfillmentTime,
    amountCents: pending.amountCents,
  };
}

/**
 * After Bancontact / iDEAL redirect, the browser may have lost sessionStorage.
 * This endpoint verifies Stripe payment and returns the Redis pending snapshot
 * (or an existing inbox order) so the confirmation page can finish locally.
 */
export async function POST(req: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "stripe_not_configured" }, { status: 503 });
  }

  let body: RecoverBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const orderId = typeof body.orderId === "string" ? body.orderId.trim() : "";
  const paymentIntentId =
    typeof body.paymentIntentId === "string" ? body.paymentIntentId.trim() : "";

  if (!orderId || !paymentIntentId) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const stripe = getStripe();
  const { paymentIntent: pi, state } = await retrieveSettledPaymentIntent(
    stripe,
    paymentIntentId
  );

  if (state === "failed") {
    return NextResponse.json(
      { error: "payment_not_completed", status: pi.status },
      { status: 402 }
    );
  }

  if (pi.metadata.orderId !== orderId) {
    return NextResponse.json({ error: "order_mismatch" }, { status: 400 });
  }

  const settling = state === "settling";

  // The order may already be on the kitchen board (webhook got there first, or
  // the kitchen already accepted it). Any status counts — the customer just
  // needs their confirmation back.
  if (isOrderInboxConfigured()) {
    const existing = await getOrderById(orderId);
    if (existing) {
      return NextResponse.json({
        ok: true,
        paid: true,
        settling,
        orderId,
        fulfilled: true,
        order: existing,
      });
    }
  }

  const pending = await loadPendingStripeOrder(orderId);

  if (!pending) {
    // Paid but the checkout snapshot is gone — still confirm for the customer.
    return NextResponse.json({
      ok: true,
      paid: true,
      settling,
      orderId,
      minimal: true,
    });
  }

  if (pi.amount !== pending.amountCents) {
    // Paid, but the snapshot no longer matches what was charged, so we can't
    // safely rebuild the line items. Confirm the payment without details rather
    // than telling a paying customer their order failed.
    console.error("[stripe/recover] amount mismatch", {
      orderId,
      charged: pi.amount,
      pending: pending.amountCents,
    });
    return NextResponse.json({
      ok: true,
      paid: true,
      settling,
      orderId,
      minimal: true,
    });
  }

  // Settled and not on the board yet: write it here instead of trusting the
  // customer's browser to complete the hand-off. While the payment is still
  // processing the webhook does this once it succeeds.
  if (!settling) {
    const fulfill = await fulfillPaidStripeOrder(pi);
    if (fulfill.ok) {
      const order = isOrderInboxConfigured()
        ? await getOrderById(orderId)
        : null;
      if (order) {
        return NextResponse.json({
          ok: true,
          paid: true,
          settling: false,
          orderId,
          fulfilled: true,
          order,
        });
      }
    } else {
      console.error("[stripe/recover] fulfill failed", {
        orderId,
        reason: fulfill.reason,
      });
    }
  }

  return NextResponse.json({
    ok: true,
    paid: true,
    settling,
    pending: pendingPayload(pending),
  });
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
