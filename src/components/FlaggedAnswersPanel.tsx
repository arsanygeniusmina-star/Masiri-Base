import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, ChevronDown, Loader2, Megaphone, Flame, X } from 'lucide-react';
import { fetchFlaggedAnswers, reviewFlaggedAnswer, type FlaggedAction, type FlaggedAnswer } from '../lib/feed';
import { readingPalette } from './readings/readingTheme';

/**
 * Head servants only: answers the AI flagged (irrelevant, disrespectful or not
 * understandable). For each one: publish it on top of the post, don't count the
 * day for the Streak, or ignore. Checks every 30 s and shows a notification when
 * a new one arrives (if notifications are allowed).
 */
export const FlaggedAnswersPanel: React.FC<{ theme: 'light' | 'dark'; onChanged: () => void }> = ({ theme, onChanged }) => {
  const p = readingPalette(theme);
  const [items, setItems] = useState<FlaggedAnswer[]>([]);
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const known = useRef<Set<string> | null>(null);

  const load = useCallback(async () => {
    try {
      const next = await fetchFlaggedAnswers();
      // Notify about answers not seen before (skip the very first load).
      if (known.current) {
        const fresh = next.filter((item) => !known.current?.has(item.answerId));
        if (fresh.length && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          try {
            new Notification('إجابة تحتاج مراجعة', { body: `${fresh[0].name}: «${fresh[0].answerText.slice(0, 80)}»`, lang: 'ar', dir: 'rtl', tag: 'masiri-flagged' });
          } catch {
            // Some phones only allow notifications from the service worker; the badge still shows.
          }
        }
      }
      known.current = new Set(next.map((item) => item.answerId));
      setItems(next);
    } catch {
      // Not set up yet in the database, or offline: keep the panel hidden.
    }
  }, []);

  useEffect(() => {
    void load();
    const interval = window.setInterval(() => void load(), 30000);
    return () => window.clearInterval(interval);
  }, [load]);

  const act = async (item: FlaggedAnswer, action: FlaggedAction) => {
    setBusyId(item.answerId);
    setError('');
    try {
      await reviewFlaggedAnswer(item.answerId, action);
      setItems((current) => current.filter((entry) => entry.answerId !== item.answerId));
      onChanged();
    } catch {
      setError('تعذر تنفيذ الإجراء. حاول مرة أخرى.');
    } finally {
      setBusyId(null);
    }
  };

  if (items.length === 0) return null;

  const button = 'inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-xs font-black disabled:opacity-50';

  return (
    <section className="liquid-glass-card overflow-hidden rounded-3xl" style={{ border: `1px solid ${p.error}` }}>
      <button type="button" onClick={() => setOpen((value) => !value)} className="flex w-full items-center gap-3 p-4 text-right" aria-expanded={open}>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl" style={{ backgroundColor: p.errorSoft, color: p.error }}>
          <AlertTriangle className="h-5 w-5" />
        </span>
        <span className="flex-1 text-sm font-black" style={{ color: p.text }}>إجابات تحتاج مراجعة</span>
        <span dir="ltr" className="rounded-full px-2.5 py-0.5 text-sm font-black text-white" style={{ backgroundColor: p.error }}>{items.length}</span>
        <ChevronDown className={`h-5 w-5 transition-transform ${open ? 'rotate-180' : ''}`} style={{ color: p.muted }} />
      </button>

      {open && (
        <div className="space-y-3 px-4 pb-4">
          {error && <p className="text-xs font-bold" role="alert" style={{ color: p.error }}>{error}</p>}
          {items.map((item) => (
            <article key={item.answerId} className="space-y-2.5 rounded-2xl p-3.5" style={{ backgroundColor: p.surfaceAlt }}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-black" style={{ color: p.text }}>{item.name}</span>
                {item.reference && <span className="text-xs" style={{ color: p.muted }}>{item.reference}</span>}
              </div>
              <p className="rounded-xl p-3 text-sm leading-7" style={{ backgroundColor: p.surface, color: p.text }}>«{item.answerText}»</p>
              {item.reason && <p className="text-xs font-bold" style={{ color: p.error }}>السبب: {item.reason}</p>}
              <div className="flex gap-2">
                <button type="button" disabled={busyId === item.answerId || !item.hasPost} onClick={() => void act(item, 'publish')} className={button} style={{ backgroundColor: p.soft, color: p.accentText }} title={item.hasPost ? '' : 'مفيش منشور لسه'}>
                  {busyId === item.answerId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Megaphone className="h-4 w-4" />} انشرها على المنشور
                </button>
                <button type="button" disabled={busyId === item.answerId || !item.hasPost} onClick={() => void act(item, 'remove_streak')} className={button} style={{ backgroundColor: p.errorSoft, color: p.error }}>
                  <Flame className="h-4 w-4" /> لا تُحسب في الـ Streak
                </button>
                <button type="button" disabled={busyId === item.answerId} onClick={() => void act(item, 'dismiss')} className={button} style={{ backgroundColor: p.surface, color: p.muted }}>
                  <X className="h-4 w-4" /> تجاهل
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};
