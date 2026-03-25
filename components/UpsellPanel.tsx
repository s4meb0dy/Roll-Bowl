"use client";

import { useEffect, useState, useCallback } from "react";
import { X, Plus, CheckCircle2 } from "lucide-react";
import { useStore } from "@/lib/store/useStore";
import { useT } from "@/lib/i18n";
import { DRANKEN, DESSERTEN, EXTRAS } from "@/lib/menu";
import type { ReadyMadeItem } from "@/lib/types";

const POOL = [...DRANKEN.filter((d) => !d.unavailable), ...DESSERTEN, ...EXTRAS];
const DISPLAY_MS = 6000;
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
  const [progress, setProgress] = useState(100);
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
    setProgress(100);
    setVisible(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastAddedAt]);

  // Auto-dismiss countdown
  useEffect(() => {
    if (!visible) return;
    const interval = 50; // ms tick
    const step = (interval / DISPLAY_MS) * 100;
    const timer = setInterval(() => {
      setProgress((p) => {
        const next = p - step;
        if (next <= 0) {
          clearInterval(timer);
          dismiss();
          return 0;
        }
        return next;
      });
    }, interval);
    return () => clearInterval(timer);
  }, [visible, dismiss]);

  const handleAdd = (item: ReadyMadeItem) => {
    addToCart({ type: "item", name: item.name, price: item.price, quantity: 1, note: "", menuItemId: item.id });
    setAddedIds((prev) => new Set([...prev, item.id]));
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 w-72 animate-slide-up">
      <div className="overflow-hidden rounded-2xl bg-neutral-900 shadow-2xl ring-1 ring-white/10">
        {/* Progress bar */}
        <div className="h-0.5 bg-neutral-700">
          <div
            className="h-full bg-sage-400 transition-[width] duration-75"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <p className="text-sm font-bold text-white">{t("upsell.title")}</p>
          <button
            onClick={dismiss}
            className="flex h-6 w-6 items-center justify-center rounded-full text-neutral-400 transition hover:bg-neutral-700 hover:text-white"
          >
            <X size={13} />
          </button>
        </div>

        {/* Items */}
        <div className="divide-y divide-neutral-800 px-4 pb-4">
          {suggestions.map((item) => {
            const added = addedIds.has(item.id);
            return (
              <div key={item.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-xl flex-shrink-0">{item.emoji}</span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white leading-tight">
                      {item.name}
                    </p>
                    <p className="text-xs text-neutral-400">€{item.price.toFixed(2)}</p>
                  </div>
                </div>
                <button
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
  );
}
