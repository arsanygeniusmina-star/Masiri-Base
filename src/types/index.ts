/**
 * Type definitions for Maseery (THE APOSTLES)
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

export interface ManagedRoleAccount {
  id?: string;
  email: string;
  name: string;
  role: 'teacher' | 'head' | 'test';
  assigned_grade?: MiddleSchoolGrade | null;
  status: 'active' | 'invited';
  created_at?: string;
}

export interface ManagedStudent {
  id: string;
  email: string;
  name: string;
  gradeLevel?: MiddleSchoolGrade | null;
  points: number;
  streakDays: number;
  avatarUrl?: string | null;
  createdAt?: string;
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

// ---------------------------------------------------------------------------
// Bible Study & Daily Readings (إصحاح النهارده)
// ---------------------------------------------------------------------------

export type BibleTestament = 'OT' | 'NT';

export interface BibleBook {
  /** Stable id shared with the `public.reading_bible_books` table (e.g. 'john'). */
  id: string;
  /** Full Arabic name, e.g. 'إنجيل يوحنا'. */
  name: string;
  /** Short Arabic name, e.g. 'يوحنا'. */
  shortName: string;
  altNames: string[];
  testament: BibleTestament;
  category: string;
  totalChapters: number;
  /** Book number used by the SVD (Van Dyck) text provider. */
  bollsNumber: number;
}

export interface BibleVerse {
  number: number;
  text: string;
}

/** A contiguous verse range picked in the Bible reader, ready to assign. */
export interface BiblePassageSelection {
  book: BibleBook;
  chapter: number;
  verseStart: number;
  verseEnd: number;
  verses: BibleVerse[];
  /** Arabic reference, e.g. 'إنجيل يوحنا ٣:١٦–١٨'. */
  reference: string;
}

export interface BiblePassage {
  id: string;
  bookId: string;
  chapter: number;
  verseStart: number;
  verseEnd: number;
  reference: string;
  verses: BibleVerse[];
}

export type ReadingAssignmentStatus = 'draft' | 'published' | 'archived';
/** 'grade' = one class, 'students' = picked students, 'all' = every student (head only). */
export type ReadingTargetType = 'grade' | 'students' | 'all';

export interface ReadingAssignment {
  id: string;
  createdBy: string | null;
  creatorName?: string;
  title?: string;
  targetType: ReadingTargetType;
  targetGrade?: MiddleSchoolGrade;
  /** Explicit recipients (only for targetType = 'students', limited by RLS). */
  recipientIds: string[];
  /** Calendar date (YYYY-MM-DD) in the assignment's time zone. */
  scheduledDate: string;
  timezone: string;
  questionText?: string;
  /** Verse number used in the daily reminder (inside the passage). */
  reminderVerse?: number;
  status: ReadingAssignmentStatus;
  publishedAt?: string;
  createdAt: string;
  passage: BiblePassage;
}

export interface ReadingCompletion {
  id: string;
  assignmentId: string;
  studentId: string;
  /** Server timestamp (ISO). */
  completedAt: string;
  /** Student's local calendar date of completion (YYYY-MM-DD). */
  localDate: string;
  /** The day this completion counts for in the Streak (the reading's scheduled date). */
  creditedDate?: string;
  /** Storage path of the photo taken after reading (bucket `reading-photos`). */
  photoPath?: string;
}

export interface ReadingAnswer {
  id: string;
  assignmentId: string;
  studentId: string;
  answerText: string;
  submittedAt: string;
  updatedAt: string;
}

export interface ReadingStreak {
  studentId: string;
  currentStreak: number;
  longestStreak: number;
  lastCompletedDate?: string;
  totalReadingDays: number;
  completedToday: boolean;
}

export interface ReadingStudent {
  id: string;
  name: string;
  gradeLevel?: MiddleSchoolGrade;
}

export type ReadingCellStatus = 'completed' | 'incomplete' | 'overdue' | 'upcoming' | 'not-assigned';

export interface NewReadingAssignmentInput {
  passage: BiblePassageSelection;
  title?: string;
  targetType: ReadingTargetType;
  targetGrade?: MiddleSchoolGrade;
  studentIds: string[];
  scheduledDate: string;
  timezone: string;
  questionText?: string;
  publish: boolean;
  reminderVerse?: number;
}
