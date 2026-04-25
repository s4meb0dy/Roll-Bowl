import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import type { Order } from "@/lib/types";
import { isOrderInboxConfigured } from "@/lib/orders/inboxConfig";

const LIST_KEY = "order:inbox";
const MAX_LEN = 200;

function isValidOrderBody(o: unknown): o is Order {
  if (!o || typeof o !== "object") return false;
  const x = o as Record<string, unknown>;
  if (typeof x.id !== "string" || !x.id) return false;
  if (!Array.isArray(x.items) || !x.createdAt) return false;
  if (!x.customerInfo || typeof x.customerInfo !== "object") return false;
  return true;
}

/**
 * GET — recent orders for the kitchen / admin to merge (cross-device).
 * POST — append a new order after checkout (so PC kitchen sees phone orders).
 */
export async function GET() {
  if (!isOrderInboxConfigured()) {
    return NextResponse.json({ orders: [] as Order[], inboxEnabled: false });
  }
  try {
    const raw = (await kv.lrange(LIST_KEY, 0, MAX_LEN - 1)) as string[];
    const byId = new Map<string, Order>();
    for (const j of raw) {
      try {
        const o = JSON.parse(j) as Order;
        if (o?.id) byId.set(o.id, o);
      } catch {
        /* skip */
      }
    }
    const orders = [...byId.values()].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return NextResponse.json({ orders, inboxEnabled: true });
  } catch (e) {
    console.error("[orders/inbox] GET", e);
    return NextResponse.json(
      { orders: [] as Order[], inboxEnabled: true, error: "read_failed" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  if (!isOrderInboxConfigured()) {
    return NextResponse.json({ ok: true, stored: false, reason: "inbox_not_configured" });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const order = (body as { order?: Order }).order;
  if (!isValidOrderBody(order)) {
    return NextResponse.json({ error: "Missing or invalid order" }, { status: 400 });
  }
  try {
    await kv.lpush(LIST_KEY, JSON.stringify(order));
    await kv.ltrim(LIST_KEY, 0, MAX_LEN - 1);
    return NextResponse.json({ ok: true, stored: true });
  } catch (e) {
    console.error("[orders/inbox] POST", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Store failed" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
