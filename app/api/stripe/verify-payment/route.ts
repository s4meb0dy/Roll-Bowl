import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/server";
import { isStripeConfigured } from "@/lib/stripe/config";

interface VerifyBody {
  paymentIntentId?: string;
  orderId?: string;
  amountCents?: number;
}

export async function POST(req: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "stripe_not_configured" },
      { status: 503 }
    );
  }

  let body: VerifyBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const paymentIntentId =
    typeof body.paymentIntentId === "string" ? body.paymentIntentId.trim() : "";
  const orderId = typeof body.orderId === "string" ? body.orderId.trim() : "";
  const amountCents =
    typeof body.amountCents === "number" ? body.amountCents : NaN;

  if (!paymentIntentId || !orderId || !Number.isFinite(amountCents)) {
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

  if (pi.amount !== amountCents) {
    return NextResponse.json({ error: "amount_mismatch" }, { status: 400 });
  }

  return NextResponse.json({ ok: true, paymentIntentId: pi.id });
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
