import "@/lib/orders/ensureKvEnv";
import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin/requireAdminAuth";
import { isOrderInboxConfigured } from "@/lib/orders/inboxConfig";
import { isInboxUnreachableError } from "@/lib/orders/inboxRedis";
import { deleteOrderById } from "@/lib/orders/inboxStore";

export async function POST(req: Request) {
  const auth = requireAdminAuth(req);
  if (auth) return auth;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const orderId =
    typeof (body as { orderId?: unknown }).orderId === "string"
      ? (body as { orderId: string }).orderId.trim()
      : "";
  if (!orderId) {
    return NextResponse.json({ error: "missing_order_id" }, { status: 400 });
  }

  if (!isOrderInboxConfigured()) {
    // No server inbox — nothing to delete server-side; the client still drops it locally.
    return NextResponse.json({ ok: true, deleted: false, inboxEnabled: false });
  }

  try {
    const { deleted, version } = await deleteOrderById(orderId);
    return NextResponse.json({ ok: true, deleted, version, inboxEnabled: true });
  } catch (e) {
    if (isInboxUnreachableError(e)) {
      return NextResponse.json({ error: "inbox_unreachable" }, { status: 503 });
    }
    console.error("[admin/orders/delete]", e);
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }
}
