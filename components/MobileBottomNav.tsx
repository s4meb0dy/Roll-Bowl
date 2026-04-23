"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, UtensilsCrossed, ShoppingCart } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useStore } from "@/lib/store/useStore";
import { useT } from "@/lib/i18n";

interface NavItem {
  href: string;
  labelKey: string;
  fallback: string;
  icon: LucideIcon;
  match: (pathname: string) => boolean;
}

const ITEMS: NavItem[] = [
  {
    href: "/",
    labelKey: "nav.home",
    fallback: "Home",
    icon: Home,
    match: (p) => p === "/",
  },
  {
    href: "/menu",
    labelKey: "nav.menu",
    fallback: "Menu",
    icon: UtensilsCrossed,
    match: (p) => p.startsWith("/menu"),
  },
  {
    href: "/cart",
    labelKey: "nav.cart",
    fallback: "Cart",
    icon: ShoppingCart,
    match: (p) => p.startsWith("/cart") || p.startsWith("/order"),
  },
];

export default function MobileBottomNav() {
  const pathname = usePathname() ?? "/";
  const t = useT();
  const cart = useStore((s) => s.cart);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (pathname.startsWith("/admin")) return null;

  const count = mounted ? cart.reduce((sum, item) => sum + item.quantity, 0) : 0;

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-ink-200/60 bg-white/85 backdrop-blur-md md:hidden"
    >
      <ul className="mx-auto flex max-w-6xl items-stretch justify-around px-2 pt-1 safe-bottom">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          const active = item.match(pathname);
          const showBadge = item.href === "/cart" && count > 0;
          const label = t(item.labelKey);
          const displayLabel = label === item.labelKey ? item.fallback : label;

          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`tap-target relative flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-semibold transition-colors ${
                  active ? "text-ink-900" : "text-ink-500"
                }`}
              >
                <span className="relative">
                  <Icon size={22} className={active ? "text-gold-600" : ""} />
                  {showBadge && (
                    <span className="absolute -right-2 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-gold-500 px-1 text-[10px] font-bold text-white motion-safe:animate-cart-pop">
                      {count}
                    </span>
                  )}
                </span>
                <span>{displayLabel}</span>
                {active && (
                  <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-gold-500" />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
