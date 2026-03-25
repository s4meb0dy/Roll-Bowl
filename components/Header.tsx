"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingCart, ChefHat, ArrowLeft } from "lucide-react";
import { useStore } from "@/lib/store/useStore";
import { useT } from "@/lib/i18n";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useEffect, useState } from "react";

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
      <header className="sticky top-0 z-50 border-b border-neutral-100 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sage-500 text-white">
              <ChefHat size={20} />
            </span>
            <div>
              <span className="font-display text-lg font-bold text-sage-700">Roll&Bowl</span>
              <span className="ml-2 rounded-full bg-sage-100 px-2 py-0.5 text-[11px] font-semibold text-sage-600">
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
    <header className="sticky top-0 z-50 border-b border-neutral-100 bg-white/90 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sage-500 text-white">
            <ChefHat size={20} />
          </span>
          <span className="font-display text-lg font-bold text-sage-700">
            Roll&amp;Bowl
          </span>
        </Link>

        {/* Zone indicator */}
        {mounted && zipCode && zipCodeConfig && (
          <span className="hidden rounded-full border border-sage-200 bg-sage-50 px-3 py-1 text-xs font-medium text-sage-700 sm:block">
            📍 {zipCodeConfig.area} ({zipCode})
          </span>
        )}

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <LanguageSwitcher />

          {isCartPage ? (
            <Link href="/menu" className="btn-ghost text-sm">
              <ArrowLeft size={16} />
              {t("header.back_to_menu")}
            </Link>
          ) : (
            <Link
              href="/cart"
              className="relative flex h-10 items-center gap-2 rounded-xl border border-sage-200 bg-white px-4 py-2 text-sm font-semibold text-sage-700 shadow-sm transition hover:bg-sage-50"
            >
              <ShoppingCart size={17} />
              <span>{t("header.cart")}</span>
              {count > 0 && (
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-sage-500 px-1 text-[11px] font-bold text-white">
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
