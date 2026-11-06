import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, Heart, Loader2, RefreshCw, Search, Sparkles, Users } from 'lucide-react';
import type { User } from '../types';
import { fetchPeopleStreaks, fetchPersonReadings, normalizeName, type PersonReading, type PersonStreak } from '../lib/people';
import { getReadingPhotoUrl } from '../lib/readings';
import { formatLongDate, localDateKey, relativeDayLabel } from '../lib/readingDates';
import { readingPalette, secondaryButtonStyle, type ReadingPalette } from '../components/readings/readingTheme';
import { StreakBadge } from '../components/readings/StreakBadge';
import { DoubleTapLike } from '../components/DoubleTapLike';
import { likePost } from '../lib/feed';

interface WariniScreenProps {
  currentUser: User;
  theme: 'light' | 'dark';
  /** Shown only for the wheel's owner: opens «عجلة الحظ». */
  onOpenWheel?: () => void;
  /** Open this person straight away (from a notification). */
  openUserId?: string | null;
  onOpenedUser?: () => void;
}

const ROLE_LABELS: Record<string, string> = { head: 'خادم مسؤول', teacher: 'خادم', student: 'مخدوم' };

const Avatar: React.FC<{ name: string; url?: string; size: number; p: ReadingPalette }> = ({ name, url, size, p }) =>
  url ? (
    <img src={url} alt="" className="shrink-0 rounded-full object-cover" style={{ width: size, height: size, border: `1px solid ${p.border}` }} />
  ) : (
    <span
      className="flex shrink-0 items-center justify-center rounded-full font-black"
      style={{ width: size, height: size, fontSize: size * 0.38, backgroundColor: p.soft, color: p.accentText }}
      aria-hidden="true"
    >
      {name.trim().charAt(0)}
    </span>
  );

