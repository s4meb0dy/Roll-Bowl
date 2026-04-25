import type { Order } from "@/lib/types";
import { getLightspeedKitchenRouting, getLightspeedPosOrderStatus } from "./kitchenRouting";

export type LightspeedPushState = "success" | "failed" | "skipped";

export interface LightspeedPushResult {
  state: LightspeedPushState;
  pushedAt: string;
  /** Lightspeed / POS order or sale id when success */
  saleId?: string;
  accountIdentifier?: string;
  errorMessage?: string;
  httpStatus?: number;
  /** True when LIGHTSPEED_PUSH_DRY_RUN=1 and no request was made */
  dryRun?: boolean;
}

/**
 * Pushes a web order to the configured Lightspeed (or compatible) kitchen endpoint.
 * Set LIGHTSPEED_ORDER_PUSH_URL (or LIGHTSPEED_KITCHEN_API_URL) and LIGHTSPEED_API_TOKEN.
 * Each line item includes categoryId + printerGroupId from kitchenRouting (env).
 *
 * For development without hardware: LIGHTSPEED_PUSH_DRY_RUN=1 returns success and logs payload shape.
 */
export async function pushOrderToLightspeed(order: Order): Promise<LightspeedPushResult> {
  const now = new Date().toISOString();
  const dryRun = process.env.LIGHTSPEED_PUSH_DRY_RUN === "1" || process.env.LIGHTSPEED_PUSH_DRY_RUN === "true";
  if (dryRun) {
    const posStatus = getLightspeedPosOrderStatus(order.paymentMethod);
    const lines = buildLinesPayload(order);
    // eslint-disable-next-line no-console
    console.log("[Lightspeed] DRY RUN — would POST order", {
      orderId: order.id,
      posStatus,
      lineCount: lines.length,
      isFirstTimeCustomer: Boolean(order.isFirstTimeCustomer),
    });
    return {
      state: "success",
      pushedAt: now,
      saleId: "dry-run",
      dryRun: true,
    };
  }

  const pushUrl =
    process.env.LIGHTSPEED_ORDER_PUSH_URL?.trim() ||
    process.env.LIGHTSPEED_KITCHEN_API_URL?.trim() ||
    "";
  const token =
    (process.env.LIGHTSPEED_API_TOKEN || process.env.LIGHTSPEED_ORDER_API_TOKEN || "").trim();

  if (!pushUrl) {
    // eslint-disable-next-line no-console
    console.warn("[Lightspeed] Order push skipped: set LIGHTSPEED_ORDER_PUSH_URL (or LIGHTSPEED_KITCHEN_API_URL)");
    return {
      state: "skipped",
      pushedAt: now,
      errorMessage: "Order push URL not configured (LIGHTSPEED_ORDER_PUSH_URL)",
    };
  }
  if (!token) {
    // eslint-disable-next-line no-console
    console.warn("[Lightspeed] Order push skipped: LIGHTSPEED_API_TOKEN not set");
    return {
      state: "skipped",
      pushedAt: now,
      errorMessage: "API token not configured (LIGHTSPEED_API_TOKEN)",
    };
  }

  const posStatus = getLightspeedPosOrderStatus(order.paymentMethod);
  const orderNote = buildOrderNoteForPos(order);
  const body = {
    thirdPartyReference: order.id,
    externalOrderId: order.id,
    /** K-Series / many POS: PAID and ACCEPTED both release to kitchen when configured. */
    status: posStatus,
    posStatus,
    orderNote,
    /** Shown in kitchen / third-party UIs; order lines stay unchanged. */
    isFirstTimeCustomer: Boolean(order.isFirstTimeCustomer),
    subtotal: order.subtotal,
    total: order.total,
    deliveryFee: order.deliveryFee,
    orderType: order.orderType,
    fulfillment: order.fulfillmentTime,
    customer: { ...order.customerInfo },
    payment: {
      method: order.paymentMethod,
      cashDenomination: order.cashDenomination,
    },
    items: buildLinesPayload(order),
  };

  const res = await fetch(pushUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();

  if (!res.ok) {
    console.error("[Lightspeed] Order push rejected", {
      orderId: order.id,
      httpStatus: res.status,
      body: text,
    });
    return {
      state: "failed",
      pushedAt: now,
      httpStatus: res.status,
      errorMessage: text.slice(0, 2000) || res.statusText,
    };
  }

  let saleId: string | undefined;
  let accountIdentifier: string | undefined;
  try {
    const json = JSON.parse(text) as {
      saleId?: string;
      id?: string | number;
      accountIdentifier?: string;
    };
    if (json.saleId != null) saleId = String(json.saleId);
    else if (json.id != null) saleId = String(json.id);
    accountIdentifier = json.accountIdentifier;
  } catch {
    // non-JSON success e.g. plain "OK"
  }

  // eslint-disable-next-line no-console
  console.log("[Lightspeed] Order accepted by POS", { orderId: order.id, saleId });

  return {
    state: "success",
    pushedAt: now,
    saleId,
    accountIdentifier,
  };
}

function buildOrderNoteForPos(order: Order): string {
  const parts: string[] = [];
  if (order.generalNote?.trim()) parts.push(order.generalNote.trim());
  if (order.isFirstTimeCustomer) {
    parts.push("EERSTE BESTELLING — nieuwe klant (website)");
  }
  return parts.join(" | ");
}

function buildLinesPayload(order: Order) {
  return order.items.map((item) => {
    const { categoryId, printerGroupId } = getLightspeedKitchenRouting(item);
    return {
      name: item.name,
      quantity: item.quantity,
      lineTotal: item.price * item.quantity,
      unitPrice: item.price,
      categoryId,
      printerGroupId,
      lineType: item.type,
      menuItemId: item.menuItemId ?? null,
    };
  });
}

export function isLightspeedOrderPushConfigured(): boolean {
  if (process.env.LIGHTSPEED_PUSH_DRY_RUN === "1" || process.env.LIGHTSPEED_PUSH_DRY_RUN === "true")
    return true;
  const url = process.env.LIGHTSPEED_ORDER_PUSH_URL || process.env.LIGHTSPEED_KITCHEN_API_URL;
  const token = process.env.LIGHTSPEED_API_TOKEN || process.env.LIGHTSPEED_ORDER_API_TOKEN;
  return Boolean(url?.trim() && token?.trim());
}
