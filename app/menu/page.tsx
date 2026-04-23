"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import UpsellPanel from "@/components/UpsellPanel";
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
  { id: "signature-rolls",       icon: Fish,         label: "Signature rolls" },
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
      onClick={onClick}
      aria-pressed={active}
      className={`relative flex shrink-0 items-center gap-2 rounded-xl2 px-4 h-11 text-sm font-semibold transition-all ${
        active
          ? "bg-white text-ink-900 shadow-soft ring-1 ring-gold-200/60"
          : "text-ink-500 hover:bg-ink-100 hover:text-ink-800"
      }`}
    >
      <Icon size={15} className={active ? "text-gold-600" : ""} />
      <span className="sm:hidden">{tab.shortLabel ?? tab.label}</span>
      <span className="hidden sm:inline">{tab.label}</span>
      {active && (
        <span className="absolute inset-x-3 -bottom-[9px] h-0.5 rounded-full bg-gradient-to-r from-gold-400 to-gold-600 motion-safe:animate-slide-in-left" />
      )}
    </button>
  );
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

  // Refs per tab so we can programmatically scroll the active pill into view.
  const pillRefs = useRef(new Map<Tab, HTMLButtonElement | null>());
  const setPillRef = (id: Tab) => (el: HTMLButtonElement | null) => {
    pillRefs.current.set(id, el);
  };

  useEffect(() => {
    const el = pillRefs.current.get(activeTab);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, [activeTab]);

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
      setActiveTab(visibleTabs[idx + 1].id);
    } else if (dx > 0 && idx > 0) {
      setActiveTab(visibleTabs[idx - 1].id);
    }
  };

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-sage-200 border-t-sage-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream-100 pb-28 md:pb-0">
      <Header />
      <UpsellPanel />

      <div className="sticky top-16 z-40 border-b border-ink-200/60 bg-white/85 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex gap-2 overflow-x-auto py-2.5 scrollbar-hide">
            {visibleTabs.map((tab) => (
              <TabPill
                key={tab.id}
                tab={tab}
                active={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                pillRef={setPillRef(tab.id)}
              />
            ))}
          </div>
        </div>
      </div>

      <main
        className="mx-auto max-w-6xl px-4 py-8 sm:px-6 touch-pan-y"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div key={activeTab} className="motion-safe:animate-step-fade">
          {activeTab === "ready" ? (
            <ReadyMadeBowls />
          ) : activeTab === "build" ? (
            <BowlBuilder />
          ) : activeTab === "burritos" ? (
            <BurritoSuggestions />
          ) : activeTab === "burrito-build" ? (
            <BurritoBuilder />
          ) : activeTab === "signature-rolls" ? (
            <SimpleItemSection
              title={t("sec.rolls.title")}
              subtitle={t("sec.rolls.sub")}
              items={SIGNATURE_ROLLS}
              cartType="item"
              headerGradient="from-rose-50 to-orange-100"
              priceColor="text-gold-700"
            />
          ) : activeTab === "classic-roll-build" ? (
            <ClassicRollBuilder />
          ) : activeTab === "inside-out-roll-build" ? (
            <InsideOutRollBuilder />
          ) : activeTab === "smoothies" ? (
            <SmoothieSuggestions />
          ) : activeTab === "smoothie-build" ? (
            <SmoothieBuilder />
          ) : activeTab === "smoothie-bowls" ? (
            <SimpleItemSection
              title={t("sec.smoothie_bowls.title")}
              subtitle={t("sec.smoothie_bowls.sub")}
              items={SMOOTHIE_BOWLS}
              cartType="item"
              headerGradient="from-violet-50 to-purple-100"
              priceColor="text-gold-700"
            />
          ) : activeTab === "extras" ? (
            <SimpleItemSection
              title={t("sec.extras.title")}
              subtitle={t("sec.extras.sub")}
              items={EXTRAS}
              cartType="item"
              headerGradient="from-amber-50 to-orange-100"
              priceColor="text-gold-700"
            />
          ) : activeTab === "desserten" ? (
            <SimpleItemSection
              title={t("sec.desserts.title")}
              subtitle={t("sec.desserts.sub")}
              items={DESSERTEN}
              cartType="item"
              headerGradient="from-rose-50 to-pink-100"
              priceColor="text-gold-700"
            />
          ) : (
            <SimpleItemSection
              title={t("sec.drinks.title")}
              subtitle={t("sec.drinks.sub")}
              items={DRANKEN}
              cartType="item"
              headerGradient="from-indigo-50 to-blue-100"
              priceColor="text-gold-700"
            />
          )}
        </div>
      </main>
    </div>
  );
}
