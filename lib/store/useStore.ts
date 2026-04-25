"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  CartItem,
  Order,
  OrderStatus,
  ZipCodeConfig,
} from "@/lib/types";
import type { Locale } from "@/lib/i18n/index";

function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
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

  // Actions
  setZipCode: (code: string, config: ZipCodeConfig, address: string) => void;
  clearZipCode: () => void;

  addToCart: (item: Omit<CartItem, "cartId">) => void;
  removeFromCart: (cartId: string) => void;
  updateQuantity: (cartId: string, quantity: number) => void;
  updateNote: (cartId: string, note: string) => void;
  clearCart: () => void;
  addSubmittedOrder: (order: Order) => void;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  /** Merge an order from the server inbox (e.g. phone) into this browser — idempotent. */
  mergeOrderFromInbox: (order: Order) => void;

  setLocale: (locale: Locale) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      zipCode: null,
      zipCodeConfig: null,
      deliveryAddress: null,
      cart: [],
      orders: [],
      locale: "nl",
      lastAddedAt: 0,

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

      addSubmittedOrder: (order) =>
        set((state) => {
          const exists = state.orders.some((o) => o.id === order.id);
          return {
            orders: exists
              ? state.orders.map((o) => (o.id === order.id ? order : o))
              : [order, ...state.orders],
            cart: [],
          };
        }),

      updateOrderStatus: (orderId, status) =>
        set((state) => ({
          orders: state.orders.map((o) =>
            o.id === orderId ? { ...o, status } : o
          ),
        })),

      mergeOrderFromInbox: (order) =>
        set((state) => {
          if (state.orders.some((o) => o.id === order.id)) return state;
          return { orders: [order, ...state.orders] };
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
      }),
    }
  )
);
