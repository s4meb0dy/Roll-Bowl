"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { CartItem, CustomerInfo, Order, OrderStatus, ZipCodeConfig, PaymentMethod } from "@/lib/types";
import type { Locale } from "@/lib/i18n/index";

function generateId(): string {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
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

  placeOrder: (customerInfo: CustomerInfo, generalNote: string, paymentMethod: PaymentMethod, cashDenomination?: number) => string;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  markKitchenPrinted: (orderId: string) => void;

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

      placeOrder: (customerInfo, generalNote, paymentMethod, cashDenomination) => {
        const state = get();
        const subtotal = state.cart.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0
        );
        const deliveryFee = state.zipCodeConfig?.deliveryFee ?? 0;
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
          status: "paid",
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ orders: [order, ...s.orders], cart: [] }));
        return order.id;
      },

      updateOrderStatus: (orderId, status) =>
        set((state) => ({
          orders: state.orders.map((o) =>
            o.id === orderId ? { ...o, status } : o
          ),
        })),

      markKitchenPrinted: (orderId) =>
        set((state) => ({
          kitchenPrintedOrderIds: state.kitchenPrintedOrderIds.includes(orderId)
            ? state.kitchenPrintedOrderIds
            : [...state.kitchenPrintedOrderIds, orderId],
        })),

      setLocale: (locale) => set({ locale }),
    }),
    {
      name: "roll-bowl-store",
      version: 2,
      migrate: (persistedState, version) => {
        if (version >= 2) return persistedState as Partial<AppState>;
        const p = persistedState as Partial<AppState> | null;
        if (!p?.orders) return persistedState as Partial<AppState>;
        return {
          ...p,
          orders: p.orders.map((o) =>
            (o as { status: string }).status === "pending"
              ? ({ ...o, status: "paid" } as Order)
              : o
          ),
        };
      },
      merge: (persistedState, currentState) => {
        const p = (persistedState || {}) as Partial<AppState>;
        const orders = (p.orders ?? currentState.orders).map((o) =>
          (o as { status: string }).status === "pending"
            ? ({ ...o, status: "paid" } as Order)
            : o
        );
        return {
          ...currentState,
          ...p,
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
