"use client";

import { useT } from "@/lib/i18n";

export interface StepCategory {
  labelKey: string;
  start: number;
  end: number;
}

interface StepIndicatorProps {
  step: number;
  totalSteps: number;
  categories: StepCategory[];
  progressDenominator?: number;
}

export default function StepIndicator({
  step,
  totalSteps,
  categories,
  progressDenominator,
}: StepIndicatorProps) {
  const t = useT();
  const isReview = step >= totalSteps;
  const denom = progressDenominator ?? totalSteps + 1;
  const clamped = Math.max(0, Math.min(step + 1, denom));
  const pct = Math.round((clamped / denom) * 100);

  return (
    <div className="mb-6">
      <div className="mb-2.5 hidden items-center justify-between gap-1 text-xs sm:flex">
        {categories.map(({ labelKey, start, end }) => {
          const isDone = step > end;
          const isActive = step >= start && step <= end;
          return (
            <span
              key={labelKey}
              className={`font-semibold uppercase tracking-wide transition-colors ${
                isActive
                  ? "text-ink-900"
                  : isDone
                  ? "text-sage-600"
                  : "text-ink-300"
              }`}
            >
              {t(labelKey)}
            </span>
          );
        })}
        <span
          className={`font-semibold uppercase tracking-wide ${
            isReview ? "text-ink-900" : "text-ink-300"
          }`}
        >
          {t("cat.review")}
        </span>
      </div>

      <div className="mb-2 flex items-center justify-between text-[11px] font-semibold text-ink-500 sm:hidden">
        <span>
          {isReview
            ? t("cat.review")
            : t("common.step_of", { n: step + 1, total: totalSteps })}
        </span>
        <span className="tabular-nums">{pct}%</span>
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-ink-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-sage-400 to-gold-400 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
