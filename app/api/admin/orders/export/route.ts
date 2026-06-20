import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin/requireAdminAuth";
import { isOrderInboxConfigured } from "@/lib/orders/inboxConfig";
import { isInboxUnreachableError } from "@/lib/orders/inboxRedis";
import { getRecentOrders } from "@/lib/orders/inboxStore";
import {
  accountingExportFilename,
  filterOrdersByDateRange,
  ordersToAccountingCsv,
} from "@/lib/orders/accountingExport";

const EXPORT_LIMIT = 5_000;

export async function GET(req: Request) {
  const auth = requireAdminAuth(req);
  if (auth) return auth;

  if (!isOrderInboxConfigured()) {
    return NextResponse.json({ error: "inbox_unavailable" }, { status: 503 });
  }

  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  try {
    const all = await getRecentOrders(EXPORT_LIMIT);
    const orders = filterOrdersByDateRange(all, from, to);
    const csv = ordersToAccountingCsv(orders);
    const filename = accountingExportFilename(from, to);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    if (isInboxUnreachableError(e)) {
      return NextResponse.json({ error: "inbox_unreachable" }, { status: 503 });
    }
    console.error("[admin/orders/export]", e);
    return NextResponse.json({ error: "export_failed" }, { status: 500 });
  }
}
