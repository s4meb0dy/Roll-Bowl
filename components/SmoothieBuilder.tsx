"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, Plus } from "lucide-react";
import {
  SMOOTHIE_BASE_PRICE,
  SMOOTHIE_BASES,
  SMOOTHIE_MIXINS,
  SMOOTHIE_EXTRA_MIXINS,
  SMOOTHIE_PROTEIN_SCOOPS,
} from "@/lib/menu";
import { useStore } from "@/lib/store/useStore";
import { useT } from "@/lib/i18n";
import { useInventory } from "@/lib/inventory/client";
import type { BuilderOption, SmoothieBuilderSelections } from "@/lib/types";
import OptionRow from "@/components/builder/OptionRow";
import StepIndicator, { StepCategory } from "@/components/builder/StepIndicator";
import WizardShell from "@/components/builder/WizardShell";

type SelectionKey = "basis" | "mixin1" | "mixin2" | "mixin3" | "extraMixin" | "proteinScoop";

interface StepConfig {
  key: SelectionKey;
  labelKey: string;
  labelVars?: Record<string, number>;
  options: BuilderOption[];
  isOptional?: boolean;
}

type BuilderState = Record<SelectionKey, BuilderOption | null>;

const STEPS: StepConfig[] = [
  { key: "basis",        labelKey: "step.basis",          options: SMOOTHIE_BASES },
  { key: "mixin1",       labelKey: "step.mixin", labelVars: { n: 1 }, options: SMOOTHIE_MIXINS },
  { key: "mixin2",       labelKey: "step.mixin", labelVars: { n: 2 }, options: SMOOTHIE_MIXINS },
  { key: "mixin3",       labelKey: "step.mixin", labelVars: { n: 3 }, options: SMOOTHIE_MIXINS },
  { key: "extraMixin",   labelKey: "step.extra_mixin",    options: SMOOTHIE_EXTRA_MIXINS,   isOptional: true },
  { key: "proteinScoop", labelKey: "step.protein_scoop",  options: SMOOTHIE_PROTEIN_SCOOPS, isOptional: true },
];

const TOTAL_STEPS = STEPS.length;

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

const CATEGORIES: StepCategory[] = [
  { labelKey: "cat.basis",   start: 0, end: 0 },
  { labelKey: "cat.mixins",  start: 1, end: 4 },
  { labelKey: "cat.protein", start: 5, end: 5 },
];

function computePrice(state: BuilderState): number {
  let total = SMOOTHIE_BASE_PRICE;
  for (const k of SELECTION_KEYS) {
    const opt = state[k];
    if (opt) total += opt.priceExtra;
  }
  return total;
}

export default function SmoothieBuilder() {
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

  if (added) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
        <div className="mb-4 text-6xl">🥤</div>
        <h3 className="font-display text-xl font-bold text-ink-900">{t("common.added")}</h3>
        <p className="mt-1 text-sm text-ink-500">{t("smoothie.added_sub")}</p>
      </div>
    );
  }

  const introHeader = (
    <div className="mb-7">
      <h2 className="font-display text-2xl font-bold text-ink-900">{t("smoothie.title")}</h2>
      <p className="mt-1 text-sm text-ink-500">
        {t("smoothie.intro")}{" "}
        <span className="font-semibold text-gold-700">
          {t("common.from")} €{SMOOTHIE_BASE_PRICE.toFixed(2)}
        </span>
        .
      </p>
    </div>
  );

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
        <StepIndicator step={step} totalSteps={TOTAL_STEPS} categories={CATEGORIES} progressDenominator={7} />

        <h2 className="font-display mb-1 text-xl font-bold text-ink-900">{t("smoothie.review_title")}</h2>
        <p className="mb-5 text-sm text-ink-500">{t("builder.review_sub")}</p>

        <div className="card mb-4 divide-y divide-ink-100 px-5 py-1">
          {reviewRows.map(([label, value]) => (
            <div key={label} className="flex items-start justify-between gap-4 py-2.5">
              <span className="w-28 flex-shrink-0 text-sm font-medium text-ink-500">
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
            placeholder={t("builder.note_ph_smoothie")}
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

  const cfg = currentStepConfig!;
  const currentSelection = state[cfg.key];

  return (
    <div className="animate-slide-up">
      {step === 0 && introHeader}
      <StepIndicator step={step} totalSteps={TOTAL_STEPS} categories={CATEGORIES} progressDenominator={7} />

      <WizardShell
        stepKey={step}
        onBack={step === 0 ? undefined : () => setStep((s) => Math.max(0, s - 1))}
        canBack={step > 0}
        onNext={() => setStep((s) => s + 1)}
        canAdvance={canAdvance()}
        nextLabel={step === TOTAL_STEPS - 1 ? t("common.review") : t("common.next")}
        priceChip={totalPrice > SMOOTHIE_BASE_PRICE ? `€${totalPrice.toFixed(2)}` : undefined}
      >
        <div className="mb-5">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <h2 className="font-display text-xl font-bold text-ink-900">
              {t(cfg.labelKey, cfg.labelVars)}
            </h2>
            {cfg.isOptional ? (
              <span className="tag-badge bg-ink-100 text-ink-500">{t("common.optional")}</span>
            ) : (
              <span className="tag-badge bg-gold-50 text-gold-700">{t("common.required_1")}</span>
            )}
          </div>
          <p className="text-sm text-ink-500">
            {t("common.step_of", { n: step + 1, total: TOTAL_STEPS })}
            {totalPrice > SMOOTHIE_BASE_PRICE && (
              <span className="ml-2 font-semibold text-gold-700 sm:hidden">
                · €{totalPrice.toFixed(2)} {t("common.so_far")}
              </span>
            )}
          </p>
          {cfg.isOptional && (
            <p className="mt-1 text-xs text-ink-400">{t("common.click_deselect")}</p>
          )}
        </div>

        <div className="mb-6 space-y-2">
          {cfg.options.map((option) => (
            <OptionRow
              key={option.id}
              option={option}
              selected={currentSelection?.id === option.id}
              unavailable={!isItemAvailable(option.id)}
              onSelect={() => handleSelect(cfg.key, option)}
            />
          ))}
        </div>
      </WizardShell>
    </div>
  );
}
