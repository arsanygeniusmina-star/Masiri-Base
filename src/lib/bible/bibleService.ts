import type { BibleBook, BiblePassageSelection, BibleVerse } from '../../types';

/**
 * Shared Bible text service.
 *
 * Text source: the Smith & Van Dyck Arabic translation (SVD) served by bolls.life,
 * the same provider the legacy masiri-main app used directly from the browser.
 * The legacy Express/Vercel `/api/bible/chapter` proxy is not needed because the
 * provider allows cross-origin requests. Chapters are cached in memory and in
 * sessionStorage so navigating back and forth does not refetch.
 *
 * Note: when a servant assigns a passage, the exact verses are snapshotted into
 * `public.bible_passages`, so students never depend on this provider.
 */

const BOLLS_BASE_URL = 'https://bolls.life/get-text/SVD';
const SESSION_CACHE_PREFIX = 'masiri.bible.svd.';
const REQUEST_TIMEOUT_MS = 12_000;

const memoryCache = new Map<string, BibleVerse[]>();
const inflight = new Map<string, Promise<BibleVerse[]>>();

const ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

/** Arabic count phrase with correct plural, e.g. «آية واحدة»، «آيتان»، «٣ آيات»، «١٢ آية». */
export function arabicCount(count: number, singular: string, dual: string, plural: string): string {
  if (count === 1) return `${singular} واحدة`.replace('طالب واحدة', 'طالب واحد');
  if (count === 2) return dual;
  if (count >= 3 && count <= 10) return `${toArabicDigits(count)} ${plural}`;
  return `${toArabicDigits(count)} ${singular}`;
}

export function toArabicDigits(value: number | string): string {
  return String(value).replace(/[0-9]/g, (digit) => ARABIC_DIGITS[Number(digit)]);
}

/** 'إنجيل يوحنا ٣:١٦–١٨', 'إنجيل يوحنا ٣:١٦', or 'إنجيل يوحنا ٣' for a whole chapter. */
export function formatBibleReference(
  bookName: string,
  chapter: number,
  verseStart?: number,
  verseEnd?: number,
): string {
  const base = `${bookName} ${toArabicDigits(chapter)}`;
  if (!verseStart) return base;
  if (!verseEnd || verseEnd === verseStart) return `${base}:${toArabicDigits(verseStart)}`;
  return `${base}:${toArabicDigits(verseStart)}–${toArabicDigits(verseEnd)}`;
}

export function buildPassageSelection(
  book: BibleBook,
  chapter: number,
  verses: BibleVerse[],
  verseStart: number,
  verseEnd: number,
): BiblePassageSelection {
  const start = Math.min(verseStart, verseEnd);
  const end = Math.max(verseStart, verseEnd);
  const selected = verses.filter((verse) => verse.number >= start && verse.number <= end);
  return {
    book,
    chapter,
    verseStart: start,
    verseEnd: end,
    verses: selected,
    reference: formatBibleReference(book.name, chapter, start, end),
  };
}

const cleanVerseText = (raw: unknown): string =>
  String(raw ?? '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const cacheKey = (book: BibleBook, chapter: number) => `${book.id}_${chapter}`;

function readSessionCache(key: string): BibleVerse[] | null {
  try {
    const raw = window.sessionStorage.getItem(SESSION_CACHE_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BibleVerse[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

function writeSessionCache(key: string, verses: BibleVerse[]) {
  try {
    window.sessionStorage.setItem(SESSION_CACHE_PREFIX + key, JSON.stringify(verses));
  } catch {
    // Storage can be full or blocked; the in-memory cache still works.
  }
}

async function requestChapter(book: BibleBook, chapter: number): Promise<BibleVerse[]> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${BOLLS_BASE_URL}/${book.bollsNumber}/${chapter}/`, {
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data: unknown = await response.json();
    if (!Array.isArray(data) || data.length === 0) throw new Error('empty chapter');
    const verses = data
      .map((item: { verse?: unknown; text?: unknown }) => ({
        number: Number(item.verse),
        text: cleanVerseText(item.text),
      }))
      .filter((verse) => Number.isInteger(verse.number) && verse.number > 0 && verse.text.length > 0)
      .sort((a, b) => a.number - b.number);
    if (verses.length === 0) throw new Error('empty chapter');
    return verses;
  } finally {
    window.clearTimeout(timer);
  }
}

export class BibleTextUnavailableError extends Error {
  constructor() {
    super('تعذر تحميل نص الإصحاح الآن. تحقق من الاتصال بالإنترنت ثم حاول مرة أخرى.');
    this.name = 'BibleTextUnavailableError';
  }
}

export async function fetchBibleChapter(book: BibleBook, chapter: number): Promise<BibleVerse[]> {
  if (!Number.isInteger(chapter) || chapter < 1 || chapter > book.totalChapters) {
    throw new RangeError(`Chapter ${chapter} is outside ${book.id}`);
  }
  const key = cacheKey(book, chapter);
  const cached = memoryCache.get(key) ?? readSessionCache(key);
  if (cached) {
    memoryCache.set(key, cached);
    return cached;
  }
  const pending = inflight.get(key);
  if (pending) return pending;

  const promise = requestChapter(book, chapter)
    .then((verses) => {
      memoryCache.set(key, verses);
      writeSessionCache(key, verses);
      return verses;
    })
    .catch((error: unknown) => {
      console.error('Unable to load Bible chapter', key, error);
      throw new BibleTextUnavailableError();
    })
    .finally(() => {
      inflight.delete(key);
    });
  inflight.set(key, promise);
  return promise;
}

/** Fire-and-forget prefetch of a neighbouring chapter. */
export function prefetchBibleChapter(book: BibleBook, chapter: number) {
  if (chapter < 1 || chapter > book.totalChapters) return;
  void fetchBibleChapter(book, chapter).catch(() => undefined);
}
