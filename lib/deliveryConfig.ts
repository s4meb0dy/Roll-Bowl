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
  0: [{ openHour: 16, openMinute: 0, closeHour: 22, closeMinute: 0 }], // Sunday
  1: [{ openHour: 16, openMinute: 0, closeHour: 22, closeMinute: 0 }], // Monday
  2: [
    { openHour: 11, openMinute: 0, closeHour: 13, closeMinute: 15 },
    { openHour: 16, openMinute: 0, closeHour: 22, closeMinute: 0 },
  ], // Tuesday
  3: [
    { openHour: 11, openMinute: 0, closeHour: 13, closeMinute: 15 },
    { openHour: 16, openMinute: 0, closeHour: 22, closeMinute: 0 },
  ], // Wednesday
  4: [
    { openHour: 11, openMinute: 0, closeHour: 13, closeMinute: 15 },
    { openHour: 16, openMinute: 0, closeHour: 22, closeMinute: 0 },
  ], // Thursday
  5: [
    { openHour: 11, openMinute: 0, closeHour: 14, closeMinute: 15 },
    { openHour: 16, openMinute: 0, closeHour: 22, closeMinute: 0 },
  ], // Friday
  6: [{ openHour: 16, openMinute: 0, closeHour: 22, closeMinute: 0 }], // Saturday
};

/** Time-slot granularity when scheduling for later. */
export const SLOT_INTERVAL_MINUTES = 15;

/** Minimum minutes between "now" and the first selectable slot. */
export const PREP_LEAD_MINUTES = 30;

/** Kitchen operates in Belgium — slot windows use this IANA zone. */
export const STORE_TIMEZONE = "Europe/Brussels";

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

/** Calendar date `YYYY-MM-DD` for an instant in the store timezone. */
export function dateKeyInTimeZone(
  instant: Date,
  timeZone: string = STORE_TIMEZONE
): string {
  return instant.toLocaleDateString("en-CA", { timeZone });
}

function weekdayInTimeZone(
  instant: Date,
  timeZone: string = STORE_TIMEZONE
): number {
  const short = instant.toLocaleDateString("en-US", {
    timeZone,
    weekday: "short",
  });
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[short] ?? instant.getDay();
}

/**
 * UTC instant for a wall-clock moment on `dateKey` (`YYYY-MM-DD`) in the store
 * timezone. Iteratively corrects so DST transitions stay accurate.
 */
export function wallClockToDate(
  dateKey: string,
  hour: number,
  minute: number,
  timeZone: string = STORE_TIMEZONE
): Date {
  const pad = (n: number) => String(n).padStart(2, "0");
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  let utc = new Date(`${dateKey}T${pad(hour)}:${pad(minute)}:00Z`);
  for (let i = 0; i < 4; i++) {
    const parts = formatter.formatToParts(utc);
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "0";
    const gotKey = `${get("year")}-${get("month")}-${get("day")}`;
    const gotMinutes = Number(get("hour")) * 60 + Number(get("minute"));
    const wantMinutes = hour * 60 + minute;
    let deltaMinutes = wantMinutes - gotMinutes;
    if (gotKey < dateKey) deltaMinutes += 24 * 60;
    if (gotKey > dateKey) deltaMinutes -= 24 * 60;
    if (deltaMinutes === 0 && gotKey === dateKey) break;
    utc = new Date(utc.getTime() + deltaMinutes * 60_000);
  }
  return utc;
}

function closeInstantForWindow(
  dateKey: string,
  hrs: OpenInterval,
  timeZone: string = STORE_TIMEZONE
): Date {
  if (hrs.closeHour >= 24) {
    return wallClockToDate(dateKey, 23, 59, timeZone);
  }
  return wallClockToDate(dateKey, hrs.closeHour, hrs.closeMinute, timeZone);
}

function openInstantForWindow(
  dateKey: string,
  hrs: OpenInterval,
  timeZone: string = STORE_TIMEZONE
): Date {
  return wallClockToDate(dateKey, hrs.openHour, hrs.openMinute, timeZone);
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
  const todayKey = dateKeyInTimeZone(now);

  const earliest = roundUpToInterval(
    new Date(now.getTime() + PREP_LEAD_MINUTES * 60_000),
    interval,
  );

  for (let dayOffset = 0; dayOffset <= maxDays; dayOffset++) {
    if (dayOffset > 0) continue;

    const weekday = weekdayInTimeZone(now);
    const dayWindows = OPENING_HOURS[weekday];
    if (!dayWindows || dayWindows.length === 0) continue;

    for (const hrs of dayWindows) {
      const open = openInstantForWindow(todayKey, hrs);
      const close = closeInstantForWindow(todayKey, hrs);

      let slot = roundUpToInterval(
        new Date(Math.max(open.getTime(), earliest.getTime())),
        interval,
      );

      while (slot.getTime() <= close.getTime()) {
        if (dateKeyInTimeZone(slot) !== todayKey) {
          slot = new Date(slot.getTime() + interval * 60_000);
          continue;
        }
        result.push({
          value: slot.toISOString(),
          hour: Number(
            slot.toLocaleString("en-GB", {
              timeZone: STORE_TIMEZONE,
              hour: "2-digit",
              hour12: false,
            })
          ),
          minute: Number(
            slot.toLocaleString("en-GB", {
              timeZone: STORE_TIMEZONE,
              minute: "2-digit",
            })
          ),
          dayOffset: 0,
          date: new Date(slot),
        });
        slot = new Date(slot.getTime() + interval * 60_000);
      }
    }
  }

  return result;
}

/** Reject scheduled orders outside today's allowed slot list (same-day only). */
export function validateScheduledFulfillment(
  scheduledFor: string,
  now: Date = new Date()
): { ok: true } | { ok: false; reason: string } {
  if (!scheduledFor?.trim() || Number.isNaN(Date.parse(scheduledFor))) {
    return { ok: false, reason: "invalid_scheduled_time" };
  }

  const scheduled = new Date(scheduledFor);
  const todayKey = dateKeyInTimeZone(now);
  if (dateKeyInTimeZone(scheduled) !== todayKey) {
    return { ok: false, reason: "scheduled_not_same_day" };
  }

  const allowed = getAvailableTimeSlots(now, MAX_SCHEDULE_DAYS);
  if (!allowed.some((slot) => slot.value === scheduledFor)) {
    return { ok: false, reason: "scheduled_slot_not_allowed" };
  }

  return { ok: true };
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

/** Format kitchen close time for display (e.g. 22:00). */
export function formatClosingTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/** Last closing time today (final shift), or null if the kitchen is closed all day. */
export function getTodayLastClose(
  now: Date = new Date()
): { hour: number; minute: number } | null {
  const windows = OPENING_HOURS[now.getDay()];
  if (!windows?.length) return null;
  const last = windows[windows.length - 1];
  return { hour: last.closeHour, minute: last.closeMinute };
}
