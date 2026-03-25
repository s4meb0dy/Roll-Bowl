"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import {
  SMOOTHIE_BASE_PRICE,
  SMOOTHIE_BASES,
  SMOOTHIE_MIXINS,
  SMOOTHIE_EXTRA_MIXINS,
  SMOOTHIE_PROTEIN_SCOOPS,
} from "@/lib/menu";
import { useStore } from "@/lib/store/useStore";
import { useT } from "@/lib/i18n";
import type { BuilderOption, SmoothieBuilderSelections } from "@/lib/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type SelectionKey = "basis" | "mixin1" | "mixin2" | "mixin3" | "extraMixin" | "proteinScoop";

interface StepConfig {
  key: SelectionKey;
  labelKey: string;
  labelVars?: Record<string, number>;
  options: BuilderOption[];
  isOptional?: boolean;
}

type BuilderState = Record<SelectionKey, BuilderOption | null>;

// ─── Step definitions ─────────────────────────────────────────────────────────

const STEPS: StepConfig[] = [
  { key: "basis",        labelKey: "step.basis",          options: SMOOTHIE_BASES },
  { key: "mixin1",       labelKey: "step.mixin", labelVars: { n: 1 }, options: SMOOTHIE_MIXINS },
  { key: "mixin2",       labelKey: "step.mixin", labelVars: { n: 2 }, options: SMOOTHIE_MIXINS },
  { key: "mixin3",       labelKey: "step.mixin", labelVars: { n: 3 }, options: SMOOTHIE_MIXINS },
  { key: "extraMixin",   labelKey: "step.extra_mixin",    options: SMOOTHIE_EXTRA_MIXINS,   isOptional: true },
  { key: "proteinScoop", labelKey: "step.protein_scoop",  options: SMOOTHIE_PROTEIN_SCOOPS, isOptional: true },
];

const TOTAL_STEPS = STEPS.length; // 6

const INITIAL_STATE: BuilderState = {
  basis: null,
  mixin1: null,
  mixin2: null,
  mixin3: null,
  extraMixin: null,
  proteinScoop: null,
};

const SELECTION_KEYS: SelectionKey[] = [
  "basis", "mixin1", "mixin2", "mixin3", "extraMixin", "proteinScoop",
];

const CATEGORIES: [string, number, number][] = [
  ["cat.basis",   0, 0],
  ["cat.mixins",  1, 4],
  ["cat.protein", 5, 5],
];

// ─── Price ────────────────────────────────────────────────────────────────────

