import { NextResponse } from "next/server";
import type {
  CartItem,
  CustomerInfo,
  FulfillmentTime,
  Order,
  OrderType,
  PaymentMethod,
} from "@/lib/types";
import { isNewCustomerByPhone } from "@/lib/customerIdentity";
import { pushOrderToLightspeed } from "@/lib/lightspeed/pushOrder";
import { appendOrderToInbox, readInboxOrders } from "@/lib/orders/inboxStore";
import { isOrderInboxConfigured } from "@/lib/orders/inboxConfig";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type SubmitOrderRequest = {
  cart?: CartItem[];
  customerInfo?: CustomerInfo;
  generalNote?: string;
  paymentMethod?: PaymentMethod;
  cashDenomination?: number;
  orderType?: OrderType;
  fulfillmentTime?: FulfillmentTime;
  deliveryFee?: number;
};

function badRequest(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function generateId(): string {
  // Keep the historical customer-facing order id format: e.g. CJ5MP4SMOE9T6SX.
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
}

function isValidFulfillmentTime(v: unknown): v is FulfillmentTime {
  if (!v || typeof v !== "object") return false;
  const x = v as Record<string, unknown>;
  if (x.mode === "asap") return true;
  return x.mode === "scheduled" && typeof x.scheduledFor === "string" && Boolean(x.scheduledFor);
}

function normalizeCustomerInfo(info: CustomerInfo, orderType: OrderType): CustomerInfo {
  return orderType === "takeaway"
    ? { ...info, address: "", zipCode: "" }
    : info;
}

function validateSubmit(body: SubmitOrderRequest): {
  cart: CartItem[];
  customerInfo: CustomerInfo;
  generalNote: string;
  paymentMethod: PaymentMethod;
  cashDenomination?: number;
  orderType: OrderType;
  fulfillmentTime: FulfillmentTime;
  deliveryFee: number;
} {
  const cart = body.cart;
  if (!Array.isArray(cart) || cart.length === 0) throw new Error("Cart is empty");
  for (const item of cart) {
    if (!item || typeof item !== "object") throw new Error("Invalid cart item");
    if (typeof item.name !== "string" || !item.name.trim()) throw new Error("Cart item is missing a name");
    if (typeof item.price !== "number" || item.price < 0) throw new Error("Cart item has an invalid price");
    if (!Number.isFinite(item.quantity) || item.quantity <= 0) throw new Error("Cart item has an invalid quantity");
  }

  const customerInfo = body.customerInfo;
  if (!customerInfo || typeof customerInfo !== "object") throw new Error("Customer info is missing");
  if (!customerInfo.name?.trim()) throw new Error("Customer name is required");
  if (!customerInfo.phone?.trim()) throw new Error("Customer phone is required");

  const orderType = body.orderType === "takeaway" ? "takeaway" : "delivery";
  if (orderType === "delivery" && !customerInfo.address?.trim()) {
    throw new Error("Delivery address is required");
  }

  const paymentMethod: PaymentMethod = body.paymentMethod === "cash" ? "cash" : "online";
  const cashDenomination =
    paymentMethod === "cash" && typeof body.cashDenomination === "number"
      ? body.cashDenomination
      : undefined;
  if (paymentMethod === "cash" && cashDenomination === undefined) {
    throw new Error("Cash denomination is required");
  }

  if (!isValidFulfillmentTime(body.fulfillmentTime)) {
    throw new Error("Fulfillment time is invalid");
  }

  return {
    cart,
    customerInfo: normalizeCustomerInfo(customerInfo, orderType),
    generalNote: body.generalNote?.trim() ?? "",
    paymentMethod,
    cashDenomination,
    orderType,
    fulfillmentTime: body.fulfillmentTime,
    deliveryFee: orderType === "takeaway" ? 0 : Math.max(0, body.deliveryFee ?? 0),
  };
}

export async function POST(req: Request) {
  let body: SubmitOrderRequest;
  try {
    body = (await req.json()) as SubmitOrderRequest;
  } catch {
    return badRequest("Invalid JSON");
  }

  let payload: ReturnType<typeof validateSubmit>;
  try {
    payload = validateSubmit(body);
  } catch (e) {
    return badRequest(e instanceof Error ? e.message : "Invalid order payload");
  }

  const subtotal = payload.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  if (payload.paymentMethod === "cash" && (payload.cashDenomination ?? 0) < subtotal + payload.deliveryFee) {
    return badRequest("Cash denomination is lower than the order total");
  }

  let existingOrders: Order[] = [];
  if (isOrderInboxConfigured()) {
    try {
      existingOrders = await readInboxOrders();
    } catch (e) {
      console.error("[order/submit] inbox read failed", e);
    }
  }

  const order: Order = {
    id: generateId(),
    items: payload.cart,
    subtotal,
    deliveryFee: payload.deliveryFee,
    total: subtotal + payload.deliveryFee,
    customerInfo: payload.customerInfo,
    generalNote: payload.generalNote,
    paymentMethod: payload.paymentMethod,
    ...(payload.paymentMethod === "cash" && payload.cashDenomination !== undefined
      ? { cashDenomination: payload.cashDenomination }
      : {}),
    orderType: payload.orderType,
    fulfillmentTime: payload.fulfillmentTime,
    status: "pending",
    createdAt: new Date().toISOString(),
    isFirstTimeCustomer: isNewCustomerByPhone(existingOrders, payload.customerInfo.phone),
  };

  const lightspeed = await pushOrderToLightspeed(order);
  const completedOrder: Order = { ...order, lightspeed };

  if (lightspeed.state !== "success") {
    return NextResponse.json(
      {
        ok: false,
        order: completedOrder,
        lightspeed,
        error: lightspeed.errorMessage ?? "Lightspeed did not accept the order",
      },
      { status: 502 }
    );
  }

  try {
    await appendOrderToInbox(completedOrder);
  } catch (e) {
    console.error("[order/submit] inbox write failed", e);
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : "Order could not be stored for the kitchen",
      },
      { status: 502 }
    );
  }

  return NextResponse.json({
    ok: true,
    order: completedOrder,
    lightspeed,
  });
}
