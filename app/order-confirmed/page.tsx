"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Clock, ArrowLeft, CreditCard, Banknote, Truck, Store, CalendarClock } from "lucide-react";
import { Suspense } from "react";
import { useStore } from "@/lib/store/useStore";
import { useT } from "@/lib/i18n";
import type { Order } from "@/lib/types";

function ConfirmedContent() {
  const params = useSearchParams();
  const orderId = params.get("id");
  const [dots, setDots] = useState(".");
  const t = useT();
  const orders = useStore((s) => s.orders);
  const [mounted, setMounted] = useState(false);
  const inboxPostOk = useRef(false);

  useEffect(() => { setMounted(true); }, []);

  const order = mounted ? orders.find((o) => o.id === orderId) : undefined;

  /**
   * iOS Safari / some phones drop the first POST from /cart during soft navigation.
   * Re-POST the order from this stable page so Redis gets a reliable write.
   */
  useEffect(() => {
    if (!orderId || typeof window === "undefined") return;

    const post = async (o: Order) => {
      if (inboxPostOk.current) return;
      const url = `${window.location.origin}/api/orders/inbox`;
      let body: string;
      try {
        body = JSON.stringify(JSON.parse(JSON.stringify({ order: o })) as { order: Order });
      } catch {
        body = JSON.stringify({ order: o });
      }
      try {
        let r = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          keepalive: true,
        });
        if (r.ok) {
          inboxPostOk.current = true;
          return;
        }
        r = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          keepalive: true,
        });
        if (r.ok) inboxPostOk.current = true;
      } catch {
        /* retry via delayed ticks */
      }
    };

    const tryNow = () => {
      if (inboxPostOk.current) return;
      const o = useStore.getState().orders.find((x) => x.id === orderId);
      if (o) void post(o);
    };

    tryNow();
    const t1 = setTimeout(tryNow, 400);
    const t2 = setTimeout(tryNow, 2_000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [orderId, orders]);

  useEffect(() => {
    const t = setInterval(
      () => setDots((d) => (d.length >= 3 ? "." : d + ".")),
      600
    );
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center bg-cream px-4 pb-28 pt-10 text-center sm:justify-center sm:px-6 sm:pb-8 sm:pt-12">
      <div className="flex w-full max-w-md flex-col items-center">
      {/* Icon */}
      <div className="mb-5 flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-sage-500 shadow-lg sm:mb-6 sm:h-20 sm:w-20">
        <CheckCircle2 className="h-9 w-9 text-white sm:h-10 sm:w-10" />
      </div>

      <h1 className="font-display mb-2 text-2xl font-bold text-neutral-800 sm:text-3xl">
        Order confirmed!
      </h1>
      <p className="mb-3 max-w-sm text-[15px] leading-relaxed text-neutral-600 sm:text-base">
        We&apos;ve received your order and the kitchen is on it{dots}
      </p>
      {orderId && (
        <p className="mb-3 text-sm text-neutral-500">
          Order ID:{" "}
          <span className="break-all font-mono font-semibold text-neutral-700">
            #{orderId.toUpperCase()}
          </span>
        </p>
      )}
      {orderId && order?.lightspeed?.state === "success" && (
        <p className="mb-5 w-full rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-left text-sm font-medium text-emerald-900 sm:mb-6 sm:text-center">
          ✓ Doorgegeven aan de keuken (POS{order.lightspeed.saleId && order.lightspeed.saleId !== "dry-run" ? ` · ${order.lightspeed.saleId}` : ""}
          {order.lightspeed.dryRun && " — testmodus"}).
        </p>
      )}
      {orderId && order?.lightspeed?.state === "failed" && (
        <p className="mb-5 w-full rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm text-amber-950 sm:mb-6 sm:text-center">
          Je bestelling is binnen. Konden we niet bevestigen bij het kassasysteem — bel de zaak indien nodig.{" "}
          {order.lightspeed.errorMessage && <span className="mt-1 block text-xs opacity-90 sm:mt-0 sm:inline">({order.lightspeed.errorMessage.slice(0, 120)})</span>}
        </p>
      )}
      {orderId && order?.isFirstTimeCustomer && (
        <p className="mb-5 w-full rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm font-medium text-amber-950 sm:mb-6 sm:text-center">
          {t("order.first_order_welcome")}
        </p>
      )}

      {/* Status card */}
      <div className="mb-6 w-full rounded-2xl border border-sage-100 bg-white p-4 shadow-card sm:mb-8 sm:p-6">
        <div className="flex items-start justify-between gap-1.5 sm:gap-2">
          {[
            { icon: "📝", label: "Confirmed" },
            { icon: "👨‍🍳", label: "Preparing" },
            { icon: "🛵", label: "On the way" },
            { icon: "🏠", label: "Delivered" },
          ].map((s, i) => (
            <div key={s.label} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full text-base sm:h-10 sm:w-10 sm:text-lg ${
                  i === 0
                    ? "bg-sage-500 shadow-sm"
                    : "bg-neutral-100"
                }`}
              >
                {s.icon}
              </div>
              <span
                className={`max-w-[4.5rem] text-[9px] font-medium leading-tight sm:max-w-none sm:text-[11px] ${
                  i === 0 ? "text-sage-600" : "text-neutral-400"
                }`}
              >
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Order type + fulfillment time */}
      {order && (
        <div className="mb-2 grid w-full grid-cols-1 gap-2.5 sm:grid-cols-2">
          <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-left text-sm text-neutral-700">
            {order.orderType === "takeaway" ? (
              <Store size={15} className="flex-shrink-0 text-wood-500" />
            ) : (
              <Truck size={15} className="flex-shrink-0 text-sage-500" />
            )}
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
                {order.orderType === "takeaway" ? "Afhalen" : "Bezorging"}
              </div>
              <div className="font-medium">
                {order.orderType === "takeaway" ? "Takeaway" : "Delivery"}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-left text-sm text-neutral-700">
            {order.fulfillmentTime.mode === "scheduled" ? (
              <CalendarClock size={15} className="flex-shrink-0 text-sage-500" />
            ) : (
              <Clock size={15} className="flex-shrink-0 text-sage-500" />
            )}
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
                {order.fulfillmentTime.mode === "scheduled" ? "Gepland" : "Zo snel mogelijk"}
              </div>
              <div className="font-medium">
                {order.fulfillmentTime.mode === "scheduled"
                  ? new Date(order.fulfillmentTime.scheduledFor).toLocaleString("nl-BE", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : order.orderType === "takeaway"
                  ? "15–25 min"
                  : "30–45 min"}
              </div>
            </div>
          </div>
        </div>
      )}

      {!order && (
        <div className="mb-4 flex w-full items-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-left text-sm text-amber-700">
          <Clock size={15} className="shrink-0" />
          <span>Estimated delivery: <strong>30–45 minutes</strong></span>
        </div>
      )}

      {/* Payment info */}
      {order && (
        <div className={`mt-1 flex w-full items-start gap-3 rounded-2xl border px-4 py-4 sm:px-5 ${
          order.paymentMethod === "cash"
            ? "border-amber-200 bg-amber-50 text-amber-800"
            : "border-sage-200 bg-sage-50 text-sage-800"
        }`}>
          <div className="mt-0.5 flex-shrink-0">
            {order.paymentMethod === "cash"
              ? <Banknote size={18} />
              : <CreditCard size={18} />}
          </div>
          <div className="min-w-0 flex-1 text-left text-sm sm:text-sm">
            {order.paymentMethod === "cash" ? (
              <>
                <p className="font-semibold">Contant betalen</p>
                {order.cashDenomination !== undefined && (
                  <p className="mt-1.5 text-xs leading-relaxed sm:text-sm">
                    {order.cashDenomination === order.total
                      ? "Exact bedrag — geen wisselgeld nodig."
                      : `Zorg voor €${order.cashDenomination.toFixed(2)} — de koerier geeft €${(order.cashDenomination - order.total).toFixed(2)} wisselgeld terug.`}
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="font-semibold">Online / Kaart</p>
                <p className="mt-1.5 text-xs leading-relaxed sm:text-sm">Betaal bij levering via kaart of app.</p>
              </>
            )}
          </div>
        </div>
      )}

      <div className="mt-6 w-full sm:mt-8">
        <Link
          href="/menu"
          className="btn-secondary flex w-full min-h-[48px] items-center justify-center gap-2 sm:w-auto sm:min-w-[200px] sm:px-8"
        >
          <ArrowLeft size={16} className="shrink-0" />
          Order again
        </Link>
      </div>
      </div>
    </div>
  );
}

export default function OrderConfirmedPage() {
  return (
    <Suspense>
      <ConfirmedContent />
    </Suspense>
  );
}
