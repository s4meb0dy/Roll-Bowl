import zipCodesData from "./zipCodes.json";
import type { ZipCodeConfig } from "./types";

/** All supported postcodes for delivery, keyed by postal code. */
export const ZIP_CODES = zipCodesData as Record<string, ZipCodeConfig>;

/**
 * Takeaway / pickup orders have no delivery fee and no geographic
 * minimum. We still apply a tiny sanity floor (€0 by default).
 */
export const TAKEAWAY_MIN_ORDER = 0;
export const TAKEAWAY_DELIVERY_FEE = 0;

/** One continuous window when the kitchen accepts orders (local time). */
export type OpenInterval = {
  openHour: number;
  openMinute: number;
  closeHour: number;
  closeMinute: number;
};

/**
 * Restaurant kitchen hours (local time). Multiple entries = split shifts the same day.
 * Keys: JS `Date.getDay()`: 0 = Sunday … 6 = Saturday. `null` = closed.
 */
export const OPENING_HOURS: Record<number, OpenInterval[] | null> = {
  0: [{ openHour: 16, openMinute: 0, closeHour: 21, closeMinute: 0 }], // Sunday
  1: [{ openHour: 16, openMinute: 0, closeHour: 21, closeMinute: 0 }], // Monday
  2: [
    { openHour: 11, openMinute: 0, closeHour: 13, closeMinute: 15 },
    { openHour: 16, openMinute: 0, closeHour: 21, closeMinute: 0 },
  ], // Tuesday
  3: [
    { openHour: 11, openMinute: 0, closeHour: 13, closeMinute: 15 },
    { openHour: 16, openMinute: 0, closeHour: 21, closeMinute: 0 },
  ], // Wednesday
  4: [
    { openHour: 11, openMinute: 0, closeHour: 13, closeMinute: 15 },
    { openHour: 16, openMinute: 0, closeHour: 21, closeMinute: 0 },
  ], // Thursday
  5: [
    { openHour: 11, openMinute: 0, closeHour: 14, closeMinute: 15 },
    { openHour: 16, openMinute: 0, closeHour: 21, closeMinute: 0 },
  ], // Friday
  6: [{ openHour: 16, openMinute: 0, closeHour: 21, closeMinute: 0 }], // Saturday
};

/** Time-slot granularity when scheduling for later. */
export const SLOT_INTERVAL_MINUTES = 15;

/** Minimum minutes between "now" and the first selectable slot. */
export const PREP_LEAD_MINUTES = 30;

/**
 * Maximum days ahead a customer may schedule an order.
 *
 * `0` = same-day only (no scheduling for tomorrow / day-after). The kitchen
 * prefers to handle each day's mise en place fresh, so we don't take orders
 * for future days from the storefront.
 */
export const MAX_SCHEDULE_DAYS = 0;

export interface TimeSlot {
  /** ISO datetime of the slot. */
  value: string;
  /** Local hour (0-23) of the slot. */
  hour: number;
  /** Local minute (0-59) of the slot. */
  minute: number;
  /** Offset in whole days from `now` (0 = today, 1 = tomorrow, …). */
  dayOffset: number;
  /** Raw local Date object for display formatting. */
  date: Date;
}

function roundUpToInterval(date: Date, intervalMinutes: number): Date {
  const d = new Date(date);
  d.setSeconds(0, 0);
  const mins = d.getMinutes();
  const rem = mins % intervalMinutes;
  if (rem !== 0) d.setMinutes(mins + (intervalMinutes - rem));
  return d;
}

/**
 * Returns the list of schedulable time-slots starting at least `PREP_LEAD_MINUTES`
 * from `now`, aligned to `SLOT_INTERVAL_MINUTES` and clamped to the kitchen's
 * opening hours, for up to `maxDays` days ahead.
 */
export function getAvailableTimeSlots(
  now: Date = new Date(),
  maxDays: number = MAX_SCHEDULE_DAYS,
): TimeSlot[] {
  const interval = SLOT_INTERVAL_MINUTES;
  const result: TimeSlot[] = [];

  // Earliest slot we can accept, rounded up to the next interval tick.
  const earliest = roundUpToInterval(
    new Date(now.getTime() + PREP_LEAD_MINUTES * 60_000),
    interval,
  );

  for (let dayOffset = 0; dayOffset <= maxDays; dayOffset++) {
    const date = new Date(now);
    date.setDate(date.getDate() + dayOffset);
    const dayWindows = OPENING_HOURS[date.getDay()];
    if (!dayWindows || dayWindows.length === 0) continue;

    for (const hrs of dayWindows) {
      const open = new Date(date);
      open.setHours(hrs.openHour, hrs.openMinute, 0, 0);
      const close = new Date(date);
      close.setHours(hrs.closeHour, hrs.closeMinute, 0, 0);

      let slot = roundUpToInterval(
        new Date(Math.max(open.getTime(), earliest.getTime())),
        interval,
      );

      while (slot.getTime() <= close.getTime()) {
        result.push({
          value: slot.toISOString(),
          hour: slot.getHours(),
          minute: slot.getMinutes(),
          dayOffset,
          date: new Date(slot),
        });
        slot = new Date(slot.getTime() + interval * 60_000);
      }
    }
  }

  return result;
}

/** `true` when the kitchen is currently accepting orders. */
export function isOpenNow(now: Date = new Date()): boolean {
  const windows = OPENING_HOURS[now.getDay()];
  if (!windows || windows.length === 0) return false;
  for (const hrs of windows) {
    const open = new Date(now);
    open.setHours(hrs.openHour, hrs.openMinute, 0, 0);
    const close = new Date(now);
    close.setHours(hrs.closeHour, hrs.closeMinute, 0, 0);
    if (now.getTime() >= open.getTime() && now.getTime() <= close.getTime()) {
      return true;
    }
  }
  return false;
}
