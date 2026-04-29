"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, Plus } from "lucide-react";
import {
  BURRITO_BASE_PRICE,
  BURRITO_PROTEINS,
  BURRITO_MIXINS,
  BURRITO_EXTRA_MIXINS,
  BURRITO_EXTRA_TOPPINGS,
  BUILDER_SAUCES,
  BUILDER_TOPPINGS,
} from "@/lib/menu";
import { useStore } from "@/lib/store/useStore";
import { useT } from "@/lib/i18n";
import QuantityStepper from "@/components/QuantityStepper";
import { useInventory } from "@/lib/inventory/client";
import type { BuilderOption, BurritoBuilderSelections } from "@/lib/types";
import OptionRow from "@/components/builder/OptionRow";
import StepIndicator, { StepCategory } from "@/components/builder/StepIndicator";
import WizardShell from "@/components/builder/WizardShell";

type SelectionKey =
  | "protein"
  | "saus"
  | "mixin1"
  | "mixin2"
  | "mixin3"
  | "extraMixin"
  | "topping1"
  | "topping2"
  | "extraTopping";

interface StepConfig {
  key: SelectionKey;
  labelKey: string;
  labelVars?: Record<string, number>;
  options: BuilderOption[];
  isOptional?: boolean;
}

type BuilderState = Record<SelectionKey, BuilderOption | null>;

const STEPS: StepConfig[] = [
  { key: "protein",      labelKey: "step.protein",       options: BURRITO_PROTEINS },
  { key: "saus",         labelKey: "step.saus",          options: BUILDER_SAUCES },
  { key: "mixin1",       labelKey: "step.mixin",         labelVars: { n: 1 }, options: BURRITO_MIXINS },
  { key: "mixin2",       labelKey: "step.mixin",         labelVars: { n: 2 }, options: BURRITO_MIXINS },
  { key: "mixin3",       labelKey: "step.mixin",         labelVars: { n: 3 }, options: BURRITO_MIXINS },
  { key: "extraMixin",   labelKey: "step.extra_mixin",   options: BURRITO_EXTRA_MIXINS,   isOptional: true },
  { key: "topping1",     labelKey: "step.topping",       labelVars: { n: 1 }, options: BUILDER_TOPPINGS },
  { key: "topping2",     labelKey: "step.topping",       labelVars: { n: 2 }, options: BUILDER_TOPPINGS },
  { key: "extraTopping", labelKey: "step.extra_topping", options: BURRITO_EXTRA_TOPPINGS, isOptional: true },
];

const TOTAL_STEPS = STEPS.length;

const INITIAL_STATE: BuilderState = {
  protein: null,
  saus: null,
  mixin1: null,
  mixin2: null,
  mixin3: null,
  extraMixin: null,
  topping1: null,
  topping2: null,
  extraTopping: null,
};

const SELECTION_KEYS: SelectionKey[] = [
  "protein",
  "saus",
  "mixin1",
  "mixin2",
  "mixin3",
  "extraMixin",
  "topping1",
  "topping2",
  "extraTopping",
];

const CATEGORIES: StepCategory[] = [
  { labelKey: "cat.protein",  start: 0, end: 0 },
  { labelKey: "cat.saus",     start: 1, end: 1 },
  { labelKey: "cat.mixins",   start: 2, end: 5 },
  { labelKey: "cat.toppings", start: 6, end: 8 },
];

function computePrice(state: BuilderState): number {
  let total = BURRITO_BASE_PRICE;
  for (const k of SELECTION_KEYS) {
    const opt = state[k];
    if (opt) total += opt.priceExtra;
  }
  return total;
}

