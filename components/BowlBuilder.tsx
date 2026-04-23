"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, Plus } from "lucide-react";
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
import { useInventory } from "@/lib/inventory/client";
import type { BuilderOption, BowlSize, PokeBuilderSelections } from "@/lib/types";
import OptionRow from "@/components/builder/OptionRow";
import StepIndicator, { StepCategory } from "@/components/builder/StepIndicator";
import WizardShell from "@/components/builder/WizardShell";

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

const TOTAL_STEPS = STEPS.length;

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

const CATEGORIES: StepCategory[] = [
  { labelKey: "cat.basis",    start: 0,  end: 0 },
  { labelKey: "cat.saus",     start: 1,  end: 2 },
  { labelKey: "cat.mixins",   start: 3,  end: 8 },
  { labelKey: "cat.protein",  start: 9,  end: 10 },
  { labelKey: "cat.toppings", start: 11, end: 13 },
];

function computePrice(state: BuilderState): number {
  if (!state.size) return 0;
  let total = state.size.basePrice;
  for (const k of SELECTION_KEYS) {
    const opt = state[k];
    if (opt) total += opt.priceExtra;
  }
  return total;
}

export default function BowlBuilder() {
  const t = useT();
  const addToCart = useStore((s) => s.addToCart);
  const { isItemAvailable } = useInventory();
  const [step, setStep] = useState<number>(-1);
  const [state, setState] = useState<BuilderState>(INITIAL_STATE);

  useEffect(() => {
    setState((prev) => {
      let changed = false;
      const next: BuilderState = { ...prev };
      for (const key of SELECTION_KEYS) {
        const opt = prev[key];
        if (opt && !isItemAvailable(opt.id)) {
          next[key] = null;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [isItemAvailable]);

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

  if (added) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
        <div className="mb-4 text-6xl">🎉</div>
        <h3 className="font-display text-xl font-bold text-ink-900">{t("common.added")}</h3>
        <p className="mt-1 text-sm text-ink-500">{t("bowl.added_sub")}</p>
      </div>
    );
  }

  if (step === -1) {
    return (
      <div className="animate-slide-up">
        <div className="mb-7">
          <h2 className="font-display text-2xl font-bold text-ink-900">{t("bowl.title")}</h2>
          <p className="mt-1 text-sm text-ink-500">{t("bowl.subtitle")}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {BOWL_SIZES.map((size) => (
            <button
              key={size.id}
              onClick={() => {
                setState((p) => ({ ...p, size }));
                setStep(0);
              }}
              className="card-hoverable flex flex-col items-center justify-center gap-2 border-2 border-transparent p-8 text-center transition hover:border-sage-300 active:scale-[0.98]"
            >
              <span className="text-5xl">
                {size.id === "medium" ? "🥣" : "🍲"}
              </span>
              <h3 className="font-display text-lg font-bold text-ink-900">
                {size.label}
              </h3>
              <p className="text-sm font-semibold text-gold-700 tabular-nums">
                {t("common.from")} €{size.basePrice.toFixed(2)}
              </p>
            </button>
          ))}
        </div>
      </div>
    );
  }

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
        <StepIndicator step={step} totalSteps={TOTAL_STEPS} categories={CATEGORIES} progressDenominator={15} />

        <h2 className="font-display mb-1 text-xl font-bold text-ink-900">{t("bowl.review_title")}</h2>
        <p className="mb-5 text-sm text-ink-500">{t("builder.review_sub")}</p>

        <div className="card mb-4 divide-y divide-ink-100 px-5 py-1">
          {reviewRows.map(([label, value]) => (
            <div
              key={label}
              className="flex items-start justify-between gap-4 py-2.5"
            >
              <span className="w-24 flex-shrink-0 text-sm font-medium text-ink-500">
                {label}
              </span>
              <span className="text-right text-sm font-semibold text-ink-800">
                {value}
              </span>
            </div>
          ))}
        </div>

        <div className="card mb-4 p-4">
          <label className="mb-2 block text-sm font-medium text-ink-700">
            {t("common.note")}{" "}
            <span className="font-normal text-ink-400">{t("common.optional_note")}</span>
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t("builder.note_ph_general")}
            rows={2}
            className="input-field resize-none"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="tap-target flex items-center justify-center rounded-full border border-ink-200 text-lg font-bold text-ink-600 transition hover:bg-ink-100"
            >
              −
            </button>
            <span className="w-6 text-center font-semibold tabular-nums">{quantity}</span>
            <button
              onClick={() => setQuantity((q) => q + 1)}
              className="tap-target flex items-center justify-center rounded-full border border-ink-200 text-lg font-bold text-ink-600 transition hover:bg-ink-100"
            >
              +
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => setStep(TOTAL_STEPS - 1)} className="btn-secondary">
              <ChevronLeft size={16} />
              {t("common.back")}
            </button>
            <button onClick={handleAddToCart} className="btn-gold">
              <Plus size={16} />
              {t("common.order")} · €{(totalPrice * quantity).toFixed(2)}
            </button>
          </div>
        </div>

        <button
          onClick={resetAll}
          className="mt-4 w-full text-center text-xs text-ink-400 transition hover:text-ink-600"
        >
          {t("common.restart")}
        </button>
      </div>
    );
  }

  const currentStep = STEPS[step];
  const currentSelection = state[currentStep.key];
  const isOptional = !!currentStep.isOptional;

  return (
    <div className="animate-slide-up">
      <StepIndicator step={step} totalSteps={TOTAL_STEPS} categories={CATEGORIES} progressDenominator={15} />

      <WizardShell
        stepKey={step}
        onBack={() => setStep((s) => s - 1)}
        onNext={() => setStep((s) => s + 1)}
        canAdvance={canAdvance()}
        nextLabel={step === TOTAL_STEPS - 1 ? t("common.review") : t("common.next")}
        priceChip={totalPrice > 0 ? `€${totalPrice.toFixed(2)}` : undefined}
      >
        <div className="mb-5">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <h2 className="font-display text-xl font-bold text-ink-900">
              {t(currentStep.labelKey, currentStep.labelVars)}
            </h2>
            {isOptional ? (
              <span className="tag-badge bg-ink-100 text-ink-500">{t("common.optional")}</span>
            ) : (
              <span className="tag-badge bg-gold-50 text-gold-700">{t("common.required_1")}</span>
            )}
          </div>
          <p className="text-sm text-ink-500">
            {t("common.step_of", { n: step + 1, total: TOTAL_STEPS })}
            {totalPrice > 0 && (
              <span className="ml-2 font-semibold text-gold-700 sm:hidden">
                · €{totalPrice.toFixed(2)} {t("common.so_far")}
              </span>
            )}
          </p>
          {isOptional && (
            <p className="mt-1 text-xs text-ink-400">{t("common.click_deselect")}</p>
          )}
        </div>

        <div className="mb-6 space-y-2">
          {currentStep.options.map((option) => {
            const optUnavailable = !isItemAvailable(option.id);
            return (
              <OptionRow
                key={option.id}
                option={option}
                selected={currentSelection?.id === option.id}
                unavailable={optUnavailable}
                onSelect={() => handleSelect(currentStep.key, option, isOptional)}
              />
            );
          })}
        </div>
      </WizardShell>
    </div>
  );
}
