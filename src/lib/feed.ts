import { supabase } from './supabase';
import type { UserRole } from '../types';

/** One completed daily reading shown in «الرئيسية» (now includes the answer). */
export interface FeedPost {
  completionId: string;
  userId: string;
  name: string;
  avatarUrl?: string;
  role: UserRole;
  photoPath: string;
  readingDate: string;
  reference?: string;
  answerText: string;
  completedAt: string;
  likeCount: number;
  likedByMe: boolean;
  currentStreak: number;
  /** Answer a head servant chose to publish on top of the post. */
  publishedAnswer?: string;
}

type FeedRow = {
  completion_id: string;
  user_id: string;
  name: string | null;
  avatar_url: string | null;
  role: string | null;
  photo_path: string;
  reading_date: string;
  reference_ar: string | null;
  answer_text: string | null;
  completed_at: string;
  like_count: number | null;
  liked_by_me: boolean | null;
  current_streak: number | null;
  published_answer?: string | null;
};

export const FEED_PAGE_SIZE = 30;

/** Order of «الرئيسية»: newest first (default) or most liked first. */
export type FeedSort = 'recent' | 'likes';

/** Posts ordered by the chosen sort. */
export async function fetchReadingFeed(offset = 0, limit = FEED_PAGE_SIZE, sort: FeedSort = 'recent'): Promise<FeedPost[]> {
  let { data, error } = await supabase.rpc('get_reading_feed', { p_limit: limit, p_offset: offset, p_sort: sort });
  if (error && /p_sort|function|schema cache/i.test(error.message ?? '')) {
    // Database not updated yet: the old version (most liked first).
    ({ data, error } = await supabase.rpc('get_reading_feed', { p_limit: limit, p_offset: offset }));
  }
  if (error) throw error;
  return ((data ?? []) as FeedRow[]).map((row) => ({
    completionId: row.completion_id,
    userId: row.user_id,
    name: row.name || 'عضو',
    avatarUrl: row.avatar_url || undefined,
    role: (row.role as UserRole) || 'student',
    photoPath: row.photo_path,
    readingDate: row.reading_date,
    reference: row.reference_ar || undefined,
    completedAt: row.completed_at,
    likeCount: Number(row.like_count || 0),
    likedByMe: Boolean(row.liked_by_me),
    // Only answers a head servant chose to publish appear on posts (publishedAnswer).
    answerText: '',
    currentStreak: Number(row.current_streak || 0),
    publishedAnswer: row.published_answer || undefined,
  }));
}

export async function likePost(completionId: string): Promise<void> {
  const { error } = await supabase.from('reading_likes').insert({ completion_id: completionId });
  // Already liked (double tap / two devices) is fine.
  if (error && error.code !== '23505') throw error;
}

export async function unlikePost(completionId: string, userId: string): Promise<void> {
  const { error } = await supabase.from('reading_likes').delete().eq('completion_id', completionId).eq('user_id', userId);
  if (error) throw error;
}

/** Servants only: removes a post from the feed (the reading still counts for the Streak). */
export async function deletePost(completionId: string): Promise<void> {
  const { error } = await supabase.rpc('hide_feed_post', { p_completion_id: completionId });
  if (error) throw error;
}

/** Answers flagged by the AI that still wait for a head servant. */
export interface FlaggedAnswer {
  answerId: string;
  studentId: string;
  name: string;
  reference?: string;
  question?: string;
  answerText: string;
  reason?: string;
  checkedAt: string;
  hasPost: boolean;
  status: 'pending' | 'published' | 'streak_removed' | 'published_and_removed' | 'dismissed';
  handledAt?: string;
}

export type FlaggedAction = 'publish' | 'remove_streak' | 'both' | 'dismiss';

export async function fetchFlaggedAnswers(): Promise<FlaggedAnswer[]> {
  const { data, error } = await supabase.rpc('get_flagged_answers');
  if (error) throw error;
  return ((data ?? []) as Array<Record<string, any>>).map((row) => ({
    answerId: row.answer_id,
    studentId: row.student_id,
    name: row.name || 'عضو',
    reference: row.reference || undefined,
    question: row.question || undefined,
    answerText: row.answer_text || '',
    reason: row.reason || undefined,
    checkedAt: row.checked_at,
    hasPost: Boolean(row.has_post),
    status: row.status || 'pending',
    handledAt: row.handled_at || undefined,
  }));
}

export async function reviewFlaggedAnswer(answerId: string, action: FlaggedAction): Promise<void> {
  const { error } = await supabase.rpc('review_flagged_answer', { p_answer_id: answerId, p_action: action });
  if (error) throw error;
}
