import "@/lib/orders/ensureKvEnv";
import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin/requireAdminAuth";
import { isOrderInboxConfigured } from "@/lib/orders/inboxConfig";
import { isInboxUnreachableError } from "@/lib/orders/inboxRedis";
import { clearAllOrders } from "@/lib/orders/inboxStore";

export async function POST(req: Request) {
  const auth = requireAdminAuth(req);
  if (auth) return auth;

  if (!isOrderInboxConfigured()) {
    return NextResponse.json({
      ok: true,
      deleted: 0,
      inboxEnabled: false,
    });
  }

  try {
    const { deleted, version } = await clearAllOrders();
    return NextResponse.json({
      ok: true,
      deleted,
      version,
      inboxEnabled: true,
    });
  } catch (e) {
    if (isInboxUnreachableError(e)) {
      return NextResponse.json({ error: "inbox_unreachable" }, { status: 503 });
    }
    console.error("[admin/orders/clear]", e);
    return NextResponse.json({ error: "clear_failed" }, { status: 500 });
  }
}
