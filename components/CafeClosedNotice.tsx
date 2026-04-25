"use client";

import { useEffect, useState, useMemo } from "react";
import { CalendarClock } from "lucide-react";
import { isOpenNow, getAvailableTimeSlots } from "@/lib/deliveryConfig";
import { useT } from "@/lib/i18n";

/**
 * Shown when the kitchen is currently closed and future time slots still exist
 * (so the customer can order for later).
 */
export default function CafeClosedNotice({ className = "" }: { className?: string }) {
  const t = useT();
  const [nowTick, setNowTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setNowTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const visible = useMemo(() => {
    const now = new Date();
    if (isOpenNow(now)) return false;
    return getAvailableTimeSlots(now).length > 0;
  }, [nowTick]);

  if (!visible) return null;

  return (
    <div
      className={`flex gap-2.5 rounded-xl2 border border-amber-200/90 bg-amber-50 px-3.5 py-2.5 text-sm leading-snug text-amber-950 shadow-sm ${className}`.trim()}
    >
      <CalendarClock className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-700" />
      <p>{t("time.closed_banner")}</p>
    </div>
  );
}
