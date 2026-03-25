"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Leaf } from "lucide-react";
import {
  BOWL_SIZES,
  BUILDER_BASES,
  BUILDER_SAUCES,
  BUILDER_MIXINS,
  BUILDER_EXTRA_MIXINS,
  BUILDER_PROTEINS,
  BUILDER_EXTRA_PROTEINS,
  BUILDER_TOPPINGS,
} from "@/lib/menu";
import { useStore } from "@/lib/store/useStore";
import { useT } from "@/lib/i18n";
import type { BuilderOption, BowlSize, PokeBuilderSelections } from "@/lib/types";

// ─── Types ───────────────────────────────────────────────────────────────────

type SelectionKey =
  | "basis"
  | "saus1"
  | "saus2"
  | "mixin1"
  | "mixin2"
  | "mixin3"
  | "mixin4"
  | "mixin5"
  | "extraMixin"
  | "protein"
  | "extraProtein"
  | "topping1"
  | "topping2"
  | "topping3";

interface StepConfig {
  key: SelectionKey;
  labelKey: string;
  labelVars?: Record<string, number>;
  options: BuilderOption[];
  isOptional?: boolean;
}

type BuilderState = { size: BowlSize | null } & Record<
  SelectionKey,
  BuilderOption | null
>;

// ─── Step definitions ─────────────────────────────────────────────────────────

const STEPS: StepConfig[] = [
  { key: "basis",        labelKey: "step.basis",        options: BUILDER_BASES },
  { key: "saus1",        labelKey: "step.saus_1",        options: BUILDER_SAUCES },
  { key: "saus2",        labelKey: "step.saus_2",        options: BUILDER_SAUCES },
  { key: "mixin1",       labelKey: "step.mixin",         labelVars: { n: 1 }, options: BUILDER_MIXINS },
  { key: "mixin2",       labelKey: "step.mixin",         labelVars: { n: 2 }, options: BUILDER_MIXINS },
  { key: "mixin3",       labelKey: "step.mixin",         labelVars: { n: 3 }, options: BUILDER_MIXINS },
  { key: "mixin4",       labelKey: "step.mixin",         labelVars: { n: 4 }, options: BUILDER_MIXINS },
  { key: "mixin5",       labelKey: "step.mixin",         labelVars: { n: 5 }, options: BUILDER_MIXINS },
  { key: "extraMixin",   labelKey: "step.extra_mixin",   options: BUILDER_EXTRA_MIXINS,   isOptional: true },
  { key: "protein",      labelKey: "step.protein",       options: BUILDER_PROTEINS },
  { key: "extraProtein", labelKey: "step.extra_protein", options: BUILDER_EXTRA_PROTEINS, isOptional: true },
  { key: "topping1",     labelKey: "step.topping",       labelVars: { n: 1 }, options: BUILDER_TOPPINGS },
  { key: "topping2",     labelKey: "step.topping",       labelVars: { n: 2 }, options: BUILDER_TOPPINGS },
  { key: "topping3",     labelKey: "step.topping",       labelVars: { n: 3 }, options: BUILDER_TOPPINGS },
];

const TOTAL_STEPS = STEPS.length; // 14

const INITIAL_STATE: BuilderState = {
  size: null,
  basis: null,
  saus1: null,
  saus2: null,
  mixin1: null,
  mixin2: null,
  mixin3: null,
  mixin4: null,
  mixin5: null,
  extraMixin: null,
  protein: null,
  extraProtein: null,
  topping1: null,
  topping2: null,
  topping3: null,
};

const SELECTION_KEYS: SelectionKey[] = [
  "basis",
  "saus1",
  "saus2",
  "mixin1",
  "mixin2",
  "mixin3",
  "mixin4",
  "mixin5",
  "extraMixin",
  "protein",
  "extraProtein",
  "topping1",
  "topping2",
  "topping3",
];

// Category labels for the progress bar
// Each entry: [label, firstStepIndex, lastStepIndex]
const CATEGORIES: [string, number, number][] = [
  ["cat.basis",    0,  0],
  ["cat.saus",     1,  2],
  ["cat.mixins",   3,  8],
  ["cat.protein",  9, 10],
  ["cat.toppings", 11, 13],
];

// ─── Price computation ────────────────────────────────────────────────────────

