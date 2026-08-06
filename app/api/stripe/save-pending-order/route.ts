import { NextResponse } from "next/server";
import { isStripeConfigured } from "@/lib/stripe/config";
import {
  buildPendingStripeOrder,
  loadPendingStripeOrder,
  parsePendingStripeOrderInput,
  savePendingStripeOrder,
} from "@/lib/stripe/pendingOrderStore";

export async function POST(req: Request) {
  let body: unknown;
  try {
    if (!isStripeConfigured()) {
      return NextResponse.json({ error: "stripe_not_configured" }, { status: 503 });
    }

    try {
      body = await req.json();
    } catch (parseError) {
      console.error("[stripe/save-pending-order] invalid JSON body", {
        error: parseError,
      });
      return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }

    // Cart debounces this while the customer is still typing — partial name/phone
    // must be accepted (same as create-payment-intent).
    const parsed = parsePendingStripeOrderInput(body);
    if (!parsed.ok) {
      console.error("[stripe/save-pending-order] validation failed", {
        reason: parsed.reason,
        incomingBody: body,
      });
      return NextResponse.json({ error: parsed.reason }, { status: 400 });
    }

    const existing = await loadPendingStripeOrder(parsed.input.orderId);
    const built = buildPendingStripeOrder(parsed.input, existing);
    if ("error" in built) {
      console.error("[stripe/save-pending-order] build failed", {
        error: built.error,
        orderId: parsed.input.orderId,
        incomingBody: body,
      });
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
  } catch (error) {
    console.error("[stripe/save-pending-order] unhandled error", {
      error,
      incomingBody: body,
    });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
