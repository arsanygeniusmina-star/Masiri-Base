import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, RefreshCw, Trophy } from 'lucide-react';
import type { User } from '../types';
import { demoLeaderboard, fetchPointsLeaderboard, type LeaderboardEntry } from '../lib/leaderboard';
import { GRADE_SHORT_LABELS, readingPalette, secondaryButtonStyle } from '../components/readings/readingTheme';

interface RankingScreenProps {
  currentUser: User;
  theme: 'light' | 'dark';
  simulationMode?: boolean;
}

const MEDALS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

/** «الترتيب» — every student ranked by points, highest first. */
export const RankingScreen: React.FC<RankingScreenProps> = ({ currentUser, theme, simulationMode = false }) => {
  const p = readingPalette(theme);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setEntries(simulationMode ? demoLeaderboard(currentUser.id, currentUser.name) : await fetchPointsLeaderboard());
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : '';
      setError(
        /get_points_leaderboard|function|schema cache/i.test(message)
          ? 'الترتيب لسه مش متفعّل في قاعدة البيانات.'
          : 'تعذر تحميل الترتيب. تأكد من الإنترنت وحاول مرة أخرى.',
      );
    } finally {
      setLoading(false);
    }
  }, [simulationMode, currentUser.id, currentUser.name]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-6 sm:px-6 lg:px-8" dir="rtl">
      <div className="liquid-glass-card relative flex items-center justify-between gap-4 overflow-hidden rounded-3xl p-6">
        <div className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full bg-[#C5A15A]/15 blur-2xl" />
        <div className="relative flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: p.soft, color: p.accentText, border: `1px solid ${p.softBorder}` }}>
            <Trophy className="h-6 w-6" />
          </span>
          <h1 className="text-2xl font-black sm:text-3xl" style={{ color: p.text }}>الترتيب</h1>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl disabled:opacity-50"
          style={secondaryButtonStyle(p)}
          aria-label="تحديث الترتيب"
          title="تحديث"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading && entries.length === 0 ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: p.accent }} />
        </div>
      ) : error ? (
        <div className="liquid-glass-card rounded-3xl p-6 text-center text-sm font-bold" role="alert" style={{ color: p.error }}>
          {error}
        </div>
      ) : entries.length === 0 ? (
        <div className="liquid-glass-card rounded-3xl p-6 text-center text-sm font-bold" style={{ color: p.muted }}>
          لا يوجد طلاب بعد.
        </div>
      ) : (
        <ol className="space-y-2.5">
          {entries.map((entry) => {
            const isMe = entry.userId === currentUser.id;
            const top = entry.rank <= 3;
            return (
              <li
                key={entry.userId}
                className="liquid-glass-card flex items-center gap-3 rounded-2xl p-3.5 sm:p-4"
                style={isMe ? { outline: `2px solid ${p.accent}`, outlineOffset: '-2px' } : undefined}
                aria-current={isMe ? 'true' : undefined}
              >
                <span
                  dir="ltr"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-base font-black tabular-nums"
                  style={{ backgroundColor: top ? p.goldSoft : p.surfaceAlt, color: top ? p.accentText : p.muted }}
                  aria-label={`المركز ${entry.rank}`}
                >
                  {MEDALS[entry.rank] ?? entry.rank}
                </span>
                {entry.avatarUrl ? (
                  <img src={entry.avatarUrl} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" style={{ border: `1px solid ${p.border}` }} />
                ) : (
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-black"
                    style={{ backgroundColor: p.soft, color: p.accentText }}
                    aria-hidden="true"
                  >
                    {entry.name.trim().charAt(0)}
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-black sm:text-base" style={{ color: p.text }}>
                    {entry.name}
                    {isMe && <span className="ms-1.5 text-xs font-bold" style={{ color: p.accentText }}>(أنت)</span>}
                  </span>
                  {entry.gradeLevel && (
                    <span className="block text-xs" style={{ color: p.muted }}>{GRADE_SHORT_LABELS[entry.gradeLevel]}</span>
                  )}
                </span>
                <span dir="ltr" className="shrink-0 text-end">
                  <span className="block text-lg font-black tabular-nums leading-none" style={{ color: top ? p.accentText : p.text }}>
                    {entry.points.toLocaleString('en-US')}
                  </span>
                  <span className="block text-[11px] font-bold" style={{ color: p.muted }}>نقطة</span>
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
};
