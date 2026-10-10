/**
 * Maseery Local & Supabase-Ready Database Storage
 */

import { User, TeacherWhitelistEntry, DailySpiritualTask, MemoryVerse, StudentRecord, PrayerRequest, AchievementBadge, SupabaseConfig } from '../types';

export const HEAD_EMAIL_DEFAULT = 'minasamehdeif@gmail.com';
export const HEAD_EMAIL_ALT = 'minasamehdeif@gamil.com';
export const HEAD_EMAILS = [
  'minasamehdeif@gmail.com',
  'minasamehdeif@gamil.com',
  'arsany.genius.mina@gmail.com',
];

const STORAGE_KEYS = {
  CURRENT_USER: 'maseery_current_user',
  USERS: 'maseery_users',
  TEACHERS_WHITELIST: 'maseery_teachers_whitelist',
  DAILY_TASKS: 'maseery_daily_tasks',
  STUDENT_RECORDS: 'maseery_student_records',
  PRAYER_REQUESTS: 'maseery_prayer_requests',
  BADGES: 'maseery_badges',
  SUPABASE_CONFIG: 'maseery_supabase_config',
  THEME: 'maseery_theme',
};

// Default seed data: Only Head configuration is preserved
const DEFAULT_HEAD_USER: User = {
  id: 'usr-head-01',
  name: 'مينا سامح ضيف',
  email: HEAD_EMAIL_DEFAULT,
  role: 'head',
  phone: '01223456789',
  churchName: 'كنيسة السيدة العذراء والشهيد مارمرقس',
  churchFamily: 'أمانة خدمة إعدادي العامة',
  spiritualFather: 'أبونا متى',
  streakDays: 45,
  points: 1250,
  createdAt: '2025-09-01T08:00:00Z',
};

const DEFAULT_TEACHERS_WHITELIST: TeacherWhitelistEntry[] = [];
const DEFAULT_STUDENT_RECORDS: StudentRecord[] = [];

const DEFAULT_DAILY_TASKS: DailySpiritualTask[] = [
  {
    id: 'task-1',
    title: 'صلاة باكر من الأجبية',
    subtitle: 'مزمور 62 وقراءة إنجيل النور الحقيقي',
    category: 'prayer',
    points: 20,
    completed: true,
  },
  {
    id: 'task-2',
    title: 'قراءة الإصحاح اليومي',
    subtitle: 'إنجيل متى - الإصحاح الخامس (الموعظة على الجبل)',
    category: 'bible',
    points: 25,
    completed: true,
  },
  {
    id: 'task-3',
    title: 'آية الأسبوع للحفظ وتطبيقها',
    subtitle: '«أَنْتُمْ نُورُ الْعَالَمِ. لاَ يُمْكِنُ أَنْ تُخْفَى مَدِينَةٌ مَوْضُوعَةٌ عَلَى جَبَل» (مت 5: 14)',
    category: 'verse',
    points: 15,
    completed: false,
  },
  {
    id: 'task-4',
    title: 'عمل محبة خفي اليوم',
    subtitle: 'مساعدة والديك في المنزل أو تشجيع زميل دراسي بكلمة طيبة',
    category: 'kindness',
    points: 20,
    completed: false,
  },
  {
    id: 'task-5',
    title: 'صلاة الغروب والنوم',
    subtitle: 'شكر الله على بركات اليوم وطلب سلام الروح',
    category: 'prayer',
    points: 20,
    completed: false,
  },
];

export const CURRENT_WEEK_VERSE: MemoryVerse = {
  id: 'verse-week-1',
  verseText: '«أَنْتُمْ نُورُ الْعَالَمِ. لاَ يُمْكِنُ أَنْ تُخْفَى مَدِينَةٌ مَوْضُوعَةٌ عَلَى جَبَلٍ»',
  reference: 'إنجيل متى ٥ : ١٤',
  weekTitle: 'الأسبوع الثاني - أنتم نور العالم',
  meaning: 'يدعونا السيد المسيح في مرحلة إعدادي أن نكون قدوة حسنة في المدرسة والبيت، فنشهد لاسم المسيح بأخلاقنا ومحبتنا الصادقة.',
};

