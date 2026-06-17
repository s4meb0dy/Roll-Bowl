"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  MapPin, Leaf, Clock, Star,
  ArrowRight, CheckCircle2, XCircle, Loader2, Home,
} from "lucide-react";
import { useStore } from "@/lib/store/useStore";
import { useT } from "@/lib/i18n";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import zipCodesData from "@/lib/zipCodes.json";
import { READY_MADE } from "@/lib/menu";
import type { ZipCodeConfig } from "@/lib/types";

const menuById = Object.fromEntries(READY_MADE.map((item) => [item.id, item]));

const HERO_BOWL_IDS = ["hawaiian-style", "hot-tuna", "tasty-tofu"] as const;

type HeroShowcaseItem =
  | { kind: "bowl"; id: (typeof HERO_BOWL_IDS)[number] }
  | { kind: "custom" };

const HERO_SHOWCASE: HeroShowcaseItem[] = [
  { kind: "bowl", id: "hawaiian-style" },
  { kind: "bowl", id: "hot-tuna" },
  { kind: "bowl", id: "tasty-tofu" },
  { kind: "custom" },
];

function HeroShowcaseCard({
  item,
  t,
  className = "",
}: {
  item: HeroShowcaseItem;
  t: (key: string, vars?: Record<string, string | number>) => string;
  className?: string;
}) {
  if (item.kind === "bowl") {
    const bowl = menuById[item.id];
    if (!bowl?.image) return null;
    const tag = bowl.tags[0] ?? "Popular";
    return (
      <div
        className={`group overflow-hidden rounded-xl3 border border-ink-200/60 bg-white shadow-soft ${className}`}
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-cream-100">
          <Image
            src={bowl.image}
            alt={bowl.name}
            fill
            sizes="(max-width: 1024px) 72vw, 280px"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <span className="absolute bottom-2 left-2 rounded-full bg-white/95 px-2.5 py-0.5 text-[11px] font-semibold text-ink-800 shadow-sm">
            {tag}
          </span>
          <span className="absolute bottom-2 right-2 rounded-full bg-ink-900/80 px-2 py-0.5 text-[11px] font-semibold text-white shadow-sm">
            {t("landing.from_price", { price: bowl.price.toFixed(2) })}
          </span>
        </div>
        <div className="p-3.5 sm:p-4">
          <div className="font-semibold text-ink-900">{bowl.name}</div>
          <div className="mt-1 line-clamp-2 text-xs leading-relaxed text-ink-500">
            {bowl.description}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`group overflow-hidden rounded-xl3 border border-gold-200 bg-white shadow-soft ${className}`}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-cream-100">
        <Image
          src="/bowls/delicious-chicken.png"
          alt={t("landing.hero_custom")}
          fill
          sizes="(max-width: 1024px) 72vw, 280px"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <span className="absolute bottom-2 left-2 rounded-full bg-gold-50 px-2.5 py-0.5 text-[11px] font-semibold text-gold-800 shadow-sm">
          Custom
        </span>
      </div>
      <div className="p-3.5 sm:p-4">
        <div className="font-semibold text-ink-900">{t("landing.hero_custom")}</div>
        <div className="mt-1 text-xs text-ink-500">{t("landing.hero_custom_sub")}</div>
      </div>
    </div>
  );
}

const zipCodes = zipCodesData as Record<string, ZipCodeConfig>;

type CheckState = "idle" | "loading" | "valid" | "invalid";

