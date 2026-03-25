"use client";

import { useStore } from "@/lib/store/useStore";
import type { Locale } from "@/lib/i18n/index";

const LOCALES: { code: Locale; label: string }[] = [
  { code: "nl", label: "NL" },
  { code: "en", label: "EN" },
  { code: "fr", label: "FR" },
];

export default function LanguageSwitcher() {
  const locale = useStore((s) => s.locale);
  const setLocale = useStore((s) => s.setLocale);

  return (
    <div className="flex items-center gap-0.5 rounded-xl border border-neutral-200 p-0.5">
      {LOCALES.map(({ code, label }) => (
        <button
          key={code}
          onClick={() => setLocale(code)}
          className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
            locale === code
              ? "bg-sage-500 text-white shadow-sm"
              : "text-neutral-500 hover:text-neutral-700"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
