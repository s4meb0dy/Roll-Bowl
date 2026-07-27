import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin/requireAdminAuth";
import { isServerDirectPrintEnabled } from "@/lib/orders/printQueueStore";

/** Tells the kitchen board whether printing is handled server-side (SDP). */
export async function GET(req: Request) {
  const auth = requireAdminAuth(req);
  if (auth) return auth;
  return NextResponse.json({ enabled: isServerDirectPrintEnabled() });
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
