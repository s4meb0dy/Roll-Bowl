"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles, Utensils, Sandwich, Wand2, Droplets, FlaskConical,
  Salad, Package, Cookie, GlassWater, Fish, Scroll,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Header from "@/components/Header";
import BowlBuilder from "@/components/BowlBuilder";
import ReadyMadeBowls from "@/components/ReadyMadeBowls";
import BurritoSuggestions from "@/components/BurritoSuggestions";
import BurritoBuilder from "@/components/BurritoBuilder";
import SmoothieSuggestions from "@/components/SmoothieSuggestions";
import SmoothieBuilder from "@/components/SmoothieBuilder";
import ClassicRollBuilder from "@/components/ClassicRollBuilder";
import InsideOutRollBuilder from "@/components/InsideOutRollBuilder";
import SimpleItemSection from "@/components/SimpleItemSection";
import { SIGNATURE_ROLLS, SMOOTHIE_BOWLS, EXTRAS, DESSERTEN, DRANKEN } from "@/lib/menu";
import { useStore } from "@/lib/store/useStore";
import { useT } from "@/lib/i18n";
import MenuCategoryScrubber from "@/components/MenuCategoryScrubber";
import CafeClosedNotice from "@/components/CafeClosedNotice";
import { useInventory, useInventorySync } from "@/lib/inventory/client";
import type { InventoryCategoryId } from "@/lib/inventory/types";

type Tab =
  | "ready" | "build"
  | "burritos" | "burrito-build"
  | "signature-rolls" | "classic-roll-build" | "inside-out-roll-build"
  | "smoothies" | "smoothie-build"
  | "smoothie-bowls" | "extras" | "desserten" | "dranken";

const TAB_CATEGORY: Partial<Record<Tab, InventoryCategoryId>> = {
  smoothies: "smoothies",
  "smoothie-build": "smoothies",
  "smoothie-bowls": "smoothie-bowls",
  extras: "extras",
  desserten: "desserten",
  dranken: "dranken",
};

interface TabDef {
  id: Tab;
  icon: LucideIcon;
  label: string;
  shortLabel?: string;
}

const TABS: TabDef[] = [
  { id: "ready",                 icon: Utensils,     label: "Poké bowls suggesties", shortLabel: "Bowls" },
  { id: "build",                 icon: Sparkles,     label: "Stel je poké bowl samen", shortLabel: "Build bowl" },
  { id: "burritos",              icon: Sandwich,     label: "Poké burrito's suggesties", shortLabel: "Burritos" },
  { id: "burrito-build",         icon: Wand2,        label: "Stel je poké burrito samen", shortLabel: "Build burrito" },
  { id: "signature-rolls",       icon: Fish,         label: "Sushi Push Pop", shortLabel: "Push Pop" },
  { id: "classic-roll-build",    icon: Scroll,       label: "Stel je classic roll samen", shortLabel: "Classic roll" },
  { id: "inside-out-roll-build", icon: Wand2,        label: "Stel je inside-out roll samen", shortLabel: "Inside-out" },
  { id: "smoothies",             icon: Droplets,     label: "Smoothies suggesties", shortLabel: "Smoothies" },
  { id: "smoothie-build",        icon: FlaskConical, label: "Stel je eigen smoothie samen", shortLabel: "Build smoothie" },
  { id: "smoothie-bowls",        icon: Salad,        label: "Smoothie bowls" },
  { id: "extras",                icon: Package,      label: "Extra's" },
  { id: "desserten",             icon: Cookie,       label: "Desserten" },
  { id: "dranken",               icon: GlassWater,   label: "Dranken" },
];

function TabPill({
  tab,
  active,
  onClick,
  pillRef,
}: {
  tab: TabDef;
  active: boolean;
  onClick: () => void;
  pillRef?: React.Ref<HTMLButtonElement>;
}) {
  const Icon = tab.icon;
  return (
    <button
      ref={pillRef}
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`relative flex h-11 min-h-[44px] shrink-0 snap-center items-center gap-2 rounded-xl2 border px-3.5 text-sm font-semibold transition-[transform,background-color,border-color,box-shadow] motion-reduce:transition-none active:scale-[0.98] motion-reduce:active:scale-100 sm:px-4 ${
        active
          ? "border-gold-500/90 bg-gold-50/95 text-ink-900 shadow-sm"
          : "border-ink-200/70 bg-white/80 text-ink-600 hover:border-ink-300 hover:bg-white hover:text-ink-800"
      }`}
    >
      <Icon size={15} className={active ? "text-gold-500" : "text-ink-500"} />
      <span className="sm:hidden">{tab.shortLabel ?? tab.label}</span>
      <span className="hidden sm:inline">{tab.label}</span>
    </button>
  );
}

/** Pixels: matches section `scroll-mt-32` (8rem) so spy aligns with click scroll. */
const SECTION_SCROLL_OFFSET_PX = 128;

