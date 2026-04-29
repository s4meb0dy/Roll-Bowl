"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  Printer,
  RefreshCw,
  Clock,
  ChefHat,
  Lock,
  Radio,
  UtensilsCrossed,
  Truck,
  Store,
  CalendarClock,
  Boxes,
  Bell,
  BellOff,
  Volume2,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import Header from "@/components/Header";
import KitchenReceipt80 from "@/components/KitchenReceipt80";
import { useStore } from "@/lib/store/useStore";
import {
  isKitchenAlarmMuted,
  setKitchenAlarmMuted,
  startKitchenAlarmLoop,
  stopKitchenAlarmLoop,
  playTestKitchenAlarm,
} from "@/lib/kitchenSound";
import type { Order, OrderStatus } from "@/lib/types";
import { subscribeToOrderStream } from "@/lib/orders/client";
import { describeCartItemForKitchen } from "@/lib/orders/itemDescriptors";

const ADMIN_PIN = "1234";
const STORAGE_KEY = "roll-bowl-store";
const KITCHEN_MODE_KEY = "roll-bowl-kitchen-mode";

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; color: string; next: OrderStatus | null }
> = {
  pending: { label: "⏳ Wachtend", color: "bg-amber-50 text-amber-900 border-amber-200", next: null },
  paid: { label: "💶 Betaald", color: "bg-emerald-50 text-emerald-800 border-emerald-200", next: "preparing" },
  preparing: { label: "👨‍🍳 In bereiding", color: "bg-blue-50 text-blue-700 border-blue-200", next: "ready" },
  ready: { label: "✅ Klaar", color: "bg-sage-50 text-sage-700 border-sage-200", next: "delivered" },
  delivered: { label: "🎉 Bezorgd", color: "bg-neutral-50 text-neutral-500 border-neutral-200", next: null },
};

