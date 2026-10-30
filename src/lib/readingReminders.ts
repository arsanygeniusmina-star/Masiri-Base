import type { ReadingAssignment } from '../types';
import { findBibleBook } from './bible/books';
import { formatBibleReference } from './bible/bibleService';
import { reminderVerseOf } from './readings';

/**
 * Daily reading reminders (in-app + browser notification).
 *
 * Today this shows a system notification when the student opens the app and
 * still has today's reading pending (once per day per device). Real push to a
 * closed app needs a server sender (Supabase Edge Function + Web Push keys),
 * which can be added later without changing this module's callers.
 */

const LAST_REMINDER_KEY = 'masiri.reading-reminder.last';
const ICON = '/masiri-journey-icon.jpg?v=20261010-2';

export type ReminderPermission = 'granted' | 'denied' | 'default' | 'unsupported';

export function reminderPermission(): ReminderPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission as ReminderPermission;
}

/** Must be called from a tap (browsers only show the prompt after a user gesture). */
export async function requestReminderPermission(): Promise<ReminderPermission> {
  if (reminderPermission() === 'unsupported') return 'unsupported';
  try {
    return (await Notification.requestPermission()) as ReminderPermission;
  } catch {
    return reminderPermission();
  }
}

/** «إنجيل يوحنا ٣:١٦» and the verse text for an assignment's reminder verse. */
export function reminderVerseDetails(assignment: ReadingAssignment): { reference: string; text: string } | null {
  const verse = reminderVerseOf(assignment);
  if (!verse) return null;
  const book = findBibleBook(assignment.passage.bookId);
  const reference = book
    ? formatBibleReference(book.name, assignment.passage.chapter, verse.number)
    : assignment.passage.reference;
  return { reference, text: verse.text };
}

function alreadyRemindedToday(today: string): boolean {
  try {
    return window.localStorage.getItem(LAST_REMINDER_KEY) === today;
  } catch {
    return false;
  }
}

function markRemindedToday(today: string) {
  try {
    window.localStorage.setItem(LAST_REMINDER_KEY, today);
  } catch {
    // Storage may be blocked; the worst case is a second reminder.
  }
}

async function serviceWorkerRegistration(timeoutMs = 1500): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  try {
    return await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<null>((resolve) => window.setTimeout(() => resolve(null), timeoutMs)),
    ]);
  } catch {
    return null;
  }
}

/**
 * Shows today's reminder notification once per day, only when permission is
 * granted and today's reading is still pending. Returns true when shown.
 */
export async function showDailyReadingReminder(assignment: ReadingAssignment, today: string): Promise<boolean> {
  if (reminderPermission() !== 'granted' || alreadyRemindedToday(today)) return false;
  const details = reminderVerseDetails(assignment);
  const title = `قراءة اليوم: ${assignment.passage.reference}`;
  const body = details ? `«${details.text}» (${details.reference})` : 'افتح «إصحاح النهارده» واقرأ إصحاح اليوم.';
  const options: NotificationOptions = { body, icon: ICON, badge: ICON, tag: `masiri-reading-${today}`, lang: 'ar', dir: 'rtl' };
  try {
    const registration = await serviceWorkerRegistration();
    if (registration) {
      await registration.showNotification(title, options);
    } else {
      // Desktop browsers without a service worker (e.g. during local development).
      new Notification(title, options);
    }
    markRemindedToday(today);
    return true;
  } catch {
    return false;
  }
}
