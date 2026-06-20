"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { useT } from "@/lib/i18n";
import { BUSINESS, BUSINESS_ADDRESS_LINE } from "@/lib/business";

export default function SiteFooter() {
  const pathname = usePathname();
  const t = useT();

  if (pathname.startsWith("/admin")) {
    return null;
  }

  return (
    <footer className="border-t border-ink-200/60 bg-white pb-24 pt-10 md:pb-10">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 lg:gap-10">
          <div>
            <div className="mb-3 flex items-center gap-2.5">
              <Image
                src="/logo.png"
                alt={BUSINESS.name}
                width={32}
                height={32}
                className="rounded-full object-cover ring-1 ring-ink-200/60"
              />
              <span className="font-display text-lg font-bold text-ink-900">
                Roll<span className="text-gold-600">&amp;</span>Bowl
              </span>
            </div>
            <p className="text-sm leading-relaxed text-ink-500">{t("footer.tagline")}</p>
          </div>

          <div>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-400">
              {t("footer.contact_title")}
            </h2>
            <ul className="space-y-2.5 text-sm text-ink-700">
              <li>
                <a
                  href={BUSINESS.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-start gap-2 transition-colors hover:text-gold-700"
                >
                  <MapPin size={15} className="mt-0.5 shrink-0 text-gold-600" />
                  <span>
                    {BUSINESS.street}
                    <br />
                    {BUSINESS.postalCode} {BUSINESS.city}
                  </span>
                </a>
              </li>
              <li>
                <a
                  href={`tel:${BUSINESS.phoneE164}`}
                  className="inline-flex items-center gap-2 transition-colors hover:text-gold-700"
                >
                  <Phone size={15} className="shrink-0 text-gold-600" />
                  {BUSINESS.phoneDisplay}
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${BUSINESS.email}`}
                  className="inline-flex items-center gap-2 transition-colors hover:text-gold-700"
                >
                  <Mail size={15} className="shrink-0 text-gold-600" />
                  {BUSINESS.email}
                </a>
              </li>
            </ul>
            <p className="mt-3 text-xs text-ink-400">
              {t("footer.kbo")}: {BUSINESS.kbo}
              <br />
              {t("footer.vat")}: {BUSINESS.vat}
            </p>
          </div>

          <div className="sm:col-span-2 lg:col-span-1">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-400">
              {t("footer.hours_title")}
            </h2>
            <div className="flex items-start gap-2 text-sm leading-relaxed text-ink-600">
              <Clock size={15} className="mt-0.5 shrink-0 text-gold-600" />
              <span>{t("landing.hours")}</span>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-ink-100 pt-6 text-center text-xs text-ink-400">
          <p>
            © {new Date().getFullYear()} {BUSINESS.name}. {t("landing.footer_copy")}
          </p>
          <p className="mt-1">
            <Link href="/" className="hover:text-ink-600">
              {BUSINESS_ADDRESS_LINE}
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
