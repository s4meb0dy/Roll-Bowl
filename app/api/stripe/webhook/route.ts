import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/server";
import { isStripeConfigured } from "@/lib/stripe/config";
import { fulfillPaidStripeOrder } from "@/lib/stripe/fulfillPaidOrder";

export async function POST(req: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "stripe_not_configured" }, { status: 503 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    return NextResponse.json({ error: "webhook_not_configured" }, { status: 503 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "missing_signature" }, { status: 400 });
  }

  const payload = await req.text();
  const stripe = getStripe();

  let event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "invalid_signature";
    console.error("[stripe/webhook]", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (event.type === "payment_intent.succeeded") {
    const pi = event.data.object;
    const result = await fulfillPaidStripeOrder(pi);
    if (!result.ok && result.retry) {
      console.error("[stripe/webhook] fulfill failed (retry)", result);
      return NextResponse.json({ error: result.reason }, { status: 503 });
    }
    if (!result.ok) {
      console.error("[stripe/webhook] fulfill failed", result);
    }
  }

  if (event.type === "payment_intent.payment_failed") {
    const pi = event.data.object;
    console.warn("[stripe/webhook] payment_intent.payment_failed", {
      id: pi.id,
      orderId: pi.metadata?.orderId,
      lastError: pi.last_payment_error?.message,
    });
  }

  return NextResponse.json({ received: true });
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
