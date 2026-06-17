import { NextResponse } from "next/server";
import { pushOrderToLightspeed } from "@/lib/lightspeed/pushOrder";
import type { Order } from "@/lib/types";
import { isOrderInboxConfigured } from "@/lib/orders/inboxConfig";
import { getOrderById, patchOrderFields } from "@/lib/orders/inboxStore";
import { validateOrderSubmission } from "@/lib/orders/validateOrderSubmission";

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

  const submission = await validateOrderSubmission(order);
  if (!submission.ok) {
    return NextResponse.json(
      { error: "unauthorized", reason: submission.reason },
      { status: 403 }
    );
  }

  if (isOrderInboxConfigured()) {
    const existing = await getOrderById(order.id);
    if (!existing && order.paymentMethod === "cash") {
      return NextResponse.json({ error: "order_not_in_inbox" }, { status: 404 });
    }
  }

  try {
    const result = await pushOrderToLightspeed(order);

    if (isOrderInboxConfigured() && result.state !== "skipped") {
      try {
        await patchOrderFields(order.id, {
          lightspeed: {
            state: result.state,
            pushedAt: result.pushedAt,
            saleId: result.saleId,
            accountIdentifier: result.accountIdentifier,
            errorMessage: result.errorMessage,
            httpStatus: result.httpStatus,
            dryRun: result.dryRun,
          },
        });
      } catch (e) {
        console.error("[orders/push] inbox patch failed", order.id, e);
      }
    }

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