const DEFAULT_BADGES: AchievementBadge[] = [
  {
    id: 'b-1',
    title: 'مواظب الأجبية',
    description: 'أتممت 7 أيام متتالية من صلاة باكر',
    iconName: 'book-open',
    isUnlocked: true,
    unlockedAt: '2025-10-04',
    category: 'spiritual',
  },
  {
    id: 'b-2',
    title: 'حارس الإنجيل',
    description: 'حفظت 5 آيات أسبوعية متتالية بنجاح',
    iconName: 'scroll',
    isUnlocked: true,
    unlockedAt: '2025-10-07',
    category: 'study',
  },
  {
    id: 'b-3',
    title: 'قلب نقي',
    description: 'مواظبة على سر الاعتراف والتناول الشهري',
    iconName: 'cross',
    isUnlocked: true,
    unlockedAt: '2025-10-01',
    category: 'spiritual',
  },
  {
    id: 'b-4',
    title: 'نجم الحضور الذهبي',
    description: 'نسبة حضور 100% في مدارس الأحد لشهر كامل',
    iconName: 'award',
    isUnlocked: false,
    category: 'attendance',
  },
  {
    id: 'b-5',
    title: 'سفير المحبة',
    description: 'أتممت 10 أعمال محبة وتشجيع لأخوتك',
    iconName: 'heart',
    isUnlocked: false,
    category: 'spiritual',
  },
];

const DEFAULT_PRAYER_REQUESTS: PrayerRequest[] = [
  {
    id: 'pr-1',
    studentId: 'usr-student-01',
    studentName: 'مارك عماد رفعت',
    content: 'أذكروني في الصلاة من أجل امتحانات الميدتيرم لمادة العلوم والأسبوع القادم.',
    isPrivate: true,
    status: 'pending',
    createdAt: '2025-10-08T18:20:00Z',
  },
  {
    id: 'pr-2',
    studentId: 'std-2',
    studentName: 'ساندرا أمير كامل',
    content: 'صلاة من أجل شفاء جدتي في المستشفى.',
    isPrivate: false,
    status: 'prayed',
    createdAt: '2025-10-07T14:10:00Z',
  },
];

const DEFAULT_SUPABASE_CONFIG: SupabaseConfig = {
  url: 'https://pduypklunvcsvabireuy.supabase.co',
  anonKey:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkdXlwa2x1bnZjc3ZhYmlyZXV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE1OTAzMzQsImV4cCI6MjEwNzE2NjMzNH0.5nNn5ltgOpOj3g5akdQerpXvHl1U6Ljz0xZI-lk1Leg',
  isConnected: true,
  autoSync: true,
  lastSync: '2026-10-09T23:21:00Z',
};