/** One reading day: its photo (or the chapter name when there's no photo). */
const DayTile: React.FC<{ reading: PersonReading; p: ReadingPalette; today: string }> = ({ reading, p, today }) => {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [liked, setLiked] = useState(reading.likedByMe);
  const [likes, setLikes] = useState(reading.likeCount);

  // Double-tap the photo → like (never unlikes).
  const like = () => {
    if (liked) return;
    setLiked(true);
    setLikes((count) => count + 1);
    likePost(reading.completionId).catch(() => {
      setLiked(false);
      setLikes((count) => Math.max(0, count - 1));
    });
  };

  useEffect(() => {
    let cancelled = false;
    if (!reading.photoPath) return;
    getReadingPhotoUrl(reading.photoPath)
      .then((signed) => { if (!cancelled) setUrl(signed); })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [reading.photoPath]);

  const label = relativeDayLabel(reading.readingDate, today);
  return (
    <li className="overflow-hidden rounded-2xl" style={{ backgroundColor: p.surfaceAlt, border: `1px solid ${p.border}` }}>
      <DoubleTapLike onLike={like}>
        <div className="relative flex aspect-square items-center justify-center">
          {url && !failed ? (
            <img src={url} alt={`قراءة ${label}`} className="h-full w-full object-cover" loading="lazy" draggable={false} onError={() => setFailed(true)} />
          ) : (
            <span className="px-2 text-center text-xs font-bold leading-5" style={{ color: p.muted }}>
              📖<br />{reading.reference ?? 'قراءة'}
            </span>
          )}
          {(likes > 0 || liked) && (
            <span dir="ltr" className="absolute bottom-1.5 left-1.5 inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-bold text-white">
              <Heart className="h-3 w-3" style={liked ? { color: '#FF4D7A', fill: '#FF4D7A' } : undefined} /> {likes}
            </span>
          )}
        </div>
      </DoubleTapLike>
      <div className="px-2 py-1.5">
        <p className="truncate text-xs font-black" style={{ color: p.text }} title={formatLongDate(reading.readingDate)}>{label}</p>
        {reading.reference && <p className="truncate text-[11px]" style={{ color: p.muted }}>{reading.reference}</p>}
      </div>
    </li>
  );
};

/** One person: Streak numbers and every reading day. */
const PersonView: React.FC<{ person: PersonStreak; p: ReadingPalette; onBack: () => void; isMe: boolean }> = ({ person, p, onBack, isMe }) => {
  const [readings, setReadings] = useState<PersonReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const today = localDateKey();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    fetchPersonReadings(person.userId)
      .then((rows) => { if (!cancelled) setReadings(rows); })
      .catch(() => { if (!cancelled) setError('تعذر تحميل القراءات. حاول مرة أخرى.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [person.userId]);

  const stats: Array<[string, number]> = [
    ['الـ Streak دلوقتي', person.currentStreak],
    ['أطول Streak', person.longestStreak],
  ];

  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold" style={secondaryButtonStyle(p)}>
        <ArrowRight className="h-4 w-4" /> رجوع
      </button>

      <div className="liquid-glass-card flex items-center gap-4 rounded-3xl p-5">
        <Avatar name={person.name} url={person.avatarUrl} size={64} p={p} />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-xl font-black" style={{ color: p.text }}>
            {person.name}
            {isMe && <span className="ms-1.5 text-sm font-bold" style={{ color: p.accentText }}>(أنت)</span>}
          </h2>
          <p className="text-xs" style={{ color: p.muted }}>{ROLE_LABELS[person.role] ?? ''}</p>
        </div>
        <StreakBadge value={person.currentStreak} size="lg" color={p.accentText} active={person.completedToday} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        {stats.map(([label, value]) => (
          <div key={label} className="liquid-glass-card rounded-2xl p-3 text-center">
            <p dir="ltr" className="text-2xl font-black tabular-nums" style={{ color: p.text }}>{value.toLocaleString('en-US')}</p>
            <p className="text-[11px] font-bold" style={{ color: p.muted }}>{label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" style={{ color: p.accent }} /></div>
      ) : error ? (
        <div className="liquid-glass-card rounded-3xl p-6 text-center text-sm font-bold" role="alert" style={{ color: p.error }}>{error}</div>
      ) : readings.length === 0 ? (
        <div className="liquid-glass-card rounded-3xl p-6 text-center text-sm font-bold" style={{ color: p.muted }}>لسه مقرأش أي إصحاح.</div>
      ) : (
        <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {readings.map((reading) => <DayTile key={reading.completionId} reading={reading} p={p} today={today} />)}
        </ul>
      )}
    </div>
  );
};

/** «ورينى» — everyone ranked by Streak, search by name, tap a person to see their days. */
export const WariniScreen: React.FC<WariniScreenProps> = ({ currentUser, theme, onOpenWheel, openUserId, onOpenedUser }) => {
  const p = readingPalette(theme);
  const [people, setPeople] = useState<PersonStreak[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<PersonStreak | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setPeople(await fetchPeopleStreaks());
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : '';
      setError(/get_people_streaks|function|schema cache/i.test(message) ? 'الصفحة لسه مش متفعّلة في قاعدة البيانات.' : 'تعذر التحميل. حاول مرة أخرى.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // From a notification: open that person once the list has loaded.
  useEffect(() => {
    if (!openUserId || loading) return;
    const person = people.find((item) => item.userId === openUserId);
    if (person) setSelected(person);
    onOpenedUser?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openUserId, loading, people]);

  // Rank by current Streak (people with the same Streak share the same place).
  const ranked = useMemo(() => {
    let place = 0;
    let previous = -1;
    return people.map((person, index) => {
      if (person.currentStreak !== previous) {
        place = index + 1;
        previous = person.currentStreak;
      }
      return { person, place };
    });
  }, [people]);

  const search = normalizeName(query);
  const shown = search ? ranked.filter(({ person }) => normalizeName(person.name).includes(search)) : ranked;

  const open = (person: PersonStreak) => {
    setSelected(person);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (selected) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8" dir="rtl">
        <PersonView person={selected} p={p} isMe={selected.userId === currentUser.id} onBack={() => setSelected(null)} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-6 sm:px-6 lg:px-8" dir="rtl">
      <div className="liquid-glass-card relative flex items-center justify-between gap-4 overflow-hidden rounded-3xl p-6">
        <div className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full bg-[#C5A15A]/15 blur-2xl" />
        <div className="relative flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: p.soft, color: p.accentText, border: `1px solid ${p.softBorder}` }}>
            <Users className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-2xl font-black sm:text-3xl" style={{ color: p.text }}>ورينى</h1>
            {!loading && <p className="text-xs" style={{ color: p.muted }}>{people.length} شخص</p>}
          </div>
        </div>
        <div className="relative flex gap-2">
          {onOpenWheel && (
            <button type="button" onClick={onOpenWheel} className="inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-bold" style={secondaryButtonStyle(p)} title="عجلة الحظ">
              <Sparkles className="h-4 w-4" /> العجلة
            </button>
          )}
          <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex h-10 w-10 items-center justify-center rounded-xl disabled:opacity-50" style={secondaryButtonStyle(p)} aria-label="تحديث" title="تحديث">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <label className="liquid-glass-card flex items-center gap-2 rounded-2xl px-4 py-3">
        <Search className="h-5 w-5 shrink-0" style={{ color: p.muted }} />
        <input
          type="search"
          value={query}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => setQuery(event.target.value)}
          placeholder="ابحث بالاسم…"
          className="w-full bg-transparent text-base outline-none"
          style={{ color: p.text }}
          dir="auto"
          aria-label="ابحث بالاسم"
        />
      </label>

      {loading && people.length === 0 ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin" style={{ color: p.accent }} /></div>
      ) : error ? (
        <div className="liquid-glass-card rounded-3xl p-6 text-center text-sm font-bold" role="alert" style={{ color: p.error }}>{error}</div>
      ) : shown.length === 0 ? (
        <div className="liquid-glass-card rounded-3xl p-6 text-center text-sm font-bold" style={{ color: p.muted }}>
          {search ? `مفيش حد اسمه «${query.trim()}».` : 'لسه مفيش حد.'}
        </div>
      ) : (
        <ol className="space-y-2">
          {shown.map(({ person, place }) => {
            const isMe = person.userId === currentUser.id;
            return (
              <li key={person.userId}>
                <button
                  type="button"
                  onClick={() => open(person)}
                  className="liquid-glass-card flex w-full items-center gap-3 rounded-2xl p-3 text-start transition-transform active:scale-[0.99]"
                  style={isMe ? { outline: `2px solid ${p.accent}`, outlineOffset: '-2px' } : undefined}
                >
                  <span dir="ltr" className="w-8 shrink-0 text-center text-sm font-black tabular-nums" style={{ color: place <= 3 ? p.accentText : p.muted }}>
                    {place}
                  </span>
                  <Avatar name={person.name} url={person.avatarUrl} size={40} p={p} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-black sm:text-base" style={{ color: p.text }}>
                      {person.name}
                      {isMe && <span className="ms-1.5 text-xs font-bold" style={{ color: p.accentText }}>(أنت)</span>}
                    </span>
                    <span className="block text-xs" style={{ color: p.muted }}>{ROLE_LABELS[person.role] ?? ''}</span>
                  </span>
                  <StreakBadge value={person.currentStreak} size="md" color={p.accentText} active={person.completedToday} />
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
};
