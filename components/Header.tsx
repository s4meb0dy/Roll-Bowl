"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ShoppingCart, ArrowLeft } from "lucide-react";
import { useStore } from "@/lib/store/useStore";
import { useT } from "@/lib/i18n";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useEffect, useState } from "react";

function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <Image
      src="/logo.png"
      alt="Roll & Bowl"
      width={size}
      height={size}
      priority
      className="rounded-full object-cover shadow-sm ring-1 ring-sage-200"
    />
  );
}

export default function Header() {
  const pathname = usePathname();
  const t = useT();
  const cart = useStore((s) => s.cart);
  const zipCode = useStore((s) => s.zipCode);
  const zipCodeConfig = useStore((s) => s.zipCodeConfig);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const count = mounted ? cart.reduce((sum, item) => sum + item.quantity, 0) : 0;
  const isCartPage = pathname === "/cart";
  const isAdminPage = pathname === "/admin";

  if (isAdminPage) {
    return (
      <header className="sticky top-0 z-50 border-b border-ink-200/60 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <LogoMark size={40} />
            <div>
              <span className="font-display text-lg font-bold text-ink-900">Roll<span className="text-gold-600">&amp;</span>Bowl</span>
              <span className="ml-2 rounded-full bg-gold-50 px-2 py-0.5 text-[11px] font-semibold text-gold-700">
                {t("header.kitchen")}
              </span>
            </div>
          </Link>
          <LanguageSwitcher />
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-50 border-b border-ink-200/60 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <LogoMark size={40} />
          <span className="font-display text-lg font-bold text-ink-900">
            Roll<span className="text-gold-600">&amp;</span>Bowl
          </span>
        </Link>

        {mounted && zipCode && zipCodeConfig && (
          <span className="chip hidden border-sage-200 bg-sage-50 text-sage-700 sm:inline-flex">
            📍 {zipCodeConfig.area} ({zipCode})
          </span>
        )}

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <LanguageSwitcher />

          {isCartPage ? (
            <Link href="/menu" className="btn-ghost text-sm">
              <ArrowLeft size={16} />
              <span className="hidden sm:inline">{t("header.back_to_menu")}</span>
            </Link>
          ) : (
            <Link
              href="/cart"
              aria-label={t("header.cart")}
              className="tap-target relative hidden h-10 items-center gap-2 rounded-xl2 border border-ink-200 bg-white px-4 text-sm font-semibold text-ink-700 shadow-soft transition hover:border-gold-300 hover:text-gold-700 md:inline-flex"
            >
              <ShoppingCart size={17} />
              <span>{t("header.cart")}</span>
              {count > 0 && (
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-gold-500 px-1 text-[11px] font-bold text-white motion-safe:animate-cart-pop">
                  {count}
                </span>
              )}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
