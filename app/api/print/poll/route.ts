import "@/lib/orders/ensureKvEnv";
import { NextResponse } from "next/server";
import { isOrderInboxConfigured } from "@/lib/orders/inboxConfig";
import { getOrderById, patchOrderFields } from "@/lib/orders/inboxStore";
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
 *   - ConnectionType=GetRequest  → next receipt as ePOS-Print XML, or empty
 *   - ConnectionType=SetResponse → printer reports result; we mark printed
 *
 * Configure (Web Config → Server Direct Print):
 *   URL = https://www.rollnbowl.be/api/print/poll
 *   ID  = same value as Vercel env SERVER_DIRECT_PRINT_ID
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

/** Epson expects Content-Length: 0 when there is nothing to print. */
function empty(): NextResponse {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      "Content-Length": "0",
      "Cache-Control": "no-store",
    },
  });
}

/** Epson printjobid: 1–30 chars, alphanumeric / _ - . only. */
function toPrintJobId(orderId: string): string {
  const cleaned = orderId.replace(/[^a-zA-Z0-9._-]/g, "");
  return (cleaned || "job").slice(0, 30);
}

function escapeId(id: string): string {
  return id.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Access Test in Web Config often hits GET — answer 200 empty so the test passes. */
export async function GET() {
  return empty();
}

export async function POST(req: Request) {
  const configuredId = serverDirectPrintId();
  if (!configuredId || !isOrderInboxConfigured()) {
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

  // Only serve the configured printer (exact ID match).
  if (id !== configuredId) return empty();

  if (connectionType === "SetResponse") {
    const responseFile = params.get("ResponseFile") ?? "";
    const jobId = (
      responseFile.match(/<printjobid>([^<]*)<\/printjobid>/i)?.[1] ?? ""
    ).trim();
    const success = /success\s*=\s*["']?(true|1)["']?/i.test(responseFile);
    if (jobId) {
      try {
        const completedId = await completePrintJob(jobId, success);
        if (success && completedId) {
          await patchOrderFields(completedId, { kitchenPrinted: true });
        }
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
        const jobId = toPrintJobId(orderId);
        const eposXml = buildEposPrintXml(buildKitchenReceiptLines(order));
        const body =
          `<?xml version="1.0" encoding="utf-8"?>` +
          `<PrintRequestInfo Version="2.00">` +
          `<ePOSPrint>` +
          `<Parameter>` +
          `<devid>local_printer</devid>` +
          `<timeout>10000</timeout>` +
          `<printjobid>${escapeId(jobId)}</printjobid>` +
          `</Parameter>` +
          `<PrintData>${eposXml}</PrintData>` +
          `</ePOSPrint>` +
          `</PrintRequestInfo>`;
        return xml(body);
      }
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
