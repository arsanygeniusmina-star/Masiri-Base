import React, { useState } from 'react';
import { CheckCheck, Flame, Loader2, Megaphone, RefreshCw, ShieldAlert, X } from 'lucide-react';
import { reviewFlaggedAnswer, type FlaggedAction, type FlaggedAnswer } from '../lib/feed';
import { readingPalette, secondaryButtonStyle } from '../components/readings/readingTheme';

interface ReviewScreenProps {
  theme: 'light' | 'dark';
  items: FlaggedAnswer[];
  loading: boolean;
  onRefresh: () => void;
}

const STATUS_LABELS: Record<FlaggedAnswer['status'], string> = {
  pending: 'في انتظار القرار',
  published: 'اتنشرت على المنشور',
  streak_removed: 'اليوم مش محسوب',
  published_and_removed: 'اتنشرت + اليوم مش محسوب',
  dismissed: 'اتجاهلت',
};

const formatTime = (iso: string) =>
  new Date(iso).toLocaleString('ar-EG', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

/**
 * «متابعة» (head servants): answers the AI flagged as irrelevant, disrespectful
 * or not understandable. For each one: publish the words on top of the post,
 * don't count that day for the Streak, both, or ignore.
 */
export const ReviewScreen: React.FC<ReviewScreenProps> = ({ theme, items, loading, onRefresh }) => {
  const p = readingPalette(theme);
  const [busy, setBusy] = useState<string | null>(null);
  const [done, setDone] = useState<Record<string, FlaggedAnswer['status']>>({});
  const [error, setError] = useState('');

  const act = async (item: FlaggedAnswer, action: FlaggedAction) => {
    setBusy(`${item.answerId}:${action}`);
    setError('');
    try {
      await reviewFlaggedAnswer(item.answerId, action);
      setDone((current) => ({
        ...current,
        [item.answerId]: action === 'publish' ? 'published' : action === 'remove_streak' ? 'streak_removed' : action === 'both' ? 'published_and_removed' : 'dismissed',
      }));
      onRefresh();
    } catch {
      setError('تعذر تنفيذ الإجراء. حاول مرة أخرى.');
    } finally {
      setBusy(null);
    }
  };

  const withLocal = items.map((item) => ({ ...item, status: done[item.answerId] ?? item.status }));
  const pending = withLocal.filter((item) => item.status === 'pending');
  const handled = withLocal.filter((item) => item.status !== 'pending');

  const button = 'inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-black disabled:opacity-50';
  const spinner = (key: string) => (busy === key ? <Loader2 className="h-4 w-4 animate-spin" /> : null);

  const card = (item: FlaggedAnswer, actionable: boolean) => (
    <article key={item.answerId} className="liquid-glass-card space-y-3 rounded-3xl p-4">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-base font-black" style={{ color: p.text }}>{item.name}</span>
        <span className="text-xs" style={{ color: p.muted }}>{[item.reference, formatTime(item.checkedAt)].filter(Boolean).join(' · ')}</span>
      </div>
      {item.question && <p className="text-xs font-bold" style={{ color: p.muted }}>{item.question}</p>}
      <p className="rounded-2xl p-3 text-sm leading-7" style={{ backgroundColor: p.surfaceAlt, color: p.text }}>«{item.answerText}»</p>
      {item.reason && <p className="text-xs font-bold" style={{ color: p.error }}>رأي الذكاء الاصطناعي: {item.reason}</p>}

      {actionable ? (
        <>
          {!item.hasPost && <p className="text-xs" style={{ color: p.muted }}>القراءة دي اتشالت قبل كده، فمفيش منشور.</p>}
          <div className="grid grid-cols-2 gap-2">
            <button type="button" disabled={Boolean(busy) || !item.hasPost} onClick={() => void act(item, 'publish')} className={button} style={{ backgroundColor: p.soft, color: p.accentText }}>
              {spinner(`${item.answerId}:publish`) ?? <Megaphone className="h-4 w-4" />} انشر الكلام فوق صورته
            </button>
            <button type="button" disabled={Boolean(busy) || !item.hasPost} onClick={() => void act(item, 'remove_streak')} className={button} style={{ backgroundColor: p.errorSoft, color: p.error }}>
              {spinner(`${item.answerId}:remove_streak`) ?? <Flame className="h-4 w-4" />} احذف اليوم من الـ Streak
            </button>
            <button type="button" disabled={Boolean(busy) || !item.hasPost} onClick={() => void act(item, 'both')} className={button} style={{ backgroundColor: p.error, color: '#FFFFFF' }}>
              {spinner(`${item.answerId}:both`) ?? <CheckCheck className="h-4 w-4" />} الاتنين
            </button>
            <button type="button" disabled={Boolean(busy)} onClick={() => void act(item, 'dismiss')} className={button} style={{ backgroundColor: p.surfaceAlt, color: p.muted }}>
              {spinner(`${item.answerId}:dismiss`) ?? <X className="h-4 w-4" />} تجاهل
            </button>
          </div>
        </>
      ) : (
        <p className="text-xs font-black" style={{ color: item.status === 'dismissed' ? p.muted : p.accentText }}>✓ {STATUS_LABELS[item.status]}</p>
      )}
    </article>
  );

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-6" dir="rtl">
      <div className="liquid-glass-card flex items-center justify-between gap-3 rounded-3xl p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: p.errorSoft, color: p.error }}>
            <ShieldAlert className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-2xl font-black" style={{ color: p.text }}>متابعة</h1>
            <p className="text-xs" style={{ color: p.muted }}>إجابات الذكاء الاصطناعي شايف إنها محتاجة مراجعة</p>
          </div>
        </div>
        <button type="button" onClick={onRefresh} disabled={loading} className="inline-flex h-10 w-10 items-center justify-center rounded-xl disabled:opacity-50" style={secondaryButtonStyle(p)} aria-label="تحديث">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && <p className="text-center text-sm font-bold" role="alert" style={{ color: p.error }}>{error}</p>}

      {loading && items.length === 0 ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin" style={{ color: p.accent }} /></div>
      ) : (
        <>
          <h2 className="px-1 text-sm font-black" style={{ color: p.text }}>محتاجة قرار ({pending.length})</h2>
          {pending.length === 0 ? (
            <div className="liquid-glass-card rounded-3xl p-6 text-center text-sm font-bold" style={{ color: p.muted }}>مفيش إجابات محتاجة مراجعة دلوقتي 👌</div>
          ) : (
            pending.map((item) => card(item, true))
          )}
          {handled.length > 0 && (
            <>
              <h2 className="px-1 pt-2 text-sm font-black" style={{ color: p.muted }}>اتعمل فيها قرار</h2>
              {handled.slice(0, 30).map((item) => card(item, false))}
            </>
          )}
        </>
      )}
    </div>
  );
};