function formatCheckedTime(d: Date) {
  return d.toLocaleTimeString("nl-BE", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function OrderCard({
  order,
  onAcceptAndPrint,
  onPrintReceipt,
  isAlarmTarget,
}: {
  order: Order;
  onAcceptAndPrint: (id: string) => void;
  onPrintReceipt: (id: string) => void;
  isAlarmTarget?: boolean;
}) {
  const updateOrderStatus = useStore((s) => s.updateOrderStatus);
  const cfg = STATUS_CONFIG[order.status];

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString("nl-BE", { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("nl-BE", { day: "2-digit", month: "short", year: "numeric" });
  };

  return (
    <div
      className={`card overflow-hidden border print-break ${
        order.status === "delivered" ? "opacity-60" : ""
      } ${isAlarmTarget ? "ring-2 ring-gold-400 ring-offset-2" : ""}`}
    >
      <div className="flex items-start justify-between border-b border-neutral-100 bg-neutral-50 px-5 py-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-bold text-neutral-500">
              #{order.id.toUpperCase()}
            </span>
            <span className={`tag-badge border text-xs ${cfg.color}`}>
              {cfg.label}
            </span>
            {order.lightspeed?.state === "success" && (
              <span className="tag-badge border border-emerald-200 bg-emerald-50 text-xs font-semibold text-emerald-800">
                <CheckCircle2 size={12} className="inline" /> Naar keuken / POS
                {order.lightspeed.saleId && order.lightspeed.saleId !== "dry-run" && (
                  <span className="ml-1 font-mono text-[10px]">#{String(order.lightspeed.saleId).slice(0, 8)}</span>
                )}
              </span>
            )}
            {order.lightspeed?.state === "failed" && (
              <span
                className="tag-badge border border-rose-200 bg-rose-50 text-xs font-semibold text-rose-800"
                title={order.lightspeed.errorMessage ?? "POS weigerde de order"}
              >
                POS-sync fout
              </span>
            )}
            {order.lightspeed?.state === "skipped" && (
              <span className="tag-badge border border-amber-200 bg-amber-50 text-xs text-amber-900">
                POS: niet geconfigureerd
              </span>
            )}
            <span
              className={`tag-badge inline-flex items-center gap-1 border text-xs font-semibold ${
                order.orderType === "takeaway"
                  ? "border-wood-200 bg-wood-50 text-wood-800"
                  : "border-sage-200 bg-sage-50 text-sage-800"
              }`}
            >
              {order.orderType === "takeaway" ? (
                <>
                  <Store size={11} /> Afhalen
                </>
              ) : (
                <>
                  <Truck size={11} /> Bezorging
                </>
              )}
            </span>
            {order.fulfillmentTime?.mode === "scheduled" && (
              <span className="tag-badge inline-flex items-center gap-1 border border-blue-200 bg-blue-50 text-xs font-semibold text-blue-800">
                <CalendarClock size={11} />
                {new Date(order.fulfillmentTime.scheduledFor).toLocaleString("nl-BE", {
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
            {order.fulfillmentTime?.mode === "asap" && (
              <span className="tag-badge inline-flex items-center gap-1 border border-emerald-200 bg-emerald-50 text-xs font-semibold text-emerald-800">
                <Clock size={11} /> Zo snel mogelijk
              </span>
            )}
            {order.isFirstTimeCustomer && (
              <span
                className="tag-badge inline-flex items-center gap-1 border border-amber-300 bg-amber-100 text-xs font-bold text-amber-950"
                title="Eerste bestelling met dit telefoonnummer in dit systeem"
              >
                <Sparkles size={12} className="shrink-0" />
                1e bestelling
              </span>
            )}
          </div>
          <div className="mt-1 flex items-center gap-2 text-xs text-neutral-400">
            <Clock size={11} />
            {formatDate(order.createdAt)} om {formatTime(order.createdAt)}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 text-right">
          <button
            type="button"
            onClick={() => onPrintReceipt(order.id)}
            className="no-print flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-2 py-1 text-xs font-semibold text-neutral-600 shadow-sm hover:bg-neutral-50"
            title="Keukenbon (her)afdrukken"
          >
            <Printer size={14} />
            Print
          </button>
          <div>
            <div className="font-bold text-neutral-800">€{order.total.toFixed(2)}</div>
            <div className="text-xs text-neutral-400">
              {order.items.length} {order.items.length === 1 ? "artikel" : "artikelen"}
            </div>
          </div>
        </div>
      </div>

      {order.isFirstTimeCustomer && (
        <div className="border-b border-amber-200 bg-amber-50 px-5 py-2.5 text-center text-sm font-bold text-amber-950">
          <span className="inline-flex items-center justify-center gap-1.5">
            <Sparkles size={16} className="text-amber-600" />
            Nieuwe klant — eerste bestelling (uniek telefoonnr.)
          </span>
        </div>
      )}

      <div className="border-b border-neutral-100 px-5 py-3">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
              Naam
            </div>
            <div className="font-medium text-neutral-800">{order.customerInfo.name}</div>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
              Telefoon
            </div>
            <div className="font-medium text-neutral-800">{order.customerInfo.phone}</div>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
              {order.orderType === "takeaway" ? "Afhalen" : "Adres"}
            </div>
            <div className="font-medium text-neutral-800">
              {order.orderType === "takeaway"
                ? "Klant haalt af in de winkel"
                : `${order.customerInfo.address}, ${order.customerInfo.zipCode}`}
            </div>
          </div>
        </div>
      </div>

      <div className="divide-y divide-neutral-50 px-5">
        {order.items.map((item) => {
          const lines = describeCartItemForKitchen(item);
          return (
            <div key={item.cartId} className="py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-neutral-800">
                      {item.quantity}× {item.name}
                    </span>
                    <span className="text-xs text-neutral-400 capitalize">
                      ({item.type})
                    </span>
                  </div>
                  {lines.length > 0 && (
                    <ul className="mt-1.5 space-y-0.5 rounded-lg bg-neutral-50 px-3 py-2 text-xs leading-snug text-neutral-700">
                      {lines.map((l, idx) => (
                        <li
                          key={idx}
                          className={l.accent ? "font-semibold text-amber-800" : ""}
                        >
                          <span className="font-semibold text-neutral-500">
                            {l.label}:
                          </span>{" "}
                          {l.value}
                        </li>
                      ))}
                    </ul>
                  )}
                  {item.note && (
                    <p className="mt-1 flex items-start gap-1 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-900">
                      📝 {item.note}
                    </p>
                  )}
                </div>
                <span className="shrink-0 text-sm font-semibold text-neutral-700">
                  €{(item.price * item.quantity).toFixed(2)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className={`border-t px-5 py-3 ${order.paymentMethod === "cash" ? "border-amber-100 bg-amber-50" : "border-neutral-100 bg-neutral-50"}`}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-base">{order.paymentMethod === "cash" ? "💵" : "💳"}</span>
            <span className={`text-sm font-bold ${order.paymentMethod === "cash" ? "text-amber-800" : "text-neutral-700"}`}>
              {order.paymentMethod === "cash" ? "Contant betalen" : "Online / Kaart"}
            </span>
          </div>
          {order.paymentMethod === "cash" && order.cashDenomination !== undefined && (
            <div className="text-right text-xs font-medium text-amber-800">
              <div>Klant betaalt: <strong>€{order.cashDenomination.toFixed(2)}</strong></div>
              {order.cashDenomination > order.total && (
                <div className="text-amber-700">Wisselgeld: <strong>€{(order.cashDenomination - order.total).toFixed(2)}</strong></div>
              )}
              {order.cashDenomination === order.total && (
                <div className="text-sage-700">Exact bedrag ✓</div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-neutral-100 bg-neutral-50 px-5 py-3">
        <div className="flex items-start justify-between gap-4">
          <div className="text-xs text-neutral-500">
            {order.generalNote && (
              <span className="flex items-center gap-1">
                📝 <em>{order.generalNote}</em>
              </span>
            )}
          </div>
          <div className="shrink-0 text-right text-xs text-neutral-500">
            <div>Subtotaal: €{order.subtotal.toFixed(2)}</div>
            {order.orderType !== "takeaway" && (
              <div>Bezorging: €{order.deliveryFee.toFixed(2)}</div>
            )}
            <div className="font-bold text-neutral-800">
              Totaal: €{order.total.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {order.status === "pending" && (
        <div className="no-print border-t border-neutral-100 bg-amber-50/50 px-5 py-4">
          <button
            type="button"
            onClick={() => onAcceptAndPrint(order.id)}
            className="btn-primary flex w-full items-center justify-center gap-2 text-sm"
          >
            <Printer size={16} />
            Accepteren & afdrukken
          </button>
        </div>
      )}

      {order.status !== "pending" && cfg.next && (
        <div className="no-print border-t border-neutral-100 px-5 py-3">
          <button
            type="button"
            onClick={() => updateOrderStatus(order.id, cfg.next!)}
            className="btn-primary text-sm"
          >
            Markeer als {STATUS_CONFIG[cfg.next].label}
          </button>
        </div>
      )}
    </div>
  );
}

function PinGate({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === ADMIN_PIN) {
      onUnlock();
    } else {
      setError(true);
      setPin("");
      setTimeout(() => setError(false), 1500);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-cream px-4">
      <div className="card w-full max-w-sm p-8 text-center">
        <div className="mb-5 flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sage-500">
            <ChefHat size={28} className="text-white" />
          </div>
        </div>
        <h1 className="font-display mb-1 text-xl font-bold text-neutral-800">
          Kitchen View
        </h1>
        <p className="mb-6 text-sm text-neutral-400">Enter your PIN to continue</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Lock
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
            />
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              placeholder="••••"
              autoFocus
              className={`input-field pl-9 text-center text-2xl tracking-[0.5em] ${
                error ? "border-red-300 bg-red-50" : ""
              }`}
            />
          </div>
          {error && (
            <p className="text-xs text-red-500 animate-fade-in">Incorrect PIN. Try again.</p>
          )}
          <button type="submit" className="btn-primary w-full justify-center">
            Unlock
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const orders = useStore((s) => s.orders);
  const markKitchenPrinted = useStore((s) => s.markKitchenPrinted);
  const updateOrderStatus = useStore((s) => s.updateOrderStatus);
  const applyOrdersSnapshot = useStore((s) => s.applyOrdersSnapshot);

  const [mounted, setMounted] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [filter, setFilter] = useState<OrderStatus | "all">("all");
  const [kitchenMode, setKitchenMode] = useState(false);
  const [storeHydrated, setStoreHydrated] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date>(() => new Date());
  const [printTargetId, setPrintTargetId] = useState<string | null>(null);
  const [alarmOrderId, setAlarmOrderId] = useState<string | null>(null);
  const [soundMuted, setSoundMuted] = useState(false);
  /** null = not yet fetched; server inbox (Redis) for phone → PC order sync */
  const [orderInboxEnabled, setOrderInboxEnabled] = useState<boolean | null>(null);
  /** Connection state for the SSE stream → drives the live status pill. */
  const [streamConnected, setStreamConnected] = useState(false);
  const [usingPollingFallback, setUsingPollingFallback] = useState(false);

  const printFlightRef = useRef<{ id: string } | null>(null);
  const newOrderWatchInit = useRef(false);
  const seenOrderIds = useRef<Set<string>>(new Set());

  const triggerKitchenPrint = useCallback(
    (orderId: string) => {
      if (printFlightRef.current) return;
      printFlightRef.current = { id: orderId };
      setPrintTargetId(orderId);

      const printTimer = window.setTimeout(() => {
        document.body.classList.add("kitchen-printing-active");
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            window.print();
          });
        });
      }, 100);

      let fallbackTimer: number | null = null;
      const finish = () => {
        if (fallbackTimer !== null) {
          clearTimeout(fallbackTimer);
          fallbackTimer = null;
        }
        clearTimeout(printTimer);
        document.body.classList.remove("kitchen-printing-active");
        markKitchenPrinted(orderId);
        setPrintTargetId(null);
        printFlightRef.current = null;
      };

      window.addEventListener("afterprint", finish, { once: true });
      fallbackTimer = window.setTimeout(finish, 4000);
    },
    [markKitchenPrinted]
  );

  const handleAcceptAndPrint = useCallback(
    (orderId: string) => {
      updateOrderStatus(orderId, "preparing");
      stopKitchenAlarmLoop();
      setAlarmOrderId((cur) => (cur === orderId ? null : cur));
      triggerKitchenPrint(orderId);
    },
    [updateOrderStatus, triggerKitchenPrint]
  );

  useEffect(() => {
    setSoundMuted(isKitchenAlarmMuted());
  }, []);

  useEffect(() => {
    if (!storeHydrated || !unlocked) return;
    if (!newOrderWatchInit.current) {
      newOrderWatchInit.current = true;
      orders.forEach((o) => seenOrderIds.current.add(o.id));
      return;
    }
    for (const o of orders) {
      if (!seenOrderIds.current.has(o.id)) {
        seenOrderIds.current.add(o.id);
        if (o.status === "pending") {
          setAlarmOrderId(o.id);
          startKitchenAlarmLoop();
        }
      }
    }
  }, [orders, storeHydrated, unlocked]);

  const acknowledgeAlarm = useCallback(() => {
    stopKitchenAlarmLoop();
    setAlarmOrderId(null);
  }, []);

  const toggleMute = useCallback(() => {
    const next = !soundMuted;
    setSoundMuted(next);
    setKitchenAlarmMuted(next);
  }, [soundMuted]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const v = localStorage.getItem(KITCHEN_MODE_KEY);
    if (v === "1") setKitchenMode(true);
  }, []);

  useEffect(() => {
    void useStore.persist.rehydrate();
    const unsub = useStore.persist.onFinishHydration(() => setStoreHydrated(true));
    if (useStore.persist.hasHydrated()) setStoreHydrated(true);
    return unsub;
  }, []);

  useEffect(() => {
    if (!mounted || !storeHydrated) return;
    const tick = () => {
      setLastChecked(new Date());
      void useStore.persist.rehydrate();
    };
    const id = window.setInterval(tick, 2_000);
    return () => window.clearInterval(id);
  }, [mounted, storeHydrated]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        void useStore.persist.rehydrate();
        setLastChecked(new Date());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  /**
   * Real-time link to the kitchen inbox.
   *
   * SSE pushes every new order or status change within ~1.5s of the server
   * write. Polling fallback only kicks in when the EventSource transport
   * keeps failing (some corporate proxies strip text/event-stream).
   *
   * Runs even before the PIN gate is unlocked: that way the kitchen tab can
   * sit idle on the gate while phones place orders, and the moment the PIN
   * is entered everything is already loaded.
   */
  useEffect(() => {
    if (!storeHydrated) return;
    const unsubscribe = subscribeToOrderStream({
      onSnapshot: (snap) => {
        setOrderInboxEnabled(snap.inboxEnabled);
        applyOrdersSnapshot(snap.orders);
        setStreamConnected(true);
        setUsingPollingFallback(false);
        setLastChecked(new Date());
      },
      onUpdate: (snap) => {
        setOrderInboxEnabled(snap.inboxEnabled);
        applyOrdersSnapshot(snap.orders);
        setStreamConnected(true);
        setLastChecked(new Date());
      },
      onDisconnect: () => {
        setStreamConnected(false);
      },
      onFallbackToPolling: () => {
        setUsingPollingFallback(true);
        setStreamConnected(false);
      },
    });
    return () => {
      unsubscribe();
    };
  }, [storeHydrated, applyOrdersSnapshot]);

  const toggleKitchenMode = (on: boolean) => {
    setKitchenMode(on);
    if (typeof window !== "undefined") {
      localStorage.setItem(KITCHEN_MODE_KEY, on ? "1" : "0");
    }
  };

  if (!mounted || !unlocked) {
    return (
      <>
        <Header />
        <PinGate onUnlock={() => setUnlocked(true)} />
      </>
    );
  }

  const filtered =
    filter === "all" ? orders : orders.filter((o) => o.status === filter);

  const counts = {
    all: orders.length,
    pending: orders.filter((o) => o.status === "pending").length,
    paid: orders.filter((o) => o.status === "paid").length,
    preparing: orders.filter((o) => o.status === "preparing").length,
    ready: orders.filter((o) => o.status === "ready").length,
    delivered: orders.filter((o) => o.status === "delivered").length,
  };

  const printOrder = printTargetId ? orders.find((o) => o.id === printTargetId) : undefined;

  return (
    <div className="min-h-screen bg-cream pb-24">
      <Header />

      {alarmOrderId && (
        <div
          className="no-print fixed bottom-0 left-0 right-0 z-[200] border-t border-amber-300 bg-amber-100/95 shadow-[0_-4px_24px_rgba(0,0,0,0.12)] backdrop-blur-sm safe-bottom md:pr-0"
          role="alert"
        >
          <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <div className="flex min-w-0 items-center gap-2 text-sm font-bold text-amber-950">
              <span className="relative flex h-3 w-3 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-60" />
                <span className="relative h-3 w-3 rounded-full bg-amber-500" />
              </span>
              <Bell className="shrink-0 text-amber-800" size={20} />
              <span className="truncate">Nieuw order — #{alarmOrderId.toUpperCase()}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={acknowledgeAlarm}
                className="btn-primary rounded-xl px-4 py-2 text-sm"
              >
                Bevestig gehoord
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-neutral-800">
              Kitchen Terminal
            </h1>
            <p className="text-sm text-neutral-400">
              {orders.length} total order(s)
            </p>
            {orderInboxEnabled === false && (
              <p className="mt-2 max-w-xl rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-950">
                <strong>Telefoon → PC:</strong> bestellingen staan in localStorage per toestel. Koppel in Vercel
                <strong> Storage → Redis (Upstash) </strong>
                en zet env-variabelen, daarna komen bestellingen van elke telefoon hier binnen. Zie README / order inbox.
              </p>
            )}
            {orderInboxEnabled === true && (
              <p className="mt-1 text-xs font-medium text-emerald-800">
                {streamConnected
                  ? "Realtime kitchen-stream actief — bestellingen en statuswijzigingen verschijnen direct op alle toestellen."
                  : usingPollingFallback
                    ? "Stream niet beschikbaar — terugvallen op polling om de 4s. Bestellingen blijven binnenkomen."
                    : "Verbinding met de keuken-stream wordt opgezet…"}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/admin/inventory"
              className="btn-secondary text-sm"
              title="Beheer voorraad en product-beschikbaarheid"
            >
              <Boxes size={15} />
              Voorraadbeheer
            </Link>
            <div
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs shadow-sm ${
                streamConnected
                  ? "border-emerald-200 bg-white"
                  : usingPollingFallback
                    ? "border-amber-200 bg-amber-50"
                    : "border-neutral-200 bg-neutral-50"
              }`}
              title={
                streamConnected
                  ? "Realtime SSE-stream actief — wijzigingen komen direct binnen"
                  : usingPollingFallback
                    ? "Polling-fallback actief — vernieuwt om de 4s"
                    : "Verbinding met de stream wordt opgezet…"
              }
            >
              <span className="relative flex h-2.5 w-2.5">
                {streamConnected && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                )}
                <span
                  className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
                    streamConnected
                      ? "bg-emerald-500"
                      : usingPollingFallback
                        ? "bg-amber-500"
                        : "bg-neutral-400"
                  }`}
                />
              </span>
              <Radio
                size={14}
                className={
                  streamConnected
                    ? "text-emerald-600"
                    : usingPollingFallback
                      ? "text-amber-600"
                      : "text-neutral-500"
                }
              />
              <span
                className={`font-semibold ${
                  streamConnected
                    ? "text-emerald-800"
                    : usingPollingFallback
                      ? "text-amber-900"
                      : "text-neutral-600"
                }`}
              >
                {streamConnected
                  ? "Kitchen link · live"
                  : usingPollingFallback
                    ? "Kitchen link · polling"
                    : "Kitchen link · connecting…"}
              </span>
            </div>
            <div className="text-xs text-neutral-500">
              Last checked:{" "}
              <span className="font-mono font-medium text-neutral-700">
                {formatCheckedTime(lastChecked)}
              </span>
            </div>
          </div>
        </div>

        <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <UtensilsCrossed size={20} className="text-wood-600" />
            <div>
              <p className="text-sm font-bold text-neutral-800">Kitchen mode</p>
              <p className="text-xs text-neutral-500">
                <strong>Pieptonen</strong> ca. 5s (stopt vanzelf). Dempen,{" "}
                <strong>Bevestig gehoord</strong>, of <strong>Accepteren &amp; afdrukken</strong>. 80mm bon. Chrome:{" "}
                <code className="rounded bg-neutral-100 px-1">--kiosk-printing</code> voor stille print.
              </p>
            </div>
          </div>
          <div className="flex flex-col items-stretch gap-2 sm:items-end">
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={toggleMute}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold shadow-sm ${
                  soundMuted
                    ? "border-neutral-200 bg-neutral-100 text-neutral-600"
                    : "border-amber-200 bg-amber-50 text-amber-900"
                }`}
              >
                {soundMuted ? <BellOff size={15} /> : <Bell size={15} />}
                {soundMuted ? "Geluid aan" : "Dempen"}
              </button>
              <button
                type="button"
                onClick={() => playTestKitchenAlarm()}
                disabled={soundMuted}
                className="inline-flex items-center gap-1.5 rounded-xl border border-sage-200 bg-white px-3 py-2 text-xs font-semibold text-sage-800 shadow-sm disabled:opacity-40"
                title="Test de alarmtoon (na interactie geeft de browser vaak toestemming)"
              >
                <Volume2 size={15} />
                Test geluid
              </button>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={kitchenMode}
            onClick={() => toggleKitchenMode(!kitchenMode)}
            className={`relative h-9 w-14 shrink-0 rounded-full transition-colors ${
              kitchenMode ? "bg-sage-500" : "bg-neutral-300"
            }`}
          >
            <span
              className={`absolute top-1 left-1 h-7 w-7 rounded-full bg-white shadow transition-transform ${
                kitchenMode ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-2">
            <button
              onClick={() => window.print()}
              className="btn-secondary text-sm"
            >
              <Printer size={15} />
              Print view
            </button>
            <button
              onClick={() => {
                setLastChecked(new Date());
                void useStore.persist.rehydrate();
              }}
              className="btn-ghost text-neutral-400"
            >
              <RefreshCw size={15} />
            </button>
          </div>
        </div>

        <div className="no-print mb-6 flex flex-wrap gap-2">
          {(["all", "pending", "paid", "preparing", "ready", "delivered"] as const).map(
            (s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold capitalize transition ${
                  filter === s
                    ? "bg-sage-500 text-white"
                    : "bg-white text-neutral-500 shadow-sm hover:bg-neutral-50"
                }`}
              >
                {s} ({counts[s]})
              </button>
            )
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-3 text-5xl">📋</div>
            <h3 className="font-semibold text-neutral-700">No orders yet</h3>
            <p className="mt-1 text-sm text-neutral-400">
              {filter !== "all"
                ? `No ${filter} orders at the moment.`
                : "Orders will appear here once customers place them."}
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {filtered.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                isAlarmTarget={order.id === alarmOrderId}
                onAcceptAndPrint={handleAcceptAndPrint}
                onPrintReceipt={triggerKitchenPrint}
              />
            ))}
          </div>
        )}
      </main>

      {typeof document !== "undefined" &&
        printOrder &&
        createPortal(<KitchenReceipt80 order={printOrder} />, document.body)}
    </div>
  );
}
