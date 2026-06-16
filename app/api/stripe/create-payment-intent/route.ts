import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/server";
import { isStripeConfigured } from "@/lib/stripe/config";
import { computeOrderAmounts } from "@/lib/stripe/orderTotal";
import type { CartItem, OrderType } from "@/lib/types";

interface CreatePaymentIntentBody {
  orderId?: string;
  items?: CartItem[];
  orderType?: OrderType;
  zipCode?: string | null;
  customerName?: string;
  customerPhone?: string;
}

export async function POST(req: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "stripe_not_configured" },
      { status: 503 }
    );
  }

  let body: CreatePaymentIntentBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const orderId = typeof body.orderId === "string" ? body.orderId.trim() : "";
  const items = Array.isArray(body.items) ? body.items : [];
  const orderType = body.orderType === "takeaway" ? "takeaway" : "delivery";

  if (!orderId || items.length === 0) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const { total, amountCents } = computeOrderAmounts(
    items,
    orderType,
    body.zipCode
  );

  if (amountCents < 50) {
    return NextResponse.json({ error: "amount_too_low" }, { status: 400 });
  }

  const stripe = getStripe();
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency: "eur",
    automatic_payment_methods: { enabled: true },
    metadata: {
      orderId,
      orderType,
      total: total.toFixed(2),
      ...(body.customerName?.trim()
        ? { customerName: body.customerName.trim().slice(0, 120) }
        : {}),
      ...(body.customerPhone?.trim()
        ? { customerPhone: body.customerPhone.trim().slice(0, 40) }
        : {}),
    },
  });

  return NextResponse.json({
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
    amountCents,
  });
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
