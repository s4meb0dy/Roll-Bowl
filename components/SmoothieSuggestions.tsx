"use client";

import { useState } from "react";
import { Plus, Minus, Leaf, CheckCircle2, AlertCircle } from "lucide-react";
import { SMOOTHIES } from "@/lib/menu";
import { useStore } from "@/lib/store/useStore";
import { useT } from "@/lib/i18n";
import type { ReadyMadeItem } from "@/lib/types";

const TAG_STYLES: Record<string, string> = {
  Vegan: "bg-emerald-50 text-emerald-600",
  GF: "bg-sky-50 text-sky-600",
  Popular: "bg-amber-50 text-amber-600",
  New: "bg-violet-50 text-violet-600",
  "18+": "bg-red-50 text-red-600",
};

function SmoothieCard({ item }: { item: ReadyMadeItem }) {
  const t = useT();
  const addToCart = useStore((s) => s.addToCart);
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);
  const [note, setNote] = useState("");
  const [showNote, setShowNote] = useState(false);

  const isAgeRestricted = item.tags.includes("18+");

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
    setTimeout(() => setJustAdded(false), 2000);
  };

  return (
    <div className="card group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-card-hover">
      {/* Coloured header */}
      <div className="flex items-center justify-between bg-gradient-to-br from-sky-50 to-cyan-100 px-5 py-5">
        <div className="text-4xl">{item.emoji}</div>
        <div className="text-right">
          <div className="text-xl font-bold text-sky-700">
            €{item.price.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-5">
        {/* Tags */}
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

        <h3 className="font-display font-bold text-neutral-800">{item.name}</h3>
        <p className="mt-1 text-sm text-neutral-500 leading-relaxed">
          {item.description}
        </p>

        <div className="mt-3 rounded-xl bg-neutral-50 px-3 py-2.5">
          <p className="text-xs text-neutral-500 leading-relaxed">
            <span className="font-semibold text-neutral-600">Ingrediënten: </span>
            {item.ingredients}
          </p>
        </div>

        {/* Age restriction notice */}
        {isAgeRestricted && (
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2.5">
            <AlertCircle size={14} className="mt-0.5 flex-shrink-0 text-red-500" />
            <p className="text-xs text-red-600 leading-relaxed">
                   {t("age.notice")}
            </p>
          </div>
        )}

        {/* Note input */}
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

        {/* Actions */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2">
            {/* Quantity control */}
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

            {/* Add to cart */}
            <button
              onClick={handleAdd}
              className={`btn-primary flex-1 justify-center text-sm transition-all ${
                justAdded ? "bg-sage-600" : ""
              }`}
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

          {/* Note toggle */}
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

export default function SmoothieSuggestions() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="font-display text-xl font-bold text-neutral-800">
          Smoothies
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          Vers gemixt met de beste ingrediënten. Gewoon kiezen en bestellen.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {SMOOTHIES.map((item) => (
          <SmoothieCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
