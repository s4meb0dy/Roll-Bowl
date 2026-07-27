import "@/lib/orders/ensureKvEnv";
import { NextResponse } from "next/server";
import { isOrderInboxConfigured } from "@/lib/orders/inboxConfig";
import { getOrderById } from "@/lib/orders/inboxStore";
import {
  claimNextPrintJob,
  completePrintJob,
  serverDirectPrintId,
} from "@/lib/orders/printQueueStore";
import { buildKitchenReceiptLines } from "@/lib/epos/receiptContent";
import { buildEposPrintXml } from "@/lib/epos/eposXml";

/**
 * Epson **Server Direct Print** endpoint. The TM-m30III at the venue POSTs here
 * (application/x-www-form-urlencoded) on its polling interval:
 *
 *   - ConnectionType=GetRequest  → we answer with the next receipt as
 *     ePOS-Print XML wrapped in <PrintRequestInfo>, or an empty body if nothing
 *     is queued.
 *   - ConnectionType=SetResponse → the printer reports the result of the last
 *     job (ResponseFile contains the printjobid + success flag); we mark it
 *     printed or re-queue it.
 *
 * Configure the printer (Web Config → Server Direct Print) to poll
 *   https://www.rollnbowl.be/api/print/poll
 * with the ID set to the value of the SERVER_DIRECT_PRINT_ID env var.
 */

function xml(body: string): NextResponse {
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

const empty = () => xml("");

function escapeId(id: string): string {
  return id.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function POST(req: Request) {
  const configuredId = serverDirectPrintId();
  if (!configuredId || !isOrderInboxConfigured()) {
    // SDP not enabled — nothing to print.
    return empty();
  }

  let raw = "";
  try {
    raw = await req.text();
  } catch {
    return empty();
  }
  const params = new URLSearchParams(raw);
  const connectionType = params.get("ConnectionType") ?? "";
  const id = params.get("ID") ?? "";

  // Only serve the configured printer.
  if (id !== configuredId) return empty();

  // The printer confirming the result of the previous job.
  if (connectionType === "SetResponse") {
    const responseFile = params.get("ResponseFile") ?? "";
    const jobId = (responseFile.match(/<printjobid>([^<]*)<\/printjobid>/i)?.[1] ?? "").trim();
    const success = /success\s*=\s*["']?(true|1)["']?/i.test(responseFile);
    if (jobId) {
      try {
        await completePrintJob(jobId, success);
      } catch (e) {
        console.error("[print/poll] completePrintJob", e);
      }
    }
    return empty();
  }

  // GetRequest (default): hand out the next receipt if any.
  try {
    let orderId = await claimNextPrintJob();
    let guard = 0;
    while (orderId && guard++ < 25) {
      const order = await getOrderById(orderId);
      if (order && !order.kitchenPrinted) {
        const eposXml = buildEposPrintXml(buildKitchenReceiptLines(order));
        const body =
          `<?xml version="1.0" encoding="utf-8"?>` +
          `<PrintRequestInfo Version="2.00">` +
          `<ePOSPrint>` +
          `<Parameter>` +
          `<devid>local_printer</devid>` +
          `<timeout>10000</timeout>` +
          `<printjobid>${escapeId(orderId)}</printjobid>` +
          `</Parameter>` +
          `<PrintData>${eposXml}</PrintData>` +
          `</ePOSPrint>` +
          `</PrintRequestInfo>`;
        return xml(body);
      }
      // Already printed or vanished — release the slot and try the next one.
      await completePrintJob(orderId, true);
      orderId = await claimNextPrintJob();
    }
  } catch (e) {
    console.error("[print/poll] GetRequest", e);
  }

  return empty();
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
