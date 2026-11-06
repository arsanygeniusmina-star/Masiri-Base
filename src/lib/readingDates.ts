/**
 * Calendar-date helpers for daily readings.
 *
 * Rules used across the feature:
 *  - A reading is scheduled for a calendar date (YYYY-MM-DD), not an instant.
 *  - "Today" is the viewer's local calendar date (device time zone).
 *  - Completion instants are stored by the database (UTC, timestamptz) and
 *    displayed in the viewer's local time.
 */

export const DEFAULT_MINISTRY_TIME_ZONE = 'Africa/Cairo';

const pad = (value: number) => String(value).padStart(2, '0');

/**
 * LAUNCH NIGHT: the app was sent to everyone on the evening of 30 Oct 2026 and the
 * plan starts on 31 Oct. Reading that evening counts as 31 Oct (the database accepts
 * it because it is within one day of server time); from midnight on this does nothing.
 */
const LAUNCH_EVENING = '2026-10-30';
const LAUNCH_DAY = '2026-10-31';

/** Local calendar date key, e.g. '2026-10-23'. With no argument it means "today". */
export function localDateKey(date?: Date): string {
  const value = date ?? new Date();
  const key = `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
  return date === undefined && key === LAUNCH_EVENING ? LAUNCH_DAY : key;
}

/** Parses 'YYYY-MM-DD' as a local date at noon (avoids DST edge cases). */
export function parseDateKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1, 12, 0, 0, 0);
}

export function addDaysToKey(key: string, days: number): string {
  const date = parseDateKey(key);
  date.setDate(date.getDate() + days);
  return localDateKey(date);
}

export function compareDateKeys(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Reading weeks run Friday → Thursday. Returns the Friday that starts the week
 * containing `key` (mirrors private.reading_week_start in the database).
 */
export function readingWeekStart(key: string): string {
  const day = parseDateKey(key).getDay(); // Sun=0 … Fri=5 … Sat=6
  return addDaysToKey(key, -((day - 5 + 7) % 7));
}

/**
 * First day that can still be restored today: the start of this Friday → Thursday
 * week — except on Friday, which is a grace day for the whole week that just ended
 * (mirrors private.restore_window_start in the database).
 */
export function restoreWindowStart(today: string): string {
  return readingWeekStart(addDaysToKey(today, -1));
}

/** A reading can be completed on its day, or restored later in its week (and on the Friday after it). */
export function canCompleteReadingOn(scheduledDate: string, today: string): boolean {
  return scheduledDate <= today && scheduledDate >= restoreWindowStart(today);
}

/** Last day a missed reading can be restored: the Friday after its week. */
export function restoreDeadline(scheduledDate: string): string {
  return addDaysToKey(readingWeekStart(scheduledDate), 7);
}

export function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_MINISTRY_TIME_ZONE;
  } catch {
    return DEFAULT_MINISTRY_TIME_ZONE;
  }
}

const longDateFormatter = new Intl.DateTimeFormat('ar-EG', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});
const shortDateFormatter = new Intl.DateTimeFormat('ar-EG', { weekday: 'short', day: 'numeric', month: 'short' });
const timeFormatter = new Intl.DateTimeFormat('ar-EG', { hour: 'numeric', minute: '2-digit' });
const dateTimeFormatter = new Intl.DateTimeFormat('ar-EG', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  hour: 'numeric',
  minute: '2-digit',
});

/** 'الجمعة، ٢٣ أكتوبر ٢٠٢٦' */
export function formatLongDate(key: string): string {
  return longDateFormatter.format(parseDateKey(key));
}

/** 'الجمعة ٢٣ أكتوبر' */
export function formatShortDate(key: string): string {
  return shortDateFormatter.format(parseDateKey(key));
}

/** '٦:٤٢ م' in the viewer's local time. */
export function formatLocalTime(iso: string): string {
  return timeFormatter.format(new Date(iso));
}

export function formatLocalDateTime(iso: string): string {
  return dateTimeFormatter.format(new Date(iso));
}

/** 'اليوم' / 'أمس' / 'غدًا' or the short date. */
export function relativeDayLabel(key: string, today: string = localDateKey()): string {
  if (key === today) return 'اليوم';
  if (key === addDaysToKey(today, -1)) return 'أمس';
  if (key === addDaysToKey(today, 1)) return 'غدًا';
  return formatShortDate(key);
}
