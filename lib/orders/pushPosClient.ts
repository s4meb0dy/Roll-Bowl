import type { Order, OrderLightspeedMeta } from "@/lib/types";

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
    });
    const data = (await res.json().catch(() => ({}))) as Partial<OrderLightspeedMeta> & {
      error?: string;
    };
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
