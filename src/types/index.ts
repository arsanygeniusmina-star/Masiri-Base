/**
 * Type definitions for Maseery (مسيري)
 * Church Middle School Ministry Platform
 */

export type UserRole = 'head' | 'teacher' | 'student' | 'test';

export type MiddleSchoolGrade = 'grade-1' | 'grade-2' | 'grade-3';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  churchName?: string;
  gradeLevel?: MiddleSchoolGrade;
  churchFamily?: string;
  spiritualFather?: string;
  avatarUrl?: string;
  streakDays: number;
  points: number;
  createdAt: string;
}

export interface TeacherWhitelistEntry {
  id: string;
  email: string;
  name: string;
  assignedGrade?: MiddleSchoolGrade;
  addedBy: string;
  addedAt: string;
  notes?: string;
  status: 'active' | 'invited';
}

export interface DailySpiritualTask {
  id: string;
  title: string;
  subtitle: string;
  category: 'prayer' | 'bible' | 'liturgy' | 'verse' | 'kindness';
  points: number;
  completed: boolean;
}

export interface MemoryVerse {
  id: string;
  verseText: string;
  reference: string;
  weekTitle: string;
  meaning: string;
  audioSimulated?: boolean;
}

export interface StudentRecord {
  id: string;
  name: string;
  email: string;
  gradeLevel: MiddleSchoolGrade;
  churchFamily: string;
  spiritualFather: string;
  phone: string;
  attendanceRate: number; // percentage
  points: number;
  streakDays: number;
  lastActive: string;
  teacherNotes: string;
}

export interface PrayerRequest {
  id: string;
  studentId: string;
  studentName: string;
  content: string;
  isPrivate: boolean;
  status: 'pending' | 'prayed';
  createdAt: string;
}

export interface AchievementBadge {
  id: string;
  title: string;
  description: string;
  iconName: string;
  isUnlocked: boolean;
  unlockedAt?: string;
  category: 'spiritual' | 'attendance' | 'study';
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConnected: boolean;
  lastSync?: string;
  autoSync: boolean;
}
