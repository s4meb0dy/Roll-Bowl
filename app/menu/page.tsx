"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Utensils, Sandwich, Wand2, Droplets, FlaskConical, Salad, Package, Cookie, GlassWater } from "lucide-react";
import Header from "@/components/Header";
import BowlBuilder from "@/components/BowlBuilder";
import ReadyMadeBowls from "@/components/ReadyMadeBowls";
import BurritoSuggestions from "@/components/BurritoSuggestions";
import BurritoBuilder from "@/components/BurritoBuilder";
import SmoothieSuggestions from "@/components/SmoothieSuggestions";
import SmoothieBuilder from "@/components/SmoothieBuilder";
import SimpleItemSection from "@/components/SimpleItemSection";
import { SMOOTHIE_BOWLS, EXTRAS, DESSERTEN, DRANKEN } from "@/lib/menu";
import { useStore } from "@/lib/store/useStore";
import { useT } from "@/lib/i18n";
import UpsellPanel from "@/components/UpsellPanel";

type Tab =
  | "ready" | "build"
  | "burritos" | "burrito-build"
  | "smoothies" | "smoothie-build"
  | "smoothie-bowls" | "extras" | "desserten" | "dranken";

export default function MenuPage() {
  const router = useRouter();
  const t = useT();
  const zipCode = useStore((s) => s.zipCode);
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("ready");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !zipCode) {
      router.replace("/");
    }
  }, [mounted, zipCode, router]);

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-sage-200 border-t-sage-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream">
      <Header />
      <UpsellPanel />

      {/* Tab bar — scrollable on narrow screens */}
      <div className="sticky top-16 z-40 border-b border-neutral-100 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="flex gap-1 overflow-x-auto py-2 scrollbar-hide">
            <button
              onClick={() => setActiveTab("ready")}
              className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                activeTab === "ready"
                  ? "bg-sage-500 text-white shadow-sm"
                  : "text-neutral-500 hover:bg-neutral-100"
              }`}
            >
              <Utensils size={15} />
              Poké bowls suggesties
            </button>
            <button
              onClick={() => setActiveTab("build")}
              className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                activeTab === "build"
                  ? "bg-sage-500 text-white shadow-sm"
                  : "text-neutral-500 hover:bg-neutral-100"
              }`}
            >
              <Sparkles size={15} />
              Stel je poké bowl samen
            </button>
            <button
              onClick={() => setActiveTab("burritos")}
              className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                activeTab === "burritos"
                  ? "bg-sage-500 text-white shadow-sm"
                  : "text-neutral-500 hover:bg-neutral-100"
              }`}
            >
              <Sandwich size={15} />
              Poké burrito&apos;s suggesties
            </button>
            <button
              onClick={() => setActiveTab("burrito-build")}
              className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                activeTab === "burrito-build"
                  ? "bg-sage-500 text-white shadow-sm"
                  : "text-neutral-500 hover:bg-neutral-100"
              }`}
            >
              <Wand2 size={15} />
              Stel je poké burrito samen
            </button>
            <button
              onClick={() => setActiveTab("smoothies")}
              className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                activeTab === "smoothies"
                  ? "bg-sage-500 text-white shadow-sm"
                  : "text-neutral-500 hover:bg-neutral-100"
              }`}
            >
              <Droplets size={15} />
              Smoothies suggesties
            </button>
            <button
              onClick={() => setActiveTab("smoothie-build")}
              className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                activeTab === "smoothie-build"
                  ? "bg-sage-500 text-white shadow-sm"
                  : "text-neutral-500 hover:bg-neutral-100"
              }`}
            >
              <FlaskConical size={15} />
              Stel je eigen smoothie samen
            </button>
            <button
              onClick={() => setActiveTab("smoothie-bowls")}
              className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                activeTab === "smoothie-bowls"
                  ? "bg-sage-500 text-white shadow-sm"
                  : "text-neutral-500 hover:bg-neutral-100"
              }`}
            >
              <Salad size={15} />
              Smoothie bowls
            </button>
            <button
              onClick={() => setActiveTab("extras")}
              className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                activeTab === "extras"
                  ? "bg-sage-500 text-white shadow-sm"
                  : "text-neutral-500 hover:bg-neutral-100"
              }`}
            >
              <Package size={15} />
              Extra&apos;s
            </button>
            <button
              onClick={() => setActiveTab("desserten")}
              className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                activeTab === "desserten"
                  ? "bg-sage-500 text-white shadow-sm"
                  : "text-neutral-500 hover:bg-neutral-100"
              }`}
            >
              <Cookie size={15} />
              Desserten
            </button>
            <button
              onClick={() => setActiveTab("dranken")}
              className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                activeTab === "dranken"
                  ? "bg-sage-500 text-white shadow-sm"
                  : "text-neutral-500 hover:bg-neutral-100"
              }`}
            >
              <GlassWater size={15} />
              Dranken
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        {activeTab === "ready" ? (
          <ReadyMadeBowls />
        ) : activeTab === "build" ? (
          <BowlBuilder />
        ) : activeTab === "burritos" ? (
          <BurritoSuggestions />
        ) : activeTab === "burrito-build" ? (
          <BurritoBuilder />
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
            priceColor="text-violet-700"
          />
        ) : activeTab === "extras" ? (
          <SimpleItemSection
            title={t("sec.extras.title")}
            subtitle={t("sec.extras.sub")}
            items={EXTRAS}
            cartType="item"
            headerGradient="from-amber-50 to-orange-100"
            priceColor="text-amber-700"
          />
        ) : activeTab === "desserten" ? (
          <SimpleItemSection
            title={t("sec.desserts.title")}
            subtitle={t("sec.desserts.sub")}
            items={DESSERTEN}
            cartType="item"
            headerGradient="from-rose-50 to-pink-100"
            priceColor="text-rose-700"
          />
        ) : (
          <SimpleItemSection
            title={t("sec.drinks.title")}
            subtitle={t("sec.drinks.sub")}
            items={DRANKEN}
            cartType="item"
            headerGradient="from-indigo-50 to-blue-100"
            priceColor="text-indigo-700"
          />
        )}
      </main>
    </div>
  );
}
