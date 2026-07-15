"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  CartItem,
  CustomerInfo,
  Order,
  OrderLightspeedMeta,
  OrderStatus,
  ZipCodeConfig,
  PaymentMethod,
  OrderType,
  FulfillmentTime,
} from "@/lib/types";
import type { Locale } from "@/lib/i18n/index";
import { isNewCustomerByPhone } from "@/lib/customerIdentity";
import { patchOrderRemote } from "@/lib/orders/client";
import { generateOrderId } from "@/lib/orderId";

function tsOf(o: Order | undefined | null): number {
  if (!o) return 0;
  if (o.updatedAt) {
    const t = Date.parse(o.updatedAt);
    if (Number.isFinite(t)) return t;
  }
  const c = Date.parse(o.createdAt);
  return Number.isFinite(c) ? c : 0;
}

/**
 * Merge a server copy onto a local copy without losing in-flight optimistic
 * updates. Returns the same `local` reference when nothing changes so React
 * skips re-rendering listeners that haven't actually changed.
 *
 * Rule: whichever side has the later `updatedAt` wins on the mutable fields
 * (status / lightspeed / kitchenPrinted). `version` is just kept in sync as
 * a write-ordering hint for the SSE loop.
 */
function mergeOrderRecord(local: Order, server: Order): Order {
  const localTs = tsOf(local);
  const serverTs = tsOf(server);

  if (localTs > serverTs) return local;

  const next: Order = {
    ...local,
    status: server.status,
    ...(server.lightspeed !== undefined ? { lightspeed: server.lightspeed } : {}),
    ...(server.kitchenPrinted !== undefined
      ? { kitchenPrinted: server.kitchenPrinted }
      : {}),
    ...(server.prepMinutes !== undefined
      ? { prepMinutes: server.prepMinutes }
      : {}),
    ...(server.expectedReadyAt !== undefined
      ? { expectedReadyAt: server.expectedReadyAt }
      : {}),
    version: Math.max(local.version ?? 0, server.version ?? 0),
    updatedAt: server.updatedAt ?? local.updatedAt,
  };

  if (
    next.status === local.status &&
    next.lightspeed === local.lightspeed &&
    next.kitchenPrinted === local.kitchenPrinted &&
    next.prepMinutes === local.prepMinutes &&
    next.expectedReadyAt === local.expectedReadyAt &&
    next.version === local.version &&
    next.updatedAt === local.updatedAt
  ) {
    return local;
  }
  return next;
}

interface AppState {
  // Delivery zone session
  zipCode: string | null;
  zipCodeConfig: ZipCodeConfig | null;
  deliveryAddress: string | null;
  /** Chosen on landing; drives menu access and cart default order type. */
  sessionOrderType: OrderType;

  // Cart
  cart: CartItem[];

  // Orders (persisted for admin view)
  orders: Order[];

  // UI locale
  locale: Locale;

  // Transient: timestamp of last addToCart (not persisted, drives upsell panel)
  lastAddedAt: number;

  /** Order IDs that have been auto-printed on the kitchen terminal (persisted) */
  kitchenPrintedOrderIds: string[];

  // Actions
  setZipCode: (code: string, config: ZipCodeConfig, address: string) => void;
  clearZipCode: () => void;
  setSessionOrderType: (orderType: OrderType) => void;
  startTakeawaySession: () => void;

  addToCart: (item: Omit<CartItem, "cartId">) => void;
  removeFromCart: (cartId: string) => void;
  updateQuantity: (cartId: string, quantity: number) => void;
  updateNote: (cartId: string, note: string) => void;
  clearCart: () => void;

