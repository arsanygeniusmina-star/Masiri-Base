import { supabase } from './supabase';
import type { MiddleSchoolGrade } from '../types';

export interface LeaderboardEntry {
  userId: string;
  name: string;
  points: number;
  gradeLevel?: MiddleSchoolGrade;
  avatarUrl?: string;
  rank: number;
}

type LeaderboardRow = {
  user_id: string;
  name: string | null;
  points: number | null;
  grade_level: string | null;
  avatar_url: string | null;
  rank: number | null;
};

const GRADES: MiddleSchoolGrade[] = ['grade-1', 'grade-2', 'grade-3'];

/** All students ranked by points (database function public.get_points_leaderboard). */
export async function fetchPointsLeaderboard(): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase.rpc('get_points_leaderboard');
  if (error) throw error;
  return ((data ?? []) as LeaderboardRow[]).map((row, index) => ({
    userId: row.user_id,
    name: row.name || 'طالب',
    points: Number(row.points || 0),
    gradeLevel: GRADES.includes(row.grade_level as MiddleSchoolGrade) ? (row.grade_level as MiddleSchoolGrade) : undefined,
    avatarUrl: row.avatar_url || undefined,
    rank: Number(row.rank || index + 1),
  }));
}

/** Local sample data for the TEST role's preview (no real accounts). */
export function demoLeaderboard(currentUserId: string, currentName: string): LeaderboardEntry[] {
  const rows: Array<[string, string, number, MiddleSchoolGrade]> = [
    ['demo-1', 'مارك', 420, 'grade-2'],
    ['demo-2', 'مريم', 385, 'grade-1'],
    [currentUserId, currentName, 310, 'grade-1'],
    ['demo-3', 'بيشوي', 310, 'grade-3'],
    ['demo-4', 'كيرلس', 240, 'grade-2'],
    ['demo-5', 'ماريا', 180, 'grade-3'],
    ['demo-6', 'يوستينا', 95, 'grade-1'],
  ];
  let rank = 0;
  let previous = Number.POSITIVE_INFINITY;
  return rows.map(([userId, name, points, gradeLevel], index) => {
    if (points < previous) rank = index + 1;
    previous = points;
    return { userId, name, points, gradeLevel, rank };
  });
}
