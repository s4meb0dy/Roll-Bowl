"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ArrowRight, Clock, Leaf, Mail, MapPin, Phone } from "lucide-react";
import { useT } from "@/lib/i18n";
import { BUSINESS } from "@/lib/business";

function FooterLink({
  href,
  external,
  icon: Icon,
  children,
  sub,
}: {
  href: string;
  external?: boolean;
  icon: typeof MapPin;
  children: React.ReactNode;
  sub?: string;
}) {
  const className =
    "group flex items-start gap-3 rounded-xl2 border border-white/10 bg-white/[0.06] p-3.5 transition-all hover:border-gold-400/30 hover:bg-white/[0.1] sm:p-4";

  const inner = (
    <>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold-500/15 text-gold-300 ring-1 ring-gold-400/20 transition-colors group-hover:bg-gold-500/25">
        <Icon size={16} />
      </span>
      <span className="min-w-0 pt-0.5">
        <span className="block text-sm font-medium text-white/95">{children}</span>
        {sub && <span className="mt-0.5 block text-xs text-white/50">{sub}</span>}
      </span>
    </>
  );

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {inner}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {inner}
    </Link>
  );
}

export default function SiteFooter() {
  const pathname = usePathname();
  const t = useT();

  if (pathname.startsWith("/admin")) {
    return null;
  }

  const hourLines = t("landing.hours").split(" · ").filter(Boolean);

  return (
    <footer className="relative mt-auto overflow-hidden rounded-t-[2rem] bg-gradient-to-br from-ink-900 via-ink-800 to-ink-900 pb-24 pt-12 text-white sm:rounded-t-[2.5rem] sm:pt-14 md:pb-12">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        aria-hidden
        style={{
          backgroundImage:
            "radial-gradient(circle at 15% 20%, rgba(90,137,70,0.25) 0%, transparent 45%), radial-gradient(circle at 85% 80%, rgba(183,138,58,0.18) 0%, transparent 40%)",
        }}
      />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-8">
          {/* Brand + CTA */}
          <div className="lg:col-span-4">
            <div className="mb-4 flex items-center gap-3">
              <Image
                src="/logo.png"
                alt={BUSINESS.name}
                width={44}
                height={44}
                className="rounded-full object-cover ring-2 ring-white/15"
              />
              <div>
                <span className="font-display block text-xl font-bold tracking-tight text-white">
                  Roll<span className="text-gold-400">&amp;</span>Bowl
                </span>
                <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium text-sage-300/90">
                  <Leaf size={11} />
                  Vers · Gezond · Lokaal
                </span>
              </div>
            </div>
            <p className="mb-6 max-w-xs text-sm leading-relaxed text-white/60">
              {t("footer.tagline")}
            </p>
            <Link
              href={pathname === "/" ? "#delivery-form" : "/#delivery-form"}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl2 bg-gradient-to-br from-gold-400 to-gold-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-gold-900/30 transition hover:brightness-105"
            >
              {t("footer.order_cta")}
              <ArrowRight size={15} />
            </Link>
          </div>

          {/* Contact */}
          <div className="lg:col-span-4">
            <h2 className="mb-4 font-display text-xs font-bold uppercase tracking-[0.14em] text-gold-400/90">
              {t("footer.contact_title")}
            </h2>
            <div className="space-y-2.5">
              <FooterLink
                href={BUSINESS.mapsUrl}
                external
                icon={MapPin}
                sub={t("footer.maps_hint")}
              >
                {BUSINESS.street}
                <br />
                {BUSINESS.postalCode} {BUSINESS.city}
              </FooterLink>
              <FooterLink href={`tel:${BUSINESS.phoneE164}`} icon={Phone}>
                {BUSINESS.phoneDisplay}
              </FooterLink>
              <FooterLink href={`mailto:${BUSINESS.email}`} icon={Mail}>
                {BUSINESS.email}
              </FooterLink>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-white/40">
              {t("footer.kbo")} {BUSINESS.kbo}
              <span className="mx-2 text-white/20">·</span>
              {t("footer.vat")} {BUSINESS.vat}
            </p>
          </div>

          {/* Hours */}
          <div className="lg:col-span-4">
            <h2 className="mb-4 font-display text-xs font-bold uppercase tracking-[0.14em] text-gold-400/90">
              {t("footer.hours_title")}
            </h2>
            <div className="rounded-xl3 border border-white/10 bg-white/[0.05] p-4 sm:p-5">
              <div className="mb-3 flex items-center gap-2 text-gold-300/90">
                <Clock size={16} />
                <span className="text-xs font-semibold uppercase tracking-wide text-white/70">
                  {t("footer.hours_sub")}
                </span>
              </div>
              <ul className="space-y-2.5">
                {hourLines.map((line) => (
                  <li
                    key={line}
                    className="flex gap-2 text-sm leading-snug text-white/75 before:mt-2 before:h-1 before:w-1 before:shrink-0 before:rounded-full before:bg-gold-400/80 before:content-['']"
                  >
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 sm:flex-row">
          <p className="text-center text-xs text-white/45 sm:text-left">
            © {new Date().getFullYear()} {BUSINESS.name}. {t("landing.footer_copy")}
          </p>
          <p className="text-center text-[11px] text-white/35 sm:text-right">
            {BUSINESS.name} · {BUSINESS.city}
          </p>
        </div>
      </div>
    </footer>
  );
}
