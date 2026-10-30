import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Heart, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import type { User } from '../types';
import { FEED_PAGE_SIZE, deletePost, fetchReadingFeed, likePost, unlikePost, type FeedPost } from '../lib/feed';
import { getReadingPhotoUrl } from '../lib/readings';
import { readingPalette, secondaryButtonStyle } from '../components/readings/readingTheme';
import { StreakBadge } from '../components/readings/StreakBadge';
import { STREAK_CHANGED_EVENT } from '../lib/useReadingStreak';

interface FeedScreenProps {
  currentUser: User;
  theme: 'light' | 'dark';
  simulationMode?: boolean;
}

const ROLE_LABELS: Record<string, string> = { head: 'أمين الخدمة', teacher: 'خادم', student: '' };

function demoPosts(): FeedPost[] {
  const names: Array<[string, string, number, number]> = [['مارك', 'student', 12, 9], ['بيتر', 'teacher', 8, 21], ['مريم', 'student', 5, 4]];
  return names.map(([name, role, likes, streak], i) => ({
    completionId: `demo-${i}`, userId: `demo-user-${i}`, name, role: role as FeedPost['role'], photoPath: '', readingDate: '2026-10-30',
    reference: 'سفر التكوين ١', completedAt: new Date().toISOString(), likeCount: likes, likedByMe: false, currentStreak: streak,
  }));
}

