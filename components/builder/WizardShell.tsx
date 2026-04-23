"use client";

import { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useT } from "@/lib/i18n";

interface WizardShellProps {
  stepKey: string | number;
  children: ReactNode;
  onBack?: () => void;
  onNext?: () => void;
  canBack?: boolean;
  canAdvance?: boolean;
  nextLabel?: string;
  priceChip?: string;
}

export default function WizardShell({
  stepKey,
  children,
  onBack,
  onNext,
  canBack = true,
  canAdvance = true,
  nextLabel,
  priceChip,
}: WizardShellProps) {
  const t = useT();

  return (
    <div className="flex flex-col">
      <div
        key={stepKey}
        className="motion-safe:animate-step-fade"
      >
        {children}
      </div>

      {(onBack || onNext) && (
        <div className="mt-2 flex items-center justify-between gap-3">
          {onBack ? (
            <button
              onClick={onBack}
              disabled={!canBack}
              className="btn-secondary disabled:invisible"
            >
              <ChevronLeft size={16} />
              {t("common.back")}
            </button>
          ) : (
            <span />
          )}

          <div className="flex items-center gap-3">
            {priceChip && (
              <span className="hidden rounded-full bg-gold-50 px-3 py-1.5 text-xs font-semibold text-gold-700 tabular-nums sm:inline-flex">
                {priceChip}
              </span>
            )}
            {onNext && (
              <button
                onClick={onNext}
                disabled={!canAdvance}
                className="btn-primary disabled:cursor-not-allowed disabled:opacity-40"
              >
                {nextLabel ?? t("common.next")}
                <ChevronRight size={16} />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
