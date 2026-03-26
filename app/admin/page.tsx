"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Printer,
  RefreshCw,
  Clock,
  ChefHat,
  Lock,
  Radio,
  UtensilsCrossed,
} from "lucide-react";
import Header from "@/components/Header";
import KitchenReceipt80 from "@/components/KitchenReceipt80";
import { useStore } from "@/lib/store/useStore";
import { playNewOrderChime } from "@/lib/kitchenSound";
import type { Order, OrderStatus } from "@/lib/types";

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
}: {
  order: Order;
  onAcceptAndPrint: (id: string) => void;
  onPrintReceipt: (id: string) => void;
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

  const formatComponents = (item: Order["items"][0]): string => {
    if (item.type !== "custom" || !item.components) return "";
    const { base, protein, toppings, sauce } = item.components;
    return [base?.name, protein?.name, toppings.map((t) => t.name).join(", "), sauce?.name]
      .filter(Boolean)
      .join(" · ");
  };

  return (
    <div
      className={`card overflow-hidden border print-break ${
        order.status === "delivered" ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-start justify-between border-b border-neutral-100 bg-neutral-50 px-5 py-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-neutral-500">
              #{order.id.toUpperCase()}
            </span>
            <span className={`tag-badge border text-xs ${cfg.color}`}>
              {cfg.label}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-2 text-xs text-neutral-400">
            <Clock size={11} />
            {formatDate(order.createdAt)} om {formatTime(order.createdAt)}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 text-right">
          {order.status !== "pending" && (
            <button
              type="button"
              onClick={() => onPrintReceipt(order.id)}
              className="no-print flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-2 py-1 text-xs font-semibold text-neutral-600 shadow-sm hover:bg-neutral-50"
              title="Bon afdrukken"
            >
              <Printer size={14} />
              Print
            </button>
          )}
          <div>
            <div className="font-bold text-neutral-800">€{order.total.toFixed(2)}</div>
            <div className="text-xs text-neutral-400">
              {order.items.length} {order.items.length === 1 ? "artikel" : "artikelen"}
            </div>
          </div>
        </div>
      </div>

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
              Adres
            </div>
            <div className="font-medium text-neutral-800">
              {order.customerInfo.address}, {order.customerInfo.zipCode}
            </div>
          </div>
        </div>
      </div>

      <div className="divide-y divide-neutral-50 px-5">
        {order.items.map((item) => (
          <div key={item.cartId} className="py-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-neutral-800">
                    {item.quantity}× {item.name}
                  </span>
                  <span className="text-xs text-neutral-400 capitalize">
                    ({item.type})
                  </span>
                </div>
                {item.type === "custom" && item.components && (
                  <p className="mt-0.5 text-xs text-neutral-500">
                    {formatComponents(item)}
                  </p>
                )}
                {item.note && (
                  <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-wood-500">
                    📝 {item.note}
                  </p>
                )}
              </div>
              <span className="text-sm font-semibold text-neutral-700">
                €{(item.price * item.quantity).toFixed(2)}
              </span>
            </div>
          </div>
        ))}
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
            <div>Bezorging: €{order.deliveryFee.toFixed(2)}</div>
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

  const [mounted, setMounted] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [filter, setFilter] = useState<OrderStatus | "all">("all");
  const [kitchenMode, setKitchenMode] = useState(false);
  const [storeHydrated, setStoreHydrated] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date>(() => new Date());
  const [printTargetId, setPrintTargetId] = useState<string | null>(null);

  const printFlightRef = useRef<{ id: string } | null>(null);

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
      playNewOrderChime();
      triggerKitchenPrint(orderId);
    },
    [updateOrderStatus, triggerKitchenPrint]
  );

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
    const id = window.setInterval(tick, 10_000);
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
    <div className="min-h-screen bg-cream">
      <Header />

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-neutral-800">
              Kitchen Terminal
            </h1>
            <p className="text-sm text-neutral-400">
              {orders.length} total order(s)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div
              className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs shadow-sm"
              title="Live sync: polling every 10s + cross-tab storage"
            >
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
              </span>
              <Radio size={14} className="text-emerald-600" />
              <span className="font-semibold text-emerald-800">Kitchen link active</span>
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
                New orders start as <strong>wachtend</strong>: tap <strong>Accepteren &amp; afdrukken</strong> for
                chime + 80mm bon. Use Chrome with{" "}
                <code className="rounded bg-neutral-100 px-1">--kiosk-printing</code> for silent printing.
              </p>
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
