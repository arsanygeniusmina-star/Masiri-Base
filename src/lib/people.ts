import { supabase } from './supabase';
import type { UserRole } from '../types';

/** One person on «ورينى». */
export interface PersonStreak {
  userId: string;
  name: string;
  avatarUrl?: string;
  role: UserRole;
  currentStreak: number;
  longestStreak: number;
  totalReadingDays: number;
  completedToday: boolean;
}

/** One reading day of a person (newest first). */
export interface PersonReading {
  completionId: string;
  readingDate: string;
  reference?: string;
  photoPath?: string;
  completedAt: string;
  likeCount: number;
  likedByMe: boolean;
}

/** Everyone you may see, highest current Streak first. */
export async function fetchPeopleStreaks(): Promise<PersonStreak[]> {
  const { data, error } = await supabase.rpc('get_people_streaks');
  if (error) throw error;
  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    userId: String(row.user_id),
    name: String(row.name || 'عضو'),
    avatarUrl: (row.avatar_url as string | null) || undefined,
    role: (row.role as UserRole) || 'student',
    currentStreak: Number(row.current_streak || 0),
    longestStreak: Number(row.longest_streak || 0),
    totalReadingDays: Number(row.total_reading_days || 0),
    completedToday: Boolean(row.completed_today),
  }));
}

/** The reading days of one person. */
export async function fetchPersonReadings(userId: string): Promise<PersonReading[]> {
  const { data, error } = await supabase.rpc('get_person_readings', { p_user_id: userId });
  if (error) throw error;
  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    completionId: String(row.completion_id),
    readingDate: String(row.reading_date),
    reference: (row.reference_ar as string | null) || undefined,
    photoPath: (row.photo_path as string | null) || undefined,
    completedAt: String(row.completed_at),
    likeCount: Number(row.like_count || 0),
    likedByMe: Boolean(row.liked_by_me),
  }));
}

/** Search that ignores case, extra spaces and Arabic letter variants (أ/إ/آ → ا, ة → ه, ى → ي). */
export function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[ً-ْـ]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[_.\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