function menuSectionId(tab: Tab) {
  return `menu-section-${tab}`;
}

type TFn = ReturnType<typeof useT>;

function MenuSectionBody({ id, t }: { id: Tab; t: TFn }) {
  switch (id) {
    case "ready":
      return <ReadyMadeBowls />;
    case "build":
      return <BowlBuilder />;
    case "burritos":
      return <BurritoSuggestions />;
    case "burrito-build":
      return <BurritoBuilder />;
    case "signature-rolls":
      return (
        <SimpleItemSection
          title={t("sec.rolls.title")}
          subtitle={t("sec.rolls.sub")}
          items={SIGNATURE_ROLLS}
          cartType="item"
          headerGradient="from-rose-50 to-orange-100"
          priceColor="text-gold-700"
        />
      );
    case "classic-roll-build":
      return <ClassicRollBuilder />;
    case "inside-out-roll-build":
      return <InsideOutRollBuilder />;
    case "smoothies":
      return <SmoothieSuggestions />;
    case "smoothie-build":
      return <SmoothieBuilder />;
    case "smoothie-bowls":
      return (
        <SimpleItemSection
          title={t("sec.smoothie_bowls.title")}
          subtitle={t("sec.smoothie_bowls.sub")}
          items={SMOOTHIE_BOWLS}
          cartType="item"
          headerGradient="from-violet-50 to-purple-100"
          priceColor="text-gold-700"
        />
      );
    case "extras":
      return (
        <SimpleItemSection
          title={t("sec.extras.title")}
          subtitle={t("sec.extras.sub")}
          items={EXTRAS}
          cartType="item"
          headerGradient="from-amber-50 to-orange-100"
          priceColor="text-gold-700"
        />
      );
    case "desserten":
      return (
        <SimpleItemSection
          title={t("sec.desserts.title")}
          subtitle={t("sec.desserts.sub")}
          items={DESSERTEN}
          cartType="item"
          headerGradient="from-rose-50 to-pink-100"
          priceColor="text-gold-700"
        />
      );
    case "dranken":
      return (
        <SimpleItemSection
          title={t("sec.drinks.title")}
          subtitle={t("sec.drinks.sub")}
          items={DRANKEN}
          cartType="item"
          headerGradient="from-indigo-50 to-blue-100"
          priceColor="text-gold-700"
        />
      );
    default:
      return null;
  }
}

