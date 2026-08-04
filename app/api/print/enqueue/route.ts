import "@/lib/orders/ensureKvEnv";
import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin/requireAdminAuth";
import { isOrderInboxConfigured } from "@/lib/orders/inboxConfig";
import { isInboxUnreachableError } from "@/lib/orders/inboxRedis";
import {
  enqueuePrintJob,
  isServerDirectPrintEnabled,
  SDP_TEST_JOB_ID,
} from "@/lib/orders/printQueueStore";

/** Manually (re)queue an order — or `{ test: true }` for a minimal SDP test ticket. */
export async function POST(req: Request) {
  const auth = requireAdminAuth(req);
  if (auth) return auth;

  if (!isServerDirectPrintEnabled() || !isOrderInboxConfigured()) {
    return NextResponse.json({ ok: false, error: "sdp_disabled" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const isTest = (body as { test?: unknown }).test === true;
  const orderId = isTest
    ? SDP_TEST_JOB_ID
    : typeof (body as { orderId?: unknown }).orderId === "string"
      ? (body as { orderId: string }).orderId.trim()
      : "";
  if (!orderId) {
    return NextResponse.json({ error: "missing_order_id" }, { status: 400 });
  }

  try {
    await enqueuePrintJob(orderId, { force: true });
    return NextResponse.json({ ok: true, test: isTest });
  } catch (e) {
    if (isInboxUnreachableError(e)) {
      return NextResponse.json({ error: "inbox_unreachable" }, { status: 503 });
    }
    console.error("[print/enqueue]", e);
    return NextResponse.json({ error: "enqueue_failed" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
