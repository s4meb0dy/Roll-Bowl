import "@/lib/orders/ensureKvEnv";
import { NextResponse } from "next/server";
import type { Order } from "@/lib/types";
import { isOrderInboxConfigured } from "@/lib/orders/inboxConfig";
import { isInboxUnreachableError } from "@/lib/orders/inboxRedis";
import {
  getRecentOrders,
  getVersion,
  storeNewOrder,
} from "@/lib/orders/inboxStore";

const READ_LIMIT = 200;

function validateOrderInboxPayload(
  o: unknown
): { ok: true; order: Order } | { ok: false; reason: string } {
  if (!o || typeof o !== "object") {
    return { ok: false, reason: "not_an_object" };
  }
  const x = o as Record<string, unknown>;
  if (typeof x.id !== "string" || !x.id.trim()) {
    return { ok: false, reason: "id" };
  }
  if (!Array.isArray(x.items)) {
    return { ok: false, reason: "items_not_array" };
  }
  if (x.createdAt == null || (typeof x.createdAt === "string" && !x.createdAt)) {
    return { ok: false, reason: "createdAt" };
  }
  if (x.customerInfo == null || typeof x.customerInfo !== "object" || Array.isArray(x.customerInfo)) {
    return { ok: false, reason: "customerInfo" };
  }
  return { ok: true, order: o as Order };
}

/**
 * GET — recent orders + global write version. The kitchen pulls this on
 * mount and after losing the SSE connection.
 *
 * POST — idempotent create: storing the same id twice (e.g. cart retry)
 * leaves the existing server-side record untouched.
 */
export async function GET() {
  if (!isOrderInboxConfigured()) {
    return NextResponse.json({
      orders: [] as Order[],
      version: 0,
      inboxEnabled: false,
    });
  }
  try {
    const [orders, version] = await Promise.all([
      getRecentOrders(READ_LIMIT),
      getVersion(),
    ]);
    return NextResponse.json({ orders, version, inboxEnabled: true });
  } catch (e) {
    if (isInboxUnreachableError(e)) {
      // Local dev / transient outage — quietly degrade so the kitchen UI
      // simply shows "no orders yet" instead of an error toast.
      return NextResponse.json({
        orders: [] as Order[],
        version: 0,
        inboxEnabled: false,
        error: "inbox_unavailable",
      });
    }
    console.error("[orders/inbox] GET", e);
    const debug = process.env.ORDER_INBOX_DEBUG === "1";
    const errMsg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      {
        orders: [] as Order[],
        version: 0,
        inboxEnabled: true,
        error: "read_failed",
        ...(debug ? { read_error: errMsg } : {}),
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  if (!isOrderInboxConfigured()) {
    return NextResponse.json({
      ok: true,
      stored: false,
      reason: "inbox_not_configured",
    });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const rawOrder = (body as { order?: Order }).order;
  const checked = validateOrderInboxPayload(rawOrder);
  if (!checked.ok) {
    console.error("[orders/inbox] reject", checked.reason, {
      hasOrder: rawOrder != null,
    });
    return NextResponse.json(
      { error: "Missing or invalid order", reason: checked.reason },
      { status: 400 }
    );
  }
  try {
    const { created, version } = await storeNewOrder(checked.order);
    return NextResponse.json({
      ok: true,
      stored: true,
      duplicate: !created,
      version,
    });
  } catch (e) {
    if (isInboxUnreachableError(e)) {
      // Local dev or transient outage. Cart.tsx falls back to sendBeacon and
      // the order is still saved in localStorage on the customer's device.
      return NextResponse.json(
        {
          ok: false,
          stored: false,
          reason: "inbox_unavailable",
        },
        { status: 503 }
      );
    }
    console.error("[orders/inbox] POST", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Store failed" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
