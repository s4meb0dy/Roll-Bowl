"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  Printer,
  RefreshCw,
  Clock,
  ChefHat,
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
  ListChecks,
  X,
  Download,
  Minus,
  Plus,
  Trash2,
  CreditCard,
  Banknote,
  Euro,
  Wallet,
} from "lucide-react";
import Header from "@/components/Header";
import EposPrinterSettings from "@/components/admin/EposPrinterSettings";
import KitchenReceipt80 from "@/components/KitchenReceipt80";
import { loadEposConfig } from "@/lib/epos/config";
import { printKitchenOrderEpos } from "@/lib/epos/printOrder";
import { useStore } from "@/lib/store/useStore";
import {
  isKitchenAlarmMuted,
  setKitchenAlarmMuted,
  startKitchenAlarmLoop,
  stopKitchenAlarmLoop,
  playTestKitchenAlarm,
  unlockKitchenAudio,
  ensureKitchenAudioUnlock,
  isKitchenAudioReady,
} from "@/lib/kitchenSound";
import type { Order, OrderStatus, OrderType } from "@/lib/types";
import { subscribeToOrderStream } from "@/lib/orders/client";
import { dateKeyInTimeZone } from "@/lib/deliveryConfig";
import { describeCartItemForKitchen } from "@/lib/orders/itemDescriptors";
import { shortOrderCode } from "@/lib/orderId";
import AdminPinGate from "@/components/AdminPinGate";
import {
  isAdminSessionUnlocked,
  verifyAdminPinRemote,
  getStoredAdminPin,
} from "@/lib/admin/pinClient";
import {
  downloadOrdersFromBrowser,
  downloadOrdersFromServer,
} from "@/lib/orders/exportClient";
import { clearAllOrdersRemote } from "@/lib/orders/clearOrdersClient";
import { deleteOrderRemote } from "@/lib/orders/deleteOrderClient";
import { requestScreenWakeLock, releaseScreenWakeLock } from "@/lib/wakeLock";

const STORAGE_KEY = "roll-bowl-store";
const KITCHEN_MODE_KEY = "roll-bowl-kitchen-mode";
const KITCHEN_SETUP_DISMISSED_KEY = "roll-bowl-kitchen-setup-dismissed";

/** Cash orders arrive as pending; Stripe/webhook orders as paid — both need the kitchen chime. */
function isNewOrderAlertStatus(status: OrderStatus): boolean {
  return status === "pending" || status === "paid";
}

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

function getStatusLabel(status: OrderStatus, orderType: OrderType): string {
  if (orderType === "takeaway" && status === "delivered") {
    return "🎉 Opgehaald";
  }
  return STATUS_CONFIG[status].label;
}

function getStatusDisplay(order: Order): {
  label: string;
  color: string;
  next: OrderStatus | null;
} {
  const base = STATUS_CONFIG[order.status];
  if (order.orderType === "takeaway" && order.status === "delivered") {
    return { ...base, label: "🎉 Opgehaald" };
  }
  return base;
}

