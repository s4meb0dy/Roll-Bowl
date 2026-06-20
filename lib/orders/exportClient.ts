import { getStoredAdminPin } from "@/lib/admin/pinClient";
import {
  accountingExportFilename,
  filterOrdersByDateRange,
  ordersToAccountingCsv,
  triggerCsvDownload,
} from "@/lib/orders/accountingExport";
import type { Order } from "@/lib/types";

export async function downloadOrdersFromServer(options?: {
  from?: string;
  to?: string;
}): Promise<{ ok: true; count: number } | { ok: false; reason: string }> {
  const params = new URLSearchParams();
  if (options?.from) params.set("from", options.from);
  if (options?.to) params.set("to", options.to);
  const qs = params.toString();
  const url = `/api/admin/orders/export${qs ? `?${qs}` : ""}`;

  const pin = getStoredAdminPin();
  const headers: HeadersInit = pin ? { "x-admin-pin": pin } : {};

  const res = await fetch(url, { credentials: "same-origin", headers });

  if (res.status === 401) return { ok: false, reason: "unauthorized" };
  if (res.status === 503) return { ok: false, reason: "inbox_unavailable" };
  if (!res.ok) return { ok: false, reason: "export_failed" };

  const blob = await res.blob();
  const csv = await blob.text();
  const rowCount = Math.max(0, csv.split(/\r?\n/).filter(Boolean).length - 1);

  const disposition = res.headers.get("Content-Disposition") ?? "";
  const match = /filename="([^"]+)"/.exec(disposition);
  const filename =
    match?.[1] ?? accountingExportFilename(options?.from, options?.to);

  triggerCsvDownload(csv, filename);
  return { ok: true, count: rowCount };
}

/** Fallback when Redis inbox is not linked — exports orders visible in this browser. */
export function downloadOrdersFromBrowser(
  orders: Order[],
  options?: { from?: string; to?: string }
): number {
  const filtered = filterOrdersByDateRange(orders, options?.from, options?.to);
  const csv = ordersToAccountingCsv(filtered);
  triggerCsvDownload(
    csv,
    accountingExportFilename(options?.from, options?.to)
  );
  return filtered.length;
}
