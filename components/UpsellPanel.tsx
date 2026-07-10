"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import { X, Plus, Check } from "lucide-react";
import { useStore } from "@/lib/store/useStore";
import { useT } from "@/lib/i18n";
import { DRANKEN, DESSERTEN, EXTRAS } from "@/lib/menu";
import type { ReadyMadeItem } from "@/lib/types";

const POOL = [...DRANKEN.filter((d) => !d.unavailable), ...DESSERTEN, ...EXTRAS];
/** How many tiles go in the "forgot something?" carousel vs the list below. */
const FEATURED_COUNT = 4;
const LIST_COUNT = 3;
const TOTAL_PICKS = FEATURED_COUNT + LIST_COUNT;

function pickSuggestions(cartIds: Set<string>): ReadyMadeItem[] {
  const eligible = POOL.filter((item) => !cartIds.has(item.id));
  const shuffled = [...eligible].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, TOTAL_PICKS);
}

export default function UpsellPanel() {
  const t = useT();
  const lastAddedAt = useStore((s) => s.lastAddedAt);
  const cart = useStore((s) => s.cart);
  const addToCart = useStore((s) => s.addToCart);

  const [visible, setVisible] = useState(false);
  const [suggestions, setSuggestions] = useState<ReadyMadeItem[]>([]);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  // Mirror `visible` in a ref so the open-effect can bail out without needing
  // `visible` in its dependency list (which would reopen it right after close).
  const visibleRef = useRef(false);
  useEffect(() => {
    visibleRef.current = visible;
  }, [visible]);

  const dismiss = useCallback(() => {
    setVisible(false);
    setAddedIds(new Set());
  }, []);

  // Open the panel when an item is added — but not for the adds triggered from
  // inside the panel itself (those just tick the checkmark, no reshuffle).
  useEffect(() => {
    if (!lastAddedAt) return;
    if (visibleRef.current) return;
    const cartIds = new Set(
      cart.map((i) => i.menuItemId).filter(Boolean) as string[]
    );
    const picks = pickSuggestions(cartIds);
    if (picks.length === 0) return;
    setSuggestions(picks);
    setAddedIds(new Set());
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
    addToCart({
      type: "item",
      name: item.name,
      price: item.price,
      quantity: 1,
      note: "",
      menuItemId: item.id,
    });
    setAddedIds((prev) => new Set([...prev, item.id]));
  };

  if (!visible) return null;

  const featured = suggestions.slice(0, FEATURED_COUNT);
  const list = suggestions.slice(FEATURED_COUNT, FEATURED_COUNT + LIST_COUNT);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upsell-title"
    >
      {/* Backdrop — visual only; close only via the X / done button. */}
      <div className="absolute inset-0 bg-ink-900/50 backdrop-blur-[2px]" aria-hidden />

      <div className="relative w-full max-w-md animate-fade-in">
        <div className="flex max-h-[90vh] flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl ring-1 ring-ink-900/5 sm:rounded-3xl">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 bg-gradient-to-br from-gold-50 to-wood-50 px-5 pb-4 pt-5">
            <div className="min-w-0">
              <h2
                id="upsell-title"
                className="font-display text-lg font-bold leading-tight text-ink-900"
              >
                {t("upsell.forgot_title")}
              </h2>
              <p className="mt-0.5 text-xs text-ink-500">{t("upsell.forgot_sub")}</p>
            </div>
            <button
              type="button"
              onClick={dismiss}
              className="tap-target -mr-1 -mt-1 flex h-11 w-11 min-h-[44px] min-w-[44px] flex-shrink-0 items-center justify-center rounded-full text-ink-400 transition hover:bg-ink-100 hover:text-ink-700 active:scale-[0.98]"
              aria-label={t("upsell.close")}
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-hide">
          {/* Featured: swipeable row on mobile, 2-col grid on desktop */}
          {featured.length > 0 && (
            <div className="flex gap-3 overflow-x-auto scrollbar-hide px-5 py-4 [-webkit-overflow-scrolling:touch] sm:grid sm:grid-cols-2 sm:overflow-visible">
              {featured.map((item) => {
                const added = addedIds.has(item.id);
                return (
                  <div
                    key={item.id}
                    className="relative w-28 flex-shrink-0 overflow-hidden rounded-2xl border border-ink-200/70 bg-white sm:w-auto"
                  >
                    <div className="relative flex aspect-square w-full items-center justify-center bg-gradient-to-br from-cream-100 to-sage-50">
                      {item.image ? (
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          sizes="(min-width: 640px) 200px, 112px"
                          className="object-cover"
                        />
                      ) : (
                        <span className="text-4xl">{item.emoji}</span>
                      )}
                      <button
                        type="button"
                        onClick={() => !added && handleAdd(item)}
                        aria-label={t("upsell.add")}
                        className={`absolute bottom-1.5 right-1.5 flex h-9 w-9 items-center justify-center rounded-full shadow-md transition-transform active:scale-[0.94] ${
                          added
                            ? "bg-sage-500 text-white"
                            : "bg-gold-500 text-white hover:bg-gold-600"
                        }`}
                      >
                        {added ? <Check size={16} /> : <Plus size={16} />}
                      </button>
                    </div>
                    <div className="px-2 py-1.5">
                      <p className="truncate text-xs font-semibold leading-tight text-ink-900">
                        {item.name}
                      </p>
                      <p className="text-xs font-medium text-ink-500">
                        €{item.price.toFixed(2)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* "You might also like" list */}
          {list.length > 0 && (
            <div className="px-5 pb-2">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-400">
                {t("upsell.seen_title")}
              </p>
              <div className="divide-y divide-ink-100">
                {list.map((item) => {
                  const added = addedIds.has(item.id);
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3 py-2.5"
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="flex-shrink-0 text-xl">{item.emoji}</span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold leading-tight text-ink-900">
                            {item.name}
                          </p>
                          <p className="text-xs text-ink-500">
                            €{item.price.toFixed(2)}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => !added && handleAdd(item)}
                        aria-label={t("upsell.add")}
                        className={`flex h-10 w-10 min-h-[40px] min-w-[40px] flex-shrink-0 items-center justify-center rounded-full transition-transform active:scale-[0.96] ${
                          added
                            ? "bg-sage-500 text-white"
                            : "bg-ink-100 text-ink-700 hover:bg-gold-500 hover:text-white"
                        }`}
                      >
                        {added ? <Check size={16} /> : <Plus size={16} />}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          </div>

          {/* Dismiss */}
          <div className="border-t border-ink-100 px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+1.75rem)]">
            <button
              type="button"
              onClick={dismiss}
              className="w-full rounded-xl2 border border-ink-200 bg-white py-2.5 text-sm font-semibold text-ink-600 transition hover:bg-ink-50 active:scale-[0.99]"
            >
              {t("upsell.done")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