/** One post: publisher on top, the reading photo, and the like button under it on the left. */
const PostCard: React.FC<{ post: FeedPost; theme: 'light' | 'dark'; onToggleLike: (post: FeedPost) => void; onDelete?: (post: FeedPost) => void }> = ({ post, theme, onToggleLike, onDelete }) => {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const p = readingPalette(theme);
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!post.photoPath) return;
    getReadingPhotoUrl(post.photoPath)
      .then((signed) => { if (!cancelled) setUrl(signed); })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [post.photoPath]);

  const roleLabel = ROLE_LABELS[post.role] ?? '';

  // No photo (or it can't be shown) → no post at all.
  if (!post.photoPath || failed) return null;

  return (
    <article className="liquid-glass-card overflow-hidden rounded-3xl" hidden={!loaded}>
      {/* Publisher */}
      <header className="flex items-center gap-3 p-3.5">
        {post.avatarUrl ? (
          <img src={post.avatarUrl} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" style={{ border: `1px solid ${p.border}` }} />
        ) : (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-black" style={{ backgroundColor: p.soft, color: p.accentText }} aria-hidden="true">
            {post.name.trim().charAt(0)}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-black sm:text-base" style={{ color: p.text }}>{post.name}</span>
          <span className="block truncate text-xs" style={{ color: p.muted }}>
            {[roleLabel, post.reference].filter(Boolean).join(' · ')}
          </span>
        </span>
        <StreakBadge value={post.currentStreak} size="md" color={p.accentText} />
      </header>

      {/* Photo */}
      <div className="flex aspect-square w-full items-center justify-center" style={{ backgroundColor: p.surfaceAlt }}>
        {/* The post stays hidden until this photo has fully loaded. */}
        {url && (
          <img src={url} alt={`صورة ${post.name} بعد القراءة`} className="h-full w-full object-cover" onLoad={() => setLoaded(true)} onError={() => setFailed(true)} />
        )}
      </div>

      {/* Like — on the left under the photo */}
      <footer className="flex items-center justify-between p-3">
        {/* Servants only: delete (tap twice to confirm) — on the right */}
        {onDelete ? (
          <button
            type="button"
            onClick={() => (confirmDelete ? onDelete(post) : setConfirmDelete(true))}
            onBlur={() => setConfirmDelete(false)}
            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-black transition-transform active:scale-90"
            style={{ color: p.error, backgroundColor: confirmDelete ? p.errorSoft : 'transparent' }}
            aria-label={confirmDelete ? 'تأكيد حذف المنشور' : 'حذف المنشور'}
          >
            <Trash2 className="h-5 w-5" />
            {confirmDelete && 'تأكيد الحذف؟'}
          </button>
        ) : <span />}
        <button
          type="button"
          onClick={() => onToggleLike(post)}
          className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-black transition-transform active:scale-90"
          style={{ color: post.likedByMe ? '#E0245E' : p.muted }}
          aria-pressed={post.likedByMe}
          aria-label={post.likedByMe ? 'إلغاء الإعجاب' : 'إعجاب'}
        >
          <span dir="ltr" className="tabular-nums">{post.likeCount.toLocaleString('en-US')}</span>
          <Heart className="h-6 w-6" fill={post.likedByMe ? '#E0245E' : 'none'} />
        </button>
      </footer>
    </article>
  );
};

/** «الرئيسية»: every completed daily reading, most liked first. */
export const FeedScreen: React.FC<FeedScreenProps> = ({ currentUser, theme, simulationMode = false }) => {
  const p = readingPalette(theme);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const first = simulationMode ? demoPosts() : await fetchReadingFeed(0);
      setPosts(first);
      setHasMore(!simulationMode && first.length === FEED_PAGE_SIZE);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : '';
      setError(/get_reading_feed|function|schema cache/i.test(message) ? 'الصفحة لسه مش متفعّلة في قاعدة البيانات.' : 'تعذر تحميل المنشورات. حاول مرة أخرى.');
    } finally {
      setLoading(false);
    }
  }, [simulationMode]);

  useEffect(() => {
    void load();
  }, [load]);

  // Live: new posts show up by themselves (every 15 s, when the app comes back
  // to the front, and right after you finish your own reading).
  const shownCount = useRef(FEED_PAGE_SIZE);
  shownCount.current = Math.max(FEED_PAGE_SIZE, posts.length);
  useEffect(() => {
    if (simulationMode) return;
    let busy = false;
    const refresh = async () => {
      if (busy || document.visibilityState === 'hidden') return;
      busy = true;
      try {
        const latest = await fetchReadingFeed(0, Math.min(100, shownCount.current));
        setPosts(latest);
        setHasMore(latest.length === Math.min(100, shownCount.current));
        setError('');
      } catch {
        // Keep showing the current posts; the next tick will try again.
      } finally {
        busy = false;
      }
    };
    const interval = window.setInterval(() => void refresh(), 15000);
    const onVisible = () => { if (document.visibilityState === 'visible') void refresh(); };
    const onPosted = () => void refresh();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener(STREAK_CHANGED_EVENT, onPosted);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener(STREAK_CHANGED_EVENT, onPosted);
    };
  }, [simulationMode]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const next = await fetchReadingFeed(posts.length);
      setPosts((current) => {
        const seen = new Set(current.map((post) => post.completionId));
        return [...current, ...next.filter((post) => !seen.has(post.completionId))];
      });
      setHasMore(next.length === FEED_PAGE_SIZE);
    } catch {
      setError('تعذر تحميل المزيد.');
    } finally {
      setLoadingMore(false);
    }
  };

  const isServant = currentUser.role === 'teacher' || currentUser.role === 'head';
  const removePost = async (post: FeedPost) => {
    setPosts((current) => current.filter((item) => item.completionId !== post.completionId));
    if (simulationMode) return;
    try {
      await deletePost(post.completionId);
    } catch {
      setError('تعذر حذف المنشور.');
      void load();
    }
  };

  // Optimistic like/unlike; the order only changes on the next refresh so posts don't jump.
  const toggleLike = async (post: FeedPost) => {
    const liked = !post.likedByMe;
    const apply = (state: boolean) =>
      setPosts((current) => current.map((item) => (item.completionId === post.completionId
        ? { ...item, likedByMe: state, likeCount: Math.max(0, item.likeCount + (state === item.likedByMe ? 0 : state ? 1 : -1)) }
        : item)));
    apply(liked);
    if (simulationMode) return;
    try {
      if (liked) await likePost(post.completionId);
      else await unlikePost(post.completionId, currentUser.id);
    } catch {
      apply(!liked);
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-4 px-4 py-6" dir="rtl">
      <div className="flex justify-end">
        <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex h-10 w-10 items-center justify-center rounded-xl disabled:opacity-50" style={secondaryButtonStyle(p)} aria-label="تحديث" title="تحديث">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading && posts.length === 0 ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin" style={{ color: p.accent }} /></div>
      ) : error && posts.length === 0 ? (
        <div className="liquid-glass-card rounded-3xl p-6 text-center text-sm font-bold" role="alert" style={{ color: p.error }}>{error}</div>
      ) : posts.length === 0 ? (
        <div className="liquid-glass-card rounded-3xl p-6 text-center text-sm font-bold" style={{ color: p.muted }}>
          لسه مفيش منشورات. اقرأ «إصحاح النهارده» وصوّر عشان تكون أول واحد 🔥
        </div>
      ) : (
        <>
          {posts.map((post) => <PostCard key={post.completionId} post={post} theme={theme} onToggleLike={(item) => void toggleLike(item)} onDelete={isServant ? (item) => void removePost(item) : undefined} />)}
          {hasMore && (
            <button type="button" onClick={() => void loadMore()} disabled={loadingMore} className="mx-auto flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-black disabled:opacity-60" style={secondaryButtonStyle(p)}>
              {loadingMore && <Loader2 className="h-4 w-4 animate-spin" />} عرض المزيد
            </button>
          )}
        </>
      )}
    </div>
  );
};
