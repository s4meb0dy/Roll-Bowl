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

/**
 * Restaurant kitchen opening hours (local time).
 * Keys are JS `Date.getDay()` values: 0 = Sunday … 6 = Saturday.
 * Set a weekday to `null` to mark it as closed.
 */
export const OPENING_HOURS: Record<
  number,
  { openHour: number; openMinute: number; closeHour: number; closeMinute: number } | null
> = {
  0: { openHour: 12, openMinute: 0, closeHour: 22, closeMinute: 0 }, // Sunday
  1: { openHour: 12, openMinute: 0, closeHour: 22, closeMinute: 0 }, // Monday
  2: { openHour: 12, openMinute: 0, closeHour: 22, closeMinute: 0 }, // Tuesday
  3: { openHour: 12, openMinute: 0, closeHour: 22, closeMinute: 0 }, // Wednesday
  4: { openHour: 12, openMinute: 0, closeHour: 22, closeMinute: 0 }, // Thursday
  5: { openHour: 12, openMinute: 0, closeHour: 22, closeMinute: 0 }, // Friday
  6: { openHour: 12, openMinute: 0, closeHour: 22, closeMinute: 0 }, // Saturday
};

/** Time-slot granularity when scheduling for later. */
export const SLOT_INTERVAL_MINUTES = 15;

/** Minimum minutes between "now" and the first selectable slot. */
export const PREP_LEAD_MINUTES = 30;

/** Maximum days ahead a customer may schedule an order. */
export const MAX_SCHEDULE_DAYS = 2;

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
    const hrs = OPENING_HOURS[date.getDay()];
    if (!hrs) continue;

    const open = new Date(date);
    open.setHours(hrs.openHour, hrs.openMinute, 0, 0);
    const close = new Date(date);
    close.setHours(hrs.closeHour, hrs.closeMinute, 0, 0);

    // Day's starting slot: later of earliest-allowed and the day's opening,
    // then aligned up to the next interval.
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

  return result;
}

/** `true` when the kitchen is currently accepting orders. */
export function isOpenNow(now: Date = new Date()): boolean {
  const hrs = OPENING_HOURS[now.getDay()];
  if (!hrs) return false;
  const open = new Date(now);
  open.setHours(hrs.openHour, hrs.openMinute, 0, 0);
  const close = new Date(now);
  close.setHours(hrs.closeHour, hrs.closeMinute, 0, 0);
  return now >= open && now <= close;
}
