import { useEffect, useState } from 'react';
import { fetchReadingAssignments, fetchReadingCompletions, fetchReadingStreaks, restorableMissedReadings } from './readings';
import { addDaysToKey, localDateKey, readingWeekStart } from './readingDates';
import { READINGS_PREVIEW_MODE, loadPreviewReadings } from './readingsPreview';

const STREAK_CHANGED_EVENT = 'masiri:reading-streak-changed';

export interface StreakState {
  value: number;
  /** Today's chapter has been read → colourful 🔥, otherwise dark grey. */
  completedToday: boolean;
  /** Missed readings that can still be restored this week (shows the Restore button). */
  restoreCount?: number;
}

/** Call after a reading is completed so every Streak badge (e.g. the top bar) refreshes. */
export function announceReadingStreakChanged(state?: StreakState) {
  window.dispatchEvent(new CustomEvent<StreakState | undefined>(STREAK_CHANGED_EVENT, { detail: state }));
}

async function countRestorable(userId: string, today: string): Promise<number> {
  const weekStart = readingWeekStart(today);
  if (weekStart >= today) return 0; // Friday: nothing earlier in this week yet.
  const assignments = await fetchReadingAssignments({ fromDate: weekStart, toDate: addDaysToKey(today, -1), includeVerses: false });
  if (assignments.length === 0) return 0;
  const completions = await fetchReadingCompletions({ studentId: userId, assignmentIds: assignments.map((a) => a.id) });
  return restorableMissedReadings(assignments, completions, today).length;
}

/**
 * Current reading Streak for a student (null while loading or for non-students).
 * Uses the local test mode until the database is linked, otherwise Supabase.
 */
export function useReadingStreak(userId: string | undefined, isStudent: boolean, simulationMode = false, fallback = 0): StreakState | null {
  const [streak, setStreak] = useState<StreakState | null>(null);

  useEffect(() => {
    if (!userId || !isStudent) {
      setStreak(null);
      return;
    }
    let cancelled = false;
    const load = async () => {
      if (simulationMode) {
        setStreak({ value: fallback, completedToday: false, restoreCount: 0 });
        return;
      }
      const today = localDateKey();
      try {
        if (READINGS_PREVIEW_MODE) {
          const preview = await loadPreviewReadings(userId, today);
          const restoreCount = restorableMissedReadings(preview.assignments, preview.completions, today).length;
          if (!cancelled) setStreak({ value: preview.streak.currentStreak, completedToday: preview.streak.completedToday, restoreCount });
          return;
        }
        const [rows, restoreCount] = await Promise.all([
          fetchReadingStreaks([userId], today),
          countRestorable(userId, today).catch(() => 0),
        ]);
        const row = rows[0];
        if (!cancelled) setStreak({ value: row?.currentStreak ?? 0, completedToday: Boolean(row?.completedToday), restoreCount });
      } catch {
        if (!cancelled) setStreak({ value: fallback, completedToday: false, restoreCount: 0 });
      }
    };
    void load();
    const onChanged = (event: Event) => {
      // Show the new value at once, then reload so the Restore count is up to date.
      const state = (event as CustomEvent<StreakState | undefined>).detail;
      if (state) setStreak((current) => ({ ...state, restoreCount: state.restoreCount ?? current?.restoreCount }));
      void load();
    };
    window.addEventListener(STREAK_CHANGED_EVENT, onChanged);
    window.addEventListener('focus', load);
    return () => {
      cancelled = true;
      window.removeEventListener(STREAK_CHANGED_EVENT, onChanged);
      window.removeEventListener('focus', load);
    };
  }, [userId, isStudent, simulationMode, fallback]);

  return streak;
}
