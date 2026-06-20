"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Mail, MapPin, Phone, Instagram, Facebook } from "lucide-react";
import { useT } from "@/lib/i18n";
import { BUSINESS } from "@/lib/business";

function TikTokIcon({ size = 15, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.75a8.18 8.18 0 0 0 4.77 1.52V6.82a4.85 4.85 0 0 1-1.01-.13z" />
    </svg>
  );
}

const SOCIAL_LINKS = [
  { key: "instagram" as const, href: BUSINESS.social.instagram, Icon: Instagram },
  { key: "tiktok" as const, href: BUSINESS.social.tiktok, Icon: TikTokIcon },
  { key: "facebook" as const, href: BUSINESS.social.facebook, Icon: Facebook },
];

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
          {/* Brand + social */}
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
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

            <nav
              className="mt-3 flex items-center gap-2"
              aria-label={t("footer.social_label")}
            >
              {SOCIAL_LINKS.map(({ key, href, Icon }) => (
                <a
                  key={key}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t(`footer.social_${key}`)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-ink-100 bg-cream-50/80 text-ink-500 transition-colors hover:border-gold-200 hover:bg-gold-50 hover:text-gold-700"
                >
                  <Icon size={15} className="shrink-0" />
                </a>
              ))}
            </nav>
          </div>

          {/* Contact */}
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

        <div className="mt-4 flex flex-col gap-3 border-t border-ink-100 pt-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="text-[11px] leading-relaxed text-ink-400">
            <p className="text-ink-500">{t("landing.hours")}</p>
            <p className="mt-1">
              {t("footer.kbo")} {BUSINESS.kbo}
              <span className="mx-1.5 text-ink-200">·</span>
              {t("footer.vat")} {BUSINESS.vat}
            </p>
          </div>

          <nav
            className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-500 sm:justify-end"
            aria-label="Legal"
          >
            <Link href="/privacy" className="transition-colors hover:text-gold-700">
              {t("legal.privacy")}
            </Link>
            <span className="text-ink-200" aria-hidden>
              ·
            </span>
            <Link href="/voorwaarden" className="transition-colors hover:text-gold-700">
              {t("legal.terms")}
            </Link>
            <span className="text-ink-200" aria-hidden>
              ·
            </span>
            <Link href="/allergenen" className="transition-colors hover:text-gold-700">
              {t("legal.allergens")}
            </Link>
          </nav>
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
