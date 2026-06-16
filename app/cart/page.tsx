"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Trash2,
  ChevronRight,
  Loader2,
  MessageSquare,
  AlertCircle,
  CreditCard,
  Banknote,
  CheckCircle2,
  Truck,
  Store,
  Clock,
  CalendarClock,
} from "lucide-react";
import Link from "next/link";
import Header from "@/components/Header";
import { useStore } from "@/lib/store/useStore";
import { useT } from "@/lib/i18n";
import type { CustomerInfo, PaymentMethod, OrderType, FulfillmentTime } from "@/lib/types";
import {
  getAvailableTimeSlots,
  isOpenNow,
  getTodayLastClose,
  formatClosingTime,
  TAKEAWAY_DELIVERY_FEE,
  TAKEAWAY_MIN_ORDER,
  type TimeSlot,
} from "@/lib/deliveryConfig";
import QuantityStepper from "@/components/QuantityStepper";
import CafeClosedNotice from "@/components/CafeClosedNotice";
import {
  StripePaymentSection,
  isStripePublishableConfigured,
  type StripePaymentHandle,
} from "@/components/StripePaymentForm";
import { generateOrderId } from "@/lib/orderId";
import { computeOrderAmounts } from "@/lib/stripe/orderTotal";
import {
  savePendingStripeCheckout,
  clearPendingStripeCheckout,
} from "@/lib/stripe/pendingOrder";
import { postOrderToInbox } from "@/lib/orders/postInboxClient";