  placeOrder: (args: {
    customerInfo: CustomerInfo;
    generalNote: string;
    paymentMethod: PaymentMethod;
    cashDenomination?: number;
    orderType: OrderType;
    fulfillmentTime: FulfillmentTime;
    orderId?: string;
    stripePaymentIntentId?: string;
    status?: OrderStatus;
    /** Use when cart was cleared before placing (e.g. Stripe redirect return). */
    items?: CartItem[];
  }) => Order;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  /**
   * Accept a new order: set status to `preparing` and record the kitchen's
   * chosen prep time (minutes), which drives the expected ready/delivery time.
   */
  acceptOrderWithPrep: (orderId: string, prepMinutes: number) => void;
  /** Accept a scheduled order using the customer's chosen time slot. */
  acceptScheduledOrder: (orderId: string) => void;
  markKitchenPrinted: (orderId: string) => void;
  setOrderLightspeed: (orderId: string, meta: OrderLightspeedMeta) => void;
  /** Merge an order from the server inbox (e.g. phone) into this browser — idempotent. */
  mergeOrderFromInbox: (order: Order) => void;

  /** Apply a snapshot of orders from the server (initial fetch / SSE snapshot event). */
  applyOrdersSnapshot: (orders: Order[]) => void;

  /** Wipe the local order board (e.g. after server-side clear). */
  clearOrders: () => void;

  /** Remove a single order from the local board (e.g. after server-side delete). */
  removeOrder: (orderId: string) => void;

  setLocale: (locale: Locale) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      zipCode: null,
      zipCodeConfig: null,
      deliveryAddress: null,
      sessionOrderType: "delivery",
      cart: [],
      orders: [],
      locale: "nl",
      lastAddedAt: 0,
      kitchenPrintedOrderIds: [],

      setZipCode: (code, config, address) =>
        set({
          zipCode: code,
          zipCodeConfig: config,
          deliveryAddress: address,
          sessionOrderType: "delivery",
        }),

      clearZipCode: () =>
        set({ zipCode: null, zipCodeConfig: null, deliveryAddress: null }),

      setSessionOrderType: (orderType) => set({ sessionOrderType: orderType }),

      startTakeawaySession: () =>
        set({
          sessionOrderType: "takeaway",
          zipCode: null,
          zipCodeConfig: null,
          deliveryAddress: null,
        }),

      addToCart: (item) =>
        set((state) => ({
          cart: [...state.cart, { ...item, cartId: generateOrderId() }],
          lastAddedAt: Date.now(),
        })),

      removeFromCart: (cartId) =>
        set((state) => ({
          cart: state.cart.filter((i) => i.cartId !== cartId),
        })),

      updateQuantity: (cartId, quantity) =>
        set((state) => ({
          cart:
            quantity <= 0
              ? state.cart.filter((i) => i.cartId !== cartId)
              : state.cart.map((i) =>
                  i.cartId === cartId ? { ...i, quantity } : i
                ),
        })),

      updateNote: (cartId, note) =>
        set((state) => ({
          cart: state.cart.map((i) =>
            i.cartId === cartId ? { ...i, note } : i
          ),
        })),

      clearCart: () => set({ cart: [] }),

