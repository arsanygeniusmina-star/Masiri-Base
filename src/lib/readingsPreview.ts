import type { ReadingAnswer, ReadingAssignment, ReadingCompletion, ReadingStreak } from '../types';
import { findBibleBook } from './bible/books';
import { fetchBibleChapter, formatBibleReference } from './bible/bibleService';
import { computeReadingStreak, creditedDateOf } from './readings';
import { addDaysToKey } from './readingDates';
import { DEFAULT_PLAN_QUESTION } from './readingPlans';

/**
 * TEMPORARY local test mode for «إصحاح النهارده» — used until the reading migrations are
 * applied in Supabase.
 *
 * Every signed-in student gets «إنجيل متى ٦» as today's reading. Answers, the
 * proof photo (as a small thumbnail) and completions are stored ONLY in this
 * browser's localStorage, so the full flow (answer → camera photo → تمت القراءة →
 * Streak) can be tried end to end. Nothing is sent to the database.
 *
 * ➜ To switch it off after linking the database: set READINGS_PREVIEW_MODE = false.
 */
export const READINGS_PREVIEW_MODE = false;

const PREVIEW_BOOK_ID = 'matt';
const PREVIEW_CHAPTER = 6;
const PREVIEW_REMINDER_VERSE = 33;

type PreviewStore = {
  /** First day the student opened test mode; one reading exists for every day since. */
  startDate?: string;
  completions: ReadingCompletion[];
  answers: ReadingAnswer[];
  photos: Record<string, string>;
};

const storeKey = (userId: string) => `masiri.readings-preview.v1.${userId}`;

function readStore(userId: string): PreviewStore {
  try {
    const raw = window.localStorage.getItem(storeKey(userId));
    if (raw) {
      const parsed = JSON.parse(raw) as PreviewStore;
      return { startDate: parsed.startDate, completions: parsed.completions ?? [], answers: parsed.answers ?? [], photos: parsed.photos ?? {} };
    }
  } catch {
    // Storage blocked or corrupted: start fresh.
  }
  return { completions: [], answers: [], photos: {} };
}

function writeStore(userId: string, store: PreviewStore) {
  try {
    window.localStorage.setItem(storeKey(userId), JSON.stringify(store));
  } catch {
    // Most likely full: drop old photos and retry once without them.
    try {
      window.localStorage.setItem(storeKey(userId), JSON.stringify({ ...store, photos: {} }));
    } catch {
      // Give up silently; the in-memory screen state still works.
    }
  }
}

/** A fresh Matthew 6 reading for each day, so the Streak can be tested day after day. */
export const previewAssignmentId = (today: string) => `preview-matt-6-${today}`;

export async function loadPreviewReadings(userId: string, today: string): Promise<{
  assignments: ReadingAssignment[];
  completions: ReadingCompletion[];
  answers: ReadingAnswer[];
  streak: ReadingStreak;
}> {
  const book = findBibleBook(PREVIEW_BOOK_ID);
  if (!book) throw new Error('Preview book missing');
  const verses = await fetchBibleChapter(book, PREVIEW_CHAPTER);
  const base: ReadingAssignment = {
    id: previewAssignmentId(today),
    createdBy: null,
    creatorName: 'وضع التجربة',
    title: 'قراءة تجريبية',
    targetType: 'all',
    recipientIds: [],
    scheduledDate: today,
    timezone: 'Africa/Cairo',
    questionText: DEFAULT_PLAN_QUESTION,
    reminderVerse: PREVIEW_REMINDER_VERSE,
    status: 'published',
    createdAt: new Date().toISOString(),
    passage: {
      id: `preview-passage-${today}`,
      bookId: book.id,
      chapter: PREVIEW_CHAPTER,
      verseStart: verses[0].number,
      verseEnd: verses[verses.length - 1].number,
      reference: formatBibleReference(book.name, PREVIEW_CHAPTER),
      verses,
    },
  };
  const store = readStore(userId);
  if (!store.startDate || store.startDate > today) {
    store.startDate = today;
    writeStore(userId, store);
  }
  // One Matthew 6 reading for every day since test mode started (max 60 days),
  // so missed days and the weekly Restore can be tried for real.
  const assignments: ReadingAssignment[] = [];
  for (let day = today, count = 0; day >= store.startDate && count < 60; day = addDaysToKey(day, -1), count += 1) {
    assignments.push({ ...base, id: previewAssignmentId(day), scheduledDate: day, passage: { ...base.passage, id: `preview-passage-${day}` } });
  }
  return {
    assignments,
    completions: store.completions,
    answers: store.answers,
    streak: computeReadingStreak(userId, store.completions.map(creditedDateOf), today),
  };
}

export function savePreviewAnswer(userId: string, answer: ReadingAnswer) {
  const store = readStore(userId);
  store.answers = [answer, ...store.answers.filter((item) => item.assignmentId !== answer.assignmentId)];
  writeStore(userId, store);
}

export function savePreviewCompletion(userId: string, completion: ReadingCompletion, photoDataUrl?: string) {
  const store = readStore(userId);
  store.completions = [completion, ...store.completions.filter((item) => item.assignmentId !== completion.assignmentId)];
  if (photoDataUrl && completion.photoPath) store.photos[completion.photoPath] = photoDataUrl;
  writeStore(userId, store);
}

export function previewPhotoUrl(userId: string, photoPath: string): string | null {
  return readStore(userId).photos[photoPath] ?? null;
}

/** Small JPEG data URL (≈30–60 KB) so several days of photos fit in localStorage. */
export async function makePreviewThumbnail(photo: Blob, maxEdge = 480): Promise<string> {
  const bitmap = await createImageBitmap(photo);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL('image/jpeg', 0.7);
}
