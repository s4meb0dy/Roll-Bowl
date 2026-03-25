"use client";

import { useState } from "react";
import { Plus, Minus, CheckCircle2, Leaf, Info } from "lucide-react";
import { useStore } from "@/lib/store/useStore";
import { useT } from "@/lib/i18n";
import type { ReadyMadeItem, CartItem } from "@/lib/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  title: string;
  subtitle: string;
  items: ReadyMadeItem[];
  cartType: CartItem["type"];
  headerGradient: string;
  priceColor: string;
}

const TAG_STYLES: Record<string, string> = {
  Vegan:   "bg-emerald-50 text-emerald-600",
  GF:      "bg-sky-50 text-sky-600",
  Popular: "bg-amber-50 text-amber-600",
  New:     "bg-violet-50 text-violet-600",
  "18+":   "bg-red-50 text-red-600",
};

// ─── Card ─────────────────────────────────────────────────────────────────────

function ItemCard({
  item,
  cartType,
  headerGradient,
  priceColor,
}: {
  item: ReadyMadeItem;
  cartType: CartItem["type"];
  headerGradient: string;
  priceColor: string;
}) {
  const t = useT();
  const addToCart = useStore((s) => s.addToCart);
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);
  const [note, setNote] = useState("");
  const [showNote, setShowNote] = useState(false);

  const handleAdd = () => {
    addToCart({
      type: cartType,
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
    setTimeout(() => setJustAdded(false), 2000);
  };

  if (item.unavailable) {
    return (
      <div className="card flex flex-col overflow-hidden opacity-50 select-none">
        <div className={`flex items-center justify-between bg-gradient-to-br ${headerGradient} px-5 py-4`}>
          <div className="text-3xl grayscale">{item.emoji}</div>
          <span className="rounded-full bg-neutral-200 px-2.5 py-0.5 text-xs font-semibold text-neutral-500">
                 {t("common.unavailable")}
          </span>
        </div>
        <div className="p-4">
          <p className="font-semibold text-neutral-500">{item.name}</p>
          {item.info && (
            <p className="mt-1 flex items-center gap-1 text-xs text-neutral-400">
              <Info size={11} />
              {item.info}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="card group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-card-hover">
      {/* Header */}
      <div className={`flex items-center justify-between bg-gradient-to-br ${headerGradient} px-5 py-4`}>
        <div className="text-3xl">{item.emoji}</div>
        <div className={`text-xl font-bold ${priceColor}`}>
          €{item.price.toFixed(2)}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-4">
        {/* Tags */}
        {item.tags.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1">
            {item.tags.map((tag) => (
              <span
                key={tag}
                className={`tag-badge ${TAG_STYLES[tag] ?? "bg-neutral-100 text-neutral-600"}`}
              >
                {tag === "Vegan" && <Leaf size={10} className="mr-0.5" />}
                {tag}
              </span>
            ))}
          </div>
        )}

        <h3 className="font-display font-bold text-neutral-800 leading-snug">{item.name}</h3>

        {item.description && (
          <p className="mt-1 text-sm text-neutral-500 leading-relaxed">{item.description}</p>
        )}

        {item.ingredients && (
          <div className="mt-2 rounded-xl bg-neutral-50 px-3 py-2">
            <p className="text-xs text-neutral-500 leading-relaxed">
              <span className="font-semibold text-neutral-600">Ingrediënten: </span>
              {item.ingredients}
            </p>
          </div>
        )}

        {item.info && (
          <p className="mt-2 flex items-center gap-1 text-xs text-neutral-400">
            <Info size={11} className="flex-shrink-0" />
            {item.info}
          </p>
        )}

        {/* Note */}
        {showNote && (
          <div className="mt-3 animate-slide-up">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
                    placeholder={t("builder.note_ph_simple")}
              rows={2}
              className="input-field resize-none text-xs"
            />
          </div>
        )}

        {/* Actions */}
        <div className="mt-auto pt-4 space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-xl border border-neutral-200 px-1 py-1 shrink-0">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 transition"
              >
                <Minus size={13} />
              </button>
              <span className="w-6 text-center text-sm font-semibold text-neutral-800">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity((q) => q + 1)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 transition"
              >
                <Plus size={13} />
              </button>
            </div>

            <button
              onClick={handleAdd}
              className={`btn-primary flex-1 justify-center text-sm transition-all ${justAdded ? "bg-sage-600" : ""}`}
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
          </div>

          <button
            onClick={() => setShowNote((v) => !v)}
            className="btn-ghost w-full text-xs text-neutral-400"
          >
                   {showNote ? t("common.hide_note") : t("common.add_note")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────

export default function SimpleItemSection({
  title,
  subtitle,
  items,
  cartType,
  headerGradient,
  priceColor,
}: Props) {
  return (
    <div>
      <div className="mb-6">
        <h2 className="font-display text-xl font-bold text-neutral-800">{title}</h2>
        <p className="mt-1 text-sm text-neutral-500">{subtitle}</p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <ItemCard
            key={item.id}
            item={item}
            cartType={cartType}
            headerGradient={headerGradient}
            priceColor={priceColor}
          />
        ))}
      </div>
    </div>
  );
}
