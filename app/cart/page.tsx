"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Trash2,
  ShoppingBag,
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
  TAKEAWAY_DELIVERY_FEE,
  TAKEAWAY_MIN_ORDER,
  type TimeSlot,
} from "@/lib/deliveryConfig";

function QuantityControl({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange(value - 1)}
        className="flex h-8 w-8 items-center justify-center rounded-full border border-ink-200 text-sm font-bold text-ink-600 transition hover:bg-ink-100"
      >
        −
      </button>
      <span className="w-5 text-center text-sm font-semibold tabular-nums">{value}</span>
      <button
        onClick={() => onChange(value + 1)}
        className="flex h-8 w-8 items-center justify-center rounded-full border border-ink-200 text-sm font-bold text-ink-600 transition hover:bg-ink-100"
      >
        +
      </button>
    </div>
  );
}

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
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("online");
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

  const handlePlaceOrder = async () => {
    if (!validate() || belowMinimum) return;
    if (paymentMethod === "cash" && (cashDenomination === null || cashDenomination < total)) return;
    if (timeMode === "scheduled" && !scheduledSlot) return;

    setPlacing(true);
    await new Promise((r) => setTimeout(r, 900));

    const fulfillmentTime: FulfillmentTime =
      timeMode === "asap"
        ? { mode: "asap" }
        : { mode: "scheduled", scheduledFor: scheduledSlot };

    // Takeaway doesn't need address fields — blank them on the order so the
    // receipt doesn't print a stale delivery address from a previous session.
    const finalCustomerInfo: CustomerInfo = isTakeaway
      ? { ...customerInfo, address: "", zipCode: "" }
      : customerInfo;

    const id = placeOrder({
      customerInfo: finalCustomerInfo,
      generalNote,
      paymentMethod,
      cashDenomination: cashDenomination ?? undefined,
      orderType,
      fulfillmentTime,
    });
    router.push(`/order-confirmed?id=${id}`);
  };

  // Preset euro bill denominations
  const DENOMINATIONS = [10, 20, 50, 100, 200];

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
    [s.topping1, s.topping2].forEach((t) => { if (t && t.name !== "Geen toppings") parts.push(t.name); });
    return parts.join(" · ");
  };

  const formatClassicRollSelections = (item: (typeof cart)[0]): string => {
    const s = item.classicRollSelections;
    if (!s) return "";
    const parts: string[] = [];
    if (s.protein) parts.push(s.protein.name);
    if (s.extraProtein) parts.push(`+ ${s.extraProtein.name}`);
    [s.mixin1, s.mixin2].forEach((m) => { if (m) parts.push(m.name); });
    if (s.extraMixin) parts.push(`+ ${s.extraMixin.name}`);
    if (s.sauce && s.sauce.name !== "Geen saus") parts.push(s.sauce.name);
    return parts.join(" · ");
  };

  const formatInsideOutRollSelections = (item: (typeof cart)[0]): string => {
    const s = item.insideOutRollSelections;
    if (!s) return "";
    const parts: string[] = [];
    if (s.protein) parts.push(s.protein.name);
    if (s.extraProtein) parts.push(`+ ${s.extraProtein.name}`);
    [s.mixin1, s.mixin2].forEach((m) => { if (m) parts.push(m.name); });
    if (s.extraMixin) parts.push(`+ ${s.extraMixin.name}`);
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
    if (s.extraProtein) parts.push(s.extraProtein.name);
    [s.mixin1, s.mixin2, s.mixin3, s.mixin4, s.mixin5].forEach((m) => {
      if (m) parts.push(m.name);
    });
    if (s.extraMixin) parts.push(s.extraMixin.name);
    [s.topping1, s.topping2, s.topping3].forEach((t) => {
      if (t && t.name !== "Geen toppings") parts.push(t.name);
    });
    return parts.join(" · ");
  };

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-cream-100 pb-28 md:pb-0">
        <Header />
        <div className="flex flex-col items-center justify-center py-32 text-center">
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
    <div className="min-h-screen bg-cream-100 pb-28 md:pb-8">
      <Header />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
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

                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <QuantityControl
                      value={item.quantity}
                      onChange={(v) => updateQuantity(item.cartId, v)}
                    />
                    <span className="text-xs tabular-nums text-ink-400">
                      €{item.price.toFixed(2)} {t("cart.each")}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() =>
                        setExpandedNote(
                          expandedNote === item.cartId ? null : item.cartId
                        )
                      }
                      className="btn-ghost text-xs text-ink-500"
                    >
                      {t("cart.note_btn")}
                    </button>
                    <button
                      onClick={() => removeFromCart(item.cartId)}
                      className="btn-ghost text-ink-400 hover:text-red-500"
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

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setOrderType("delivery")}
                    className={`flex items-center justify-center gap-2 rounded-xl2 border px-3 py-3 text-sm font-semibold transition-all tap-target ${
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
                    className={`flex items-center justify-center gap-2 rounded-xl2 border px-3 py-3 text-sm font-semibold transition-all tap-target ${
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
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => { setTimeMode("asap"); setScheduledSlot(""); }}
                      className={`flex items-center justify-center gap-2 rounded-xl2 border px-3 py-3 text-sm font-semibold transition-all tap-target ${
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
                      className={`flex items-center justify-center gap-2 rounded-xl2 border px-3 py-3 text-sm font-semibold transition-all tap-target ${
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
                          {t("time.no_slots")}
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

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => { setPaymentMethod("online"); setCashDenomination(null); setCustomCash(""); }}
                    className={`flex items-center justify-center gap-2 rounded-xl2 border px-3 py-3 text-sm font-semibold transition-all tap-target ${
                      paymentMethod === "online"
                        ? "border-gold-300 bg-gold-50 text-gold-700 shadow-sm"
                        : "border-ink-200 bg-white text-ink-600 hover:border-ink-300"
                    }`}
                  >
                    <CreditCard size={16} className="flex-shrink-0" />
                    <span>{t("payment.online")}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("cash")}
                    className={`flex items-center justify-center gap-2 rounded-xl2 border px-3 py-3 text-sm font-semibold transition-all tap-target ${
                      paymentMethod === "cash"
                        ? "border-gold-300 bg-gold-50 text-gold-700 shadow-sm"
                        : "border-ink-200 bg-white text-ink-600 hover:border-ink-300"
                    }`}
                  >
                    <Banknote size={16} className="flex-shrink-0" />
                    <span>{t("payment.cash")}</span>
                  </button>
                </div>

                {paymentMethod === "online" && (
                  <p className="mt-2 text-xs text-ink-500">{t("payment.online_sub")}</p>
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
                            className={`rounded-xl2 border px-4 py-2 text-sm font-bold transition-all tabular-nums ${
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
                <button
                  onClick={handlePlaceOrder}
                  disabled={
                    placing ||
                    belowMinimum ||
                    (paymentMethod === "cash" && (cashDenomination === null || cashDenomination < total)) ||
                    (timeMode === "scheduled" && !scheduledSlot)
                  }
                  className="btn-gold w-full justify-center py-3.5 text-base"
                >
                  {placing ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <>
                      {paymentMethod === "cash" ? <Banknote size={18} /> : <ShoppingBag size={18} />}
                      {t("cart.place_order", { total: total.toFixed(2) })}
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
