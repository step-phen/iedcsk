/**
 * Philippine Time (UTC+8) utilities.
 *
 * WHY THIS FILE EXISTS:
 * - Postgres stores all timestamp values in UTC (see lib/db.ts, which parses
 *   them back as UTC rather than server-local time).
 * - JS `Date` objects are just UTC timestamps internally — `new Date()`,
 *   `.getDate()`, `.getDay()`, etc. use the SERVER's local timezone (which on
 *   most hosting platforms is UTC), not Philippine time.
 * - That mismatch causes bugs like: "today" boundaries being off by a day,
 *   or the wrong weekday showing in the UI, whenever it's between
 *   12:00 AM–7:59 AM in Manila (still "yesterday" in UTC).
 *
 * RULE: Anywhere in the codebase that needs "what is today/now in the
 * Philippines," use these helpers instead of `new Date()` + manual math.
 */

const PH_OFFSET_MS = 8 * 60 * 60 * 1000; // UTC+8, no DST in PH

/**
 * Returns a Date object representing the current moment, shifted so that
 * reading its UTC getters (getUTCFullYear, getUTCMonth, getUTCDate,
 * getUTCDay, getUTCHours, ...) gives you Philippine wall-clock values.
 *
 * Do NOT use the non-UTC getters (getFullYear, getDay, etc.) on the result —
 * always use the getUTC* variants, since this Date's underlying timestamp
 * has been deliberately shifted.
 */
export function nowInPH(): Date {
  return new Date(Date.now() + PH_OFFSET_MS);
}

/**
 * Today's calendar date in Philippine time, as a UTC-midnight Date safe to
 * write directly into a DATE column (e.g. classroom_sessions.session_date).
 * Building it from nowInPH()'s UTC getters — rather than `new Date()` or
 * getTodayRangePH().todayStart — matters: todayStart is a real UTC instant
 * (8h behind PH midnight), so its own UTC calendar date is still "yesterday"
 * for roughly the first 8 hours of each PH day.
 */
export function todayDatePH(): Date {
  const ph = nowInPH();
  return new Date(Date.UTC(ph.getUTCFullYear(), ph.getUTCMonth(), ph.getUTCDate()));
}

/**
 * The current day of week in Philippine time, as a string, matching
 * whatever casing convention your `scheduleDays.day` values use in the DB
 * (adjust the array below if your schema stores e.g. "Mon" or lowercase).
 */
export function currentWeekdayPH(): string {
  const WEEKDAYS = [
    "SUNDAY",
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
  ];
  return WEEKDAYS[nowInPH().getUTCDay()];
}

/**
 * Returns [todayStart, todayEnd) as real UTC Date objects — safe to pass
 * directly as `>=` / `<` query parameters — representing midnight to midnight
 * in Philippine time.
 *
 * Example:
 *   const { todayStart, todayEnd } = getTodayRangePH();
 *   await activityScoreService.listCompletedBetweenForTeacher(
 *     teacherId, todayStart, todayEnd
 *   );
 */
export function getTodayRangePH(): { todayStart: Date; todayEnd: Date } {
  const phNow = nowInPH();
  const y = phNow.getUTCFullYear();
  const m = phNow.getUTCMonth();
  const d = phNow.getUTCDate();

  const todayStart = new Date(Date.UTC(y, m, d, 0, 0, 0, 0) - PH_OFFSET_MS);
  const todayEnd = new Date(Date.UTC(y, m, d + 1, 0, 0, 0, 0) - PH_OFFSET_MS);

  return { todayStart, todayEnd };
}

/**
 * Same idea as getTodayRangePH, but for an arbitrary date (e.g. if you ever
 * need "yesterday in PH" or a specific historical day's range).
 */
export function getDayRangePH(date: Date): { dayStart: Date; dayEnd: Date } {
  const shifted = new Date(date.getTime() + PH_OFFSET_MS);
  const y = shifted.getUTCFullYear();
  const m = shifted.getUTCMonth();
  const d = shifted.getUTCDate();

  const dayStart = new Date(Date.UTC(y, m, d, 0, 0, 0, 0) - PH_OFFSET_MS);
  const dayEnd = new Date(Date.UTC(y, m, d + 1, 0, 0, 0, 0) - PH_OFFSET_MS);

  return { dayStart, dayEnd };
}

/**
 * True when `referenceDate` falls inside the first 7 days (Week 1) of a
 * schedule that begins on `startDate`, i.e. day 0 through day 6 inclusive.
 *
 * Both arguments are expected to be UTC-midnight calendar dates — which is
 * exactly what a Postgres DATE column returns (lib/db.ts parses OID 1082 that
 * way) and what todayDatePH() produces — so the difference is always a whole
 * number of days and no
 * timezone drift creeps in.
 */
export function isWithinWeekOne(startDate: Date, referenceDate: Date): boolean {
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const daysElapsed = Math.floor((referenceDate.getTime() - startDate.getTime()) / ONE_DAY_MS);
  return daysElapsed >= 0 && daysElapsed < 7;
}

/**
 * Which week of a schedule `referenceDate` falls in, counting from 1 — the
 * general form of isWithinWeekOne (which is this returning 1).
 *
 * Same UTC-midnight expectation as above. Returns 0 or negative for dates
 * before the schedule starts, so callers decide how to clamp.
 */
export function weekNumberFrom(startDate: Date, referenceDate: Date): number {
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const daysElapsed = Math.floor((referenceDate.getTime() - startDate.getTime()) / ONE_DAY_MS);
  return Math.floor(daysElapsed / 7) + 1;
}

/**
 * Formats a UTC-stored Date for display in Philippine time, using the
 * built-in Intl timezone conversion (this one's safe to use directly,
 * since Intl handles the offset for you).
 */
export function formatDatePH(
  date: Date,
  options: Intl.DateTimeFormatOptions = { month: "long", day: "numeric", year: "numeric" }
): string {
  return new Intl.DateTimeFormat("en-US", { ...options, timeZone: "Asia/Manila" }).format(date);
}

/**
 * Full weekday name (e.g. "Saturday") for an arbitrary UTC-stored Date, in
 * Philippine time. Unlike currentWeekdayPH() (which is only for "now" and
 * returns the DB's UPPERCASE day-of-week label), this is for displaying the
 * weekday of any past timestamp — e.g. an attendance record's session start.
 */
export function formatWeekdayPH(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    timeZone: "Asia/Manila",
  }).format(date);
}

/**
 * Formats the time of day in Philippine time as h:mm with AM/PM — e.g.
 * "2:07 PM". Like formatDatePH, Intl handles the offset, so this one is
 * safe to call directly (including from a Client Component).
 */
export function formatTimePH(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Manila",
  }).format(date);
}

/**
 * Formats a UTC-stored Date as PH time (date + time), useful for debug logs
 * or timestamps shown in the UI.
 */
export function formatDateTimePH(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Manila",
  }).format(date);
}