function computePrice(state: BuilderState): number {
  if (!state.size) return 0;
  let total = state.size.basePrice;
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
  const pct = step < 0 ? 0 : Math.round(((step + 1) / 15) * 100);

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
          className="h-full rounded-full bg-sage-400 transition-all duration-500"
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
          ? "border-sage-400 bg-sage-50"
          : "border-neutral-100 bg-neutral-50 hover:border-sage-200 hover:bg-white"
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={`h-4 w-4 rounded-full border-2 flex-shrink-0 transition-colors ${
            selected ? "border-sage-500 bg-sage-500" : "border-neutral-300"
          }`}
        />
        <div className="min-w-0">
          <p className="text-sm font-medium text-neutral-800">{option.name}</p>
          {(option.isVegan || option.isGlutenFree) && (
            <div className="flex gap-1 mt-0.5">
              {option.isVegan && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-1.5 text-[10px] font-semibold text-emerald-600">
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
          )}
        </div>
      </div>
      {option.priceExtra > 0 && (
        <span
          className={`text-xs font-semibold flex-shrink-0 ml-3 ${
            selected ? "text-sage-600" : "text-neutral-500"
          }`}
        >
          +€{option.priceExtra.toFixed(2)}
        </span>
      )}
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function BowlBuilder() {
  const t = useT();
  const addToCart = useStore((s) => s.addToCart);
  const [step, setStep] = useState<number>(-1);
  const [state, setState] = useState<BuilderState>(INITIAL_STATE);
  const [note, setNote] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const totalPrice = computePrice(state);

  const canAdvance = (): boolean => {
    if (step === -1) return state.size !== null;
    if (step >= 0 && step < TOTAL_STEPS) {
      const s = STEPS[step];
      return s.isOptional ? true : state[s.key] !== null;
    }
    return true;
  };

  // For optional steps clicking the same item deselects it; required steps only select
  const handleSelect = (key: SelectionKey, option: BuilderOption, isOptional: boolean) => {
    setState((prev) => {
      if (isOptional && prev[key]?.id === option.id) {
        return { ...prev, [key]: null };
      }
      return { ...prev, [key]: option };
    });
  };

  const resetAll = () => {
    setStep(-1);
    setState(INITIAL_STATE);
    setNote("");
    setQuantity(1);
  };

  const handleAddToCart = () => {
    if (!state.size) return;
    addToCart({
      type: "poke-builder",
      name: state.size.label,
      price: totalPrice,
      quantity,
      note,
      pokeSelections: { ...state, size: state.size } as PokeBuilderSelections,
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
        <div className="mb-4 text-6xl">🎉</div>
        <h3 className="font-display text-xl font-bold text-neutral-800">{t("common.added")}</h3>
        <p className="mt-1 text-sm text-neutral-500">{t("bowl.added_sub")}</p>
      </div>
    );
  }

  // ── Size selection (step -1) ──────────────────────────────────────────────
  if (step === -1) {
    return (
      <div className="animate-slide-up">
        <div className="mb-7">
          <h2 className="font-display text-xl font-bold text-neutral-800">{t("bowl.title")}</h2>
          <p className="mt-1 text-sm text-neutral-500">{t("bowl.subtitle")}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {BOWL_SIZES.map((size) => (
            <button
              key={size.id}
              onClick={() => {
                setState((p) => ({ ...p, size }));
                setStep(0);
              }}
              className="card flex flex-col items-center justify-center gap-2 p-8 text-center border-2 border-transparent transition hover:-translate-y-0.5 hover:shadow-card-hover hover:border-sage-300 active:scale-[0.98]"
            >
              <span className="text-5xl">
                {size.id === "medium" ? "🥣" : "🍲"}
              </span>
              <h3 className="font-display text-lg font-bold text-neutral-800">
                {size.label}
              </h3>
              <p className="text-sm font-semibold text-sage-600">
                {t("common.from")} €{size.basePrice.toFixed(2)}
              </p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Review step (step === TOTAL_STEPS) ────────────────────────────────────
  if (step === TOTAL_STEPS) {
    const reviewRows: [string, string][] = [
      ["Formaat",   state.size?.label     ?? ""],
      ["Basis",     state.basis?.name     ?? ""],
      ["Saus 1",    state.saus1?.name     ?? ""],
      ["Saus 2",    state.saus2?.name     ?? ""],
      ["Mix-in 1",  state.mixin1?.name    ?? ""],
      ["Mix-in 2",  state.mixin2?.name    ?? ""],
      ["Mix-in 3",  state.mixin3?.name    ?? ""],
      ["Mix-in 4",  state.mixin4?.name    ?? ""],
      ["Mix-in 5",  state.mixin5?.name    ?? ""],
      ...(state.extraMixin   ? [["Extra mix-in",  state.extraMixin.name]   as [string, string]] : []),
      ["Proteïne",  state.protein?.name   ?? ""],
      ...(state.extraProtein ? [["Extra proteïne", state.extraProtein.name] as [string, string]] : []),
      ["Topping 1", state.topping1?.name  ?? ""],
      ["Topping 2", state.topping2?.name  ?? ""],
      ["Topping 3", state.topping3?.name  ?? ""],
    ];

    return (
      <div className="animate-slide-up">
        <StepIndicator step={step} />

        <h2 className="font-display mb-1 text-xl font-bold text-neutral-800">{t("bowl.review_title")}</h2>
        <p className="mb-5 text-sm text-neutral-500">{t("builder.review_sub")}</p>

        <div className="card mb-4 divide-y divide-neutral-100 px-5 py-1">
          {reviewRows.map(([label, value]) => (
            <div
              key={label}
              className="flex items-start justify-between gap-4 py-2.5"
            >
              <span className="text-sm font-medium text-neutral-500 flex-shrink-0 w-24">
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
            placeholder={t("builder.note_ph_general")}
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

  // ── Regular / optional step (step 0–13) ──────────────────────────────────
  const currentStep = STEPS[step];
  const currentSelection = state[currentStep.key];
  const isOptional = !!currentStep.isOptional;

  return (
    <div className="animate-slide-up">
      <StepIndicator step={step} />

      <div className="mb-5">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <h2 className="font-display text-xl font-bold text-neutral-800">
            {t(currentStep.labelKey, currentStep.labelVars)}
          </h2>
          {isOptional ? (
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
          {totalPrice > 0 && (
            <span className="ml-2 font-semibold text-sage-600">
              · €{totalPrice.toFixed(2)} {t("common.so_far")}
            </span>
          )}
        </p>
        {isOptional && (
          <p className="mt-1 text-xs text-neutral-400">{t("common.click_deselect")}</p>
        )}
      </div>

      <div className="space-y-1.5 mb-6">
        {currentStep.options.map((option) => (
          <OptionRow
            key={option.id}
            option={option}
            selected={currentSelection?.id === option.id}
            onSelect={() => handleSelect(currentStep.key, option, isOptional)}
          />
        ))}
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={() => setStep((s) => s - 1)}
          className="btn-secondary"
        >
          <ChevronLeft size={16} />
          {step === 0 ? t("cat.basis") : t("common.back")}
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
