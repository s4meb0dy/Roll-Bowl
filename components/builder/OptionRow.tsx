"use client";

import { Leaf } from "lucide-react";
import { useT } from "@/lib/i18n";
import type { BuilderOption } from "@/lib/types";

interface OptionRowProps {
  option: BuilderOption;
  selected: boolean;
  unavailable: boolean;
  onSelect: () => void;
}

export default function OptionRow({
  option,
  selected,
  unavailable,
  onSelect,
}: OptionRowProps) {
  const t = useT();

  return (
    <button
      onClick={unavailable ? undefined : onSelect}
      disabled={unavailable}
      aria-disabled={unavailable}
      aria-pressed={selected}
      className={`group flex w-full min-w-0 max-w-full items-center justify-between overflow-hidden rounded-xl2 border px-4 py-3.5 text-left transition-transform motion-reduce:transition-none motion-safe:animate-step-fade ${
        unavailable
          ? "cursor-not-allowed border-ink-100 bg-ink-50 opacity-55 select-none"
          : selected
          ? "border-gold-300 bg-gold-50/70 shadow-sm ring-1 ring-gold-200/60 active:scale-[0.98] motion-reduce:active:scale-100"
          : "border-ink-200 bg-white active:scale-[0.98] motion-reduce:active:scale-100 md:hover:-translate-y-0.5 active:md:hover:translate-y-0 hover:border-sage-300 hover:bg-sage-50/50 hover:shadow-soft"
      }`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
            unavailable
              ? "border-ink-200 bg-ink-100"
              : selected
              ? "border-gold-500 bg-gold-500"
              : "border-ink-300 bg-white group-hover:border-sage-400"
          }`}
        >
          {selected && !unavailable && (
            <span className="block h-1.5 w-1.5 rounded-full bg-white" />
          )}
        </span>
        <div className="min-w-0 break-words">
          <p
            className={`text-sm font-semibold [overflow-wrap:anywhere] ${
              unavailable ? "text-ink-400 line-through" : "text-ink-800"
            }`}
          >
            {option.name}
          </p>
          {unavailable ? (
            <span className="mt-0.5 inline-flex items-center rounded-full bg-ink-200 px-2 py-0.5 text-[10px] font-semibold text-ink-600">
              {t("common.unavailable")}
            </span>
          ) : (
            (option.isVegan || option.isGlutenFree) && (
              <div className="mt-1 flex gap-1">
                {option.isVegan && (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-sage-50 px-1.5 text-[10px] font-semibold text-sage-600">
                    <Leaf size={8} />
                    vegan
                  </span>
                )}
                {option.isGlutenFree && (
                  <span className="inline-flex items-center rounded-full bg-sky-50 px-1.5 text-[10px] font-semibold text-sky-600">
                    gf
                  </span>
                )}
              </div>
            )
          )}
        </div>
      </div>
      {option.priceExtra > 0 && (
        <span
          className={`ml-3 flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${
            unavailable
              ? "bg-ink-100 text-ink-400"
              : selected
              ? "bg-gold-100 text-gold-700"
              : "bg-ink-50 text-ink-500"
          }`}
        >
          +€{option.priceExtra.toFixed(2)}
        </span>
      )}
    </button>
  );
}
