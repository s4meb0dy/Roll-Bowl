import type { Order, OrderLightspeedMeta } from "@/lib/types";

export function shouldRetryPosPush(lightspeed?: OrderLightspeedMeta): boolean {
  if (!lightspeed) return true;
  if (lightspeed.state === "success" || lightspeed.state === "skipped") return false;
  // Retry client/network failures; do not retry when POS returned an HTTP error.
  if (lightspeed.state === "failed" && lightspeed.httpStatus == null) return true;
  return false;
}

export async function pushOrderToPos(
  order: Order,
  setOrderLightspeed: (orderId: string, meta: OrderLightspeedMeta) => void
): Promise<void> {
  const id = order.id;
  try {
    const res = await fetch("/api/orders/push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order }),
      keepalive: true,
    });
    const data = (await res.json().catch(() => ({}))) as Partial<OrderLightspeedMeta> & {
      error?: string;
    };

    // Transient race, not a POS failure: for cash orders the server only pushes
    // to the POS once the order exists in the Redis inbox. When the POS push
    // arrives before the inbox write has committed, the API replies 404
    // `order_not_in_inbox`. Leave the lightspeed state unset so the caller keeps
    // retrying (shouldRetryPosPush stays true) and the customer never sees a
    // false "couldn't confirm with the cash register" warning — the order is
    // already on its way to the kitchen inbox.
    if (res.status === 404 && data.error === "order_not_in_inbox") {
      return;
    }

    if (data.state) {
      setOrderLightspeed(id, {
        state: data.state,
        pushedAt: data.pushedAt ?? new Date().toISOString(),
        saleId: data.saleId,
        accountIdentifier: data.accountIdentifier,
        errorMessage: data.errorMessage,
        httpStatus: data.httpStatus ?? (res.ok ? undefined : res.status),
        dryRun: data.dryRun,
      });
    } else {
      setOrderLightspeed(id, {
        state: "failed",
        pushedAt: new Date().toISOString(),
        errorMessage:
          data.errorMessage ?? data.error ?? res.statusText ?? "Onbekende POS-fout",
        httpStatus: res.status,
      });
    }
  } catch (e) {
    console.error("[orders/push] network error", e);
    setOrderLightspeed(id, {
      state: "failed",
      pushedAt: new Date().toISOString(),
      errorMessage: "Geen verbinding met keuken/POS. Bestelling lokaal opgeslagen.",
    });
  }
}
