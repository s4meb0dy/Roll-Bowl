"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Clock, ArrowLeft, CreditCard, Banknote, Truck, Store, CalendarClock, AlertTriangle } from "lucide-react";
import { Suspense } from "react";
import { useStore } from "@/lib/store/useStore";
import { useT } from "@/lib/i18n";
import { shortOrderCode } from "@/lib/orderId";
import type { Order } from "@/lib/types";
import {
  loadPendingStripeCheckout,
  clearPendingStripeCheckout,
} from "@/lib/stripe/pendingOrder";
import { postOrderToInbox } from "@/lib/orders/postInboxClient";
import { pushOrderToPos, shouldRetryPosPush } from "@/lib/orders/pushPosClient";

const DELIVERY_PROGRESS_STEPS = [
  { icon: "📝", labelKey: "order.confirmed.status.confirmed" },
  { icon: "👨‍🍳", labelKey: "order.confirmed.status.preparing" },
  { icon: "🛵", labelKey: "order.confirmed.status.on_the_way" },
  { icon: "🏠", labelKey: "order.confirmed.status.delivered" },
] as const;

const TAKEAWAY_PROGRESS_STEPS = [
  { icon: "📝", labelKey: "order.confirmed.status.confirmed" },
  { icon: "👨‍🍳", labelKey: "order.confirmed.status.preparing" },
  { icon: "✅", labelKey: "order.confirmed.status.ready" },
  { icon: "🏪", labelKey: "order.confirmed.status.picked_up" },
] as const;

