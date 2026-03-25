"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";
import Link from "next/link";
import Header from "@/components/Header";
import { useStore } from "@/lib/store/useStore";
import { useT } from "@/lib/i18n";
import type { CustomerInfo, PaymentMethod } from "@/lib/types";

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
        className="flex h-7 w-7 items-center justify-center rounded-full border border-neutral-200 text-sm font-bold text-neutral-600 transition hover:bg-neutral-100"
      >
        −
      </button>
      <span className="w-5 text-center text-sm font-semibold">{value}</span>
      <button
        onClick={() => onChange(value + 1)}
        className="flex h-7 w-7 items-center justify-center rounded-full border border-neutral-200 text-sm font-bold text-neutral-600 transition hover:bg-neutral-100"
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

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-sage-200 border-t-sage-500" />
      </div>
    );
  }

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = zipCodeConfig?.deliveryFee ?? 0;
  const minOrder = zipCodeConfig?.minOrder ?? 0;
  const total = subtotal + deliveryFee;
  const belowMinimum = subtotal < minOrder;

  const validate = (): boolean => {
    const e: Partial<CustomerInfo> = {};
    if (!customerInfo.name.trim()) e.name = t("val.name");
    if (!customerInfo.phone.trim()) e.phone = t("val.phone");
    if (!customerInfo.address.trim()) e.address = t("val.address");
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handlePlaceOrder = async () => {
    if (!validate() || belowMinimum) return;
    if (paymentMethod === "cash" && (cashDenomination === null || cashDenomination < total)) return;
    setPlacing(true);
    await new Promise((r) => setTimeout(r, 900));
    const id = placeOrder(customerInfo, generalNote, paymentMethod, cashDenomination ?? undefined);
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
      <div className="min-h-screen bg-cream">
        <Header />
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <div className="mb-4 text-6xl">🛒</div>
          <h2 className="font-display text-2xl font-bold text-neutral-800">
            {t("cart.empty_title")}
          </h2>
          <p className="mt-2 text-neutral-500">{t("cart.empty_sub")}</p>
          <Link href="/menu" className="btn-primary mt-6">
            {t("cart.browse_menu")}
            <ChevronRight size={16} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream">
      <Header />

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <h1 className="font-display mb-6 text-2xl font-bold text-neutral-800">
          {t("cart.title")}
        </h1>

        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          {/* Cart items */}
          <div className="space-y-3">
            {cart.map((item) => (
              <div key={item.cartId} className="card p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                        {item.type === "poke-builder"
                          ? t("type.poke_bowl")
                          : item.type === "burrito"
                          ? t("type.poke_burrito")
                          : item.type === "burrito-builder"
                          ? t("type.poke_burrito")
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
                    <h3 className="mt-0.5 font-semibold text-neutral-800 truncate">
                      {item.name}
                    </h3>
                    {item.type === "custom" && item.components && (
                      <p className="mt-0.5 text-xs text-neutral-500 leading-relaxed">
                        {formatComponents(item)}
                      </p>
                    )}
                    {item.type === "poke-builder" && item.pokeSelections && (
                      <p className="mt-0.5 text-xs text-neutral-500 leading-relaxed line-clamp-2">
                        {formatPokeSelections(item)}
                      </p>
                    )}
                    {item.type === "burrito-builder" && item.burritoSelections && (
                      <p className="mt-0.5 text-xs text-neutral-500 leading-relaxed line-clamp-2">
                        {formatBurritoSelections(item)}
                      </p>
                    )}
                    {item.type === "smoothie-builder" && item.smoothieSelections && (
                      <p className="mt-0.5 text-xs text-neutral-500 leading-relaxed line-clamp-2">
                        {formatSmoothieSelections(item)}
                      </p>
                    )}
                    {item.type === "ready-made" &&
                      (item.selectedSize || item.selectedBase) && (
                        <p className="mt-0.5 text-xs text-neutral-500">
                          {[item.selectedSize?.label, item.selectedBase?.name]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      )}
                    {item.note && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-wood-500">
                        <MessageSquare size={11} />
                        {item.note}
                      </p>
                    )}
                  </div>
                  <div className="text-right font-bold text-neutral-800 shrink-0">
                    €{(item.price * item.quantity).toFixed(2)}
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <QuantityControl
                      value={item.quantity}
                      onChange={(v) => updateQuantity(item.cartId, v)}
                    />
                    <span className="text-xs text-neutral-400">
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
                      className="btn-ghost text-xs text-neutral-400"
                    >
                      {t("cart.note_btn")}
                    </button>
                    <button
                      onClick={() => removeFromCart(item.cartId)}
                      className="btn-ghost text-neutral-300 hover:text-red-400"
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

            {/* General note */}
            <div className="card p-4">
              <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-neutral-700">
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

          {/* Sidebar: summary + checkout */}
          <div className="space-y-4">
            {/* Order summary */}
            <div className="card p-5">
              <h2 className="mb-4 font-semibold text-neutral-800">
                {t("cart.summary")}
              </h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-neutral-600">
                  <span>{t("cart.subtotal")}</span>
                  <span>€{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>{t("cart.delivery_fee")}</span>
                  <span>€{deliveryFee.toFixed(2)}</span>
                </div>
                {belowMinimum && (
                  <div className="flex items-center gap-1.5 rounded-xl bg-amber-50 p-2.5 text-xs text-amber-700">
                    <AlertCircle size={13} />
                    {t("cart.min_warning", {
                      amount: minOrder.toFixed(2),
                      diff: (minOrder - subtotal).toFixed(2),
                    })}
                  </div>
                )}
                <div className="flex justify-between border-t border-neutral-100 pt-2 font-bold text-neutral-800">
                  <span>{t("cart.total")}</span>
                  <span>€{total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Customer info */}
            <div className="card p-5">
              <h2 className="mb-4 font-semibold text-neutral-800">
                {t("cart.delivery_details")}
              </h2>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-600">
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
                  <label className="mb-1 block text-xs font-medium text-neutral-600">
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

                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-600">
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
                  <label className="mb-1 block text-xs font-medium text-neutral-600">
                    {t("cart.postal_code")}
                  </label>
                  <input
                    type="text"
                    value={customerInfo.zipCode}
                    readOnly
                    className="input-field bg-neutral-50 text-neutral-500"
                  />
                </div>
              </div>

              {/* ── Payment method ────────────────────────────────────────── */}
              <div className="mt-5 space-y-3">
                <p className="text-sm font-semibold text-neutral-700">
                  {t("payment.title")}
                </p>

                {/* Toggle buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => { setPaymentMethod("online"); setCashDenomination(null); setCustomCash(""); }}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-3 text-left text-sm font-semibold transition-all ${
                      paymentMethod === "online"
                        ? "border-sage-400 bg-sage-50 text-sage-700"
                        : "border-neutral-200 bg-neutral-50 text-neutral-600 hover:border-neutral-300"
                    }`}
                  >
                    <CreditCard size={16} className="flex-shrink-0" />
                    <span>{t("payment.online")}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("cash")}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-3 text-left text-sm font-semibold transition-all ${
                      paymentMethod === "cash"
                        ? "border-wood-400 bg-wood-50 text-wood-700"
                        : "border-neutral-200 bg-neutral-50 text-neutral-600 hover:border-neutral-300"
                    }`}
                  >
                    <Banknote size={16} className="flex-shrink-0" />
                    <span>{t("payment.cash")}</span>
                  </button>
                </div>

                {/* Online sub-text */}
                {paymentMethod === "online" && (
                  <p className="text-xs text-neutral-400">{t("payment.online_sub")}</p>
                )}

                {/* Cash denomination picker */}
                {paymentMethod === "cash" && (
                  <div className="space-y-3 animate-slide-up">
                    <p className="text-xs font-medium text-neutral-600">
                      {t("payment.denomination_label")}
                    </p>

                    {/* Preset bills */}
                    <div className="flex flex-wrap gap-2">
                      {DENOMINATIONS.filter((d) => d >= total || d >= 10).map((bill) => {
                        const selected = cashDenomination === bill;
                        const tooLow = bill < total;
                        return (
                          <button
                            key={bill}
                            type="button"
                            onClick={() => { setCashDenomination(bill); setCustomCash(""); }}
                            className={`rounded-xl border px-4 py-2 text-sm font-bold transition-all ${
                              selected
                                ? "border-wood-400 bg-wood-500 text-white shadow-sm"
                                : tooLow
                                ? "border-neutral-100 bg-neutral-50 text-neutral-300 cursor-not-allowed"
                                : "border-neutral-200 bg-white text-neutral-700 hover:border-wood-300 hover:bg-wood-50"
                            }`}
                            disabled={tooLow}
                          >
                            €{bill}
                          </button>
                        );
                      })}

                      {/* Custom input */}
                      <div className="relative">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-neutral-400">
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

                    {/* Change display */}
                    {cashDenomination !== null && cashDenomination < total && (
                      <div className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-xs text-red-600">
                        <AlertCircle size={13} className="flex-shrink-0" />
                        {t("payment.denomination_low", { total: total.toFixed(2) })}
                      </div>
                    )}
                    {cashDenomination !== null && cashDenomination >= total && (
                      <div className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-medium ${
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
                      <p className="text-xs text-neutral-400">{t("payment.denomination_required")}</p>
                    )}
                  </div>
                )}
              </div>

              <button
                onClick={handlePlaceOrder}
                disabled={
                  placing ||
                  belowMinimum ||
                  (paymentMethod === "cash" && (cashDenomination === null || cashDenomination < total))
                }
                className="btn-primary mt-5 w-full justify-center py-3 text-base"
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
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
