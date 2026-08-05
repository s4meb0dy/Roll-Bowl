import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/server";
import { isStripeConfigured } from "@/lib/stripe/config";
import { fulfillPaidStripeOrder } from "@/lib/stripe/fulfillPaidOrder";
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
  const pi = await stripe.paymentIntents.retrieve(paymentIntentId);

  if (pi.status !== "succeeded") {
    return NextResponse.json(
      { error: "payment_not_completed", status: pi.status },
      { status: 402 }
    );
  }

  if (pi.metadata.orderId !== orderId) {
    return NextResponse.json({ error: "order_mismatch" }, { status: 400 });
  }

  const pending = await loadPendingStripeOrder(orderId);
  if (pending) {
    if (pi.amount !== pending.amountCents) {
      return NextResponse.json({ error: "amount_mismatch" }, { status: 400 });
    }
    return NextResponse.json({ ok: true, pending: pendingPayload(pending) });
  }

  if (isOrderInboxConfigured()) {
    const existing = await getOrderById(orderId);
    if (existing?.status === "paid") {
      return NextResponse.json({
        ok: true,
        paid: true,
        orderId,
        fulfilled: true,
        order: existing,
      });
    }
  }

  const fulfill = await fulfillPaidStripeOrder(pi);
  if (fulfill.ok) {
    const order =
      isOrderInboxConfigured() ? await getOrderById(orderId) : null;
    return NextResponse.json({
      ok: true,
      paid: true,
      orderId,
      fulfilled: true,
      ...(order ? { order } : { minimal: true }),
    });
  }

  if (fulfill.reason === "pending_not_found") {
    // Paid but checkout snapshot is gone — still confirm for the customer.
    return NextResponse.json({
      ok: true,
      paid: true,
      orderId,
      minimal: true,
    });
  }

  return NextResponse.json(
    { error: fulfill.reason, orderId },
    { status: 500 }
  );
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