function ConfirmedContent() {
  const params = useSearchParams();
  const orderId = params.get("id");
  const stripeReturn = params.get("stripe_return");
  const paymentIntentId = params.get("payment_intent");
  const [dots, setDots] = useState(".");
  const t = useT();
  const orders = useStore((s) => s.orders);
  const sessionOrderType = useStore((s) => s.sessionOrderType);
  const placeOrder = useStore((s) => s.placeOrder);
  const setOrderLightspeed = useStore((s) => s.setOrderLightspeed);
  const [mounted, setMounted] = useState(false);
  const [stripeCompleting, setStripeCompleting] = useState(false);
  const [stripeError, setStripeError] = useState(false);
  const stripeReturnHandled = useRef(false);
  const inboxPostOk = useRef(false);
  const posPushDone = useRef(false);

  useEffect(() => { setMounted(true); }, []);

  const order = mounted ? orders.find((o) => o.id === orderId) : undefined;
  const isTakeaway =
    order?.orderType === "takeaway" ||
    (!order && sessionOrderType === "takeaway");
  const progressSteps = isTakeaway ? TAKEAWAY_PROGRESS_STEPS : DELIVERY_PROGRESS_STEPS;

  /** Complete order after Bancontact / iDEAL redirect back from Stripe. */
  useEffect(() => {
    if (
      !mounted ||
      !orderId ||
      stripeReturn !== "1" ||
      !paymentIntentId ||
      stripeReturnHandled.current
    ) {
      return;
    }
    const existing = useStore.getState().orders.find((o) => o.id === orderId);
    if (existing) {
      stripeReturnHandled.current = true;
      clearPendingStripeCheckout(orderId);
      return;
    }

    const pending = loadPendingStripeCheckout(orderId);
    if (!pending) {
      // Redirected back from Stripe but the checkout snapshot is gone: we can't
      // safely reconstruct the order. Surface an error instead of a fake success.
      stripeReturnHandled.current = true;
      setStripeError(true);
      return;
    }

    stripeReturnHandled.current = true;
    setStripeCompleting(true);

    void (async () => {
      try {
        await fetch("/api/stripe/save-pending-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId,
            items: pending.items,
            customerInfo: pending.customerInfo,
            generalNote: pending.generalNote,
            orderType: pending.orderType,
            fulfillmentTime: pending.fulfillmentTime,
            zipCode:
              pending.orderType === "takeaway"
                ? ""
                : pending.customerInfo.zipCode,
          }),
        });

        const verifyRes = await fetch("/api/stripe/verify-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentIntentId,
            orderId,
            amountCents: pending.amountCents,
          }),
        });
        if (!verifyRes.ok) {
          setStripeError(true);
          return;
        }

        const placed = placeOrder({
          customerInfo: pending.customerInfo,
          generalNote: pending.generalNote,
          paymentMethod: "online",
          orderType: pending.orderType,
          fulfillmentTime: pending.fulfillmentTime,
          orderId,
          stripePaymentIntentId: paymentIntentId,
          status: "paid",
          items: pending.items,
        });
        clearPendingStripeCheckout(orderId);
        await postOrderToInbox(placed);
        void pushOrderToPos(placed, setOrderLightspeed);
      } catch {
        setStripeError(true);
      } finally {
        setStripeCompleting(false);
      }
    })();
  }, [
    mounted,
    orderId,
    stripeReturn,
    paymentIntentId,
    placeOrder,
    setOrderLightspeed,
  ]);

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

  /**
   * POS push from /cart is often aborted during navigation (same as inbox).
   * Retry from this page; skip when POS is not configured or already accepted.
   */
  useEffect(() => {
    if (!orderId || typeof window === "undefined") return;

    const tryPush = () => {
      if (posPushDone.current) return;
      const o = useStore.getState().orders.find((x) => x.id === orderId);
      if (!o) return;
      if (!shouldRetryPosPush(o.lightspeed)) {
        posPushDone.current = true;
        return;
      }
      void pushOrderToPos(o, setOrderLightspeed).then(() => {
        const latest = useStore.getState().orders.find((x) => x.id === orderId);
        if (!shouldRetryPosPush(latest?.lightspeed)) posPushDone.current = true;
      });
    };

    tryPush();
    const t1 = setTimeout(tryPush, 400);
    const t2 = setTimeout(tryPush, 2_000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [orderId, orders, setOrderLightspeed]);

  useEffect(() => {
    const t = setInterval(
      () => setDots((d) => (d.length >= 3 ? "." : d + ".")),
      600
    );
    return () => clearInterval(t);
  }, []);

  if (stripeError && !order) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-cream px-4 pb-28 pt-10 text-center sm:px-6 sm:pb-8 sm:pt-12">
        <div className="flex w-full max-w-md flex-col items-center">
          <div className="mb-5 flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-amber-500 shadow-lg sm:mb-6 sm:h-20 sm:w-20">
            <AlertTriangle className="h-9 w-9 text-white sm:h-10 sm:w-10" />
          </div>
          <h1 className="font-display mb-2 text-2xl font-bold text-neutral-800 sm:text-3xl">
            {t("order.confirmed.error_title")}
          </h1>
          <p className="mb-6 max-w-sm text-[15px] leading-relaxed text-neutral-600 sm:text-base">
            {t("order.confirmed.error_body")}
          </p>
          <Link
            href="/cart"
            className="btn-primary flex w-full min-h-[48px] items-center justify-center gap-2 sm:w-auto sm:min-w-[200px] sm:px-8"
          >
            <ArrowLeft size={16} className="shrink-0" />
            {t("order.confirmed.order_again")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-cream px-4 pb-28 pt-10 text-center sm:justify-center sm:px-6 sm:pb-8 sm:pt-12">
      <div className="flex w-full max-w-md flex-col items-center">
      {/* Icon */}
      <div className="mb-5 flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-sage-500 shadow-lg sm:mb-6 sm:h-20 sm:w-20">
        <CheckCircle2 className="h-9 w-9 text-white sm:h-10 sm:w-10" />
      </div>

      <h1 className="font-display mb-2 text-2xl font-bold text-neutral-800 sm:text-3xl">
        {t("order.confirmed.title")}
      </h1>
      <p className="mb-3 max-w-sm text-[15px] leading-relaxed text-neutral-600 sm:text-base">
        {t("order.confirmed.subtitle")}{dots}
      </p>
      {orderId && (
        <p className="mb-3 text-sm text-neutral-500">
          {t("order.confirmed.order_id")}:{" "}
          <span className="break-all font-mono font-semibold text-neutral-700">
            #{shortOrderCode(orderId)}
          </span>
        </p>
      )}
      {orderId && order?.lightspeed?.state === "failed" && (
        <p className="mb-5 w-full rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm text-amber-950 sm:mb-6 sm:text-center">
          {t("order.confirmed.pos_failed")}{" "}
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
          {progressSteps.map((s, i) => (
            <div key={s.labelKey} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
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
                {t(s.labelKey)}
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
                {order.orderType === "takeaway" ? t("order.confirmed.takeaway") : t("order.confirmed.delivery")}
              </div>
              <div className="font-medium">
                {order.orderType === "takeaway" ? t("order_type.takeaway") : t("order_type.delivery")}
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
                {order.expectedReadyAt
                  ? t("order.confirmed.expected")
                  : order.fulfillmentTime.mode === "scheduled"
                  ? t("order.confirmed.scheduled")
                  : t("order.confirmed.asap")}
              </div>
              <div className="font-medium">
                {order.expectedReadyAt
                  ? t("order.confirmed.expected_ready", {
                      time: new Date(order.expectedReadyAt).toLocaleTimeString("nl-BE", {
                        hour: "2-digit",
                        minute: "2-digit",
                      }),
                    })
                  : order.fulfillmentTime.mode === "scheduled"
                  ? new Date(order.fulfillmentTime.scheduledFor).toLocaleString("nl-BE", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : order.orderType === "takeaway"
                  ? t("order.confirmed.eta_takeaway")
                  : t("order.confirmed.eta_delivery")}
              </div>
            </div>
          </div>
        </div>
      )}

      {!order && !stripeCompleting && (
        <div className="mb-4 flex w-full items-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-left text-sm text-amber-700">
          <Clock size={15} className="shrink-0" />
          <span>{t("order.confirmed.eta_fallback")}</span>
        </div>
      )}

      {stripeCompleting && (
        <div className="mb-4 flex w-full items-center gap-2 rounded-xl bg-sage-50 px-4 py-3 text-left text-sm text-sage-800">
          <Clock size={15} className="shrink-0 animate-pulse" />
          <span>{t("order.confirmed.stripe_completing")}</span>
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
                <p className="font-semibold">{t("payment.cash")}</p>
                <p className="mt-1 text-xs leading-relaxed sm:text-sm">
                  {order.orderType === "takeaway"
                    ? t("payment.cash_sub_takeaway")
                    : t("payment.cash_sub")}
                </p>
                {order.cashDenomination !== undefined && (
                  <p className="mt-1.5 text-xs leading-relaxed sm:text-sm">
                    {order.cashDenomination === order.total
                      ? t("payment.no_change")
                      : t(
                          order.orderType === "takeaway"
                            ? "payment.cash_banner_takeaway"
                            : "payment.cash_banner",
                          {
                            denomination: order.cashDenomination.toFixed(2),
                            change: (order.cashDenomination - order.total).toFixed(2),
                          }
                        )}
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="font-semibold">{t("payment.online")}</p>
                <p className="mt-1.5 text-xs leading-relaxed sm:text-sm">
                  {order.stripePaymentIntentId
                    ? t("payment.paid_online")
                    : t("payment.online_sub")}
                </p>
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
          {t("order.confirmed.order_again")}
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
