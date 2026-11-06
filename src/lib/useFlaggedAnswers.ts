import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchFlaggedAnswers, type FlaggedAnswer } from './feed';
import { showAppNotification } from './readingReminders';

/**
 * Head servants only: flagged answers for «متابعة». Checks every 30 s (and when
 * the app comes back to the front) on every page, and shows a notification for
 * each newly flagged answer.
 */
export function useFlaggedAnswers(enabled: boolean) {
  const [items, setItems] = useState<FlaggedAnswer[]>([]);
  const [loading, setLoading] = useState(false);
  const known = useRef<Set<string> | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const next = await fetchFlaggedAnswers();
      const pendingIds = next.filter((item) => item.status === 'pending').map((item) => item.answerId);
      if (known.current) {
        const fresh = next.filter((item) => item.status === 'pending' && !known.current?.has(item.answerId));
        for (const item of fresh.slice(0, 3)) {
          void showAppNotification('إجابة محتاجة متابعة ⚠️', `${item.name}: «${item.answerText.slice(0, 80)}»`, `masiri-flagged-${item.answerId}`);
        }
      }
      known.current = new Set([...(known.current ?? []), ...pendingIds]);
      setItems(next);
    } catch {
      // Not set up yet or offline: keep what we have.
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setItems([]);
      known.current = null;
      return;
    }
    void refresh();
    const interval = window.setInterval(() => void refresh(), 30000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [enabled, refresh]);

  return {
    items,
    loading,
    refresh,
    pendingCount: items.filter((item) => item.status === 'pending').length,
  };
}
