import "@/lib/orders/ensureKvEnv";
import { NextResponse } from "next/server";
import type { Order } from "@/lib/types";
import { isOrderInboxConfigured } from "@/lib/orders/inboxConfig";
import { readInboxOrders } from "@/lib/orders/inboxStore";

/**
 * GET — recent orders for the kitchen / admin to merge (cross-device).
 * POST — append a new order after checkout (so PC kitchen sees phone orders).
 */
export async function GET() {
  if (!isOrderInboxConfigured()) {
    return NextResponse.json({ orders: [] as Order[], inboxEnabled: false });
  }

  try {
    const orders = await readInboxOrders();
    return NextResponse.json({ orders, inboxEnabled: true });
  } catch (e) {
    console.error("[orders/inbox] GET", e);
    const debug = process.env.ORDER_INBOX_DEBUG === "1";
    const errMsg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      {
        orders: [] as Order[],
        inboxEnabled: true,
        error: "read_failed",
        ...(debug ? { read_error: errMsg } : {}),
      },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
