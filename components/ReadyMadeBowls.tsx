"use client";

import { useState } from "react";
import { Plus, Flame, Leaf, CheckCircle2, X, Minus } from "lucide-react";
import { READY_MADE, SIZE_OPTIONS, BASE_OPTIONS } from "@/lib/menu";
import { useStore } from "@/lib/store/useStore";
import { useT } from "@/lib/i18n";
import type { ReadyMadeItem, SizeOption, BaseOption } from "@/lib/types";

const TAG_STYLES: Record<string, string> = {
  Popular: "bg-amber-50 text-amber-600",
  Vegan: "bg-emerald-50 text-emerald-600",
  GF: "bg-sky-50 text-sky-600",
  New: "bg-violet-50 text-violet-600",
  Keto: "bg-orange-50 text-orange-600",
};

function BowlModal({
  item,
  onClose,
  onAdd,
}: {
  item: ReadyMadeItem;
  onClose: () => void;
  onAdd: (size: SizeOption, base: BaseOption, note: string, quantity: number) => void;
}) {
  const t = useT();
  const [selectedSize, setSelectedSize] = useState<SizeOption>(SIZE_OPTIONS[0]);
  const [selectedBase, setSelectedBase] = useState<BaseOption>(BASE_OPTIONS[0]);
  const [note, setNote] = useState("");
  const [quantity, setQuantity] = useState(1);

  const unitPrice = item.price + selectedSize.priceExtra + selectedBase.priceExtra;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 flex-shrink-0">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-neutral-400">
              Aanpassen
            </p>
            <h3 className="font-display font-bold text-neutral-800 text-lg leading-tight">
              {item.emoji} {item.name}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-5 py-5 space-y-7">
          {/* Size selection */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <p className="text-sm font-semibold text-neutral-800">{t("step.basis")}</p>
              <span className="tag-badge bg-red-50 text-red-500">{t("common.required_1")}</span>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {SIZE_OPTIONS.map((size) => {
                const active = selectedSize.id === size.id;
                return (
                  <button
                    key={size.id}
                    onClick={() => setSelectedSize(size)}
                    className={`flex items-center justify-between rounded-2xl border-2 px-4 py-3.5 text-left transition-all ${
                      active
                        ? "border-sage-400 bg-sage-50 shadow-sm"
                        : "border-neutral-200 hover:border-sage-200"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`h-4 w-4 rounded-full border-2 flex-shrink-0 transition-colors ${
                          active ? "border-sage-500 bg-sage-500" : "border-neutral-300"
                        }`}
                      />
                      <span className="font-semibold text-neutral-800 text-sm">
                        {size.label}
                      </span>
                    </div>
                    <span
                      className={`text-xs font-semibold ${
                        active ? "text-sage-600" : "text-neutral-400"
                      }`}
                    >
                      {size.priceExtra === 0
                        ? "Inbegrepen"
                        : `+€${size.priceExtra.toFixed(2)}`}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Base selection */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <p className="text-sm font-semibold text-neutral-800">{t("step.saus")}</p>
              <span className="tag-badge bg-red-50 text-red-500">{t("common.required_1")}</span>
            </div>
            <div className="space-y-1.5">
              {BASE_OPTIONS.map((base) => {
                const active = selectedBase.id === base.id;
                return (
                  <button
                    key={base.id}
                    onClick={() => setSelectedBase(base)}
                    className={`w-full flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-all ${
                      active
                        ? "border-sage-400 bg-sage-50"
                        : "border-neutral-100 bg-neutral-50 hover:border-sage-200 hover:bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-4 w-4 rounded-full border-2 flex-shrink-0 transition-colors ${
                          active ? "border-sage-500 bg-sage-500" : "border-neutral-300"
                        }`}
                      />
                      <span className="text-sm font-medium text-neutral-800">
                        {base.name}
                      </span>
                    </div>
                    {base.priceExtra > 0 && (
                      <span className="text-xs font-semibold text-sage-600">
                        +€{base.priceExtra.toFixed(2)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Note */}
          <section>
            <p className="text-sm font-semibold text-neutral-800 mb-2">
              {t("common.note")}{" "}
              <span className="font-normal text-neutral-400">{t("common.optional_note")}</span>
            </p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("builder.note_ph_general")}
              rows={2}
              className="input-field resize-none text-sm"
            />
          </section>
        </div>

        {/* Sticky footer */}
        <div className="px-5 py-4 border-t border-neutral-100 flex-shrink-0 bg-white rounded-b-3xl">
          {/* Price breakdown */}
          <p className="mb-3 text-xs text-neutral-500">
            Basisprijs: €{item.price.toFixed(2)}
            {selectedSize.priceExtra > 0 && (
              <> + formaat: €{selectedSize.priceExtra.toFixed(2)}</>
            )}
            {selectedBase.priceExtra > 0 && (
              <> + basis: €{selectedBase.priceExtra.toFixed(2)}</>
            )}
            {quantity > 1 && (
              <> · <strong className="text-neutral-700">{quantity}× €{unitPrice.toFixed(2)}</strong></>
            )}
          </p>
          {/* Quantity + add */}
          <div className="flex items-center gap-3">
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
              onClick={() => onAdd(selectedSize, selectedBase, note, quantity)}
              className="btn-primary flex-1 justify-center py-3 text-base"
            >
              <Plus size={18} />
              {t("common.order")} · €{(unitPrice * quantity).toFixed(2)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function BowlCard({ item }: { item: ReadyMadeItem }) {
  const t = useT();
  const addToCart = useStore((s) => s.addToCart);
  const [justAdded, setJustAdded] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const handleAdd = (size: SizeOption, base: BaseOption, note: string, quantity: number) => {
    const totalPrice = item.price + size.priceExtra + base.priceExtra;
    addToCart({
      type: "ready-made",
      name: item.name,
      price: totalPrice,
      quantity,
      note,
      menuItemId: item.id,
      selectedSize: size,
      selectedBase: base,
    });
    setShowModal(false);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 2000);
  };

  return (
    <>
      <div className="card group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-card-hover">
        {/* Coloured header */}
        <div className="flex items-center justify-between bg-gradient-to-br from-sage-50 to-cream-200 px-5 py-5">
          <div className="text-4xl">{item.emoji}</div>
          <div className="text-right">
            <div className="text-xl font-bold text-sage-700">
              {t("common.from")} €{item.price.toFixed(2)}
            </div>
            {item.calories && (
              <div className="flex items-center justify-end gap-0.5 text-xs text-neutral-400">
                <Flame size={10} />
                {item.calories} kcal
              </div>
            )}
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
              <span className="font-semibold text-neutral-600">{t("common.ingredients")}: </span>
              {item.ingredients}
            </p>
          </div>

          {/* Add button */}
          <div className="mt-4">
            <button
              onClick={() => setShowModal(true)}
              className={`btn-primary w-full justify-center text-sm transition-all ${
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
                  {t("common.order")}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {showModal && (
        <BowlModal
          item={item}
          onClose={() => setShowModal(false)}
          onAdd={handleAdd}
        />
      )}
    </>
  );
}

export default function ReadyMadeBowls() {
  const t = useT();
  return (
    <div>
      <div className="mb-6">
        <h2 className="font-display text-xl font-bold text-neutral-800">
          {t("sec.poke.title")}
        </h2>
        <p className="mt-1 text-sm text-neutral-500">{t("sec.poke.sub")}</p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {READY_MADE.map((item) => (
          <BowlCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