export default function LandingPage() {
  const router = useRouter();
  const t = useT();
  const { setZipCode, zipCode, deliveryAddress } = useStore();

  const [address, setAddress] = useState("");
  const [postalInput, setPostalInput] = useState("");
  const [checkState, setCheckState] = useState<CheckState>("idle");
  const [foundConfig, setFoundConfig] = useState<ZipCodeConfig | null>(null);
  const [mounted, setMounted] = useState(false);
  const [addressError, setAddressError] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (mounted) {
      if (zipCode) setPostalInput(zipCode);
      if (deliveryAddress) setAddress(deliveryAddress);
    }
  }, [mounted, zipCode, deliveryAddress]);

  const handleCheck = () => {
    const code = postalInput.trim();
    if (!code) return;
    setCheckState("loading");
    setTimeout(() => {
      const config = zipCodes[code];
      if (config) { setFoundConfig(config); setCheckState("valid"); }
      else { setCheckState("invalid"); setFoundConfig(null); }
    }, 600);
  };

  const handleProceed = () => {
    if (!foundConfig) return;
    if (!address.trim()) { setAddressError(true); return; }
    setAddressError(false);
    setZipCode(postalInput.trim(), foundConfig, address.trim());
    router.push("/menu");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (checkState === "valid") handleProceed();
      else handleCheck();
    }
  };

  const resetCheck = () => { setCheckState("idle"); setFoundConfig(null); };

  const FEATURES = [
    { icon: "🥗", titleKey: "feat.1.title", descKey: "feat.1.desc" },
    { icon: "🚀", titleKey: "feat.2.title", descKey: "feat.2.desc" },
    { icon: "🌿", titleKey: "feat.3.title", descKey: "feat.3.desc" },
  ];

  const HOW_IT_WORKS = [
    { num: "01", labelKey: "how.1.label", descKey: "how.1.desc" },
    { num: "02", labelKey: "how.2.label", descKey: "how.2.desc" },
    { num: "03", labelKey: "how.3.label", descKey: "how.3.desc" },
    { num: "04", labelKey: "how.4.label", descKey: "how.4.desc" },
  ];

  const canProceed = checkState === "valid" && !!foundConfig;

  return (
    <div className="min-h-screen bg-cream-100 pb-28 md:pb-0">
      {/* Nav */}
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <Image
            src="/logo.png"
            alt="Roll & Bowl"
            width={44}
            height={44}
            priority
            className="rounded-full object-cover shadow-soft ring-1 ring-ink-200/60"
          />
          <span className="font-display text-lg font-bold text-ink-900">
            Roll<span className="text-gold-600">&amp;</span>Bowl
          </span>
        </div>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-12 sm:px-6 sm:pt-20">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div className="animate-slide-up">
            <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-gold-200 bg-gold-50 px-3 py-1 text-xs font-semibold text-gold-700">
              <Leaf size={12} />
              {t("landing.badge")}
            </span>

            <h1 className="font-display mb-5 text-4xl font-bold leading-[1.05] tracking-tight text-ink-900 sm:text-5xl lg:text-6xl">
              {t("landing.title1")}
              <br />
              <span className="text-gold-600">{t("landing.title2")}</span>
            </h1>

            <p className="mb-10 max-w-xl text-lg leading-relaxed text-ink-500">
              {t("landing.subtitle")}
            </p>

            {/* Address + postal code form */}
            <div className="card p-5">
              <label className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-800">
                <MapPin size={15} className="text-gold-600" />
                {t("landing.address_label")}
              </label>

              <div className="mb-3">
                <div className="relative">
                  <Home size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => { setAddress(e.target.value); setAddressError(false); }}
                    onKeyDown={handleKeyDown}
                    placeholder={t("landing.address_placeholder")}
                    className={`input-field pl-9 ${addressError ? "border-red-300 focus:ring-red-200" : ""}`}
                  />
                </div>
                {addressError && (
                  <p className="mt-1 text-xs text-red-500">{t("landing.address_error")}</p>
                )}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={postalInput}
                  onChange={(e) => { setPostalInput(e.target.value); resetCheck(); }}
                  onKeyDown={handleKeyDown}
                  placeholder={t("landing.postal_placeholder")}
                  maxLength={6}
                  className="input-field flex-1"
                />
                <button
                  onClick={canProceed ? handleProceed : handleCheck}
                  disabled={!postalInput.trim() || checkState === "loading"}
                  className={`${canProceed ? "btn-gold" : "btn-primary"} shrink-0`}
                >
                  {checkState === "loading" ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : canProceed ? (
                    <>{t("landing.order_now")}<ArrowRight size={15} /></>
                  ) : (
                    t("landing.check")
                  )}
                </button>
              </div>

              {checkState === "valid" && foundConfig && (
                <div className="mt-3 flex items-start gap-2 rounded-xl2 bg-sage-50 p-3 text-sm animate-fade-in">
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-sage-500" />
                  <div>
                    <span className="font-semibold text-sage-700">
                      {t("landing.valid_title", { area: foundConfig.area })}
                    </span>
                    <div className="mt-0.5 text-ink-500">
                      {t("landing.min_order")}{" "}
                      <strong className="tabular-nums text-ink-800">€{foundConfig.minOrder.toFixed(2)}</strong>
                      {" · "}
                      {t("landing.delivery_fee")}{" "}
                      <strong className="tabular-nums text-ink-800">€{foundConfig.deliveryFee.toFixed(2)}</strong>
                    </div>
                  </div>
                </div>
              )}

              {checkState === "invalid" && (
                <div className="mt-3 flex items-center gap-2 rounded-xl2 bg-red-50 p-3 text-sm text-red-600 animate-fade-in">
                  <XCircle size={16} className="shrink-0" />
                  {t("landing.invalid", { code: postalInput })}
                </div>
              )}
            </div>

            {/* Social proof */}
            <div className="mt-6 flex items-center gap-4">
              <div className="flex -space-x-2">
                {["🧑‍🍳", "👩", "🧑", "👨"].map((e, i) => (
                  <span key={i} className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-cream-200 text-sm shadow-sm">
                    {e}
                  </span>
                ))}
              </div>
              <div className="text-sm text-ink-500">
                <span className="flex items-center gap-1 font-semibold text-ink-800">
                  <Star size={13} fill="currentColor" className="text-gold-500" />
                  4,9 / 5
                </span>
                {t("landing.reviews", { count: "2.400" })}
              </div>
            </div>
          </div>

          {/* Mobile: horizontal food gallery */}
          <div className="lg:hidden">
            <h2 className="mb-3 font-display text-lg font-bold text-ink-900">
              {t("landing.popular_title")}
            </h2>
            <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 snap-x snap-mandatory scrollbar-hide sm:-mx-6 sm:px-6">
              {HERO_SHOWCASE.map((item) => (
                <HeroShowcaseCard
                  key={item.kind === "bowl" ? item.id : "custom"}
                  item={item}
                  t={t}
                  className="w-[72vw] max-w-[280px] shrink-0 snap-start transition active:scale-[0.98] sm:w-[240px]"
                />
              ))}
            </div>
          </div>

          {/* Desktop: 2×2 grid */}
          <div className="relative hidden lg:block">
            <div className="grid grid-cols-2 gap-4">
              {HERO_SHOWCASE.map((item) => (
                <HeroShowcaseCard
                  key={item.kind === "bowl" ? item.id : "custom"}
                  item={item}
                  t={t}
                  className="transition hover:-translate-y-0.5 hover:shadow-soft-hover"
                />
              ))}
            </div>
            <div className="pointer-events-none absolute -right-8 -top-8 h-48 w-48 rounded-full bg-sage-100 opacity-40 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-8 -left-8 h-40 w-40 rounded-full bg-gold-100 opacity-40 blur-3xl" />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-ink-200/60 bg-white py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-8 sm:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.titleKey} className="text-center">
                <div className="mb-4 text-4xl">{f.icon}</div>
                <h3 className="mb-2 font-semibold text-ink-900">{t(f.titleKey)}</h3>
                <p className="text-sm leading-relaxed text-ink-500">{t(f.descKey)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="font-display mb-10 text-center text-3xl font-bold tracking-tight text-ink-900">
            {t("landing.how_title")}
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {HOW_IT_WORKS.map((step, i) => (
              <div key={step.num} className="relative">
                {i < HOW_IT_WORKS.length - 1 && (
                  <div className="absolute right-0 top-5 hidden h-0.5 w-1/2 bg-gold-100 lg:block" />
                )}
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-gold-400 to-gold-600 text-sm font-bold text-white shadow-soft">
                  {step.num}
                </div>
                <h4 className="mt-3 font-semibold text-ink-900">{t(step.labelKey)}</h4>
                <p className="mt-1 text-sm leading-relaxed text-ink-500">{t(step.descKey)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-ink-200/60 bg-white py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6">
          <div className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="Roll & Bowl"
              width={28}
              height={28}
              className="rounded-full object-cover ring-1 ring-ink-200/60"
            />
            <span className="font-display font-bold text-ink-900">
              Roll<span className="text-gold-600">&amp;</span>Bowl
            </span>
          </div>
          <p className="text-xs text-ink-400">
            © {new Date().getFullYear()} Roll&amp;Bowl. {t("landing.footer_copy")}
          </p>
          <div className="flex items-center gap-1 text-xs text-ink-400">
            <Clock size={12} />
            {t("landing.hours")}
          </div>
        </div>
      </footer>
    </div>
  );
}