export default function BurritoBuilder() {
  const t = useT();
  const addToCart = useStore((s) => s.addToCart);
  const { isItemAvailable } = useInventory();
  const [step, setStep] = useState(0);
  const [state, setState] = useState<BuilderState>(INITIAL_STATE);
  const [note, setNote] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

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

  const totalPrice = computePrice(state);

  const canAdvance = (): boolean => {
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
    setStep(0);
    setState(INITIAL_STATE);
    setNote("");
    setQuantity(1);
  };

  const handleAddToCart = () => {
    addToCart({
      type: "burrito-builder",
      name: "Poké burrito naar keuze",
      price: totalPrice,
      quantity,
      note,
      burritoSelections: state as BurritoBuilderSelections,
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
        <div className="mb-4 text-6xl">🌯</div>
        <h3 className="font-display text-xl font-bold text-ink-900">{t("common.added")}</h3>
        <p className="mt-1 text-sm text-ink-500">{t("burrito.added_sub")}</p>
      </div>
    );
  }

  const introHeader = (
    <div className="mb-7">
      <h2 className="font-display text-2xl font-bold text-ink-900">{t("burrito.title")}</h2>
      <p className="mt-1 text-sm text-ink-500">
        {t("burrito.intro")}{" "}
        <span className="font-semibold text-gold-700">
          vanaf €{BURRITO_BASE_PRICE.toFixed(2)}
        </span>
        .
      </p>
    </div>
  );

  if (step === TOTAL_STEPS) {
    const reviewRows: [string, string][] = [
      ["Proteïne",  state.protein?.name  ?? ""],
      ["Saus",      state.saus?.name     ?? ""],
      ["Mix-in 1",  state.mixin1?.name   ?? ""],
      ["Mix-in 2",  state.mixin2?.name   ?? ""],
      ["Mix-in 3",  state.mixin3?.name   ?? ""],
      ...(state.extraMixin   ? [["Extra mix-in",  state.extraMixin.name]   as [string, string]] : []),
      ["Topping 1", state.topping1?.name ?? ""],
      ["Topping 2", state.topping2?.name ?? ""],
      ...(state.extraTopping ? [["Extra topping", state.extraTopping.name] as [string, string]] : []),
    ];

    return (
      <div className="animate-slide-up">
        {introHeader}
        <StepIndicator step={step} totalSteps={TOTAL_STEPS} categories={CATEGORIES} progressDenominator={10} />

        <h2 className="font-display mb-1 text-xl font-bold text-ink-900">{t("burrito.review_title")}</h2>
        <p className="mb-5 text-sm text-ink-500">{t("builder.review_sub")}</p>

        <div className="card mb-4 divide-y divide-ink-100 px-5 py-1">
          {reviewRows.map(([label, value]) => (
            <div key={label} className="flex items-start justify-between gap-4 py-2.5">
              <span className="w-20 flex-shrink-0 text-sm font-medium text-ink-500">
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
            Opmerking{" "}
            <span className="font-normal text-ink-400">(optioneel)</span>
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t("builder.note_ph_burrito")}
            rows={2}
            className="input-field resize-none"
          />
        </div>

        <div className="flex flex-col gap-3 min-[500px]:flex-row min-[500px]:flex-wrap min-[500px]:items-center min-[500px]:justify-between">
          <div className="flex items-center gap-3">
            <QuantityStepper value={quantity} onChange={setQuantity} />
          </div>

          <div className="flex w-full min-w-0 flex-col gap-2 min-[400px]:flex-row min-[400px]:items-stretch min-[400px]:justify-end min-[400px]:gap-3">
            <button type="button" onClick={() => setStep(TOTAL_STEPS - 1)} className="btn-secondary w-full min-[400px]:w-auto">
              <ChevronLeft size={16} />
              {t("common.back")}
            </button>
            <button type="button" onClick={handleAddToCart} className="btn-gold w-full min-[400px]:w-auto min-[400px]:shrink-0">
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
      {step === 0 && introHeader}
      <StepIndicator step={step} totalSteps={TOTAL_STEPS} categories={CATEGORIES} progressDenominator={10} />

      <WizardShell
        stepKey={step}
        onBack={step === 0 ? undefined : () => setStep((s) => Math.max(0, s - 1))}
        canBack={step > 0}
        onNext={() => setStep((s) => s + 1)}
        canAdvance={canAdvance()}
        nextLabel={step === TOTAL_STEPS - 1 ? t("common.review") : t("common.next")}
        priceChip={totalPrice > BURRITO_BASE_PRICE ? `€${totalPrice.toFixed(2)}` : undefined}
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
            {totalPrice > BURRITO_BASE_PRICE && (
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
                unavailable={optUnavailable}
                option={option}
                selected={currentSelection?.id === option.id}
                onSelect={() => handleSelect(currentStep.key, option, isOptional)}
              />
            );
          })}
        </div>
      </WizardShell>
    </div>
  );
}
