import { findBibleBook } from './bible/books';
import { addDaysToKey } from './readingDates';
import type { BibleBook } from '../types';

/**
 * Daily Bible reading plans.
 *
 * «خطة القراءة اليومية» — one chapter per day for all students, starting 30 Oct 2026.
 * Each entry is [book id, [[chapter, reminder verse], ...]] in reading order.
 * The reminder verse is the verse sent in the daily reminder notification.
 * Deuterocanonical books (باروخ، طوبيا، يهوديت، المكابيين) were removed at the
 * servants' request because the app's Van Dyck text does not include them.
 */

export interface ReadingPlanDay {
  /** 0-based day index in the plan. */
  index: number;
  date: string;
  book: BibleBook;
  chapter: number;
  reminderVerse: number;
}

export interface ReadingPlan {
  id: string;
  title: string;
  startDate: string;
  question: string;
  days: ReadingPlanDay[];
}

type PlanSource = [string, [number, number][]][];

const DAILY_CHAPTERS_2026: PlanSource = [
  ['gen', [[1, 1], [2, 7], [3, 15], [4, 7], [6, 8], [9, 13], [12, 2], [15, 6], [17, 1], [22, 8], [28, 15], [37, 3], [45, 8], [50, 20]]],
  ['exod', [[1, 17], [2, 24], [3, 14], [4, 12], [5, 1], [6, 7], [7, 5], [8, 19], [9, 16], [10, 2], [11, 7], [12, 13], [13, 21], [14, 14], [15, 2], [16, 4], [17, 15], [19, 5], [20, 3], [24, 7], [25, 8], [32, 26], [34, 6]]],
  ['lev', [[1, 4], [8, 12], [16, 30], [17, 11], [19, 18], [23, 3]]],
  ['num', [[6, 24], [9, 18], [13, 30], [14, 8], [21, 8]]],
  ['deut', [[4, 29], [6, 5], [8, 3], [18, 15], [30, 19], [31, 6], [34, 10]]],
  ['josh', [[1, 9], [2, 11], [3, 5], [5, 15], [6, 2], [23, 14], [24, 15]]],
  ['judg', [[2, 18], [6, 12], [13, 24], [16, 28]]],
  ['ruth', [[1, 16], [2, 12], [3, 11], [4, 14]]],
  ['1sam', [[3, 10], [8, 7], [16, 7], [17, 47], [24, 6]]],
  ['2sam', [[5, 10], [7, 22], [11, 27], [12, 13], [22, 2]]],
  ['1kings', [[3, 9], [8, 27], [18, 39]]],
  ['2kings', [[2, 9], [5, 15]]],
  ['1chron', [[16, 34]]],
  ['2chron', [[20, 15]]],
  ['psalm', [[2, 7], [8, 4], [22, 1], [23, 1], [40, 1], [51, 10], [110, 1]]],
  ['isa', [[1, 18], [6, 8], [7, 14], [9, 6], [11, 2], [40, 31], [52, 7], [53, 5], [61, 1]]],
  ['jer', [[1, 5], [23, 6], [31, 3], [33, 3]]],
  ['lam', [[3, 22]]],
  ['ezek', [[1, 28], [18, 32], [34, 11], [36, 26], [37, 5]]],
  ['dan', [[1, 8], [2, 22], [3, 25], [7, 14], [9, 9]]],
  ['hos', [[2, 19], [6, 6], [11, 1]]],
  ['joel', [[2, 28]]],
  ['amos', [[9, 11]]],
  ['jonah', [[2, 9], [3, 10]]],
  ['mic', [[5, 2]]],
  ['hab', [[2, 4]]],
  ['zeph', [[3, 17]]],
  ['hag', [[2, 9]]],
  ['zech', [[3, 4], [9, 9], [12, 10]]],
  ['mal', [[3, 1]]],
  ['esth', [[4, 14], [8, 16]]],
  ['matt', [[1, 21], [2, 11], [3, 17], [4, 4], [5, 8], [6, 33], [7, 7], [16, 16], [17, 5], [21, 9], [26, 39], [28, 20]]],
  ['mark', [[1, 15], [2, 17], [4, 39], [8, 34], [14, 36], [15, 39], [16, 6]]],
  ['luke', [[1, 37], [2, 11], [4, 18], [5, 10], [9, 23], [10, 42], [15, 20], [19, 10], [22, 42], [23, 34], [24, 32]]],
  ['john', [[1, 14], [2, 11], [3, 16], [4, 14], [6, 35], [8, 12], [9, 25], [10, 11], [11, 25], [12, 24], [13, 34], [14, 6], [15, 5], [17, 3], [18, 37], [19, 30], [20, 29], [21, 17]]],
  ['acts', [[1, 8], [2, 4], [3, 6], [4, 12], [10, 34], [15, 11], [26, 18]]],
  ['rom', [[1, 16], [3, 23], [4, 3], [5, 8], [6, 23], [8, 28]]],
  ['1cor', [[1, 18], [15, 57]]],
  ['2cor', [[5, 17]]],
  ['gal', [[2, 20], [3, 26]]],
  ['eph', [[1, 7], [2, 8], [3, 20], [4, 32], [5, 8], [6, 11]]],
  ['phil', [[1, 21], [2, 5], [3, 14], [4, 13]]],
  ['col', [[1, 15], [2, 6], [3, 2]]],
  ['1thess', [[4, 16], [5, 18]]],
  ['2thess', [[1, 12]]],
  ['1tim', [[1, 15], [2, 5]]],
  ['2tim', [[3, 16], [4, 7]]],
  ['titus', [[2, 11], [3, 5]]],
  ['philm', [[1, 6]]],
  ['heb', [[1, 3], [2, 18], [4, 12], [7, 25], [8, 10], [9, 12], [10, 23], [11, 1], [12, 2]]],
  ['jas', [[1, 5], [2, 17], [5, 16]]],
  ['1pet', [[1, 3], [2, 9], [3, 15], [5, 7]]],
  ['2pet', [[1, 3], [3, 9]]],
  ['1john', [[1, 9], [3, 1], [4, 8], [5, 12]]],
  ['2john', [[1, 6]]],
  ['3john', [[1, 11]]],
  ['jude', [[1, 24]]],
  ['rev', [[1, 8], [4, 11], [5, 12], [7, 17], [11, 15], [12, 11], [14, 13], [19, 16], [20, 6], [21, 4], [22, 20]]],
];

export const DEFAULT_PLAN_START = '2026-10-30';
export const DEFAULT_PLAN_QUESTION = 'شوفت ربنا فين في الإصحاح؟';

export function buildReadingPlan(startDate: string = DEFAULT_PLAN_START, question: string = DEFAULT_PLAN_QUESTION): ReadingPlan {
  const days: ReadingPlanDay[] = [];
  for (const [bookId, chapters] of DAILY_CHAPTERS_2026) {
    const book = findBibleBook(bookId);
    if (!book) throw new Error(`Unknown book in reading plan: ${bookId}`);
    for (const [chapter, reminderVerse] of chapters) {
      const index = days.length;
      days.push({ index, date: addDaysToKey(startDate, index), book, chapter, reminderVerse });
    }
  }
  return { id: 'daily-chapters-2026', title: 'خطة القراءة اليومية', startDate, question, days };
}

/** Number of days in the default plan (260). */
export const DAILY_PLAN_LENGTH = DAILY_CHAPTERS_2026.reduce((total, [, chapters]) => total + chapters.length, 0);