function computePrice(state: BuilderState): number {
  let total = SMOOTHIE_BASE_PRICE;
  for (const k of SELECTION_KEYS) {
    const opt = state[k];
    if (opt) total += opt.priceExtra;
  }
  return total;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StepIndicator({ step }: { step: number }) {
  const t = useT();
  const isReview = step >= TOTAL_STEPS;
  const pct = step < 0 ? 0 : Math.round(((step + 1) / 7) * 100);

  return (
    <div className="mb-6">
      <div className="mb-2.5 flex items-center justify-between text-xs">
        {CATEGORIES.map(([labelKey, start, end]) => {
          const isDone = step > end;
          const isActive = step >= start && step <= end;
          return (
            <span
              key={labelKey}
              className={`font-medium transition-colors ${
                isActive ? "text-neutral-800" : isDone ? "text-sage-500" : "text-neutral-300"
              }`}
            >
              {t(labelKey)}
            </span>
          );
        })}
        <span className={`font-medium ${isReview ? "text-neutral-800" : "text-neutral-300"}`}>
          {t("cat.review")}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-neutral-100">
        <div
          className="h-full rounded-full bg-sky-400 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function OptionRow({
  option,
  selected,
  onSelect,
}: {
  option: BuilderOption;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`w-full flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-all ${
        selected
          ? "border-sky-400 bg-sky-50"
          : "border-neutral-100 bg-neutral-50 hover:border-sky-200 hover:bg-white"
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={`h-4 w-4 rounded-full border-2 flex-shrink-0 transition-colors ${
            selected ? "border-sky-500 bg-sky-500" : "border-neutral-300"
          }`}
        />
        <span className="text-sm font-medium text-neutral-800">{option.name}</span>
      </div>
      {option.priceExtra > 0 && (
        <span className={`text-xs font-semibold flex-shrink-0 ml-3 ${selected ? "text-sky-600" : "text-neutral-500"}`}>
          +€{option.priceExtra.toFixed(2)}
        </span>
      )}
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SmoothieBuilder() {
  const t = useT();
  const addToCart = useStore((s) => s.addToCart);
  const [step, setStep] = useState(0);
  const [state, setState] = useState<BuilderState>(INITIAL_STATE);
  const [note, setNote] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const totalPrice = computePrice(state);

  const currentStepConfig = step < TOTAL_STEPS ? STEPS[step] : null;

  const canAdvance = (): boolean => {
    if (step >= 0 && step < TOTAL_STEPS) {
      const cfg = STEPS[step];
      if (cfg.isOptional) return true;
      return state[cfg.key] !== null;
    }
    return true;
  };

  const handleSelect = (key: SelectionKey, option: BuilderOption) => {
    setState((prev) => ({
      ...prev,
      [key]: prev[key]?.id === option.id ? null : option,
    }));
  };

  const resetAll = () => {
    setStep(0);
    setState(INITIAL_STATE);
    setNote("");
    setQuantity(1);
  };

  const handleAddToCart = () => {
    addToCart({
      type: "smoothie-builder",
      name: "Smoothie naar keuze",
      price: totalPrice,
      quantity,
      note,
      smoothieSelections: state as SmoothieBuilderSelections,
    });
    setAdded(true);
    setTimeout(() => {
      resetAll();
      setAdded(false);
    }, 2000);
  };

  // ── Added screen ──────────────────────────────────────────────────────────
  if (added) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
        <div className="mb-4 text-6xl">🥤</div>
        <h3 className="font-display text-xl font-bold text-neutral-800">{t("common.added")}</h3>
        <p className="mt-1 text-sm text-neutral-500">{t("smoothie.added_sub")}</p>
      </div>
    );
  }

  const introHeader = (
    <div className="mb-7">
      <h2 className="font-display text-xl font-bold text-neutral-800">{t("smoothie.title")}</h2>
      <p className="mt-1 text-sm text-neutral-500">
        {t("smoothie.intro")}{" "}
        <span className="font-semibold text-neutral-700">
          {t("common.from")} €{SMOOTHIE_BASE_PRICE.toFixed(2)}
        </span>
        .
      </p>
    </div>
  );

  // ── Review ────────────────────────────────────────────────────────────────
  if (step === TOTAL_STEPS) {
    const reviewRows: [string, string][] = [
      ["Basis",        state.basis?.name        ?? ""],
      ["Mix-in 1",     state.mixin1?.name       ?? ""],
      ["Mix-in 2",     state.mixin2?.name       ?? ""],
      ["Mix-in 3",     state.mixin3?.name       ?? ""],
      ...(state.extraMixin   ? [["Extra mix-in",   state.extraMixin.name]   as [string, string]] : []),
      ...(state.proteinScoop ? [["Proteïne scoop", state.proteinScoop.name] as [string, string]] : []),
    ];

    return (
      <div className="animate-slide-up">
        {introHeader}
        <StepIndicator step={step} />

        <h2 className="font-display mb-1 text-xl font-bold text-neutral-800">{t("smoothie.review_title")}</h2>
        <p className="mb-5 text-sm text-neutral-500">{t("builder.review_sub")}</p>

        <div className="card mb-4 divide-y divide-neutral-100 px-5 py-1">
          {reviewRows.map(([label, value]) => (
            <div key={label} className="flex items-start justify-between gap-4 py-2.5">
              <span className="text-sm font-medium text-neutral-500 flex-shrink-0 w-28">
                {label}
              </span>
              <span className="text-sm font-semibold text-neutral-800 text-right">
                {value}
              </span>
            </div>
          ))}
        </div>

        <div className="card mb-4 p-4">
          <label className="mb-2 block text-sm font-medium text-neutral-700">
            {t("common.note")}{" "}
            <span className="font-normal text-neutral-400">{t("common.optional_note")}</span>
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t("builder.note_ph_smoothie")}
            rows={2}
            className="input-field resize-none"
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-200 text-lg font-bold text-neutral-600 transition hover:bg-neutral-100"
            >
              −
            </button>
            <span className="w-6 text-center font-semibold">{quantity}</span>
            <button
              onClick={() => setQuantity((q) => q + 1)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-200 text-lg font-bold text-neutral-600 transition hover:bg-neutral-100"
            >
              +
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => setStep(TOTAL_STEPS - 1)} className="btn-secondary">
              <ChevronLeft size={16} />
              {t("common.back")}
            </button>
            <button onClick={handleAddToCart} className="btn-primary">
              <Plus size={16} />
              {t("common.order")} · €{(totalPrice * quantity).toFixed(2)}
            </button>
          </div>
        </div>

        <button
          onClick={resetAll}
          className="mt-4 w-full text-center text-xs text-neutral-400 transition hover:text-neutral-600"
        >
          {t("common.restart")}
        </button>
      </div>
    );
  }

  // ── Regular step ──────────────────────────────────────────────────────────
  const cfg = currentStepConfig!;
  const currentSelection = state[cfg.key];

  return (
    <div className="animate-slide-up">
      {step === 0 && introHeader}
      <StepIndicator step={step} />

      <div className="mb-5">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <h2 className="font-display text-xl font-bold text-neutral-800">
            {t(cfg.labelKey, cfg.labelVars)}
          </h2>
          {cfg.isOptional ? (
            <span className="tag-badge bg-neutral-100 text-neutral-500 flex-shrink-0">
              {t("common.optional")}
            </span>
          ) : (
            <span className="tag-badge bg-red-50 text-red-500 flex-shrink-0">
              {t("common.required_1")}
            </span>
          )}
        </div>
        <p className="text-sm text-neutral-500">
          {t("common.step_of", { n: step + 1, total: TOTAL_STEPS })}
          {totalPrice > SMOOTHIE_BASE_PRICE && (
            <span className="ml-2 font-semibold text-sky-600">
              · €{totalPrice.toFixed(2)} {t("common.so_far")}
            </span>
          )}
        </p>
        {cfg.isOptional && (
          <p className="mt-1 text-xs text-neutral-400">{t("common.click_deselect")}</p>
        )}
      </div>

      <div className="space-y-1.5 mb-6">
        {cfg.options.map((option) => (
          <OptionRow
            key={option.id}
            option={option}
            selected={currentSelection?.id === option.id}
            onSelect={() => handleSelect(cfg.key, option)}
          />
        ))}
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="btn-secondary disabled:invisible"
        >
          <ChevronLeft size={16} />
          {t("common.back")}
        </button>

        <button
          onClick={() => setStep((s) => s + 1)}
          disabled={!canAdvance()}
          className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {step === TOTAL_STEPS - 1 ? t("common.review") : t("common.next")}
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
