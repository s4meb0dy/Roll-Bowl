import { NextResponse } from "next/server";

/**
 * @deprecated Long-lived SSE streams burned Vercel Fluid memory-hours (each
 * connection kept a serverless function provisioned for ~55 s, 24/7 on the
 * kitchen tablet). The kitchen client now polls /api/orders/inbox instead.
 */
export async function GET() {
  return NextResponse.json(
    { error: "stream_deprecated", use: "/api/orders/inbox" },
    { status: 410, headers: { "Cache-Control": "no-store" } }
  );
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
