import { NextResponse } from "next/server";
import { isStripeConfigured } from "@/lib/stripe/config";
import {
  buildPendingStripeOrder,
  loadPendingStripeOrder,
  parsePendingStripeOrderInput,
  savePendingStripeOrder,
} from "@/lib/stripe/pendingOrderStore";

export async function POST(req: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "stripe_not_configured" }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = parsePendingStripeOrderInput(body, { strict: true });
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

  const saved = await savePendingStripeOrder(built);
  if (!saved) {
    return NextResponse.json({ error: "pending_store_unavailable" }, { status: 503 });
  }

  return NextResponse.json({ ok: true, orderId: built.orderId, amountCents: built.amountCents });
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