      placeOrder: ({
        customerInfo,
        generalNote,
        paymentMethod,
        cashDenomination,
        orderType,
        fulfillmentTime,
        orderId: orderIdArg,
        stripePaymentIntentId,
        status: statusArg,
        items: itemsArg,
      }) => {
        const state = get();
        const lineItems = itemsArg ?? state.cart;
        const subtotal = lineItems.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0
        );
        // Takeaway skips the delivery fee entirely.
        const deliveryFee =
          orderType === "takeaway" ? 0 : state.zipCodeConfig?.deliveryFee ?? 0;
        const isFirstTimeCustomer = isNewCustomerByPhone(
          state.orders,
          customerInfo.phone,
        );
        const order: Order = {
          id: orderIdArg ?? generateOrderId(),
          items: lineItems,
          subtotal,
          deliveryFee,
          total: subtotal + deliveryFee,
          customerInfo,
          generalNote,
          paymentMethod,
          ...(paymentMethod === "cash" && cashDenomination !== undefined
            ? { cashDenomination }
            : {}),
          ...(stripePaymentIntentId ? { stripePaymentIntentId } : {}),
          orderType,
          fulfillmentTime,
          status: statusArg ?? "pending",
          createdAt: new Date().toISOString(),
          isFirstTimeCustomer,
        };
        set((s) => ({ orders: [order, ...s.orders], cart: [] }));
        return order;
      },

      updateOrderStatus: (orderId, status) => {
        set((state) => ({
          orders: state.orders.map((o) =>
            o.id === orderId
              ? { ...o, status, updatedAt: new Date().toISOString() }
              : o
          ),
        }));
        // Optimistic UI; server PATCH propagates to other devices via SSE.
        // 503/404 simply means we're running offline — the local copy stays.
        void patchOrderRemote(orderId, { status });
      },

      acceptOrderWithPrep: (orderId, prepMinutes) => {
        const minutes = Math.max(0, Math.min(180, Math.round(prepMinutes)));
        const expectedReadyAt = new Date(
          Date.now() + minutes * 60_000
        ).toISOString();
        set((state) => ({
          orders: state.orders.map((o) =>
            o.id === orderId
              ? {
                  ...o,
                  status: "preparing",
                  prepMinutes: minutes,
                  expectedReadyAt,
                  updatedAt: new Date().toISOString(),
                }
              : o
          ),
        }));
        void patchOrderRemote(orderId, {
          status: "preparing",
          prepMinutes: minutes,
          expectedReadyAt,
        });
      },

      acceptScheduledOrder: (orderId) => {
        const order = get().orders.find((o) => o.id === orderId);
        if (
          !order?.fulfillmentTime ||
          order.fulfillmentTime.mode !== "scheduled"
        ) {
          return;
        }
        const expectedReadyAt = order.fulfillmentTime.scheduledFor;
        set((state) => ({
          orders: state.orders.map((o) =>
            o.id === orderId
              ? {
                  ...o,
                  status: "preparing",
                  expectedReadyAt,
                  prepMinutes: undefined,
                  updatedAt: new Date().toISOString(),
                }
              : o
          ),
        }));
        void patchOrderRemote(orderId, {
          status: "preparing",
          expectedReadyAt,
        });
      },

      markKitchenPrinted: (orderId) => {
        set((state) => ({
          kitchenPrintedOrderIds: state.kitchenPrintedOrderIds.includes(orderId)
            ? state.kitchenPrintedOrderIds
            : [...state.kitchenPrintedOrderIds, orderId],
          orders: state.orders.map((o) =>
            o.id === orderId
              ? { ...o, kitchenPrinted: true, updatedAt: new Date().toISOString() }
              : o
          ),
        }));
        void patchOrderRemote(orderId, { kitchenPrinted: true });
      },

      setOrderLightspeed: (orderId, meta) => {
        set((state) => ({
          orders: state.orders.map((o) =>
            o.id === orderId
              ? { ...o, lightspeed: meta, updatedAt: new Date().toISOString() }
              : o
          ),
        }));
      },

      /**
       * Merge a server snapshot into the local store. Server-version wins
       * for status / lightspeed / kitchenPrinted (so admin actions made on
       * one device propagate to the others), but we never regress local
       * changes that haven't been ACK'd yet — concretely we keep the local
       * copy when the local `version` is higher, and we always keep the
       * local optimistic status until the server's `updatedAt` overtakes
       * the local `updatedAt`.
       */
      mergeOrderFromInbox: (order) =>
        set((state) => {
          const idx = state.orders.findIndex((o) => o.id === order.id);
          if (idx < 0) {
            return { orders: [order, ...state.orders] };
          }
          const local = state.orders[idx];
          const merged = mergeOrderRecord(local, order);
          if (merged === local) return state;
          const next = [...state.orders];
          next[idx] = merged;
          return { orders: next };
        }),

      applyOrdersSnapshot: (incoming) =>
        set((state) => {
          let changed = false;
          const byId = new Map<string, Order>();
          for (const o of state.orders) byId.set(o.id, o);
          for (const remote of incoming) {
            const local = byId.get(remote.id);
            if (!local) {
              byId.set(remote.id, remote);
              changed = true;
              continue;
            }
            const merged = mergeOrderRecord(local, remote);
            if (merged !== local) {
              byId.set(remote.id, merged);
              changed = true;
            }
          }
          if (!changed) return state;
          const orders = [...byId.values()].sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          return { orders };
        }),

      clearOrders: () => set({ orders: [], kitchenPrintedOrderIds: [] }),

      removeOrder: (orderId) =>
        set((state) => ({
          orders: state.orders.filter((o) => o.id !== orderId),
          kitchenPrintedOrderIds: state.kitchenPrintedOrderIds.filter(
            (id) => id !== orderId
          ),
        })),

      setLocale: (locale) => set({ locale }),
    }),
    {
      name: "roll-bowl-store",
      version: 7,
      migrate: (persistedState, version) => {
        let p = persistedState as Partial<AppState> | null;
        if (version < 7) {
          p = {
            ...p,
            sessionOrderType: p?.sessionOrderType ?? "delivery",
          };
        }
        if (version < 2 && p?.orders) {
          p = {
            ...p,
            orders: p.orders.map((o) =>
              (o as { status: string }).status === "pending"
                ? ({ ...o, status: "paid" } as Order)
                : o
            ),
          };
        }
        // v4: backfill orderType / fulfillmentTime on legacy orders so the
        // admin/receipt UIs can render them without null-checks everywhere.
        if (version < 4 && p?.orders) {
          p = {
            ...p,
            orders: p.orders.map((raw) => {
              const legacy = raw as Partial<Order> & Order;
              return {
                ...legacy,
                orderType: legacy.orderType ?? "delivery",
                fulfillmentTime: legacy.fulfillmentTime ?? { mode: "asap" },
              } as Order;
            }),
          };
        }
        if (version < 5 && p?.orders) {
          p = {
            ...p,
            orders: p.orders.map((o) => o as Order),
          };
        }
        if (version < 6 && p?.orders) {
          p = {
            ...p,
            orders: p.orders.map((raw) => {
              const o = raw as Order;
              return {
                ...o,
                isFirstTimeCustomer: o.isFirstTimeCustomer ?? false,
              };
            }),
          };
        }
        return p as Partial<AppState>;
      },
      merge: (persistedState, currentState) => {
        const p = (persistedState || {}) as Partial<AppState>;
        const pOrders = p.orders ?? [];
        const cOrders = currentState.orders;
        // Union by id; current wins (avoids a stale rehydrate wiping a just-placed order).
        const byId = new Map<string, Order>();
        for (const o of pOrders) byId.set(o.id, o);
        for (const o of cOrders) byId.set(o.id, o);
        const orders = [...byId.values()].sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        const hasNewerOrder = cOrders.some(
          (c) => !pOrders.some((po) => po.id === c.id)
        );
        // After checkout the cart is cleared in memory; old localStorage can still
        // hold pre-checkout cart — do not restore that over an empty post-checkout cart.
        const cart =
          hasNewerOrder && currentState.cart.length === 0
            ? currentState.cart
            : p.cart !== undefined
              ? p.cart
              : currentState.cart;
        return {
          ...currentState,
          ...p,
          cart,
          orders,
          kitchenPrintedOrderIds: Array.isArray(p.kitchenPrintedOrderIds)
            ? p.kitchenPrintedOrderIds
            : currentState.kitchenPrintedOrderIds,
        };
      },
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? localStorage : sessionStorage
      ),
      skipHydration: true,
      // lastAddedAt is transient — do not persist it
      partialize: (state) => ({
        zipCode: state.zipCode,
        zipCodeConfig: state.zipCodeConfig,
        deliveryAddress: state.deliveryAddress,
        sessionOrderType: state.sessionOrderType,
        cart: state.cart,
        orders: state.orders,
        locale: state.locale,
        kitchenPrintedOrderIds: state.kitchenPrintedOrderIds,
      }),
    }
  )
);
