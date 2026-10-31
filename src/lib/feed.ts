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
};

export const FEED_PAGE_SIZE = 30;

/** Posts ordered by likes (most first), then newest. */
export async function fetchReadingFeed(offset = 0, limit = FEED_PAGE_SIZE): Promise<FeedPost[]> {
  const { data, error } = await supabase.rpc('get_reading_feed', { p_limit: limit, p_offset: offset });
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
    answerText: row.answer_text || '',
    currentStreak: Number(row.current_streak || 0),
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