export default function CartPage() {
  const router = useRouter();
  const t = useT();
  const cart = useStore((s) => s.cart);
  const zipCode = useStore((s) => s.zipCode);
  const zipCodeConfig = useStore((s) => s.zipCodeConfig);
  const deliveryAddress = useStore((s) => s.deliveryAddress);
  const removeFromCart = useStore((s) => s.removeFromCart);
  const updateQuantity = useStore((s) => s.updateQuantity);
  const updateNote = useStore((s) => s.updateNote);
  const placeOrder = useStore((s) => s.placeOrder);

  const [mounted, setMounted] = useState(false);
  const [expandedNote, setExpandedNote] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const [generalNote, setGeneralNote] = useState("");
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    name: "",
    phone: "",
    address: "",
    zipCode: "",
  });
  const [errors, setErrors] = useState<Partial<CustomerInfo>>({});
  const stripeEnabled = isStripePublishableConfigured();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    stripeEnabled ? "online" : "cash"
  );
  const [stripeOrderId, setStripeOrderId] = useState<string | null>(null);
  const [stripeClientSecret, setStripeClientSecret] = useState<string | null>(null);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [stripeError, setStripeError] = useState<string | null>(null);
  const [stripeFormReady, setStripeFormReady] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const stripePaymentRef = useRef<StripePaymentHandle>(null);
  const [cashDenomination, setCashDenomination] = useState<number | null>(null);
  const [customCash, setCustomCash] = useState("");
  const [orderType, setOrderType] = useState<OrderType>("delivery");
  const [timeMode, setTimeMode] = useState<"asap" | "scheduled">("asap");
  const [scheduledSlot, setScheduledSlot] = useState<string>("");
  // Tick every minute so the time-slot picker stays fresh without a page reload.
  const [nowTick, setNowTick] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      setCustomerInfo((prev) => ({
        ...prev,
        ...(zipCode ? { zipCode } : {}),
        ...(deliveryAddress ? { address: deliveryAddress } : {}),
      }));
    }
  }, [mounted, zipCode, deliveryAddress]);

  useEffect(() => {
    const id = setInterval(() => setNowTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  // Regenerate available slots whenever the clock ticks past a minute so the
  // earliest selectable time always honours the 30-min prep lead.
  // NOTE: hook MUST run on every render (including pre-mount) to keep the
  // hook order stable across the `!mounted` early return below.
  const timeSlots = useMemo<TimeSlot[]>(
    () => (mounted ? getAvailableTimeSlots(new Date()) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mounted, nowTick],
  );

  const closeTimeLabel = useMemo(() => {
    const last = getTodayLastClose(new Date());
    return last ? formatClosingTime(last.hour, last.minute) : "23:00";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, nowTick]);

  const cafeOpen = useMemo(
    () => (mounted ? isOpenNow(new Date()) : true),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mounted, nowTick],
  );

  // Drop stale selection if the slot has rolled out of the available window.
  useEffect(() => {
    if (
      timeMode === "scheduled" &&
      scheduledSlot &&
      !timeSlots.some((s) => s.value === scheduledSlot)
    ) {
      setScheduledSlot("");
    }
  }, [timeSlots, timeMode, scheduledSlot]);

  useEffect(() => {
    if (!mounted || !stripeEnabled || paymentMethod !== "online" || cart.length === 0) {
      setStripeClientSecret(null);
      return;
    }

    const orderId = stripeOrderId ?? generateOrderId();
    if (!stripeOrderId) setStripeOrderId(orderId);

    const ac = new AbortController();
    setStripeLoading(true);
    setStripeError(null);
    setStripeFormReady(false);

    void (async () => {
      try {
        const res = await fetch("/api/stripe/create-payment-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId,
            items: cart,
            orderType,
            zipCode:
              orderType === "takeaway" ? "" : customerInfo.zipCode || zipCode,
            customerName: customerInfo.name,
            customerPhone: customerInfo.phone,
          }),
          signal: ac.signal,
        });
        const data = (await res.json()) as {
          clientSecret?: string;
          error?: string;
        };
        if (!res.ok || !data.clientSecret) {
          throw new Error(data.error ?? "stripe_error");
        }
        setStripeClientSecret(data.clientSecret);
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        setStripeClientSecret(null);
        setStripeError(t("payment.stripe_error"));
      } finally {
        if (!ac.signal.aborted) setStripeLoading(false);
      }
    })();

    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    mounted,
    stripeEnabled,
    paymentMethod,
    cart,
    orderType,
    customerInfo.zipCode,
    customerInfo.name,
    customerInfo.phone,
    zipCode,
  ]);

  useEffect(() => {
    setStripeFormReady(false);
  }, [stripeClientSecret]);

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-sage-200 border-t-sage-500" />
      </div>
    );
  }

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const isTakeaway = orderType === "takeaway";
  const deliveryFee = isTakeaway ? TAKEAWAY_DELIVERY_FEE : zipCodeConfig?.deliveryFee ?? 0;
  const minOrder = isTakeaway ? TAKEAWAY_MIN_ORDER : zipCodeConfig?.minOrder ?? 0;
  const total = subtotal + deliveryFee;
  const belowMinimum = subtotal < minOrder;

  const formatSlotLabel = (slot: TimeSlot): string => {
    const hh = String(slot.hour).padStart(2, "0");
    const mm = String(slot.minute).padStart(2, "0");
    const prefix =
      slot.dayOffset === 0
        ? ""
        : slot.dayOffset === 1
        ? `${t("time.tomorrow")} · `
        : `${slot.date.toLocaleDateString(undefined, { day: "2-digit", month: "2-digit" })} · `;
    return `${prefix}${hh}:${mm}`;
  };

  const validate = (): boolean => {
    const e: Partial<CustomerInfo> = {};
    if (!customerInfo.name.trim()) e.name = t("val.name");
    if (!customerInfo.phone.trim()) e.phone = t("val.phone");
    // Address / zipcode are only required for delivery orders.
    if (!isTakeaway && !customerInfo.address.trim()) e.address = t("val.address");
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const finishOrder = (order: ReturnType<typeof placeOrder>) => {
    const id = order.id;
    setPlacing(false);
    router.push(`/order-confirmed?id=${id}`);
    // Inbox/POS retry from order-confirmed — navigation can abort fetches from /cart.
    void postOrderToInbox(order);
  };

  const handlePlaceOrder = async () => {
    if (!validate() || belowMinimum) return;
    if (paymentMethod === "cash" && (cashDenomination === null || cashDenomination < total)) return;
    if (timeMode === "scheduled" && !scheduledSlot) return;
    if (!isOpenNow(new Date()) && timeMode === "asap") return;

    const fulfillmentTime: FulfillmentTime =
      timeMode === "asap"
        ? { mode: "asap" }
        : { mode: "scheduled", scheduledFor: scheduledSlot };

    const finalCustomerInfo: CustomerInfo = isTakeaway
      ? { ...customerInfo, address: "", zipCode: "" }
      : customerInfo;

    const { amountCents } = computeOrderAmounts(
      cart,
      orderType,
      isTakeaway ? "" : finalCustomerInfo.zipCode || zipCode
    );

    if (paymentMethod === "online" && stripeEnabled) {
      if (!stripeClientSecret || !stripeOrderId) return;
      setPaymentError(null);
      setPlacing(true);

      savePendingStripeCheckout({
        orderId: stripeOrderId,
        items: cart,
        customerInfo: finalCustomerInfo,
        generalNote,
        orderType,
        fulfillmentTime,
        amountCents,
      });

      const returnUrl = `${window.location.origin}/order-confirmed?id=${stripeOrderId}&stripe_return=1`;
      const result = await stripePaymentRef.current?.confirmPayment(returnUrl);
      if (!result?.ok) {
        setPaymentError(result?.error ?? t("payment.stripe_error"));
        setPlacing(false);
        return;
      }

      const verifyRes = await fetch("/api/stripe/verify-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentIntentId: result.paymentIntentId,
          orderId: stripeOrderId,
          amountCents,
        }),
      });
      if (!verifyRes.ok) {
        setPaymentError(t("payment.stripe_error"));
        setPlacing(false);
        return;
      }

      const order = placeOrder({
        customerInfo: finalCustomerInfo,
        generalNote,
        paymentMethod: "online",
        orderType,
        fulfillmentTime,
        orderId: stripeOrderId,
        stripePaymentIntentId: result.paymentIntentId,
        status: "paid",
      });
      clearPendingStripeCheckout(stripeOrderId);
      finishOrder(order);
      return;
    }

    setPlacing(true);
    await new Promise((r) => setTimeout(r, 900));

    const order = placeOrder({
      customerInfo: finalCustomerInfo,
      generalNote,
      paymentMethod,
      cashDenomination: cashDenomination ?? undefined,
      orderType,
      fulfillmentTime,
    });
    finishOrder(order);
  };

  // Preset euro bill denominations
  const DENOMINATIONS = [10, 20, 50, 100, 200];

  const placeOrderBlockReason = (() => {
    if (placing) return null;
    if (belowMinimum) {
      return t("cart.min_warning", {
        amount: minOrder.toFixed(2),
        diff: (minOrder - subtotal).toFixed(2),
      });
    }
    const noSlotsToday = timeSlots.length === 0;
    if (noSlotsToday) {
      return t("time.closed_after_hours", { closeTime: closeTimeLabel });
    }
    if (!cafeOpen && timeMode === "asap") {
      return t("time.closed_asap_pick_later", { closeTime: closeTimeLabel });
    }
    if (timeMode === "scheduled" && !scheduledSlot) {
      return t("time.slot_required");
    }
    if (paymentMethod === "cash") {
      if (cashDenomination === null) return t("payment.denomination_required");
      if (cashDenomination < total) {
        return t("payment.denomination_low", { total: total.toFixed(2) });
      }
    }
    if (paymentMethod === "online" && stripeEnabled) {
      if (stripeLoading) return t("payment.stripe_loading");
      if (!stripeClientSecret || !stripeFormReady) return t("payment.stripe_wait");
    }
    return null;
  })();

  const placeOrderDisabled =
    placing ||
    belowMinimum ||
    timeSlots.length === 0 ||
    (paymentMethod === "cash" &&
      (cashDenomination === null || cashDenomination < total)) ||
    (paymentMethod === "online" &&
      stripeEnabled &&
      (!stripeClientSecret || stripeLoading || !stripeFormReady)) ||
    (timeMode === "scheduled" && !scheduledSlot) ||
    (!cafeOpen && timeMode === "asap");

  const formatComponents = (item: (typeof cart)[0]): string => {
    if (item.type !== "custom" || !item.components) return "";
    const { base, protein, toppings, sauce } = item.components;
    const parts = [
      base?.name,
      protein?.name,
      toppings.map((t) => t.name).join(", "),
      sauce?.name,
    ].filter(Boolean);
    return parts.join(" · ");
  };

  const formatSmoothieSelections = (item: (typeof cart)[0]): string => {
    const s = item.smoothieSelections;
    if (!s) return "";
    const parts: string[] = [];
    if (s.basis) parts.push(s.basis.name);
    [s.mixin1, s.mixin2, s.mixin3].forEach((m) => { if (m) parts.push(m.name); });
    if (s.extraMixin) parts.push(s.extraMixin.name);
    if (s.proteinScoop) parts.push(`${s.proteinScoop.name} scoop`);
    return parts.join(" · ");
  };

  const formatBurritoSelections = (item: (typeof cart)[0]): string => {
    const s = item.burritoSelections;
    if (!s) return "";
    const parts: string[] = [];
    if (s.protein && s.protein.name !== "Geen proteine") parts.push(s.protein.name);
    if (s.saus && s.saus.name !== "Geen saus") parts.push(s.saus.name);
    [s.mixin1, s.mixin2, s.mixin3].forEach((m) => { if (m) parts.push(m.name); });
    if (s.extraMixin) parts.push(`+ ${s.extraMixin.name}`);
    [s.topping1, s.topping2].forEach((t) => { if (t && t.name !== "Geen toppings") parts.push(t.name); });
    if (s.extraTopping) parts.push(`+ ${s.extraTopping.name}`);
    return parts.join(" · ");
  };

  const formatClassicRollSelections = (item: (typeof cart)[0]): string => {
    const s = item.classicRollSelections;
    if (!s) return "";
    const parts: string[] = [];
    if (s.protein) parts.push(s.protein.name);
    [s.mixin1, s.mixin2].forEach((m) => { if (m) parts.push(m.name); });
    if (s.sauce && s.sauce.name !== "Geen saus") parts.push(s.sauce.name);
    return parts.join(" · ");
  };

  const formatInsideOutRollSelections = (item: (typeof cart)[0]): string => {
    const s = item.insideOutRollSelections;
    if (!s) return "";
    const parts: string[] = [];
    if (s.protein) parts.push(s.protein.name);
    [s.mixin1, s.mixin2].forEach((m) => { if (m) parts.push(m.name); });
    if (s.sauce && s.sauce.name !== "Geen saus") parts.push(s.sauce.name);
    if (s.topping && s.topping.name !== "Geen topping") parts.push(s.topping.name);
    return parts.join(" · ");
  };

  const formatPokeSelections = (item: (typeof cart)[0]): string => {
    const s = item.pokeSelections;
    if (!s) return "";
    const parts: string[] = [];
    if (s.basis) parts.push(s.basis.name);
    if (s.saus1 && s.saus1.name !== "Geen saus") parts.push(s.saus1.name);
    if (s.saus2 && s.saus2.name !== "Geen saus") parts.push(s.saus2.name);
    if (s.protein && s.protein.name !== "Geen proteine") parts.push(s.protein.name);
    if (s.extraProtein) parts.push(`+ ${s.extraProtein.name}`);
    [s.mixin1, s.mixin2, s.mixin3, s.mixin4, s.mixin5].forEach((m) => {
      if (m) parts.push(m.name);
    });
    if (s.extraMixin) parts.push(`+ ${s.extraMixin.name}`);
    [s.topping1, s.topping2, s.topping3].forEach((t) => {
      if (t && t.name !== "Geen toppings") parts.push(t.name);
    });
    if (s.extraTopping) parts.push(`+ ${s.extraTopping.name}`);
    return parts.join(" · ");
  };

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-cream-100">
        <Header />
        <div className="flex flex-col items-center justify-center px-4 py-32 pb-28 text-center md:pb-32">
          <div className="mb-4 text-6xl">🛒</div>
          <h2 className="font-display text-2xl font-bold text-ink-900">
            {t("cart.empty_title")}
          </h2>
          <p className="mt-2 text-ink-500">{t("cart.empty_sub")}</p>
          <Link href="/menu" className="btn-primary mt-6">
            {t("cart.browse_menu")}
            <ChevronRight size={16} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream-100">
      <Header />

      <main className="mx-auto max-w-6xl overflow-x-clip px-4 py-8 pb-28 sm:px-6 md:pb-8">
        <h1 className="font-display mb-6 text-3xl font-bold text-ink-900">
          {t("cart.title")}
        </h1>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
          <div className="space-y-3">
            {cart.map((item) => (
              <div key={item.cartId} className="card p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">
                        {item.type === "poke-builder"
                          ? t("type.poke_bowl")
                          : item.type === "burrito"
                          ? t("type.poke_burrito")
                          : item.type === "burrito-builder"
                          ? t("type.poke_burrito")
                          : item.type === "classic-roll-builder"
                          ? t("type.classic_roll")
                          : item.type === "inside-out-roll-builder"
                          ? t("type.inside_out_roll")
                          : item.type === "smoothie"
                          ? t("type.smoothie")
                          : item.type === "smoothie-builder"
                          ? t("type.smoothie")
                          : item.type === "item"
                          ? t("type.extra")
                          : item.type === "custom"
                          ? t("type.custom")
                          : t("type.poke_bowl")}
                      </span>
                    </div>
                    <h3 className="mt-0.5 font-semibold text-ink-900 truncate">
                      {item.name}
                    </h3>
                    {item.type === "custom" && item.components && (
                      <p className="mt-0.5 text-xs text-ink-500 leading-relaxed">
                        {formatComponents(item)}
                      </p>
                    )}
                    {item.type === "poke-builder" && item.pokeSelections && (
                      <p className="mt-0.5 text-xs text-ink-500 leading-relaxed line-clamp-2">
                        {formatPokeSelections(item)}
                      </p>
                    )}
                    {item.type === "burrito-builder" && item.burritoSelections && (
                      <p className="mt-0.5 text-xs text-ink-500 leading-relaxed line-clamp-2">
                        {formatBurritoSelections(item)}
                      </p>
                    )}
                    {item.type === "classic-roll-builder" && item.classicRollSelections && (
                      <p className="mt-0.5 text-xs text-ink-500 leading-relaxed line-clamp-2">
                        {formatClassicRollSelections(item)}
                      </p>
                    )}
                    {item.type === "inside-out-roll-builder" && item.insideOutRollSelections && (
                      <p className="mt-0.5 text-xs text-ink-500 leading-relaxed line-clamp-2">
                        {formatInsideOutRollSelections(item)}
                      </p>
                    )}
                    {item.type === "smoothie-builder" && item.smoothieSelections && (
                      <p className="mt-0.5 text-xs text-ink-500 leading-relaxed line-clamp-2">
                        {formatSmoothieSelections(item)}
                      </p>
                    )}
                    {item.type === "ready-made" &&
                      (item.selectedSize || item.selectedBase) && (
                        <p className="mt-0.5 text-xs text-ink-500">
                          {[item.selectedSize?.label, item.selectedBase?.name]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      )}
                    {item.note && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-gold-700">
                        <MessageSquare size={11} />
                        {item.note}
                      </p>
                    )}
                  </div>
                  <div className="font-display text-right font-bold text-gold-700 tabular-nums shrink-0">
                    €{(item.price * item.quantity).toFixed(2)}
                  </div>
                </div>

                <div className="mt-3 flex flex-col gap-3 min-[400px]:flex-row min-[400px]:items-center min-[400px]:justify-between">
                  <div className="flex items-center gap-3">
                    <QuantityStepper
                      value={item.quantity}
                      onChange={(v) => updateQuantity(item.cartId, v)}
                      min={0}
                      max={999}
                    />
                    <span className="text-xs tabular-nums text-ink-400">
                      €{item.price.toFixed(2)} {t("cart.each")}
                    </span>
                  </div>

                  <div className="flex w-full min-w-0 items-center justify-end gap-1 min-[400px]:w-auto min-[400px]:justify-end">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedNote(
                          expandedNote === item.cartId ? null : item.cartId
                        )
                      }
                      className="btn-ghost min-w-0 text-xs text-ink-500"
                    >
                      {t("cart.note_btn")}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.cartId)}
                      className="btn-ghost shrink-0 text-ink-400 hover:text-red-500"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {expandedNote === item.cartId && (
                  <div className="mt-3 animate-slide-up">
                    <input
                      type="text"
                      value={item.note}
                      onChange={(e) => updateNote(item.cartId, e.target.value)}
                      placeholder={t("cart.item_note_ph")}
                      className="input-field text-sm"
                    />
                  </div>
                )}
              </div>
            ))}

            <div className="card p-4">
              <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink-800">
                <MessageSquare size={14} className="text-sage-500" />
                {t("cart.general_note")}
              </label>
              <textarea
                value={generalNote}
                onChange={(e) => setGeneralNote(e.target.value)}
                placeholder={t("cart.general_note_ph")}
                rows={2}
                className="input-field resize-none text-sm"
              />
            </div>
          </div>

          <div className="lg:sticky lg:top-24 lg:self-start lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
            <div className="card divide-y divide-ink-200/60">
              <CafeClosedNotice className="m-0 border-0 border-b border-amber-200/80 bg-amber-50/95 p-4" />
              {/* Order summary */}
              <section className="p-5">
                <h2 className="mb-4 font-semibold text-ink-900">
                  {t("cart.summary")}
                </h2>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-ink-600">
                    <span>{t("order_type.label")}</span>
                    <span className="font-medium text-ink-900">
                      {isTakeaway ? t("order_type.takeaway") : t("order_type.delivery")}
                    </span>
                  </div>
                  <div className="flex justify-between text-ink-600">
                    <span>{t("time.label")}</span>
                    <span className="font-medium text-ink-900">
                      {timeMode === "asap"
                        ? t("time.asap")
                        : scheduledSlot
                        ? (() => {
                            const s = timeSlots.find((x) => x.value === scheduledSlot);
                            return s ? formatSlotLabel(s) : t("time.pick_slot");
                          })()
                        : t("time.pick_slot")}
                    </span>
                  </div>
                  <div className="flex justify-between text-ink-600">
                    <span>{t("cart.subtotal")}</span>
                    <span className="tabular-nums">€{subtotal.toFixed(2)}</span>
                  </div>
                  {!isTakeaway && (
                    <div className="flex justify-between text-ink-600">
                      <span>{t("cart.delivery_fee")}</span>
                      <span className="tabular-nums">€{deliveryFee.toFixed(2)}</span>
                    </div>
                  )}
                  {belowMinimum && (
                    <div className="flex items-center gap-1.5 rounded-xl2 bg-amber-50 p-2.5 text-xs text-amber-700">
                      <AlertCircle size={13} />
                      {t("cart.min_warning", {
                        amount: minOrder.toFixed(2),
                        diff: (minOrder - subtotal).toFixed(2),
                      })}
                    </div>
                  )}
                  <div className="flex justify-between border-t border-ink-200/60 pt-2 font-display text-lg font-bold text-ink-900">
                    <span>{t("cart.total")}</span>
                    <span className="tabular-nums text-gold-700">€{total.toFixed(2)}</span>
                  </div>
                </div>
              </section>

              {/* Order type + fulfillment time */}
              <section className="p-5">
                <h2 className="mb-4 font-semibold text-ink-900">
                  {t("order_type.title")}
                </h2>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setOrderType("delivery")}
                    className={`flex w-full min-w-0 items-center justify-center gap-2 rounded-xl2 border px-3 py-3 text-sm font-semibold transition-transform motion-reduce:transition-none tap-target active:scale-[0.98] motion-reduce:active:scale-100 ${
                      orderType === "delivery"
                        ? "border-gold-300 bg-gold-50 text-gold-700 shadow-sm"
                        : "border-ink-200 bg-white text-ink-600 hover:border-ink-300"
                    }`}
                  >
                    <Truck size={16} className="flex-shrink-0" />
                    <span>{t("order_type.delivery")}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderType("takeaway")}
                    className={`flex w-full min-w-0 items-center justify-center gap-2 rounded-xl2 border px-3 py-3 text-sm font-semibold transition-transform motion-reduce:transition-none tap-target active:scale-[0.98] motion-reduce:active:scale-100 ${
                      orderType === "takeaway"
                        ? "border-gold-300 bg-gold-50 text-gold-700 shadow-sm"
                        : "border-ink-200 bg-white text-ink-600 hover:border-ink-300"
                    }`}
                  >
                    <Store size={16} className="flex-shrink-0" />
                    <span>{t("order_type.takeaway")}</span>
                  </button>
                </div>

                <p className="mt-2 text-xs text-ink-500">
                  {isTakeaway
                    ? t("order_type.takeaway_sub")
                    : t("order_type.delivery_sub", {
                        area: zipCodeConfig?.area || "jouw zone",
                      })}
                </p>

                <div className="mt-5">
                  <p className="mb-2 text-sm font-semibold text-ink-800">
                    {t("time.title")}
                  </p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => { setTimeMode("asap"); setScheduledSlot(""); }}
                      className={`flex w-full min-w-0 items-center justify-center gap-2 rounded-xl2 border px-3 py-3 text-sm font-semibold transition-transform motion-reduce:transition-none tap-target active:scale-[0.98] motion-reduce:active:scale-100 ${
                        timeMode === "asap"
                          ? "border-gold-300 bg-gold-50 text-gold-700 shadow-sm"
                          : "border-ink-200 bg-white text-ink-600 hover:border-ink-300"
                      }`}
                    >
                      <Clock size={16} className="flex-shrink-0" />
                      <span>{t("time.asap")}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTimeMode("scheduled")}
                      className={`flex w-full min-w-0 items-center justify-center gap-2 rounded-xl2 border px-3 py-3 text-sm font-semibold transition-transform motion-reduce:transition-none tap-target active:scale-[0.98] motion-reduce:active:scale-100 ${
                        timeMode === "scheduled"
                          ? "border-gold-300 bg-gold-50 text-gold-700 shadow-sm"
                          : "border-ink-200 bg-white text-ink-600 hover:border-ink-300"
                      }`}
                    >
                      <CalendarClock size={16} className="flex-shrink-0" />
                      <span>{t("time.scheduled")}</span>
                    </button>
                  </div>

                  {timeMode === "scheduled" && (
                    <div className="mt-3 animate-slide-up">
                      {timeSlots.length > 0 ? (
                        <select
                          value={scheduledSlot}
                          onChange={(e) => setScheduledSlot(e.target.value)}
                          className="input-field text-sm"
                        >
                          <option value="">{t("time.pick_slot")}</option>
                          {timeSlots.map((slot) => (
                            <option key={slot.value} value={slot.value}>
                              {formatSlotLabel(slot)}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="flex items-center gap-2 rounded-xl2 bg-amber-50 px-3 py-2.5 text-xs text-amber-700">
                          <AlertCircle size={13} />
                          {t("time.no_slots", { closeTime: closeTimeLabel })}
                        </div>
                      )}
                      {timeMode === "scheduled" && !scheduledSlot && timeSlots.length > 0 && (
                        <p className="mt-1.5 text-xs text-ink-500">
                          {t("time.slot_required")}
                        </p>
                      )}
                    </div>
                  )}

                  {timeMode === "asap" && (
                    <p className="mt-2 text-xs text-ink-500">
                      {isTakeaway ? t("time.asap_sub_takeaway") : t("time.asap_sub_delivery")}
                    </p>
                  )}

                  {!cafeOpen && timeMode === "asap" && timeSlots.length > 0 && (
                    <p className="mt-2 flex items-start gap-1.5 text-xs font-medium text-amber-800">
                      <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                      {t("time.closed_pick_scheduled")}
                    </p>
                  )}
                </div>
              </section>

              {/* Customer info */}
              <section className="p-5">
                <h2 className="mb-4 font-semibold text-ink-900">
                  {isTakeaway ? t("cart.pickup_details") : t("cart.delivery_details")}
                </h2>
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-ink-600">
                      {t("cart.full_name")}
                    </label>
                    <input
                      type="text"
                      value={customerInfo.name}
                      onChange={(e) =>
                        setCustomerInfo((p) => ({ ...p, name: e.target.value }))
                      }
                      placeholder="Jane Doe"
                      className={`input-field ${errors.name ? "border-red-300" : ""}`}
                    />
                    {errors.name && (
                      <p className="mt-1 text-xs text-red-500">{errors.name}</p>
                    )}
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-ink-600">
                      {t("cart.phone")}
                    </label>
                    <input
                      type="tel"
                      value={customerInfo.phone}
                      onChange={(e) =>
                        setCustomerInfo((p) => ({ ...p, phone: e.target.value }))
                      }
                      placeholder="+32 123 456 789"
                      className={`input-field ${errors.phone ? "border-red-300" : ""}`}
                    />
                    {errors.phone && (
                      <p className="mt-1 text-xs text-red-500">{errors.phone}</p>
                    )}
                  </div>

                  {!isTakeaway && (
                    <>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-ink-600">
                          {t("cart.delivery_address")}
                        </label>
                        <input
                          type="text"
                          value={customerInfo.address}
                          onChange={(e) =>
                            setCustomerInfo((p) => ({
                              ...p,
                              address: e.target.value,
                            }))
                          }
                          placeholder="Rue de la Loi 1"
                          className={`input-field ${errors.address ? "border-red-300" : ""}`}
                        />
                        {errors.address && (
                          <p className="mt-1 text-xs text-red-500">{errors.address}</p>
                        )}
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-medium text-ink-600">
                          {t("cart.postal_code")}
                        </label>
                        <input
                          type="text"
                          value={customerInfo.zipCode}
                          readOnly
                          className="input-field bg-ink-50 text-ink-500"
                        />
                      </div>
                    </>
                  )}

                  {isTakeaway && (
                    <div className="flex items-start gap-2 rounded-xl2 bg-sage-50 px-3 py-2.5 text-xs text-sage-700">
                      <Store size={13} className="mt-0.5 flex-shrink-0" />
                      <span>
                        {t("cart.takeaway_notice", {
                          phone: customerInfo.phone.trim() || "—",
                        })}
                      </span>
                    </div>
                  )}
                </div>
              </section>

              {/* Payment method */}
              <section className="p-5">
                <h2 className="mb-4 font-semibold text-ink-900">
                  {t("payment.title")}
                </h2>

                <div
                  className={`grid gap-2 ${stripeEnabled ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}
                >
                  {stripeEnabled && (
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod("online");
                      setCashDenomination(null);
                      setCustomCash("");
                      setPaymentError(null);
                    }}
                    className={`flex w-full min-w-0 items-center justify-center gap-2 rounded-xl2 border px-3 py-3 text-sm font-semibold transition-transform motion-reduce:transition-none tap-target active:scale-[0.98] motion-reduce:active:scale-100 ${
                      paymentMethod === "online"
                        ? "border-gold-300 bg-gold-50 text-gold-700 shadow-sm"
                        : "border-ink-200 bg-white text-ink-600 hover:border-ink-300"
                    }`}
                  >
                    <CreditCard size={16} className="flex-shrink-0" />
                    <span>{t("payment.online")}</span>
                  </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("cash")}
                    className={`flex w-full min-w-0 items-center justify-center gap-2 rounded-xl2 border px-3 py-3 text-sm font-semibold transition-transform motion-reduce:transition-none tap-target active:scale-[0.98] motion-reduce:active:scale-100 ${
                      paymentMethod === "cash"
                        ? "border-gold-300 bg-gold-50 text-gold-700 shadow-sm"
                        : "border-ink-200 bg-white text-ink-600 hover:border-ink-300"
                    }`}
                  >
                    <Banknote size={16} className="flex-shrink-0" />
                    <span>{t("payment.cash")}</span>
                  </button>
                </div>

                {paymentMethod === "online" && stripeEnabled && (
                  <div className="mt-3 space-y-3 animate-slide-up">
                    <p className="text-xs text-ink-500">{t("payment.online_sub")}</p>
                    <StripePaymentSection
                      ref={stripePaymentRef}
                      clientSecret={stripeClientSecret}
                      loading={stripeLoading}
                      errorMessage={stripeError}
                      disabled={placing}
                      onReady={() => setStripeFormReady(true)}
                    />
                    {paymentError && (
                      <div className="flex items-start gap-2 rounded-xl2 bg-red-50 px-3 py-2.5 text-xs text-red-600">
                        <AlertCircle size={13} className="mt-0.5 flex-shrink-0" />
                        {paymentError}
                      </div>
                    )}
                  </div>
                )}

                {paymentMethod === "cash" && (
                  <div className="mt-3 space-y-3 animate-slide-up">
                    <p className="text-xs font-medium text-ink-600">
                      {t("payment.denomination_label")}
                    </p>

                    <div className="flex flex-wrap gap-2">
                      {DENOMINATIONS.filter((d) => d >= total || d >= 10).map((bill) => {
                        const selected = cashDenomination === bill;
                        const tooLow = bill < total;
                        return (
                          <button
                            key={bill}
                            type="button"
                            onClick={() => { setCashDenomination(bill); setCustomCash(""); }}
                            className={`tap-target min-h-[44px] rounded-xl2 border px-4 py-2 text-sm font-bold transition-transform motion-reduce:transition-none tabular-nums active:scale-[0.98] motion-reduce:active:scale-100 ${
                              selected
                                ? "border-gold-400 bg-gradient-to-br from-gold-400 to-gold-600 text-white shadow-sm"
                                : tooLow
                                ? "border-ink-100 bg-ink-50 text-ink-300 cursor-not-allowed"
                                : "border-ink-200 bg-white text-ink-700 hover:border-gold-300 hover:bg-gold-50"
                            }`}
                            disabled={tooLow}
                          >
                            €{bill}
                          </button>
                        );
                      })}

                      <div className="relative">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-ink-400">
                          €
                        </span>
                        <input
                          type="number"
                          min={Math.ceil(total)}
                          step="1"
                          value={customCash}
                          onChange={(e) => {
                            setCustomCash(e.target.value);
                            const v = parseFloat(e.target.value);
                            setCashDenomination(isNaN(v) ? null : v);
                          }}
                          placeholder={t("payment.custom")}
                          className="input-field w-28 pl-7 text-sm"
                        />
                      </div>
                    </div>

                    {cashDenomination !== null && cashDenomination < total && (
                      <div className="flex items-center gap-2 rounded-xl2 bg-red-50 px-3 py-2.5 text-xs text-red-600">
                        <AlertCircle size={13} className="flex-shrink-0" />
                        {t("payment.denomination_low", { total: total.toFixed(2) })}
                      </div>
                    )}
                    {cashDenomination !== null && cashDenomination >= total && (
                      <div className={`flex items-center gap-2 rounded-xl2 px-3 py-2.5 text-xs font-medium ${
                        cashDenomination === total
                          ? "bg-sage-50 text-sage-700"
                          : "bg-amber-50 text-amber-700"
                      }`}>
                        <CheckCircle2 size={13} className="flex-shrink-0" />
                        {cashDenomination === total
                          ? t("payment.no_change")
                          : t("payment.change", { amount: (cashDenomination - total).toFixed(2) })}
                      </div>
                    )}

                    {cashDenomination === null && (
                      <p className="text-xs text-ink-500">{t("payment.denomination_required")}</p>
                    )}
                  </div>
                )}
              </section>

              {/* Place order */}
              <section className="p-5">
                {placeOrderDisabled && placeOrderBlockReason && (
                  <div className="mb-3 flex items-start gap-2 rounded-xl2 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
                    <AlertCircle size={13} className="mt-0.5 flex-shrink-0" />
                    {placeOrderBlockReason}
                  </div>
                )}
                <button
                  onClick={handlePlaceOrder}
                  disabled={placeOrderDisabled}
                  className="btn-gold w-full justify-center py-3.5 text-base"
                >
                  {placing ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <>
                      {paymentMethod === "cash" ? (
                        <Banknote size={18} />
                      ) : (
                        <CreditCard size={18} />
                      )}
                      {paymentMethod === "online" && stripeEnabled
                        ? t("payment.stripe_pay", { total: total.toFixed(2) })
                        : t("cart.place_order", { total: total.toFixed(2) })}
                    </>
                  )}
                </button>
              </section>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
