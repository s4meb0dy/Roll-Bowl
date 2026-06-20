"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useT } from "@/lib/i18n";
import type { LegalDocument } from "@/lib/legal/types";

export default function LegalPageShell({ doc }: { doc: LegalDocument }) {
  const t = useT();

  return (
    <div className="min-h-screen bg-cream-50">
      <header className="sticky top-0 z-40 border-b border-ink-200/50 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4 sm:px-6">
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

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
          {doc.title}
        </h1>
        <p className="mt-2 text-xs text-ink-400">
          {t("legal.updated")}: {doc.updated}
        </p>
        {doc.intro && (
          <p className="mt-4 text-sm leading-relaxed text-ink-600">{doc.intro}</p>
        )}

        <div className="mt-8 space-y-8">
          {doc.sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-base font-semibold text-ink-900">{section.title}</h2>
              <div className="mt-2 space-y-2">
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph} className="text-sm leading-relaxed text-ink-600">
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
