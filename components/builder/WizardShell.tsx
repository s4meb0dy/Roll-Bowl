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
    <div className="flex min-h-0 flex-col">
      <div
        key={stepKey}
        className="min-h-0 flex-1 motion-safe:animate-step-fade"
      >
        {children}
      </div>

      {(onBack || onNext) && (
        <div
          className="sticky bottom-28 z-30 -mx-4 mt-2 flex w-full min-w-0 max-w-full flex-col border-t border-ink-200/60 bg-cream-100/95 px-4 py-3 backdrop-blur-sm md:static md:bottom-auto md:z-auto md:mx-0 md:mt-2 md:w-full md:border-0 md:bg-transparent md:px-0 md:py-0 md:backdrop-blur-none"
        >
          <div className="flex w-full min-w-0 flex-col gap-2 md:flex-row md:items-center md:justify-between md:gap-3">
            {onBack ? (
              <button
                onClick={onBack}
                disabled={!canBack}
                className="btn-secondary tap-target w-full min-w-0 disabled:invisible md:w-auto"
              >
                <ChevronLeft size={16} />
                {t("common.back")}
              </button>
            ) : (
              <span className="hidden h-0 md:block" />
            )}

            <div className="flex w-full min-w-0 flex-col items-stretch gap-2 min-[400px]:flex-row min-[400px]:items-center min-[400px]:justify-end md:w-auto md:flex-1">
              {priceChip && (
                <span className="order-first hidden w-full min-w-0 min-[400px]:inline-flex min-[400px]:w-auto min-[400px]:justify-end md:order-none">
                  <span className="inline-flex rounded-full bg-gold-50 px-3 py-1.5 text-xs font-semibold text-gold-700 tabular-nums sm:inline-flex">
                    {priceChip}
                  </span>
                </span>
              )}
              {onNext && (
                <button
                  onClick={onNext}
                  disabled={!canAdvance}
                  className="btn-primary tap-target w-full min-w-0 min-[400px]:w-auto disabled:cursor-not-allowed disabled:opacity-40 md:shrink-0"
                >
                  {nextLabel ?? t("common.next")}
                  <ChevronRight size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
