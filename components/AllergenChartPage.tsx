"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useT } from "@/lib/i18n";
import { ALLERGEN_CHART_SECTIONS } from "@/lib/legal/allergenData";
import { ALLERGEN_IDS } from "@/lib/legal/types";
import { BUSINESS } from "@/lib/business";

const UPDATED = "16 juni 2026";

export default function AllergenChartPage() {
  const t = useT();

  return (
    <div className="min-h-screen bg-cream-50">
      <header className="sticky top-0 z-40 border-b border-ink-200/50 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-ink-600 transition-colors hover:text-gold-700"
          >
            <ArrowLeft size={16} />
            {t("common.back")}
          </Link>
          <LanguageSwitcher />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
          {t("legal.allergens_title")}
        </h1>
        <p className="mt-2 text-xs text-ink-400">
          {t("legal.updated")}: {UPDATED}
        </p>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-ink-600">
          {t("legal.allergens_intro")}
        </p>

        {/* Legend */}
        <div className="mt-8 rounded-xl2 border border-ink-100 bg-white p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-ink-900">{t("legal.allergen_legend")}</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {ALLERGEN_IDS.map((id) => (
              <li key={id} className="flex items-center gap-2 text-xs text-ink-600">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-gold-50 text-[10px] font-bold text-gold-800">
                  {t(`legal.allergen_code.${id}`)}
                </span>
                {t(`legal.allergen.${id}`)}
              </li>
            ))}
          </ul>
        </div>

        {/* Product tables */}
        <div className="mt-8 space-y-10">
          {ALLERGEN_CHART_SECTIONS.map((section) => (
            <section key={section.titleKey}>
              <h2 className="text-base font-semibold text-ink-900">{t(section.titleKey)}</h2>
              <div className="mt-3 overflow-x-auto rounded-xl2 border border-ink-100 bg-white">
                <table className="w-full min-w-[520px] text-left text-xs">
                  <thead>
                    <tr className="border-b border-ink-100 bg-cream-50/80">
                      <th className="px-3 py-2.5 font-semibold text-ink-700">
                        {t("legal.allergen_col_product")}
                      </th>
                      <th className="px-3 py-2.5 font-semibold text-ink-700">
                        {t("legal.allergen_col_contains")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {section.items.map((item) => (
                      <tr key={item.id} className="border-b border-ink-50 last:border-0">
                        <td className="px-3 py-2.5 font-medium text-ink-800">{item.name}</td>
                        <td className="px-3 py-2.5">
                          {item.allergens.length === 0 ? (
                            <span className="text-ink-400">—</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {item.allergens.map((a) => (
                                <span
                                  key={a}
                                  title={t(`legal.allergen.${a}`)}
                                  className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded bg-gold-50 px-1 text-[10px] font-bold text-gold-800"
                                >
                                  {t(`legal.allergen_code.${a}`)}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>

        <div className="mt-8 rounded-xl2 border border-gold-200/60 bg-gold-50/50 p-4 text-sm leading-relaxed text-ink-600">
          <p>{t("legal.allergens_disclaimer")}</p>
          <p className="mt-2">
            {t("legal.allergens_contact")}{" "}
            <a href={`mailto:${BUSINESS.email}`} className="font-medium text-gold-700 hover:underline">
              {BUSINESS.email}
            </a>{" "}
            ·{" "}
            <a href={`tel:${BUSINESS.phoneE164}`} className="font-medium text-gold-700 hover:underline">
              {BUSINESS.phoneDisplay}
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
