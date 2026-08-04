import "@/lib/orders/ensureKvEnv";
import { NextResponse } from "next/server";
import { isOrderInboxConfigured } from "@/lib/orders/inboxConfig";
import { getOrderById, patchOrderFields } from "@/lib/orders/inboxStore";
import {
  claimNextPrintJob,
  completePrintJob,
  idsMatch,
  recordJobServed,
  recordPrinterPoll,
  rememberPrintJobMapping,
  resolveOrderIdFromPrintJobId,
  serverDirectPrintId,
  SDP_TEST_JOB_ID,
} from "@/lib/orders/printQueueStore";
import { buildKitchenReceiptLines } from "@/lib/epos/receiptContent";
import { buildEposPrintXml, buildSdpTestPrintXml } from "@/lib/epos/eposXml";

/**
 * Epson **Server Direct Print** endpoint.
 *
 * Configure (Web Config → Server Direct Print):
 *   URL = https://www.rollnbowl.be/api/print/poll
 *   ID  = same value as Vercel env SERVER_DIRECT_PRINT_ID (case-insensitive)
 *   Server Authentication = Disable
 *   URL Encode = Enable
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

function deviceId(): string {
  return process.env.SERVER_DIRECT_PRINT_DEVICE_ID?.trim() || "local_printer";
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

  // Epson sends application/x-www-form-urlencoded. Also accept query-string
  // duplicates and a few key-name variants seen across firmware revisions.
  const params = new URLSearchParams(raw);
  const urlParams = new URL(req.url).searchParams;
  const pick = (...keys: string[]) => {
    for (const k of keys) {
      const v = params.get(k) ?? urlParams.get(k);
      if (v != null && v !== "") return v;
    }
    return "";
  };
  const connectionType = pick("ConnectionType", "Connectiontype", "connectionType");
  const id = pick("ID", "Id", "id");
  const matched = idsMatch(id, configuredId);

  // Always record the poll so the kitchen can see "printer never reached us"
  // vs "ID mismatch" vs "healthy".
  try {
    await recordPrinterPoll({ id, connectionType, matched });
  } catch (e) {
    console.error("[print/poll] telemetry", e);
  }

  if (!matched) {
    console.warn(
      "[print/poll] ID mismatch — printer sent",
      JSON.stringify(id),
      "expected",
      JSON.stringify(configuredId)
    );
    return empty();
  }

  if (connectionType === "SetResponse") {
    const responseFile = params.get("ResponseFile") ?? urlParams.get("ResponseFile") ?? "";
    const jobId = (
      responseFile.match(/<printjobid>([^<]*)<\/printjobid>/i)?.[1] ?? ""
    ).trim();
    const success = /success\s*=\s*["']?(true|1)["']?/i.test(responseFile);
    if (jobId) {
      try {
        const orderId = (await resolveOrderIdFromPrintJobId(jobId)) ?? jobId;
        const completedId = await completePrintJob(orderId, success);
        if (success && completedId && completedId !== SDP_TEST_JOB_ID) {
          await patchOrderFields(completedId, { kitchenPrinted: true });
        }
      } catch (e) {
        console.error("[print/poll] completePrintJob", e);
      }
    } else {
      // No job id in response — still clear in-flight if present.
      try {
        await completePrintJob("", success);
      } catch (e) {
        console.error("[print/poll] completePrintJob empty id", e);
      }
    }
    return empty();
  }

  // GetRequest (default): hand out the next receipt if any.
  try {
    let orderId = await claimNextPrintJob();
    let guard = 0;
    while (orderId && guard++ < 25) {
      if (orderId === SDP_TEST_JOB_ID) {
        const jobId = `sdptest${Date.now().toString(36)}`.slice(0, 30);
        await rememberPrintJobMapping(jobId, SDP_TEST_JOB_ID);
        await recordJobServed(SDP_TEST_JOB_ID);
        // Rewrite PrintData devid if env overrides local_printer.
        let body = buildSdpTestPrintXml(jobId);
        const devid = deviceId();
        if (devid !== "local_printer") {
          body = body.replace(
            "<devid>local_printer</devid>",
            `<devid>${escapeId(devid)}</devid>`
          );
        }
        return xml(body);
      }

      const order = await getOrderById(orderId);
      if (order && !order.kitchenPrinted) {
        const jobId = toPrintJobId(orderId);
        await rememberPrintJobMapping(jobId, orderId);
        const eposXml = buildEposPrintXml(buildKitchenReceiptLines(order), {
          densityCommand: false,
          sdpSafe: true,
        });
        const body =
          `<?xml version="1.0" encoding="utf-8"?>` +
          `<PrintRequestInfo Version="2.00">` +
          `<ePOSPrint>` +
          `<Parameter>` +
          `<devid>${escapeId(deviceId())}</devid>` +
          `<timeout>10000</timeout>` +
          `<printjobid>${escapeId(jobId)}</printjobid>` +
          `</Parameter>` +
          `<PrintData>${eposXml}</PrintData>` +
          `</ePOSPrint>` +
          `</PrintRequestInfo>`;
        await recordJobServed(orderId);
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