export default function MenuPage() {
  const router = useRouter();
  const t = useT();
  const zipCode = useStore((s) => s.zipCode);
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("ready");

  useInventorySync();
  const { isCategoryAvailable } = useInventory();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !zipCode) {
      router.replace("/");
    }
  }, [mounted, zipCode, router]);

  useEffect(() => {
    const cat = TAB_CATEGORY[activeTab];
    if (cat && !isCategoryAvailable(cat)) {
      setActiveTab("ready");
    }
  }, [activeTab, isCategoryAvailable]);

  const tabVisible = (id: Tab): boolean => {
    const cat = TAB_CATEGORY[id];
    return cat ? isCategoryAvailable(cat) : true;
  };

  // Visible tabs in display order, used by the swipe gesture + tab-bar scroll.
  const visibleTabs = useMemo(
    () => TABS.filter((tab) => tabVisible(tab.id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isCategoryAvailable],
  );

  const visibleTabsRef = useRef(visibleTabs);
  useEffect(() => {
    visibleTabsRef.current = visibleTabs;
  }, [visibleTabs]);

  const programmaticScrollRef = useRef(false);
  const activeTabRef = useRef<Tab>(activeTab);
  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  useEffect(() => {
    if (visibleTabs.length === 0) return;
    if (!visibleTabs.some((row) => row.id === activeTab)) {
      setActiveTab(visibleTabs[0].id);
    }
  }, [activeTab, visibleTabs]);

  const scrollToSection = useCallback((id: Tab) => {
    if (typeof document === "undefined") return;
    const el = document.getElementById(menuSectionId(id));
    if (!el) return;
    setActiveTab(id);
    programmaticScrollRef.current = true;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => {
      programmaticScrollRef.current = false;
    }, 900);
  }, []);

  const rafScrollSpy = useRef<number | null>(null);
  const updateActiveFromScroll = useCallback(() => {
    if (typeof window === "undefined" || programmaticScrollRef.current) return;
    const tabs = visibleTabsRef.current;
    if (tabs.length === 0) return;
    const y = SECTION_SCROLL_OFFSET_PX;
    let next: Tab = tabs[0].id;
    for (const row of tabs) {
      const el = document.getElementById(menuSectionId(row.id));
      if (!el) continue;
      if (el.getBoundingClientRect().top <= y) {
        next = row.id;
      }
    }
    setActiveTab((prev) => (prev === next ? prev : next));
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const onScrollOrResize = () => {
      if (rafScrollSpy.current != null) cancelAnimationFrame(rafScrollSpy.current);
      rafScrollSpy.current = requestAnimationFrame(() => {
        rafScrollSpy.current = null;
        updateActiveFromScroll();
      });
    };
    updateActiveFromScroll();
    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize, { passive: true });
    return () => {
      if (rafScrollSpy.current != null) cancelAnimationFrame(rafScrollSpy.current);
      window.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [mounted, updateActiveFromScroll, visibleTabs]);

  // Refs per tab so we can programmatically scroll the active pill into view.
  const pillRefs = useRef(new Map<Tab, HTMLButtonElement | null>());
  const setPillRef = (id: Tab) => (el: HTMLButtonElement | null) => {
    pillRefs.current.set(id, el);
  };

  const tabScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = pillRefs.current.get(activeTab);
    if (el) {
      const idx = visibleTabsRef.current.findIndex((row) => row.id === activeTab);
      const n = visibleTabsRef.current.length;
      const inline: ScrollIntoViewOptions["inline"] =
        idx <= 0 ? "start" : idx >= n - 1 ? "end" : "center";
      el.scrollIntoView({ behavior: "smooth", inline, block: "nearest" });
    }
  }, [activeTab]);

  const goToAdjacentSection = useCallback(
    (dir: "prev" | "next") => {
      const tabs = visibleTabsRef.current;
      const act = activeTabRef.current;
      const idx = tabs.findIndex((row) => row.id === act);
      if (idx < 0) return;
      if (dir === "prev" && idx > 0) {
        scrollToSection(tabs[idx - 1].id);
      } else if (dir === "next" && idx < tabs.length - 1) {
        scrollToSection(tabs[idx + 1].id);
      }
    },
    [scrollToSection],
  );

  // Swipe gesture on the content area: left = next tab, right = previous tab.
  const swipeState = useRef<{ x: number; y: number; t: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    swipeState.current = { x: touch.clientX, y: touch.clientY, t: Date.now() };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = swipeState.current;
    swipeState.current = null;
    if (!start) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    const elapsed = Date.now() - start.t;
    // Require a mostly-horizontal, fast-enough gesture before we hijack it,
    // otherwise scrolling within the page stays buttery.
    if (Math.abs(dx) < 60) return;
    if (Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (elapsed > 600) return;
    const idx = visibleTabs.findIndex((t) => t.id === activeTab);
    if (idx === -1) return;
    if (dx < 0 && idx < visibleTabs.length - 1) {
      scrollToSection(visibleTabs[idx + 1].id);
    } else if (dx > 0 && idx > 0) {
      scrollToSection(visibleTabs[idx - 1].id);
    }
  };

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream-100 pb-28 md:pb-0">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-sage-200 border-t-sage-500" />
      </div>
    );
  }

  const curNavIdx = visibleTabs.findIndex((r) => r.id === activeTab);

  return (
    <div className="min-h-screen bg-cream-100">
      <Header />
      <div className="mx-auto max-w-6xl px-4 pt-2 sm:px-6 sm:pt-3">
        <CafeClosedNotice />
      </div>

      <div className="sticky top-16 z-40 border-b border-ink-200/60 bg-white/85 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          {/*
            Full-width gold scrubber: maps the whole bar to every category (dessert, drinks, …) so
            you are not limited to the horizontally scrollable pill row. Pills are still tappable.
          */}
          <div
            ref={tabScrollRef}
            className="overflow-x-auto scroll-smooth pt-2.5 pb-0 scrollbar-hide snap-x snap-mandatory touch-pan-x [-webkit-overflow-scrolling:touch]"
          >
            <div className="flex w-max gap-2 pr-0">
              {visibleTabs.map((tab) => (
                <TabPill
                  key={tab.id}
                  tab={tab}
                  active={activeTab === tab.id}
                  onClick={() => scrollToSection(tab.id)}
                  pillRef={setPillRef(tab.id)}
                />
              ))}
            </div>
          </div>
          <MenuCategoryScrubber
            tabCount={visibleTabs.length}
            activeIndex={curNavIdx}
            programmaticScrollRef={programmaticScrollRef}
            onSelectIndex={(i) => {
              const row = visibleTabs[i];
              if (row) scrollToSection(row.id);
            }}
            onStep={goToAdjacentSection}
          />
        </div>
      </div>

      <main
        className="mx-auto max-w-6xl touch-pan-y overflow-x-clip px-4 py-8 pb-28 sm:px-6 md:pb-0"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {visibleTabs.map((tab) => (
          <section
            key={tab.id}
            id={menuSectionId(tab.id)}
            className="scroll-mt-32 pb-10 last:pb-4"
            tabIndex={-1}
            aria-label={tab.label}
          >
            <MenuSectionBody id={tab.id} t={t} />
          </section>
        ))}
      </main>
    </div>
  );
}
