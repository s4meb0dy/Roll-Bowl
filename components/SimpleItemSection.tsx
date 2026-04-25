"use client";

import { useState } from "react";
import Image from "next/image";
import { Plus, CheckCircle2, Leaf, Info } from "lucide-react";
import QuantityStepper from "@/components/QuantityStepper";
import { useStore } from "@/lib/store/useStore";
import { useT } from "@/lib/i18n";
import { useInventory } from "@/lib/inventory/client";
import type { ReadyMadeItem, CartItem } from "@/lib/types";

interface Props {
  title: string;
  subtitle: string;
  items: ReadyMadeItem[];
  cartType: CartItem["type"];
  headerGradient: string;
  priceColor: string;
}

const TAG_STYLES: Record<string, string> = {
  Vegan:   "bg-sage-50 text-sage-700",
  GF:      "bg-sky-50 text-sky-700",
  Popular: "bg-gold-50 text-gold-700",
  New:     "bg-violet-50 text-violet-700",
  "18+":   "bg-red-50 text-red-600",
};

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
  const { isItemAvailable } = useInventory();
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);
  const [note, setNote] = useState("");
  const [showNote, setShowNote] = useState(false);
  const [popKey, setPopKey] = useState(0);

  const outOfStock = !isItemAvailable(item.id) || item.unavailable === true;
  const hasImage = Boolean(item.image);

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
          <div className={`relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br ${headerGradient} grayscale`}>
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
          <div className={`flex items-center justify-between bg-gradient-to-br ${headerGradient} px-5 py-4 grayscale`}>
            <div className="text-3xl">{item.emoji}</div>
            <div className={`font-display text-xl font-bold text-ink-400 tabular-nums`}>
              €{item.price.toFixed(2)}
            </div>
          </div>
        )}
        <div className="p-4">
          <p className="font-semibold text-ink-500">{item.name}</p>
          {item.info && (
            <p className="mt-1 flex items-center gap-1 text-xs text-ink-400">
              <Info size={11} />
              {item.info}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="card-hoverable group relative flex flex-col overflow-hidden">
      {hasImage ? (
        <div className={`relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br ${headerGradient}`}>
          <Image
            src={item.image!}
            alt={item.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute bottom-2 right-3 rounded-full bg-white/95 px-3 py-1 font-display text-sm font-bold tabular-nums shadow-soft backdrop-blur-sm">
            <span className={priceColor}>€{item.price.toFixed(2)}</span>
          </div>
        </div>
      ) : (
        <div className={`flex items-center justify-between bg-gradient-to-br ${headerGradient} px-5 py-4`}>
          <div className="text-3xl transition-transform duration-300 group-hover:scale-110">{item.emoji}</div>
          <div className={`font-display text-xl font-bold tabular-nums ${priceColor}`}>
            €{item.price.toFixed(2)}
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col p-4">
        {item.tags.length > 0 && (
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
        )}

        <h3 className="font-display text-[15px] font-bold leading-snug text-ink-900">{item.name}</h3>

        {item.description && (
          <p className="mt-1 text-sm leading-relaxed text-ink-500">{item.description}</p>
        )}

        {item.ingredients && (
          <div className="mt-2 rounded-xl2 bg-ink-50 px-3 py-2">
            <p className="text-xs leading-relaxed text-ink-500">
              <span className="font-semibold text-ink-700">Ingrediënten: </span>
              {item.ingredients}
            </p>
          </div>
        )}

        {item.info && (
          <p className="mt-2 flex items-center gap-1 text-xs text-ink-400">
            <Info size={11} className="flex-shrink-0" />
            {item.info}
          </p>
        )}

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

        <div className="mt-auto space-y-2 pt-4">
          <div className="flex items-center gap-2">
            <div className="flex shrink-0 items-center gap-1 rounded-xl2 border border-ink-200 bg-white px-1 py-1">
              <QuantityStepper size="sm" value={quantity} onChange={setQuantity} />
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
                  +{1}
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
        <h2 className="font-display text-2xl font-bold text-ink-900">{title}</h2>
        <p className="mt-1 text-sm text-ink-500">{subtitle}</p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
