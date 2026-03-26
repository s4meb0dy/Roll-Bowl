"use client";

import { useEffect, useState, useCallback } from "react";
import { X, Plus, CheckCircle2 } from "lucide-react";
import { useStore } from "@/lib/store/useStore";
import { useT } from "@/lib/i18n";
import { DRANKEN, DESSERTEN, EXTRAS } from "@/lib/menu";
import type { ReadyMadeItem } from "@/lib/types";

const POOL = [...DRANKEN.filter((d) => !d.unavailable), ...DESSERTEN, ...EXTRAS];
const PICK_COUNT = 3;

function pickSuggestions(cartIds: Set<string>): ReadyMadeItem[] {
  const eligible = POOL.filter((item) => !cartIds.has(item.id));
  const shuffled = [...eligible].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, PICK_COUNT);
}

export default function UpsellPanel() {
  const t = useT();
  const lastAddedAt = useStore((s) => s.lastAddedAt);
  const cart = useStore((s) => s.cart);
  const addToCart = useStore((s) => s.addToCart);

  const [visible, setVisible] = useState(false);
  const [suggestions, setSuggestions] = useState<ReadyMadeItem[]>([]);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  const dismiss = useCallback(() => {
    setVisible(false);
    setAddedIds(new Set());
  }, []);

  // Show panel when an item is added
  useEffect(() => {
    if (!lastAddedAt) return;
    const cartIds = new Set(cart.map((i) => i.menuItemId).filter(Boolean) as string[]);
    const picks = pickSuggestions(cartIds);
    if (picks.length === 0) return;
    setSuggestions(picks);
    setVisible(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastAddedAt]);

  useEffect(() => {
    if (!visible) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [visible]);

  const handleAdd = (item: ReadyMadeItem) => {
    addToCart({ type: "item", name: item.name, price: item.price, quantity: 1, note: "", menuItemId: item.id });
    setAddedIds((prev) => new Set([...prev, item.id]));
  };

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upsell-title"
    >
      {/* Backdrop — visual only; close only via X */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" aria-hidden />

      <div className="relative w-full max-w-md animate-fade-in">
        <div className="overflow-hidden rounded-2xl bg-neutral-900 shadow-2xl ring-1 ring-white/10">
          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <p id="upsell-title" className="text-sm font-bold text-white">
              {t("upsell.title")}
            </p>
            <button
              type="button"
              onClick={dismiss}
              className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 transition hover:bg-neutral-700 hover:text-white"
              aria-label={t("upsell.close")}
            >
              <X size={16} />
            </button>
          </div>

          {/* Items */}
          <div className="divide-y divide-neutral-800 px-4 pb-4">
            {suggestions.map((item) => {
              const added = addedIds.has(item.id);
              return (
                <div key={item.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="flex-shrink-0 text-xl">{item.emoji}</span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold leading-tight text-white">
                        {item.name}
                      </p>
                      <p className="text-xs text-neutral-400">€{item.price.toFixed(2)}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => !added && handleAdd(item)}
                    className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full transition ${
                      added
                        ? "bg-sage-500 text-white"
                        : "bg-neutral-700 text-neutral-200 hover:bg-wood-500 hover:text-white"
                    }`}
                  >
                    {added ? <CheckCircle2 size={15} /> : <Plus size={15} />}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
