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

/** Kitchen operates in Belgium — all slot logic uses this IANA zone. */
export const STORE_TIMEZONE = "Europe/Brussels";

/**
 * Same-day scheduling only — never tomorrow or later.
 * (Hard-coded; the storefront must not expose future-day slots.)
 */
export const MAX_SCHEDULE_DAYS = 0;

export interface TimeSlot {
  /** ISO datetime of the slot. */
  value: string;
  /** Local hour (0-23) of the slot. */
  hour: number;
  /** Local minute (0-59) of the slot. */
  minute: number;
  /** Always 0 — same-day scheduling only. */
  dayOffset: number;
  /** Raw local Date object for display formatting. */
  date: Date;
}

function roundUpUtc(instant: Date, intervalMinutes: number): Date {
  const ms = intervalMinutes * 60_000;
  return new Date(Math.ceil(instant.getTime() / ms) * ms);
}

/** Calendar date `YYYY-MM-DD` for an instant in the store timezone. */
export function dateKeyInTimeZone(
  instant: Date,
  timeZone: string = STORE_TIMEZONE
): string {
  return instant.toLocaleDateString("en-CA", { timeZone });
}

function previousDateKey(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const probe = new Date(Date.UTC(y, m - 1, d));
  probe.setUTCDate(probe.getUTCDate() - 1);
  return probe.toISOString().slice(0, 10);
}

export function weekdayInTimeZone(
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

function brusselsHourMinute(instant: Date): { hour: number; minute: number } {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: STORE_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(instant);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return { hour: get("hour"), minute: get("minute") };
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
 * After the kitchen closes, block scheduling until the next service window
 * opens (prevents "order tomorrow morning" slots right after midnight).
 */
export function isInOvernightBlackout(now: Date = new Date()): boolean {
  const todayKey = dateKeyInTimeZone(now);
  const weekday = weekdayInTimeZone(now);
  const windows = OPENING_HOURS[weekday];
  if (!windows?.length) return true;

  const lastClose = closeInstantForWindow(todayKey, windows[windows.length - 1]);
  if (now.getTime() > lastClose.getTime()) return true;

  const firstOpen = openInstantForWindow(todayKey, windows[0]);
  const earliestOrderTime = new Date(
    firstOpen.getTime() - PREP_LEAD_MINUTES * 60_000
  );
  if (now.getTime() < earliestOrderTime.getTime()) {
    const prevKey = previousDateKey(todayKey);
    const prevWeekday = weekdayInTimeZone(wallClockToDate(prevKey, 12, 0));
    const prevWindows = OPENING_HOURS[prevWeekday];
    if (prevWindows?.length) {
      const prevClose = closeInstantForWindow(
        prevKey,
        prevWindows[prevWindows.length - 1]
      );
      if (now.getTime() > prevClose.getTime()) return true;
    }
  }

  return false;
}

/**
 * Returns schedulable time-slots for **today only** (Europe/Brussels).
 * Never includes tomorrow or later calendar days.
 */
export function getAvailableTimeSlots(
  now: Date = new Date(),
  _maxDays: number = MAX_SCHEDULE_DAYS
): TimeSlot[] {
  void _maxDays;
  const interval = SLOT_INTERVAL_MINUTES;
  const todayKey = dateKeyInTimeZone(now);

  if (isInOvernightBlackout(now)) return [];

  const earliest = roundUpUtc(
    new Date(now.getTime() + PREP_LEAD_MINUTES * 60_000),
    interval
  );

  if (dateKeyInTimeZone(earliest) !== todayKey) return [];

  const weekday = weekdayInTimeZone(now);
  const dayWindows = OPENING_HOURS[weekday];
  if (!dayWindows?.length) return [];

  const result: TimeSlot[] = [];

  for (const hrs of dayWindows) {
    const open = openInstantForWindow(todayKey, hrs);
    const close = closeInstantForWindow(todayKey, hrs);

    let slot = roundUpUtc(
      new Date(Math.max(open.getTime(), earliest.getTime())),
      interval
    );

    while (slot.getTime() <= close.getTime()) {
      if (dateKeyInTimeZone(slot) !== todayKey) break;

      const { hour, minute } = brusselsHourMinute(slot);
      result.push({
        value: slot.toISOString(),
        hour,
        minute,
        dayOffset: 0,
        date: new Date(slot),
      });
      slot = new Date(slot.getTime() + interval * 60_000);
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

  if (isInOvernightBlackout(now)) {
    return { ok: false, reason: "scheduled_overnight_blackout" };
  }

  const allowed = getAvailableTimeSlots(now);
  if (!allowed.some((slot) => slot.value === scheduledFor)) {
    return { ok: false, reason: "scheduled_slot_not_allowed" };
  }

  return { ok: true };
}

/** `true` when the kitchen is currently accepting orders (Brussels local time). */
export function isOpenNow(now: Date = new Date()): boolean {
  const todayKey = dateKeyInTimeZone(now);
  const weekday = weekdayInTimeZone(now);
  const windows = OPENING_HOURS[weekday];
  if (!windows?.length) return false;

  for (const hrs of windows) {
    const open = openInstantForWindow(todayKey, hrs);
    const close = closeInstantForWindow(todayKey, hrs);
    if (now.getTime() >= open.getTime() && now.getTime() <= close.getTime()) {
      return true;
    }
  }
  return false;
}

/** Format kitchen close time for display (e.g. 21:00). */
export function formatClosingTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/** Last closing time today (final shift), or null if the kitchen is closed all day. */
export function getTodayLastClose(
  now: Date = new Date()
): { hour: number; minute: number } | null {
  const windows = OPENING_HOURS[weekdayInTimeZone(now)];
  if (!windows?.length) return null;
  const last = windows[windows.length - 1];
  return { hour: last.closeHour, minute: last.closeMinute };
}
