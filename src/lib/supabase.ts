import { createClient } from '@supabase/supabase-js';
import type { User, MiddleSchoolGrade, UserRole } from '../types';

// The URL and anon/publishable key are public client configuration, never a service-role secret.
// Keep the existing project's public values as fallback so current deployments continue to work;
// Vercel/local deployments can override them with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.
export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://pduypklunvcsvabireuy.supabase.co';
export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJIUzI1NiIsInJlZiI6InBkdXlwa2x1bnZjc3ZhYmlyZXV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE1OTAzMzQsImV4cCI6MjEwNzE2NjMzNH0.5nNn5ltgOpOj3g5akdQerpXvHl1U6Ljz0xZI-lk1Leg';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

type UserProfileRow = {
  id: string;
  email: string;
  name: string;
  role: string;
  phone?: string | null;
  church_name?: string | null;
  grade_level?: string | null;
  church_family?: string | null;
  spiritual_father?: string | null;
  avatar_url?: string | null;
  streak_days?: number | null;
  points?: number | null;
  created_at?: string | null;
};

const validRoles: UserRole[] = ['head', 'teacher', 'student', 'test'];
const validGrades: MiddleSchoolGrade[] = ['grade-1', 'grade-2', 'grade-3'];

export function mapUserProfile(row: UserProfileRow): User {
  const role = validRoles.includes(row.role as UserRole) ? row.role as UserRole : 'student';
  const gradeLevel = validGrades.includes(row.grade_level as MiddleSchoolGrade)
    ? row.grade_level as MiddleSchoolGrade
    : undefined;

  return {
    id: row.id,
    email: row.email,
    name: row.name || row.email.split('@')[0],
    role,
    phone: row.phone || undefined,
    churchName: row.church_name || undefined,
    gradeLevel,
    churchFamily: row.church_family || undefined,
    spiritualFather: row.spiritual_father || undefined,
    avatarUrl: row.avatar_url || undefined,
    streakDays: Number(row.streak_days || 0),
    points: Number(row.points || 0),
    createdAt: row.created_at || new Date().toISOString(),
  };
}

export async function fetchUserProfile(userId: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  return data ? mapUserProfile(data as UserProfileRow) : null;
}

export async function testSupabaseConnection(
  url?: string,
  anonKey?: string,
): Promise<{ connected: boolean; message: string; hasTables: boolean }> {
  try {
    const client = url && anonKey
      ? createClient(url.replace(/\/$/, ''), anonKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        })
      : supabase;

    const { error } = await client
      .from('daily_tasks')
      .select('id', { head: true, count: 'exact' });

    if (error) {
      const missingTable = error.code === '42P01' || error.code === 'PGRST205';
      return {
        connected: !missingTable && !/fetch failed|failed to fetch|network/i.test(error.message),
        hasTables: false,
        message: missingTable
          ? 'تم الوصول إلى Supabase، لكن جدول daily_tasks غير موجود في هذا المشروع.'
          : `وصل الطلب إلى Supabase لكن فحص الجدول لم ينجح: ${error.message}`,
      };
    }

    return {
      connected: true,
      hasTables: true,
      message: 'اتصال Supabase ناجح وجدول المهام متاح عبر Data API.',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'تعذر الاتصال بـ Supabase.';
    return { connected: false, hasTables: false, message };
  }
}