// Database Service Interface
export const Database = {
  // Theme
  getTheme(): 'light' | 'dark' {
    const saved = localStorage.getItem(STORAGE_KEYS.THEME);
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  },

  setTheme(theme: 'light' | 'dark') {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  },

  // Auth & Current User
  getCurrentUser(): User | null {
    const raw = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (!raw) {
      // Default to Head for initial interactive discovery or null
      return null;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  setCurrentUser(user: User | null) {
    if (!user) {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    } else {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    }
  },

  // Users store
  getUsers(): User[] {
    const raw = localStorage.getItem(STORAGE_KEYS.USERS);
    if (!raw) {
      return [];
    }
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  // Clear all users except the head and ensure the head signs up next time
  purgeAllUsersExceptHeadAndRequireSignUp() {
    try {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
      const raw = localStorage.getItem(STORAGE_KEYS.USERS);
      let keptHead: User[] = [];
      if (raw) {
        const parsed: User[] = JSON.parse(raw);
        keptHead = parsed.filter((u) => Database.isHeadEmail(u.email));
      }
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(keptHead));
      localStorage.removeItem(STORAGE_KEYS.STUDENT_RECORDS);
      localStorage.removeItem(STORAGE_KEYS.TEACHERS_WHITELIST);
    } catch {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
      localStorage.removeItem(STORAGE_KEYS.USERS);
    }
  },

  saveUser(user: User): User {
    const users = this.getUsers();
    const index = users.findIndex(u => u.id === user.id || u.email.toLowerCase() === user.email.toLowerCase());
    if (index >= 0) {
      users[index] = { ...users[index], ...user };
    } else {
      users.push(user);
    }
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    
    // Update current user if matches
    const current = this.getCurrentUser();
    if (current && (current.id === user.id || current.email.toLowerCase() === user.email.toLowerCase())) {
      this.setCurrentUser({ ...current, ...user });
    }
    return user;
  },

  // Role Checker
  isHeadEmail(email: string): boolean {
    if (!email) return false;
    const clean = email.trim().toLowerCase();
    return HEAD_EMAILS.some((h) => h.toLowerCase() === clean);
  },

  // Teachers Whitelist (Managed exclusively by Head!)
  getTeachersWhitelist(): TeacherWhitelistEntry[] {
    const raw = localStorage.getItem(STORAGE_KEYS.TEACHERS_WHITELIST);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.TEACHERS_WHITELIST, JSON.stringify(DEFAULT_TEACHERS_WHITELIST));
      return DEFAULT_TEACHERS_WHITELIST;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return DEFAULT_TEACHERS_WHITELIST;
    }
  },

  addTeacherEmail(
    email: string,
    name: string,
    addedByEmail: string,
    assignedGrade?: 'grade-1' | 'grade-2' | 'grade-3',
    notes?: string
  ): { success: boolean; message: string; entry?: TeacherWhitelistEntry } {
    // Permission check: only Head can add teachers!
    if (!this.isHeadEmail(addedByEmail)) {
      return {
        success: false,
        message: 'عفواً، لا يملك صلاحية إضافة المعلمين والخدام إلا أمين الخدمة العام (minasamehdeif@gmail.com).',
      };
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, message: 'يرجى إدخال بريد إلكتروني صالح.' };
    }

    const list = this.getTeachersWhitelist();
    const existing = list.find(t => t.email.toLowerCase() === cleanEmail);
    if (existing) {
      return { success: false, message: 'هذا البريد الإلكتروني مسجل بالفعل ضمن قائمة الخدام المعتمدين.' };
    }

    const newEntry: TeacherWhitelistEntry = {
      id: `tw-${Date.now()}`,
      email: cleanEmail,
      name: name.trim() || 'خادم جديد',
      assignedGrade: assignedGrade || 'grade-2',
      addedBy: addedByEmail,
      addedAt: new Date().toISOString(),
      notes: notes?.trim() || 'تمت الإضافة من قِبل أمين الخدمة',
      status: 'active',
    };

    list.unshift(newEntry);
    localStorage.setItem(STORAGE_KEYS.TEACHERS_WHITELIST, JSON.stringify(list));
    return { success: true, message: `تم إضافة الخادم (${newEntry.name}) بنجاح!`, entry: newEntry };
  },

  removeTeacherEmail(id: string, requesterEmail: string): { success: boolean; message: string } {
    if (!this.isHeadEmail(requesterEmail)) {
      return {
        success: false,
        message: 'عفواً، صلاحية حذف الخدام قاصرة على أمين الخدمة فقط.',
      };
    }

    const list = this.getTeachersWhitelist();
    const filtered = list.filter(t => t.id !== id);
    localStorage.setItem(STORAGE_KEYS.TEACHERS_WHITELIST, JSON.stringify(filtered));
    return { success: true, message: 'تم إزالة الخادم من القائمة بنجاح.' };
  },

  isEmailWhitelistedForTeacher(email: string): boolean {
    const clean = email.trim().toLowerCase();
    if (this.isHeadEmail(clean)) return true;
    const list = this.getTeachersWhitelist();
    return list.some(t => t.email.toLowerCase() === clean && t.status === 'active');
  },

  // Student Records & Attendance
  getStudentRecords(): StudentRecord[] {
    const raw = localStorage.getItem(STORAGE_KEYS.STUDENT_RECORDS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.STUDENT_RECORDS, JSON.stringify(DEFAULT_STUDENT_RECORDS));
      return DEFAULT_STUDENT_RECORDS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return DEFAULT_STUDENT_RECORDS;
    }
  },

  awardPointsToStudent(studentId: string, pointsToAdd: number, reason: string): StudentRecord | null {
    const records = this.getStudentRecords();
    const index = records.findIndex(r => r.id === studentId);
    if (index >= 0) {
      records[index].points += pointsToAdd;
      records[index].teacherNotes = `${records[index].teacherNotes} | +${pointsToAdd} نقطة: ${reason}`;
      localStorage.setItem(STORAGE_KEYS.STUDENT_RECORDS, JSON.stringify(records));
      return records[index];
    }
    return null;
  },

  // Daily Tasks
  getDailyTasks(): DailySpiritualTask[] {
    const raw = localStorage.getItem(STORAGE_KEYS.DAILY_TASKS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.DAILY_TASKS, JSON.stringify(DEFAULT_DAILY_TASKS));
      return DEFAULT_DAILY_TASKS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return DEFAULT_DAILY_TASKS;
    }
  },

  toggleDailyTask(taskId: string): { task: DailySpiritualTask; totalCompleted: number } | null {
    const tasks = this.getDailyTasks();
    const task = tasks.find(t => t.id === taskId);
    if (!task) return null;

    task.completed = !task.completed;
    localStorage.setItem(STORAGE_KEYS.DAILY_TASKS, JSON.stringify(tasks));

    // Update student's points if student is logged in
    const current = this.getCurrentUser();
    if (current && current.role === 'student') {
      const delta = task.completed ? task.points : -task.points;
      current.points = Math.max(0, current.points + delta);
      this.saveUser(current);
    }

    const totalCompleted = tasks.filter(t => t.completed).length;
    return { task, totalCompleted };
  },

  // Badges
  getBadges(): AchievementBadge[] {
    const raw = localStorage.getItem(STORAGE_KEYS.BADGES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.BADGES, JSON.stringify(DEFAULT_BADGES));
      return DEFAULT_BADGES;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return DEFAULT_BADGES;
    }
  },

  // Prayer Requests
  getPrayerRequests(): PrayerRequest[] {
    const raw = localStorage.getItem(STORAGE_KEYS.PRAYER_REQUESTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.PRAYER_REQUESTS, JSON.stringify(DEFAULT_PRAYER_REQUESTS));
      return DEFAULT_PRAYER_REQUESTS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return DEFAULT_PRAYER_REQUESTS;
    }
  },

  addPrayerRequest(studentName: string, content: string, isPrivate: boolean): PrayerRequest {
    const requests = this.getPrayerRequests();
    const current = this.getCurrentUser();
    const newReq: PrayerRequest = {
      id: `pr-${Date.now()}`,
      studentId: current?.id || 'usr-student-01',
      studentName: studentName.trim() || current?.name || 'طالب في إعدادي',
      content: content.trim(),
      isPrivate,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    requests.unshift(newReq);
    localStorage.setItem(STORAGE_KEYS.PRAYER_REQUESTS, JSON.stringify(requests));
    return newReq;
  },

  markPrayerDone(id: string): void {
    const requests = this.getPrayerRequests();
    const req = requests.find(r => r.id === id);
    if (req) {
      req.status = 'prayed';
      localStorage.setItem(STORAGE_KEYS.PRAYER_REQUESTS, JSON.stringify(requests));
    }
  },

  // Supabase Configuration
  getSupabaseConfig(): SupabaseConfig {
    const raw = localStorage.getItem(STORAGE_KEYS.SUPABASE_CONFIG);
    if (!raw) {
      return DEFAULT_SUPABASE_CONFIG;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return DEFAULT_SUPABASE_CONFIG;
    }
  },

  saveSupabaseConfig(config: SupabaseConfig): void {
    localStorage.setItem(STORAGE_KEYS.SUPABASE_CONFIG, JSON.stringify(config));
  },

  // Generate Supabase SQL Migration Script for the database
  generateSupabaseSQLSchema(): string {
    return `-- ========================================================
-- مَسِيري (Maseery) - Church Middle School Ministry Schema
-- Supabase PostgreSQL Migration Script
-- ========================================================

-- 1. Enable UUID Extension
create extension if not exists "uuid-ossp";

-- 2. Create User Roles Enum
create type user_role as enum ('head', 'teacher', 'student');
create type middle_school_grade as enum ('grade-1', 'grade-2', 'grade-3');

-- 3. Users Table (Profiles linked to auth.users)
create table public.users (
  id uuid primary key default uuid_generate_v4(),
  email text unique not null,
  name text not null,
  role user_role not null default 'student',
  phone text,
  church_name text default 'كنيسة السيدة العذراء والشهيد مارمرقس',
  grade_level middle_school_grade,
  church_family text,
  spiritual_father text,
  avatar_url text,
  streak_days integer default 0,
  points integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Authorized Teachers Whitelist Table (Restricted to Head only!)
create table public.teachers_whitelist (
  id uuid primary key default uuid_generate_v4(),
  email text unique not null,
  name text not null,
  assigned_grade middle_school_grade,
  added_by text not null,
  notes text,
  status text default 'active',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Seed initial Head & default whitelisted teachers
insert into public.teachers_whitelist (email, name, assigned_grade, added_by, notes)
values 
  ('${HEAD_EMAIL_DEFAULT}', 'مينا سامح ضيف (أمين الخدمة)', null, 'system', 'الأمين العام للخدمة'),
  ('teacher.fady@maseery.org', 'أ/ فادي يوسف', 'grade-2', '${HEAD_EMAIL_DEFAULT}', 'فصل ثانية إعدادي'),
  ('teacher.mary@maseery.org', 'ت/ ماري سامي', 'grade-1', '${HEAD_EMAIL_DEFAULT}', 'فصل أولى إعدادي')
on conflict (email) do nothing;

-- 5. Daily Spiritual Tasks Table
create table public.daily_tasks (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  subtitle text,
  category text not null,
  points integer default 15,
  is_active boolean default true
);

-- 6. Student Daily Logs
create table public.student_daily_logs (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid references public.users(id) on delete cascade,
  task_id uuid references public.daily_tasks(id) on delete cascade,
  completed boolean default false,
  date date default current_date,
  unique (student_id, task_id, date)
);

-- 7. Prayer Requests Table
create table public.prayer_requests (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid references public.users(id) on delete cascade,
  student_name text not null,
  content text not null,
  is_private boolean default true,
  status text default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 8. Row Level Security (RLS) Policies
alter table public.users enable row level security;
alter table public.teachers_whitelist enable row level security;
alter table public.prayer_requests enable row level security;

-- Policy: Anyone can read their own profile, servants can read students
create policy "Users can view profile" on public.users
  for select using (auth.uid() = id or exists (
    select 1 from public.users where id = auth.uid() and role in ('head', 'teacher')
  ));

-- Policy: Only Head can insert or delete teachers_whitelist
create policy "Only Head can modify teachers_whitelist" on public.teachers_whitelist
  for all using (
    exists (
      select 1 from public.users 
      where id = auth.uid() and (email = '${HEAD_EMAIL_DEFAULT}' or role = 'head')
    )
  );

-- All teachers and heads can view whitelist
create policy "Servants can view teachers_whitelist" on public.teachers_whitelist
  for select using (
    exists (
      select 1 from public.users where id = auth.uid() and role in ('head', 'teacher')
    )
  );
`;
  },
};

// Clear all users except the head, and ensure the head signs up next time he enters
Database.purgeAllUsersExceptHeadAndRequireSignUp();
