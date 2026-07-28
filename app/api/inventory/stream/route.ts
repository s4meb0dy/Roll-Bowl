import { NextResponse } from "next/server";

/**
 * @deprecated Long-lived SSE streams burned Vercel Fluid memory-hours (every
 * menu visitor held a serverless function open). The client now polls
 * /api/inventory on a 30 s interval instead.
 */
export async function GET() {
  return NextResponse.json(
    { error: "stream_deprecated", use: "/api/inventory" },
    { status: 410, headers: { "Cache-Control": "no-store" } }
  );
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
