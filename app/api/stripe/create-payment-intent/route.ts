import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe/server";
import { isStripeConfigured } from "@/lib/stripe/config";
import {
  buildPendingStripeOrder,
  loadPendingStripeOrder,
  parsePendingStripeOrderInput,
  savePendingStripeOrder,
  type PendingStripeOrder,
} from "@/lib/stripe/pendingOrderStore";

/** PI can be updated in place (amount / metadata) while checkout is open. */
const REUSE_STATUSES = new Set<Stripe.PaymentIntent.Status>([
  "requires_payment_method",
  "requires_confirmation",
  "requires_action",
]);

/** Customer may be mid-redirect (Bancontact) — return the same secret, don't mutate. */
const IN_FLIGHT_STATUSES = new Set<Stripe.PaymentIntent.Status>(["processing"]);

function piMetadata(built: PendingStripeOrder): Stripe.MetadataParam {
  return {
    orderId: built.orderId,
    orderType: built.orderType,
    total: built.total.toFixed(2),
    customerName: built.customerInfo.name.slice(0, 120),
    customerPhone: built.customerInfo.phone.slice(0, 40),
  };
}

async function tryReusePaymentIntent(
  stripe: Stripe,
  existingPiId: string,
  built: PendingStripeOrder
): Promise<Stripe.PaymentIntent | null> {
  try {
    let pi = await stripe.paymentIntents.retrieve(existingPiId);

    if (IN_FLIGHT_STATUSES.has(pi.status)) {
      return pi;
    }

    if (!REUSE_STATUSES.has(pi.status)) {
      return null;
    }

    const update: Stripe.PaymentIntentUpdateParams = {
      metadata: piMetadata(built),
    };
    if (pi.amount !== built.amountCents) {
      update.amount = built.amountCents;
    }

    pi = await stripe.paymentIntents.update(existingPiId, update);
    return pi;
  } catch (e) {
    console.warn("[stripe/create-payment-intent] reuse failed", existingPiId, e);
    return null;
  }
}

export async function POST(req: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "stripe_not_configured" },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = parsePendingStripeOrderInput(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.reason }, { status: 400 });
  }

  const existing = await loadPendingStripeOrder(parsed.input.orderId);
  const built = buildPendingStripeOrder(parsed.input, existing);
  if ("error" in built) {
    return NextResponse.json(
      {
        error: built.error,
        ...(built.minOrder !== undefined ? { minOrder: built.minOrder } : {}),
        ...(built.subtotal !== undefined ? { subtotal: built.subtotal } : {}),
      },
      { status: 400 }
    );
  }

  const stripe = getStripe();
  let paymentIntent: Stripe.PaymentIntent | null = null;

  if (existing?.paymentIntentId) {
    paymentIntent = await tryReusePaymentIntent(
      stripe,
      existing.paymentIntentId,
      built
    );
  }

  if (!paymentIntent) {
    paymentIntent = await stripe.paymentIntents.create({
      amount: built.amountCents,
      currency: "eur",
      automatic_payment_methods: { enabled: true },
      metadata: piMetadata(built),
    });
  }

  built.paymentIntentId = paymentIntent.id;
  const saved = await savePendingStripeOrder(built);
  if (!saved) {
    console.error(
      "[stripe/create-payment-intent] pending save failed",
      built.orderId
    );
    return NextResponse.json(
      { error: "pending_store_unavailable" },
      { status: 503 }
    );
  }

  if (!paymentIntent.client_secret) {
    return NextResponse.json(
      { error: "missing_client_secret" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
    amountCents: built.amountCents,
    reused: existing?.paymentIntentId === paymentIntent.id,
  });
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
