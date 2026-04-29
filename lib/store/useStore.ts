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

function generateId(): string {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
}

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
    version: Math.max(local.version ?? 0, server.version ?? 0),
    updatedAt: server.updatedAt ?? local.updatedAt,
  };

  if (
    next.status === local.status &&
    next.lightspeed === local.lightspeed &&
    next.kitchenPrinted === local.kitchenPrinted &&
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
  }) => Order;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  markKitchenPrinted: (orderId: string) => void;
  setOrderLightspeed: (orderId: string, meta: OrderLightspeedMeta) => void;
  /** Merge an order from the server inbox (e.g. phone) into this browser — idempotent. */
  mergeOrderFromInbox: (order: Order) => void;

  /** Apply a snapshot of orders from the server (initial fetch / SSE snapshot event). */
  applyOrdersSnapshot: (orders: Order[]) => void;

  setLocale: (locale: Locale) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      zipCode: null,
      zipCodeConfig: null,
      deliveryAddress: null,
      cart: [],
      orders: [],
      locale: "nl",
      lastAddedAt: 0,
      kitchenPrintedOrderIds: [],

      setZipCode: (code, config, address) =>
        set({ zipCode: code, zipCodeConfig: config, deliveryAddress: address }),

      clearZipCode: () =>
        set({ zipCode: null, zipCodeConfig: null, deliveryAddress: null }),

      addToCart: (item) =>
        set((state) => ({
          cart: [...state.cart, { ...item, cartId: generateId() }],
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

      placeOrder: ({ customerInfo, generalNote, paymentMethod, cashDenomination, orderType, fulfillmentTime }) => {
        const state = get();
        const subtotal = state.cart.reduce(
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
          id: generateId(),
          items: state.cart,
          subtotal,
          deliveryFee,
          total: subtotal + deliveryFee,
          customerInfo,
          generalNote,
          paymentMethod,
          ...(paymentMethod === "cash" && cashDenomination !== undefined
            ? { cashDenomination }
            : {}),
          orderType,
          fulfillmentTime,
          status: "pending",
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
        void patchOrderRemote(orderId, { lightspeed: meta });
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

      setLocale: (locale) => set({ locale }),
    }),
    {
      name: "roll-bowl-store",
      version: 6,
      migrate: (persistedState, version) => {
        let p = persistedState as Partial<AppState> | null;
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
        cart: state.cart,
        orders: state.orders,
        locale: state.locale,
        kitchenPrintedOrderIds: state.kitchenPrintedOrderIds,
      }),
    }
  )
);