function formatCheckedTime(d: Date) {
  return d.toLocaleTimeString("nl-BE", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

/** Prep-time stepper bounds (minutes) shown when accepting an order. */
const PREP_MIN = 5;
const PREP_MAX = 60;
const PREP_STEP = 5;
const PREP_DEFAULT = 15;

function OrderCard({
  order,
  onAcceptAndPrint,
  onAcceptScheduledAndPrint,
  onPrintReceipt,
  onDelete,
  isAlarmTarget,
}: {
  order: Order;
  onAcceptAndPrint: (id: string, prepMinutes: number) => void;
  onAcceptScheduledAndPrint: (id: string) => void;
  onPrintReceipt: (id: string) => void;
  onDelete: (id: string) => void;
  isAlarmTarget?: boolean;
}) {
  const updateOrderStatus = useStore((s) => s.updateOrderStatus);
  const [prepMinutes, setPrepMinutes] = useState(PREP_DEFAULT);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const adjustPrep = (delta: number) =>
    setPrepMinutes((m) => Math.min(PREP_MAX, Math.max(PREP_MIN, m + delta)));
  const cfg = getStatusDisplay(order);
  const isScheduled = order.fulfillmentTime?.mode === "scheduled";
  const scheduledAt =
    isScheduled && order.fulfillmentTime.mode === "scheduled"
      ? new Date(order.fulfillmentTime.scheduledFor)
      : null;

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
            <span className="font-mono text-sm font-bold text-neutral-700">
              #{shortOrderCode(order.id)}
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
            {(() => {
              const isTakeaway = order.orderType === "takeaway";
              const isScheduled = order.fulfillmentTime?.mode === "scheduled";
              const label = isTakeaway
                ? isScheduled
                  ? "Geplande afhaling"
                  : "Afhalen"
                : isScheduled
                  ? "Geplande levering"
                  : "Levering";
              const color = isScheduled
                ? "border-blue-300 bg-blue-100 text-blue-900"
                : isTakeaway
                  ? "border-wood-300 bg-wood-100 text-wood-900"
                  : "border-sage-300 bg-sage-100 text-sage-900";
              return (
                <span
                  className={`tag-badge inline-flex items-center gap-1 border text-xs font-bold uppercase tracking-wide ${color}`}
                >
                  {isTakeaway ? <Store size={12} /> : <Truck size={12} />}
                  {label}
                </span>
              );
            })()}
            {order.fulfillmentTime?.mode === "scheduled" ? (
              <span className="tag-badge inline-flex items-center gap-1 border border-blue-300 bg-blue-50 text-xs font-bold text-blue-900">
                <CalendarClock size={12} />
                Klaar om{" "}
                {new Date(order.fulfillmentTime.scheduledFor).toLocaleString("nl-BE", {
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            ) : (
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
          <div className="mt-1 flex items-center gap-1.5 text-xs font-medium text-neutral-600">
            <Clock size={12} className="text-neutral-400" />
            <span className="text-neutral-400">Besteld:</span>
            {formatDate(order.createdAt)} om {formatTime(order.createdAt)}
          </div>
          {order.expectedReadyAt && (
            <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-sage-700">
              <Clock size={12} className="text-sage-500" />
              <span className="text-sage-500">
                {order.orderType === "takeaway" ? "Klaar rond:" : "Levering rond:"}
              </span>
              {formatTime(order.expectedReadyAt)}
              {typeof order.prepMinutes === "number" && order.prepMinutes > 0 && (
                <span className="text-sage-500">(~{order.prepMinutes} min)</span>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-2 text-right">
          <div className="no-print flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onPrintReceipt(order.id)}
              className="flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-2 py-1 text-xs font-semibold text-neutral-600 shadow-sm hover:bg-neutral-50"
              title="Keukenbon (her)afdrukken"
            >
              <Printer size={14} />
              Print
            </button>
            {confirmDelete ? (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setConfirmDelete(false);
                    onDelete(order.id);
                  }}
                  className="flex items-center gap-1 rounded-lg border border-rose-300 bg-rose-600 px-2 py-1 text-xs font-semibold text-white shadow-sm hover:bg-rose-700"
                  title="Bevestig verwijderen"
                >
                  <Trash2 size={14} />
                  Verwijder
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="rounded-lg border border-neutral-200 bg-white px-2 py-1 text-xs font-semibold text-neutral-500 shadow-sm hover:bg-neutral-50"
                  title="Annuleer"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-2 py-1 text-xs font-semibold text-rose-600 shadow-sm hover:bg-rose-50"
                title="Bestelling verwijderen"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
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

      {isNewOrderAlertStatus(order.status) && (
        <div className="no-print border-t border-neutral-100 bg-amber-50/50 px-5 py-4">
          {isScheduled && scheduledAt ? (
            <>
              <div className="mb-3 flex items-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-3 py-2.5 text-sm text-blue-900">
                <CalendarClock size={16} className="shrink-0" />
                <span>
                  Klant koos{" "}
                  <strong>
                    {scheduledAt.toLocaleString("nl-BE", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </strong>
                </span>
              </div>
              <button
                type="button"
                onClick={() => onAcceptScheduledAndPrint(order.id)}
                className="btn-primary flex w-full items-center justify-center gap-2 text-sm"
              >
                <Printer size={16} />
                Accepteren &amp; afdrukken
              </button>
              <p className="mt-2 text-[11px] leading-snug text-neutral-500">
                Gepland order — geen bereidingstijd nodig, de klanttijd staat op de bon.
              </p>
            </>
          ) : (
            <>
              <div className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-neutral-600">
                <Clock size={14} className="text-neutral-500" />
                Bereidingstijd
              </div>

              <div className="flex items-center justify-between gap-3 rounded-2xl border border-sage-200 bg-white p-2 shadow-sm">
                <button
                  type="button"
                  onClick={() => adjustPrep(-PREP_STEP)}
                  disabled={prepMinutes <= PREP_MIN}
                  aria-label="Minder tijd"
                  className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border border-sage-200 bg-sage-50 text-sage-800 transition hover:bg-sage-100 active:scale-95 disabled:opacity-40"
                >
                  <Minus size={20} />
                </button>
                <div className="flex flex-1 items-baseline justify-center gap-1">
                  <span className="text-3xl font-extrabold tabular-nums text-neutral-800">
                    {prepMinutes}
                  </span>
                  <span className="text-sm font-semibold text-neutral-500">min</span>
                </div>
                <button
                  type="button"
                  onClick={() => adjustPrep(PREP_STEP)}
                  disabled={prepMinutes >= PREP_MAX}
                  aria-label="Meer tijd"
                  className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border border-sage-200 bg-sage-50 text-sage-800 transition hover:bg-sage-100 active:scale-95 disabled:opacity-40"
                >
                  <Plus size={20} />
                </button>
              </div>

              <button
                type="button"
                onClick={() => onAcceptAndPrint(order.id, prepMinutes)}
                className="btn-primary mt-3 flex w-full items-center justify-center gap-2 text-sm"
              >
                <Printer size={16} />
                Accepteren &amp; afdrukken
              </button>

              <p className="mt-2 text-[11px] leading-snug text-neutral-500">
                De klant ziet meteen de verwachte {order.orderType === "takeaway" ? "afhaal" : "lever"}tijd.
              </p>
            </>
          )}
        </div>
      )}

      {!isNewOrderAlertStatus(order.status) && cfg.next && (
        <div className="no-print border-t border-neutral-100 px-5 py-3">
          <button
            type="button"
            onClick={() => updateOrderStatus(order.id, cfg.next!)}
            className="btn-primary text-sm"
          >
            Markeer als {getStatusLabel(cfg.next, order.orderType)}
          </button>
        </div>
      )}
    </div>
  );
}

export default function AdminPage() {
  const orders = useStore((s) => s.orders);
  const markKitchenPrinted = useStore((s) => s.markKitchenPrinted);
  const acceptOrderWithPrep = useStore((s) => s.acceptOrderWithPrep);
  const acceptScheduledOrder = useStore((s) => s.acceptScheduledOrder);
  const applyOrdersSnapshot = useStore((s) => s.applyOrdersSnapshot);
  const clearOrders = useStore((s) => s.clearOrders);
  const removeOrder = useStore((s) => s.removeOrder);

  const [mounted, setMounted] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [filter, setFilter] = useState<OrderStatus | "all">("all");
  const [kitchenMode, setKitchenMode] = useState(false);
  const [setupVisible, setSetupVisible] = useState(true);
  const [storeHydrated, setStoreHydrated] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date>(() => new Date());
  const [printTargetId, setPrintTargetId] = useState<string | null>(null);
  const [alarmOrderId, setAlarmOrderId] = useState<string | null>(null);
  const [soundMuted, setSoundMuted] = useState(false);
  const [audioArmed, setAudioArmed] = useState(false);
  /** null = not yet fetched; server inbox (Redis) for phone → PC order sync */
  const [orderInboxEnabled, setOrderInboxEnabled] = useState<boolean | null>(null);
  /** Connection state for the SSE stream → drives the live status pill. */
  const [streamConnected, setStreamConnected] = useState(false);
  const [usingPollingFallback, setUsingPollingFallback] = useState(false);
  const [exportFrom, setExportFrom] = useState("");
  const [exportTo, setExportTo] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [clearOrdersOpen, setClearOrdersOpen] = useState(false);
  const [clearOrdersPin, setClearOrdersPin] = useState("");
  const [clearingOrders, setClearingOrders] = useState(false);
  const [clearOrdersMessage, setClearOrdersMessage] = useState<string | null>(null);
  const [printMessage, setPrintMessage] = useState<string | null>(null);

  const printFlightRef = useRef<{ id: string } | null>(null);
  const newOrderWatchInit = useRef(false);
  const seenOrderIds = useRef<Set<string>>(new Set());

  const triggerKitchenPrint = useCallback(
    (orderId: string) => {
      if (printFlightRef.current) return;
      // Read the freshest copy from the store: accepting an order updates the
      // prep time synchronously right before we print, and the closed-over
      // `orders` array would still be the pre-accept snapshot.
      const order = useStore.getState().orders.find((o) => o.id === orderId);
      if (!order) return;

      printFlightRef.current = { id: orderId };
      setPrintMessage(null);

      const eposConfig = loadEposConfig();
      if (eposConfig.enabled && eposConfig.host.trim()) {
        void printKitchenOrderEpos(order, eposConfig).then((result) => {
          if (result.ok) {
            markKitchenPrinted(orderId);
            setPrintMessage(null);
          } else {
            setPrintMessage(result.error);
          }
          printFlightRef.current = null;
        });
        return;
      }

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
    (orderId: string, prepMinutes: number) => {
      acceptOrderWithPrep(orderId, prepMinutes);
      stopKitchenAlarmLoop();
      setAlarmOrderId((cur) => (cur === orderId ? null : cur));
      triggerKitchenPrint(orderId);
    },
    [acceptOrderWithPrep, triggerKitchenPrint]
  );

  const handleAcceptScheduledAndPrint = useCallback(
    (orderId: string) => {
      acceptScheduledOrder(orderId);
      stopKitchenAlarmLoop();
      setAlarmOrderId((cur) => (cur === orderId ? null : cur));
      triggerKitchenPrint(orderId);
    },
    [acceptScheduledOrder, triggerKitchenPrint]
  );

  useEffect(() => {
    setSoundMuted(isKitchenAlarmMuted());
    // Defensive backup: unlock Web Audio on the first interaction with the
    // page, in case the operator skipped the PIN gesture (e.g. PIN was
    // already entered earlier in this tab session).
    ensureKitchenAudioUnlock();
  }, []);

  useEffect(() => {
    if (!storeHydrated || !unlocked) return;
    if (!newOrderWatchInit.current) {
      newOrderWatchInit.current = true;
      // Seed all current orders as "seen" so we don't double-alarm on them,
      // but if any unaccepted (pending/paid) order arrived while the kitchen
      // was sitting on the PIN screen, fire the alarm now instead of letting
      // it appear silently after unlock.
      const waiting: typeof orders = [];
      orders.forEach((o) => {
        seenOrderIds.current.add(o.id);
        if (isNewOrderAlertStatus(o.status)) waiting.push(o);
      });
      if (waiting.length > 0) {
        const newest = waiting.reduce((a, b) =>
          new Date(b.createdAt).getTime() > new Date(a.createdAt).getTime() ? b : a
        );
        setAlarmOrderId(newest.id);
        startKitchenAlarmLoop();
      }
      return;
    }
    for (const o of orders) {
      if (!seenOrderIds.current.has(o.id)) {
        seenOrderIds.current.add(o.id);
        if (isNewOrderAlertStatus(o.status)) {
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

  const handleDeleteOrder = useCallback(
    (orderId: string) => {
      // Stop the alarm if we're deleting the order that is currently ringing.
      setAlarmOrderId((cur) => {
        if (cur === orderId) stopKitchenAlarmLoop();
        return cur === orderId ? null : cur;
      });
      // Drop it locally right away for a snappy board…
      removeOrder(orderId);
      // …and remove it from the server inbox so it doesn't resync on reload.
      void deleteOrderRemote(orderId, getStoredAdminPin() ?? undefined).then(
        (res) => {
          if (!res.ok) {
            console.warn("[admin] delete order failed", orderId, res.reason);
          }
        }
      );
    },
    [removeOrder]
  );

  const toggleMute = useCallback(() => {
    const next = !soundMuted;
    setSoundMuted(next);
    setKitchenAlarmMuted(next);
  }, [soundMuted]);

  /**
   * Browsers only allow audio after a user gesture, and can silently re-suspend
   * the audio context after inactivity even once unlocked. Poll the *real*
   * readiness (unlocked AND context running) continuously so the "enable sound"
   * button reappears whenever the alarm would otherwise fail silently — tapping
   * it re-arms the audio.
   */
  useEffect(() => {
    if (!unlocked) return;
    const check = () => setAudioArmed(isKitchenAudioReady());
    check();
    const id = window.setInterval(check, 1000);
    return () => window.clearInterval(id);
  }, [unlocked]);

  const armKitchenAudio = useCallback(() => {
    unlockKitchenAudio();
    void requestScreenWakeLock();
    setAudioArmed(true);
    if (!isKitchenAlarmMuted()) playTestKitchenAlarm();
  }, []);

  // Hold a screen wake lock while the board is open so a dedicated kitchen
  // tablet never sleeps (sleeping suspends audio → silent alarm). Released on
  // unmount; re-acquired on focus by the wake-lock helper itself.
  useEffect(() => {
    if (!unlocked) return;
    void requestScreenWakeLock();
    return () => releaseScreenWakeLock();
  }, [unlocked]);

  // Browsers require one user gesture before audio/wake-lock can start. Rather
  // than force the operator to hit the dedicated "enable sound" button, treat
  // ANY interaction with the board (tap, scroll, key) as that gesture — so in
  // practice sound arms itself the first time the kitchen touches the screen
  // and then stays alive all shift (silent keep-alive + wake lock). The button
  // remains only as a visible fallback until that first touch happens.
  useEffect(() => {
    if (!unlocked) return;
    const arm = () => {
      unlockKitchenAudio();
      void requestScreenWakeLock();
    };
    const opts = { capture: true, passive: true } as const;
    window.addEventListener("pointerdown", arm, opts);
    window.addEventListener("keydown", arm, opts);
    window.addEventListener("touchstart", arm, opts);
    return () => {
      window.removeEventListener("pointerdown", arm, opts);
      window.removeEventListener("keydown", arm, opts);
      window.removeEventListener("touchstart", arm, opts);
    };
  }, [unlocked]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const v = localStorage.getItem(KITCHEN_MODE_KEY);
    if (v === "1") setKitchenMode(true);
    if (localStorage.getItem(KITCHEN_SETUP_DISMISSED_KEY) === "1") {
      setSetupVisible(false);
    }
    if (isAdminSessionUnlocked()) {
      setUnlocked(true);
      ensureKitchenAudioUnlock();
    }
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
   *
   * Re-subscribes when `unlocked` flips true: EventSource can only authenticate
   * via the `rb_admin` cookie, which is set when the PIN is verified. A stream
   * opened on a fresh session (no cookie yet) gets a 401 and falls back to
   * polling; re-opening it right after unlock establishes the live SSE link
   * instead of leaving the "kitchen link" stuck on the polling fallback.
   */
  useEffect(() => {
    if (!storeHydrated) return;
    const unsubscribe = subscribeToOrderStream({
      onSnapshot: (snap) => {
        setOrderInboxEnabled(snap.inboxEnabled);
        applyOrdersSnapshot(snap.orders, { prune: snap.inboxEnabled });
        setStreamConnected(true);
        setUsingPollingFallback(false);
        setLastChecked(new Date());
      },
      onUpdate: (snap) => {
        setOrderInboxEnabled(snap.inboxEnabled);
        applyOrdersSnapshot(snap.orders, { prune: snap.inboxEnabled });
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
  }, [storeHydrated, unlocked, applyOrdersSnapshot]);

  const toggleKitchenMode = (on: boolean) => {
    setKitchenMode(on);
    if (typeof window !== "undefined") {
      localStorage.setItem(KITCHEN_MODE_KEY, on ? "1" : "0");
    }
  };

  const handleExportOrders = useCallback(async () => {
    setExporting(true);
    setExportMessage(null);
    const range = {
      from: exportFrom.trim() || undefined,
      to: exportTo.trim() || undefined,
    };
    try {
      if (orderInboxEnabled !== false) {
        const result = await downloadOrdersFromServer(range);
        if (result.ok) {
          setExportMessage(`${result.count} bestellingen gedownload.`);
          return;
        }
        if (result.reason === "unauthorized") {
          setExportMessage("Sessie verlopen — log opnieuw in met je PIN.");
          return;
        }
      }
      const count = downloadOrdersFromBrowser(orders, range);
      setExportMessage(
        orderInboxEnabled === false
          ? `${count} bestellingen (alleen orders in deze browser — koppel Redis voor volledige export).`
          : `${count} bestellingen (fallback: alleen orders in deze browser).`
      );
    } catch {
      setExportMessage("Export mislukt. Probeer opnieuw.");
    } finally {
      setExporting(false);
    }
  }, [exportFrom, exportTo, orderInboxEnabled, orders]);

  const handleConfirmClearOrders = useCallback(async () => {
    const pin = clearOrdersPin.trim();
    if (pin.length < 4) {
      setClearOrdersMessage("Voer je PIN in.");
      return;
    }
    setClearingOrders(true);
    setClearOrdersMessage(null);
    const pinOk = await verifyAdminPinRemote(pin);
    if (!pinOk) {
      setClearOrdersMessage("Onjuiste PIN.");
      setClearingOrders(false);
      return;
    }
    const result = await clearAllOrdersRemote(pin);
    if (!result.ok) {
      setClearOrdersMessage(
        result.reason === "unauthorized"
          ? "Sessie verlopen — log opnieuw in met je PIN."
          : result.reason === "inbox_unreachable"
            ? "Redis niet bereikbaar. Probeer opnieuw."
            : "Wissen mislukt. Probeer opnieuw."
      );
      setClearingOrders(false);
      return;
    }
    clearOrders();
    setClearOrdersOpen(false);
    setClearOrdersPin("");
    setClearOrdersMessage(
      result.inboxEnabled
        ? `${result.deleted} bestellingen gewist (server + dit scherm).`
        : "Lokale bestellingen gewist (Redis niet gekoppeld)."
    );
    setClearingOrders(false);
  }, [clearOrdersPin, clearOrders]);

  useEffect(() => {
    if (!mounted || !unlocked) return;
    document.body.classList.toggle("admin-kitchen-mode", kitchenMode);
    return () => {
      document.body.classList.remove("admin-kitchen-mode");
    };
  }, [kitchenMode, mounted, unlocked]);

  // End-of-day till reconciliation: sum today's confirmed sales (Europe/Brussels)
  // split by payment method. Pending (unpaid / not-yet-accepted) orders are
  // excluded so abandoned online checkouts don't inflate the card total.
  const dayTotals = useMemo(() => {
    const todayKey = dateKeyInTimeZone(new Date());
    let card = 0;
    let cash = 0;
    let cardCount = 0;
    let cashCount = 0;
    for (const o of orders) {
      if (o.status === "pending") continue;
      if (dateKeyInTimeZone(new Date(o.createdAt)) !== todayKey) continue;
      if (o.paymentMethod === "cash") {
        cash += o.total;
        cashCount += 1;
      } else {
        card += o.total;
        cardCount += 1;
      }
    }
    return {
      card,
      cash,
      total: card + cash,
      cardCount,
      cashCount,
      count: cardCount + cashCount,
    };
  }, [orders]);

  if (!mounted || !unlocked) {
    return (
      <>
        <Header />
        <AdminPinGate
          title="Keukenbeheer"
          subtitle="Voer je PIN in om door te gaan"
          icon={
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sage-500">
              <ChefHat size={28} className="text-white" />
            </div>
          }
          onUnlock={() => setUnlocked(true)}
          onUnlockGesture={() => {
            unlockKitchenAudio();
            void requestScreenWakeLock();
          }}
        />
      </>
    );
  }

  const filtered = kitchenMode
    ? orders.filter((o) => o.status !== "delivered")
    : filter === "all"
      ? orders
      : orders.filter((o) => o.status === filter);

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
    <div className={`min-h-screen bg-cream pb-24 ${kitchenMode ? "admin-kitchen-mode-page" : ""}`}>
      {!kitchenMode && <Header />}

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
              <span className="truncate">Nieuw order — #{shortOrderCode(alarmOrderId)}</span>
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
        {!soundMuted && !audioArmed && (
          <button
            type="button"
            onClick={armKitchenAudio}
            className="no-print mb-4 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-amber-300 bg-amber-50 px-4 py-3.5 text-sm font-bold text-amber-900 shadow-sm transition hover:bg-amber-100 active:scale-[0.99]"
          >
            <Bell size={18} className="animate-pulse text-amber-600" />
            Tik hier om het meldingsgeluid aan te zetten
          </button>
        )}
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
            {!kitchenMode && (
              <Link
                href="/admin/inventory"
                className="btn-secondary text-sm"
                title="Beheer voorraad en product-beschikbaarheid"
              >
                <Boxes size={15} />
                Voorraadbeheer
              </Link>
            )}
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
            {!kitchenMode && (
              <div className="text-xs text-neutral-500">
                Last checked:{" "}
                <span className="font-mono font-medium text-neutral-700">
                  {formatCheckedTime(lastChecked)}
                </span>
              </div>
            )}
          </div>
        </div>

        {!kitchenMode && (
          <div className="no-print mb-6 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-bold text-neutral-800">
                  <Download size={16} className="text-sage-600" />
                  Export voor boekhouding
                </h2>
                <p className="mt-1 max-w-xl text-xs leading-relaxed text-neutral-500">
                  Download alle bestellingen als CSV (Excel). Semicolon-gescheiden, UTF-8.
                  {orderInboxEnabled
                    ? " Data komt uit de server (tot ca. 5000 recente orders)."
                    : " Redis niet gekoppeld — export bevat alleen orders zichtbaar in deze browser."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleExportOrders()}
                disabled={
                  exporting || (orders.length === 0 && orderInboxEnabled !== true)
                }
                className="btn-secondary shrink-0 text-sm disabled:opacity-50"
              >
                {exporting ? (
                  "Bezig…"
                ) : (
                  <>
                    <Download size={15} />
                    Download CSV
                  </>
                )}
              </button>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium text-neutral-600">
                  Van (optioneel)
                </label>
                <input
                  type="date"
                  value={exportFrom}
                  onChange={(e) => setExportFrom(e.target.value)}
                  className="input-field text-sm"
                />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium text-neutral-600">
                  Tot (optioneel)
                </label>
                <input
                  type="date"
                  value={exportTo}
                  onChange={(e) => setExportTo(e.target.value)}
                  className="input-field text-sm"
                />
              </div>
            </div>
            {exportMessage && (
              <p className="mt-3 text-xs font-medium text-sage-700">{exportMessage}</p>
            )}
          </div>
        )}

        {!kitchenMode && (
          <div className="no-print mb-6 rounded-2xl border border-red-200 bg-red-50/50 p-4 shadow-sm sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-bold text-red-900">
                  <Trash2 size={16} />
                  Alle bestellingen wissen
                </h2>
                <p className="mt-1 max-w-xl text-xs leading-relaxed text-red-800/80">
                  Verwijdert alle orders uit Redis en op dit scherm. Handig vóór je opent.
                  Dit kan niet ongedaan worden gemaakt — exporteer eerst een CSV als je een
                  back-up wilt.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setClearOrdersOpen(true);
                  setClearOrdersPin("");
                  setClearOrdersMessage(null);
                }}
                disabled={orders.length === 0 && orderInboxEnabled !== true}
                className="shrink-0 rounded-xl2 border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50"
              >
                <Trash2 size={15} className="mr-1.5 inline" />
                Wissen…
              </button>
            </div>
            {clearOrdersMessage && (
              <p className="mt-3 text-xs font-medium text-red-800">{clearOrdersMessage}</p>
            )}
          </div>
        )}

        {clearOrdersOpen &&
          mounted &&
          createPortal(
            <div
              className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4"
              role="dialog"
              aria-modal="true"
              aria-labelledby="clear-orders-title"
            >
              <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-5 shadow-xl">
                <h3
                  id="clear-orders-title"
                  className="flex items-center gap-2 text-base font-bold text-red-900"
                >
                  <Trash2 size={18} />
                  Alle bestellingen wissen?
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-600">
                  Alle bestellingen worden permanent verwijderd uit de server en dit scherm.
                  Voer je keuken-PIN in om te bevestigen.
                </p>
                <label className="mt-4 block text-xs font-medium text-neutral-600">
                  PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
                  value={clearOrdersPin}
                  onChange={(e) =>
                    setClearOrdersPin(e.target.value.replace(/\D/g, "").slice(0, 8))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void handleConfirmClearOrders();
                  }}
                  className="input-field mt-1 tabular-nums"
                  placeholder="••••"
                  autoFocus
                />
                {clearOrdersMessage && clearOrdersOpen && (
                  <p className="mt-2 text-xs font-medium text-red-600">{clearOrdersMessage}</p>
                )}
                <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setClearOrdersOpen(false);
                      setClearOrdersPin("");
                      setClearOrdersMessage(null);
                    }}
                    disabled={clearingOrders}
                    className="btn-secondary text-sm"
                  >
                    Annuleren
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleConfirmClearOrders()}
                    disabled={clearingOrders || clearOrdersPin.length < 4}
                    className="rounded-xl2 bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {clearingOrders ? "Bezig…" : "Definitief wissen"}
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )}

        {setupVisible && !kitchenMode && (
          <div className="no-print mb-6 rounded-2xl border border-sage-200 bg-sage-50/80 p-4 shadow-sm sm:p-5">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <ListChecks size={20} className="shrink-0 text-sage-700" />
                <h2 className="text-sm font-bold text-neutral-800">Keuken-setup (eenmalig)</h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSetupVisible(false);
                  localStorage.setItem(KITCHEN_SETUP_DISMISSED_KEY, "1");
                }}
                className="rounded-lg p-1 text-neutral-400 hover:bg-white hover:text-neutral-600"
                title="Sluiten"
              >
                <X size={16} />
              </button>
            </div>
            <ol className="list-decimal space-y-2 pl-5 text-xs leading-relaxed text-neutral-700 sm:text-sm">
              <li>
                Open <strong>www.rollnbowl.be/admin</strong> op de keuken-tablet — laat dit tabblad open staan.
              </li>
              <li>
                Voer de PIN in (staat in Vercel → <strong>Environment Variables → ADMIN_PIN</strong>).
              </li>
              <li>
                Controleer de groene badge <strong>«Kitchen link · live»</strong> hierboven.
              </li>
              <li>
                Klik <strong>Test geluid</strong> — zorg dat <strong>Dempen</strong> uit staat.
              </li>
              <li>
                Printer: Wi‑Fi Epson → <strong>ePOS</strong> hieronder (IP + testbon). Geen AirPrint.
              </li>
              <li>
                Bij elk nieuw order: <strong>Accepteren &amp; afdrukken</strong> (of alleen <strong>Bevestig gehoord</strong>).
              </li>
            </ol>
            <EposPrinterSettings />
          </div>
        )}

        {printMessage && (
          <div className="no-print mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-800">
            {printMessage}
          </div>
        )}

        <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <UtensilsCrossed size={20} className="shrink-0 text-wood-600" />
            <div className="min-w-0">
              <p className="text-sm font-bold text-neutral-800">Kitchen mode</p>
              <p className="text-xs text-neutral-500">
                {kitchenMode ? (
                  <>
                    <strong>Actief</strong> — compacte weergave: alleen actieve orders, geen filters
                    of setup. Ideaal voor de keuken-tablet.
                  </>
                ) : (
                  <>
                    <strong>Meldingsgeluid</strong> (3× chime, ca. 7s). Dempen,{" "}
                    <strong>Bevestig gehoord</strong>, of <strong>Accepteren &amp; afdrukken</strong>.
                    ePOS 80&nbsp;mm bon (Wi‑Fi printer, geen Safari-dialoog).
                  </>
                )}
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
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-neutral-600">Kitchen mode</span>
              <button
                type="button"
                role="switch"
                aria-checked={kitchenMode}
                aria-label="Kitchen mode aan of uit"
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
          </div>
        </div>

        {!kitchenMode && (
        <>
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

        <div className="no-print mb-6 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Wallet size={16} className="text-sage-600" />
            <h2 className="text-sm font-bold text-neutral-800">Dagtotaal</h2>
            <span className="text-xs text-neutral-400">
              — einde van de dag
            </span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-sky-100 bg-sky-50 px-4 py-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-700">
                <CreditCard size={14} />
                Kaart (online)
              </div>
              <div className="mt-1 text-2xl font-bold text-sky-900">
                €{dayTotals.card.toFixed(2)}
              </div>
              <div className="text-[11px] text-sky-600">
                {dayTotals.cardCount} order(s)
              </div>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                <Banknote size={14} />
                Contant
              </div>
              <div className="mt-1 text-2xl font-bold text-emerald-900">
                €{dayTotals.cash.toFixed(2)}
              </div>
              <div className="text-[11px] text-emerald-600">
                {dayTotals.cashCount} order(s)
              </div>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-600">
                <Euro size={14} />
                Totaal
              </div>
              <div className="mt-1 text-2xl font-bold text-neutral-900">
                €{dayTotals.total.toFixed(2)}
              </div>
              <div className="text-[11px] text-neutral-500">
                {dayTotals.count} order(s)
              </div>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-neutral-400">
            Betaalde en geaccepteerde orders van vandaag (Europe/Brussels).
            Openstaande (pending) orders tellen niet mee.
          </p>
        </div>
        </>
        )}

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-3 text-5xl">📋</div>
            <h3 className="font-semibold text-neutral-700">
              {kitchenMode ? "Geen actieve orders" : "No orders yet"}
            </h3>
            <p className="mt-1 text-sm text-neutral-400">
              {kitchenMode
                ? "Afgeleverde en opgehaalde orders zijn verborgen in kitchen mode."
                : filter !== "all"
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
                onAcceptScheduledAndPrint={handleAcceptScheduledAndPrint}
                onPrintReceipt={triggerKitchenPrint}
                onDelete={handleDeleteOrder}
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
