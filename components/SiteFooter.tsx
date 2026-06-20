"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { Mail, MapPin, Phone } from "lucide-react";
import { useT } from "@/lib/i18n";
import { BUSINESS } from "@/lib/business";

export default function SiteFooter() {
  const pathname = usePathname();
  const t = useT();

  if (pathname.startsWith("/admin")) {
    return null;
  }

  return (
    <footer className="mt-auto border-t border-ink-200/50 bg-white pb-20 pt-6 md:pb-8 md:pt-7">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
          {/* Brand */}
          <div className="flex min-w-0 items-center gap-2.5">
            <Image
              src="/logo.png"
              alt={BUSINESS.name}
              width={28}
              height={28}
              className="rounded-full object-cover ring-1 ring-ink-200/60"
            />
            <div className="min-w-0">
              <span className="font-display text-sm font-bold text-ink-900">
                Roll<span className="text-gold-600">&amp;</span>Bowl
              </span>
              <p className="truncate text-xs text-ink-400">{t("footer.tagline_short")}</p>
            </div>
          </div>

          {/* Contact — inline on desktop */}
          <div className="flex flex-col gap-2 text-xs text-ink-600 sm:items-end">
            <a
              href={BUSINESS.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 transition-colors hover:text-gold-700"
            >
              <MapPin size={13} className="shrink-0 text-gold-500" />
              <span>
                {BUSINESS.street}, {BUSINESS.postalCode} {BUSINESS.city}
              </span>
            </a>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 sm:justify-end">
              <a
                href={`tel:${BUSINESS.phoneE164}`}
                className="inline-flex items-center gap-1.5 transition-colors hover:text-gold-700"
              >
                <Phone size={13} className="text-gold-500" />
                {BUSINESS.phoneDisplay}
              </a>
              <a
                href={`mailto:${BUSINESS.email}`}
                className="inline-flex items-center gap-1.5 transition-colors hover:text-gold-700"
              >
                <Mail size={13} className="text-gold-500" />
                {BUSINESS.email}
              </a>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2 border-t border-ink-100 pt-4 text-[11px] leading-relaxed text-ink-400 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <p className="text-ink-500">{t("landing.hours")}</p>
          <p className="shrink-0">
            {t("footer.kbo")} {BUSINESS.kbo}
            <span className="mx-1.5 text-ink-200">·</span>
            {t("footer.vat")} {BUSINESS.vat}
          </p>
        </div>

        <p className="mt-3 text-center text-[10px] text-ink-300 sm:text-left">
          © {new Date().getFullYear()} {BUSINESS.name}
          <span className="mx-1.5 text-ink-200">·</span>
          {t("landing.footer_copy")}
        </p>
      </div>
    </footer>
  );
}
