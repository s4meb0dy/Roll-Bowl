"use client";

import { useState } from "react";
import Image from "next/image";
import { Plus, Flame, Leaf, CheckCircle2, X, Minus } from "lucide-react";
import { READY_MADE, SIZE_OPTIONS, BASE_OPTIONS } from "@/lib/menu";
import { useStore } from "@/lib/store/useStore";
import { useT } from "@/lib/i18n";
import { useInventory } from "@/lib/inventory/client";
import type { ReadyMadeItem, SizeOption, BaseOption } from "@/lib/types";

const TAG_STYLES: Record<string, string> = {
  Popular: "bg-gold-50 text-gold-700",
  Vegan: "bg-sage-50 text-sage-700",
  GF: "bg-sky-50 text-sky-700",
  New: "bg-violet-50 text-violet-700",
  Keto: "bg-orange-50 text-orange-700",
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
        <div className="flex flex-shrink-0 items-center justify-between border-b border-ink-200/60 px-5 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-400">
              Aanpassen
            </p>
            <h3 className="font-display text-lg font-bold leading-tight text-ink-900">
              {item.emoji} {item.name}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="tap-target rounded-xl p-2 text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-5 py-5 space-y-7">
          <section>
            <div className="mb-3 flex items-center gap-2">
              <p className="text-sm font-semibold text-ink-800">{t("step.basis")}</p>
              <span className="tag-badge bg-gold-50 text-gold-700">{t("common.required_1")}</span>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {SIZE_OPTIONS.map((size) => {
                const active = selectedSize.id === size.id;
                return (
                  <button
                    key={size.id}
                    onClick={() => setSelectedSize(size)}
                    className={`flex items-center justify-between rounded-xl2 border-2 px-4 py-3.5 text-left transition-all ${
                      active
                        ? "border-gold-300 bg-gold-50/70 shadow-sm"
                        : "border-ink-200 hover:border-sage-300"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                          active ? "border-gold-500 bg-gold-500" : "border-ink-300"
                        }`}
                      >
                        {active && <span className="block h-1.5 w-1.5 rounded-full bg-white" />}
                      </span>
                      <span className="text-sm font-semibold text-ink-900">
                        {size.label}
                      </span>
                    </div>
                    <span
                      className={`text-xs font-semibold tabular-nums ${
                        active ? "text-gold-700" : "text-ink-400"
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

          <section>
            <div className="mb-3 flex items-center gap-2">
              <p className="text-sm font-semibold text-ink-800">{t("step.saus")}</p>
              <span className="tag-badge bg-gold-50 text-gold-700">{t("common.required_1")}</span>
            </div>
            <div className="space-y-2">
              {BASE_OPTIONS.map((base) => {
                const active = selectedBase.id === base.id;
                return (
                  <button
                    key={base.id}
                    onClick={() => setSelectedBase(base)}
                    className={`flex w-full items-center justify-between rounded-xl2 border px-4 py-3.5 text-left transition-all ${
                      active
                        ? "border-gold-300 bg-gold-50/70 shadow-sm ring-1 ring-gold-200/60"
                        : "border-ink-200 bg-white hover:border-sage-300 hover:bg-sage-50/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                          active ? "border-gold-500 bg-gold-500" : "border-ink-300"
                        }`}
                      >
                        {active && <span className="block h-1.5 w-1.5 rounded-full bg-white" />}
                      </span>
                      <span className="text-sm font-medium text-ink-800">
                        {base.name}
                      </span>
                    </div>
                    {base.priceExtra > 0 && (
                      <span className={`text-xs font-semibold tabular-nums ${active ? "text-gold-700" : "text-ink-500"}`}>
                        +€{base.priceExtra.toFixed(2)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <p className="mb-2 text-sm font-semibold text-ink-800">
              {t("common.note")}{" "}
              <span className="font-normal text-ink-400">{t("common.optional_note")}</span>
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

        <div className="flex-shrink-0 rounded-b-3xl border-t border-ink-200/60 bg-white px-5 py-4">
          <p className="mb-3 text-xs text-ink-500">
            Basisprijs: €{item.price.toFixed(2)}
            {selectedSize.priceExtra > 0 && (
              <> + formaat: €{selectedSize.priceExtra.toFixed(2)}</>
            )}
            {selectedBase.priceExtra > 0 && (
              <> + basis: €{selectedBase.priceExtra.toFixed(2)}</>
            )}
            {quantity > 1 && (
              <> · <strong className="text-ink-700">{quantity}× €{unitPrice.toFixed(2)}</strong></>
            )}
          </p>
          <div className="flex items-center gap-3">
            <div className="flex shrink-0 items-center gap-1 rounded-xl2 border border-ink-200 bg-white px-1 py-1">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-500 transition hover:bg-ink-100"
              >
                <Minus size={13} />
              </button>
              <span className="w-6 text-center text-sm font-semibold tabular-nums text-ink-800">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity((q) => q + 1)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-500 transition hover:bg-ink-100"
              >
                <Plus size={13} />
              </button>
            </div>
            <button
              onClick={() => onAdd(selectedSize, selectedBase, note, quantity)}
              className="btn-gold flex-1 justify-center py-3 text-base"
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
  const { isItemAvailable } = useInventory();
  const [justAdded, setJustAdded] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const outOfStock = !isItemAvailable(item.id) || item.unavailable === true;

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

  const hasImage = Boolean(item.image);

  if (outOfStock) {
    return (
      <div className="card relative flex flex-col overflow-hidden opacity-70 select-none">
        <span className="pointer-events-none absolute right-[-34px] top-3 z-10 rotate-45 bg-gold-500 px-10 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
          {t("common.unavailable")}
        </span>
        {hasImage ? (
          <div className="relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-sage-50 to-cream-200 grayscale">
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
          <div className="flex items-center justify-between bg-gradient-to-br from-sage-50 to-cream-200 px-5 py-5 grayscale">
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
    <>
      <div className="card-hoverable group flex flex-col overflow-hidden">
        {hasImage ? (
          <div className="relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-sage-50 to-cream-200">
            <Image
              src={item.image!}
              alt={item.name}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute bottom-3 right-3 flex flex-col items-end gap-1">
              <div className="rounded-full bg-white/95 px-3 py-1 font-display text-sm font-bold text-gold-700 tabular-nums shadow-soft backdrop-blur-sm">
                {t("common.from")} €{item.price.toFixed(2)}
              </div>
              {item.calories && (
                <div className="flex items-center gap-0.5 rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-medium text-ink-500 shadow-sm backdrop-blur-sm">
                  <Flame size={9} />
                  {item.calories} kcal
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between bg-gradient-to-br from-sage-50 to-cream-200 px-5 py-5">
            <div className="text-4xl transition-transform duration-300 group-hover:scale-110">{item.emoji}</div>
            <div className="text-right">
              <div className="font-display text-xl font-bold text-gold-700 tabular-nums">
                {t("common.from")} €{item.price.toFixed(2)}
              </div>
              {item.calories && (
                <div className="flex items-center justify-end gap-0.5 text-xs text-ink-400">
                  <Flame size={10} />
                  {item.calories} kcal
                </div>
              )}
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
              <span className="font-semibold text-ink-700">{t("common.ingredients")}: </span>
              {item.ingredients}
            </p>
          </div>

          <div className="mt-4">
            <button
              onClick={() => setShowModal(true)}
              className={`btn-primary w-full justify-center text-sm ${
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
        <h2 className="font-display text-2xl font-bold text-ink-900">
          {t("sec.poke.title")}
        </h2>
        <p className="mt-1 text-sm text-ink-500">{t("sec.poke.sub")}</p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {READY_MADE.map((item) => (
          <BowlCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
