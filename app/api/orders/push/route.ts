import { NextResponse } from "next/server";
import { pushOrderToLightspeed } from "@/lib/lightspeed/pushOrder";
import type { Order } from "@/lib/types";

/**
 * Pushes a completed web order to Lightspeed (or compatible POS) for kitchen / printing.
 * Requires env (see lib/lightspeed/pushOrder.ts). Logs POS rejections on the server.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const order = (body as { order?: Order }).order;
  if (!order?.id || !Array.isArray(order.items) || !order.createdAt) {
    return NextResponse.json({ error: "Missing or invalid order" }, { status: 400 });
  }

  try {
    const result = await pushOrderToLightspeed(order);
    return NextResponse.json(result);
  } catch (e) {
    console.error("[Lightspeed] pushOrder exception", e);
    return NextResponse.json(
      {
        state: "failed" as const,
        pushedAt: new Date().toISOString(),
        errorMessage: e instanceof Error ? e.message : "Server error",
      },
      { status: 500 }
    );
  }
}
