"use client";

import { useState } from "react";
import Image from "next/image";
import { Plus, Minus, Leaf, CheckCircle2, AlertCircle } from "lucide-react";
import { SMOOTHIES } from "@/lib/menu";
import { useStore } from "@/lib/store/useStore";
import { useT } from "@/lib/i18n";
import { useInventory } from "@/lib/inventory/client";
import type { ReadyMadeItem } from "@/lib/types";

const TAG_STYLES: Record<string, string> = {
  Vegan: "bg-sage-50 text-sage-700",
  GF: "bg-sky-50 text-sky-700",
  Popular: "bg-gold-50 text-gold-700",
  New: "bg-violet-50 text-violet-700",
  "18+": "bg-red-50 text-red-600",
};

function SmoothieCard({ item }: { item: ReadyMadeItem }) {
  const t = useT();
  const addToCart = useStore((s) => s.addToCart);
  const { isItemAvailable } = useInventory();
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);
  const [note, setNote] = useState("");
  const [showNote, setShowNote] = useState(false);
  const [popKey, setPopKey] = useState(0);

  const isAgeRestricted = item.tags.includes("18+");
  const outOfStock = !isItemAvailable(item.id) || item.unavailable === true;
  const hasImage = Boolean(item.image);

  const handleAdd = () => {
    addToCart({
      type: "smoothie",
      name: item.name,
      price: item.price,
      quantity,
      note,
      menuItemId: item.id,
    });
    setJustAdded(true);
    setShowNote(false);
    setNote("");
    setQuantity(1);
    setPopKey((k) => k + 1);
    setTimeout(() => setJustAdded(false), 1600);
  };

  if (outOfStock) {
    return (
      <div className="card relative flex flex-col overflow-hidden opacity-70 select-none">
        <span className="pointer-events-none absolute right-[-34px] top-3 z-10 rotate-45 bg-gold-500 px-10 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
          {t("common.unavailable")}
        </span>
        {hasImage ? (
          <div className="relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-sky-50 to-cyan-100 grayscale">
            <Image
              src={item.image!}
              alt={item.name}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover"
            />
            <div className="absolute bottom-2 right-3 rounded-full bg-white/90 px-3 py-1 font-display text-sm font-bold text-ink-400 tabular-nums shadow-sm">
              €{item.price.toFixed(2)}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between bg-gradient-to-br from-sky-50 to-cyan-100 px-5 py-5 grayscale">
            <div className="text-4xl">{item.emoji}</div>
            <div className="font-display text-xl font-bold text-ink-400 tabular-nums">
              €{item.price.toFixed(2)}
            </div>
          </div>
        )}
        <div className="p-5">
          <h3 className="font-display font-bold text-ink-500">{item.name}</h3>
          {item.description && (
            <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-ink-400">
              {item.description}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="card-hoverable group flex flex-col overflow-hidden">
      {hasImage ? (
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-sky-50 to-cyan-100">
          <Image
            src={item.image!}
            alt={item.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute bottom-3 right-3 rounded-full bg-white/95 px-3 py-1 font-display text-sm font-bold text-gold-700 tabular-nums shadow-soft backdrop-blur-sm">
            €{item.price.toFixed(2)}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between bg-gradient-to-br from-sky-50 to-cyan-100 px-5 py-5">
          <div className="text-4xl transition-transform duration-300 group-hover:scale-110">{item.emoji}</div>
          <div className="font-display text-xl font-bold text-gold-700 tabular-nums">
            €{item.price.toFixed(2)}
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col p-5">
        <div className="mb-2 flex flex-wrap gap-1">
          {item.tags.map((tag) => (
            <span
              key={tag}
              className={`tag-badge ${TAG_STYLES[tag] ?? "bg-ink-100 text-ink-600"}`}
            >
              {tag === "Vegan" && <Leaf size={10} className="mr-0.5" />}
              {tag}
            </span>
          ))}
        </div>

        <h3 className="font-display font-bold text-ink-900">{item.name}</h3>
        <p className="mt-1 text-sm leading-relaxed text-ink-500">
          {item.description}
        </p>

        <div className="mt-3 rounded-xl2 bg-ink-50 px-3 py-2.5">
          <p className="text-xs leading-relaxed text-ink-500">
            <span className="font-semibold text-ink-700">Ingrediënten: </span>
            {item.ingredients}
          </p>
        </div>

        {isAgeRestricted && (
          <div className="mt-3 flex items-start gap-2 rounded-xl2 bg-red-50 px-3 py-2.5">
            <AlertCircle size={14} className="mt-0.5 flex-shrink-0 text-red-500" />
            <p className="text-xs leading-relaxed text-red-600">
              {t("age.notice")}
            </p>
          </div>
        )}

        {showNote && (
          <div className="mt-3 animate-slide-up">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("builder.note_ph_smoothie")}
              rows={2}
              className="input-field resize-none text-xs"
            />
          </div>
        )}

        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex shrink-0 items-center gap-1 rounded-xl2 border border-ink-200 bg-white px-1 py-1">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-500 transition hover:bg-ink-100"
              >
                <Minus size={13} />
              </button>
              <span className="w-6 text-center text-sm font-semibold tabular-nums text-ink-800">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity((q) => q + 1)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-500 transition hover:bg-ink-100"
              >
                <Plus size={13} />
              </button>
            </div>

            <div className="relative flex-1">
              <button
                onClick={handleAdd}
                key={popKey}
                className={`btn-primary w-full justify-center text-sm ${
                  justAdded ? "bg-sage-600" : ""
                } motion-safe:animate-cart-pop`}
              >
                {justAdded ? (
                  <>
                    <CheckCircle2 size={15} />
                    {t("common.added")}
                  </>
                ) : (
                  <>
                    <Plus size={15} />
                    {t("common.order")} · €{(item.price * quantity).toFixed(2)}
                  </>
                )}
              </button>
              {justAdded && (
                <span
                  key={`toast-${popKey}`}
                  className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 rounded-full bg-gold-500 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-md motion-safe:animate-toast-up"
                >
                  +1
                </span>
              )}
            </div>
          </div>

          <button
            onClick={() => setShowNote((v) => !v)}
            className="btn-ghost w-full text-xs text-ink-400"
          >
            {showNote ? t("common.hide_note") : t("common.add_note")}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SmoothieSuggestions() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="font-display text-2xl font-bold text-ink-900">
          Smoothies
        </h2>
        <p className="mt-1 text-sm text-ink-500">
          Vers gemixt met de beste ingrediënten. Gewoon kiezen en bestellen.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {SMOOTHIES.map((item) => (
          <SmoothieCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
