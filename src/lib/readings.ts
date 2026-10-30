import { supabase } from './supabase';
import { findBibleBook } from './bible/books';
import { addDaysToKey, canCompleteReadingOn, compareDateKeys, localDateKey, readingWeekStart } from './readingDates';
import type {
  BiblePassage,
  BibleVerse,
  MiddleSchoolGrade,
  NewReadingAssignmentInput,
  ReadingAnswer,
  ReadingAssignment,
  ReadingAssignmentStatus,
  ReadingCellStatus,
  ReadingCompletion,
  ReadingStreak,
  ReadingStudent,
} from '../types';

/* -------------------------------------------------------------------------- */
/* Row mapping                                                                 */
/* -------------------------------------------------------------------------- */

type PassageRow = {
  id: string;
  book_id: string;
  chapter: number;
  verse_start: number;
  verse_end: number;
  reference_ar: string;
  verses: unknown;
};

type AssignmentRow = {
  id: string;
  created_by: string | null;
  title: string | null;
  target_type: string;
  target_grade: string | null;
  scheduled_date: string;
  timezone: string | null;
  question_text: string | null;
  reminder_verse?: number | null;
  status: string;
  published_at: string | null;
  created_at: string;
  passage: PassageRow | PassageRow[] | null;
  recipients?: { student_id: string }[] | null;
  creator?: { name: string | null } | { name: string | null }[] | null;
};

const GRADES: MiddleSchoolGrade[] = ['grade-1', 'grade-2', 'grade-3'];
const STATUSES: ReadingAssignmentStatus[] = ['draft', 'published', 'archived'];

const one = <T,>(value: T | T[] | null | undefined): T | null =>
  Array.isArray(value) ? value[0] ?? null : value ?? null;

function mapVerses(raw: unknown): BibleVerse[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item: { number?: unknown; text?: unknown }) => ({ number: Number(item?.number), text: String(item?.text ?? '') }))
    .filter((verse) => Number.isInteger(verse.number) && verse.text.length > 0);
}

function mapPassage(row: PassageRow): BiblePassage {
  return {
    id: row.id,
    bookId: row.book_id,
    chapter: Number(row.chapter),
    verseStart: Number(row.verse_start),
    verseEnd: Number(row.verse_end),
    reference: row.reference_ar,
    verses: mapVerses(row.verses),
  };
}

const EMPTY_PASSAGE: BiblePassage = { id: '', bookId: '', chapter: 1, verseStart: 1, verseEnd: 1, reference: '', verses: [] };

function mapAssignment(row: AssignmentRow): ReadingAssignment {
  const passage = one(row.passage);
  const creator = one(row.creator);
  return {
    id: row.id,
    createdBy: row.created_by,
    creatorName: creator?.name || undefined,
    title: row.title || undefined,
    targetType: row.target_type === 'students' ? 'students' : row.target_type === 'all' ? 'all' : 'grade',
    targetGrade: GRADES.includes(row.target_grade as MiddleSchoolGrade) ? (row.target_grade as MiddleSchoolGrade) : undefined,
    recipientIds: (row.recipients || []).map((recipient) => recipient.student_id),
    scheduledDate: row.scheduled_date,
    timezone: row.timezone || 'Africa/Cairo',
    questionText: row.question_text || undefined,
    reminderVerse: row.reminder_verse ? Number(row.reminder_verse) : undefined,
    status: STATUSES.includes(row.status as ReadingAssignmentStatus) ? (row.status as ReadingAssignmentStatus) : 'draft',
    publishedAt: row.published_at || undefined,
    createdAt: row.created_at,
    passage: passage ? mapPassage(passage) : EMPTY_PASSAGE,
  };
}

const mapCompletion = (row: { id: string; assignment_id: string; student_id: string; completed_at: string; local_date: string; photo_path?: string | null; credited_date?: string | null }): ReadingCompletion => ({
  id: row.id,
  assignmentId: row.assignment_id,
  studentId: row.student_id,
  completedAt: row.completed_at,
  localDate: row.local_date,
  photoPath: row.photo_path || undefined,
  creditedDate: row.credited_date || undefined,
});

const COMPLETION_SELECT = 'id, assignment_id, student_id, completed_at, local_date, photo_path, credited_date';

const mapAnswer = (row: { id: string; assignment_id: string; student_id: string; answer_text: string; submitted_at: string; updated_at: string }): ReadingAnswer => ({
  id: row.id,
  assignmentId: row.assignment_id,
  studentId: row.student_id,
  answerText: row.answer_text,
  submittedAt: row.submitted_at,
  updatedAt: row.updated_at,
});

/* -------------------------------------------------------------------------- */
/* Errors                                                                      */
/* -------------------------------------------------------------------------- */

export class ReadingDataError extends Error {
  constructor(message: string, readonly details?: unknown) {
    super(message);
    this.name = 'ReadingDataError';
  }
}

function friendlyError(error: { code?: string; message?: string } | null | undefined, fallback: string): ReadingDataError {
  const code = error?.code;
  const message = error?.message || '';
  if (code === '42P01' || code === 'PGRST205' || /does not exist|schema cache/i.test(message)) {
    return new ReadingDataError('ميزة القراءات غير مفعّلة بعد في قاعدة البيانات. يرجى تطبيق ملف الترحيل الخاص بالقراءات اليومية.', error);
  }
  if (code === '42501' || /row-level security|permission denied|not authorized|Only servants/i.test(message)) {
    return new ReadingDataError('ليس لديك صلاحية لتنفيذ هذا الإجراء على هذه القراءة أو هؤلاء الطلاب.', error);
  }
  if (/not open yet/i.test(message)) return new ReadingDataError('هذه القراءة لم يحن موعدها بعد.', error);
  if (/Invalid local completion date/i.test(message)) return new ReadingDataError('تاريخ جهازك غير مضبوط. اضبط التاريخ والوقت ثم حاول مرة أخرى.', error);
  if (/Choose at least one student/i.test(message)) return new ReadingDataError('اختر طالبًا واحدًا على الأقل.', error);
  if (/Answer required/i.test(message)) return new ReadingDataError('أجب عن سؤال التأمل أولًا، ثم اضغط «تمت القراءة».', error);
  if (/Photo proof required/i.test(message)) return new ReadingDataError('التقط صورة بالكاميرا بعد القراءة، ثم اضغط «تمت القراءة».', error);
  if (/mime|size|too large|Payload/i.test(message)) return new ReadingDataError('تعذر رفع الصورة. جرّب صورة أخرى (الحد الأقصى ٥ ميجابايت).', error);
  if (/fetch|network/i.test(message)) return new ReadingDataError('تعذر الاتصال بالخادم. تحقق من الإنترنت ثم حاول مرة أخرى.', error);
  return new ReadingDataError(fallback, error);
}

/* -------------------------------------------------------------------------- */
/* Queries                                                                     */
/* -------------------------------------------------------------------------- */

const ASSIGNMENT_FIELDS =
  'id, created_by, title, target_type, target_grade, scheduled_date, timezone, question_text, reminder_verse, status, published_at, created_at, ' +
  'recipients:reading_assignment_recipients(student_id), ' +
  'creator:users!reading_assignments_created_by_fkey(name)';
const ASSIGNMENT_SELECT = `${ASSIGNMENT_FIELDS}, passage:bible_passages(id, book_id, chapter, verse_start, verse_end, reference_ar, verses)`;
/** Same without the verse text: a whole reading plan stays light for list/progress screens. */
const ASSIGNMENT_SELECT_LIGHT = `${ASSIGNMENT_FIELDS}, passage:bible_passages(id, book_id, chapter, verse_start, verse_end, reference_ar)`;

/** Supabase returns at most 1000 rows per request, so larger reads are paged. */
const PAGE_SIZE = 1000;

/** Assignments visible to the signed-in user. RLS decides the scope. */
export async function fetchReadingAssignments(options: {
  includeArchived?: boolean;
  includeDrafts?: boolean;
  /** Inclusive YYYY-MM-DD bounds on scheduled_date. */
  fromDate?: string;
  toDate?: string;
  /** Load the passage text (needed to read; not needed for lists). Default true. */
  includeVerses?: boolean;
} = {}): Promise<ReadingAssignment[]> {
  const statuses: ReadingAssignmentStatus[] = ['published'];
  if (options.includeDrafts) statuses.push('draft');
  if (options.includeArchived) statuses.push('archived');

  const rows: AssignmentRow[] = [];
  for (let from = 0; from < 5 * PAGE_SIZE; from += PAGE_SIZE) {
    let query = supabase
      .from('reading_assignments')
      .select(options.includeVerses === false ? ASSIGNMENT_SELECT_LIGHT : ASSIGNMENT_SELECT)
      .in('status', statuses);
    if (options.fromDate) query = query.gte('scheduled_date', options.fromDate);
    if (options.toDate) query = query.lte('scheduled_date', options.toDate);
    const { data, error } = await query
      .order('scheduled_date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw friendlyError(error, 'تعذر تحميل القراءات.');
    const page = (data || []) as unknown as AssignmentRow[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
  }
  return rows.map(mapAssignment);
}

/** Runs a filtered read in id chunks (short URLs) and pages through each chunk. */
async function fetchByAssignmentChunks<T>(
  assignmentIds: string[] | undefined,
  run: (ids: string[] | undefined, from: number, to: number) => PromiseLike<{ data: unknown[] | null; error: { code?: string; message?: string } | null }>,
  fallbackMessage: string,
): Promise<T[]> {
  const chunks: (string[] | undefined)[] = [];
  if (!assignmentIds) chunks.push(undefined);
  else for (let index = 0; index < assignmentIds.length; index += 60) chunks.push(assignmentIds.slice(index, index + 60));
  const rows: T[] = [];
  for (const ids of chunks) {
    for (let from = 0; from < 20 * PAGE_SIZE; from += PAGE_SIZE) {
      const { data, error } = await run(ids, from, from + PAGE_SIZE - 1);
      if (error) throw friendlyError(error, fallbackMessage);
      const page = (data || []) as T[];
      rows.push(...page);
      if (page.length < PAGE_SIZE) break;
    }
  }
  return rows;
}

export async function fetchReadingCompletions(filter: { studentId?: string; assignmentIds?: string[] } = {}): Promise<ReadingCompletion[]> {
  if (filter.assignmentIds && filter.assignmentIds.length === 0) return [];
  type Row = Parameters<typeof mapCompletion>[0];
  const rows = await fetchByAssignmentChunks<Row>(
    filter.assignmentIds,
    (ids, from, to) => {
      let query = supabase.from('reading_completions').select(COMPLETION_SELECT);
      if (filter.studentId) query = query.eq('student_id', filter.studentId);
      if (ids) query = query.in('assignment_id', ids);
      return query.order('completed_at', { ascending: false }).range(from, to);
    },
    'تعذر تحميل سجل القراءة.',
  );
  return rows.map(mapCompletion);
}

export async function fetchReadingAnswers(filter: { studentId?: string; assignmentIds?: string[] } = {}): Promise<ReadingAnswer[]> {
  if (filter.assignmentIds && filter.assignmentIds.length === 0) return [];
  type Row = Parameters<typeof mapAnswer>[0];
  const rows = await fetchByAssignmentChunks<Row>(
    filter.assignmentIds,
    (ids, from, to) => {
      let query = supabase.from('reading_answers').select('id, assignment_id, student_id, answer_text, submitted_at, updated_at');
      if (filter.studentId) query = query.eq('student_id', filter.studentId);
      if (ids) query = query.in('assignment_id', ids);
      return query.order('submitted_at', { ascending: false }).range(from, to);
    },
    'تعذر تحميل الإجابات.',
  );
  return rows.map(mapAnswer);
}

/** Students the signed-in servant may see (teacher: own grade; head: all). */
export async function fetchScopedStudents(): Promise<ReadingStudent[]> {
  const { data, error } = await supabase
    .from('users')
    .select('id, name, grade_level')
    .eq('role', 'student')
    .order('name');
  if (error) throw friendlyError(error, 'تعذر تحميل قائمة الطلاب.');
  return (data || []).map((row: { id: string; name: string | null; grade_level: string | null }) => ({
    id: row.id,
    name: row.name || 'طالب',
    gradeLevel: GRADES.includes(row.grade_level as MiddleSchoolGrade) ? (row.grade_level as MiddleSchoolGrade) : undefined,
  }));
}

export async function fetchReadingStreaks(studentIds: string[], today: string = localDateKey()): Promise<ReadingStreak[]> {
  if (studentIds.length === 0) return [];
  const results: ReadingStreak[] = [];
  // The database function accepts up to 500 ids per call.
  for (let index = 0; index < studentIds.length; index += 500) {
    const { data, error } = await supabase.rpc('get_reading_streaks', {
      p_student_ids: studentIds.slice(index, index + 500),
      p_today: today,
    });
    if (error) throw friendlyError(error, 'تعذر حساب سلسلة القراءة.');
    for (const row of (data || []) as {
      student_id: string;
      current_streak: number;
      longest_streak: number;
      last_completed_date: string | null;
      total_reading_days: number;
      completed_today: boolean;
    }[]) {
      results.push({
        studentId: row.student_id,
        currentStreak: Number(row.current_streak || 0),
        longestStreak: Number(row.longest_streak || 0),
        lastCompletedDate: row.last_completed_date || undefined,
        totalReadingDays: Number(row.total_reading_days || 0),
        completedToday: Boolean(row.completed_today),
      });
    }
  }
  return results;
}

/* -------------------------------------------------------------------------- */
/* Mutations                                                                   */
/* -------------------------------------------------------------------------- */

/** Creates passage + assignment + recipients (+ publish) in one database transaction. */
export async function createReadingAssignment(input: NewReadingAssignmentInput): Promise<string> {
  const { passage } = input;
  const { data, error } = await supabase.rpc('create_reading_assignment', {
    p_book_id: passage.book.id,
    p_chapter: passage.chapter,
    p_verse_start: passage.verseStart,
    p_verse_end: passage.verseEnd,
    p_reference_ar: passage.reference,
    p_verses: passage.verses.map((verse) => ({ number: verse.number, text: verse.text })),
    p_target_type: input.targetType,
    p_target_grade: input.targetType === 'grade' ? input.targetGrade ?? null : null,
    p_student_ids: input.targetType === 'students' ? input.studentIds : [],
    p_scheduled_date: input.scheduledDate,
    p_timezone: input.timezone,
    p_question_text: input.questionText?.trim() || null,
    p_title: input.title?.trim() || null,
    p_publish: input.publish,
    p_reminder_verse: input.reminderVerse ?? null,
  });
  if (error || !data) throw friendlyError(error, 'تعذر حفظ القراءة. حاول مرة أخرى.');
  return String(data);
}

export async function updateReadingAssignmentStatus(assignmentId: string, status: ReadingAssignmentStatus): Promise<void> {
  const { error } = await supabase.from('reading_assignments').update({ status }).eq('id', assignmentId);
  if (error) throw friendlyError(error, 'تعذر تحديث حالة القراءة.');
}

export async function deleteDraftReadingAssignment(assignmentId: string): Promise<void> {
  const { error } = await supabase.from('reading_assignments').delete().eq('id', assignmentId).eq('status', 'draft');
  if (error) throw friendlyError(error, 'تعذر حذف المسودة.');
}

/** Saves (or edits) the student's answer. */
export async function saveReadingAnswer(assignmentId: string, studentId: string, answerText: string): Promise<ReadingAnswer> {
  const text = answerText.trim();
  const inserted = await supabase
    .from('reading_answers')
    .insert({ assignment_id: assignmentId, student_id: studentId, answer_text: text })
    .select('id, assignment_id, student_id, answer_text, submitted_at, updated_at')
    .single();
  if (!inserted.error && inserted.data) return mapAnswer(inserted.data);

  if (inserted.error?.code === '23505') {
    // Already answered: update only the text (the only column students may change).
    const updated = await supabase
      .from('reading_answers')
      .update({ answer_text: text })
      .eq('assignment_id', assignmentId)
      .eq('student_id', studentId)
      .select('id, assignment_id, student_id, answer_text, submitted_at, updated_at')
      .single();
    if (!updated.error && updated.data) return mapAnswer(updated.data);
    throw friendlyError(updated.error, 'تعذر حفظ إجابتك.');
  }
  throw friendlyError(inserted.error, 'تعذر حفظ إجابتك.');
}

/* -------------------------------------------------------------------------- */
/* Photo proof (Supabase Storage + Extreme Compression)                       */
/* -------------------------------------------------------------------------- */

// Supabase Storage bucket name (uses supabase imported at top of file)
export const READING_PHOTO_BUCKET = 'reading-photos';

// ULTRA-EXTREME compression settings for reading photos
const READING_PHOTO_MAX_EDGE = 640;         // Max 640px (was 800)
const READING_PHOTO_QUALITY = 0.45;         // 45% quality (was 60%)
const READING_PHOTO_MAX_BYTES = 50 * 1024;  // 50 KB hard limit (was 100KB)
const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

/** Compresses reading photo to ~15-40 KB (max 640px, 45% quality). */
export async function compressReadingPhoto(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, READING_PHOTO_MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('no canvas');
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    // Aggressive progressive quality reduction: 0.45 → 0.35 → 0.28 → 0.22 → 0.18
    let quality = READING_PHOTO_QUALITY;
    let blob: Blob | null = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/jpeg', quality)
      );
      if (blob && blob.size <= READING_PHOTO_MAX_BYTES) break;
      quality = Math.max(0.15, quality - 0.07);
    }
    if (blob && blob.size > 0) return blob;
  } catch {
    // Fall through to fallback
  }

  // Fallback: return original if valid type and small enough
  if (ALLOWED_PHOTO_TYPES.includes(file.type) && file.size <= READING_PHOTO_MAX_BYTES) return file;
  throw new ReadingDataError('الصورة كبيرة جداً حتى بعد الضغط الشديد. التقط صورة أبسط (ورقة بيضاء/كتاب مفتوح) أو اقرب أكثر.');
}

/** Uploads compressed reading photo to Supabase Storage. Returns storage path. */
export async function uploadReadingPhoto(assignmentId: string, studentId: string, photo: Blob): Promise<string> {
  // Compress first
  const compressed = await compressReadingPhoto(photo as File);

  const ext = compressed.type === 'image/png' ? 'png' : 'jpg';
  const random = Math.random().toString(36).slice(2, 10);
  const path = `${studentId}/${assignmentId}/${Date.now()}-${random}.${ext}`;

  const { error } = await supabase.storage
    .from(READING_PHOTO_BUCKET)
    .upload(path, compressed, {
      contentType: compressed.type || 'image/jpeg',
      cacheControl: '31536000', // 1 year
      upsert: false,
    });

  if (error) {
    const msg = error.message.includes('Payload Too Large')
      ? 'الصورة لا تزال كبيرة. التقط صورة أبسط.'
      : 'تعذر رفع الصورة. تحقق من الاتصال.';
    throw new ReadingDataError(msg, error);
  }
  return path;
}

/** Creates a signed URL (1 hour) for a reading photo in Supabase Storage. */
export async function getReadingPhotoUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(READING_PHOTO_BUCKET)
    .createSignedUrl(path, 60 * 60); // 1 hour

  if (error || !data?.signedUrl) {
    throw new ReadingDataError('تعذر عرض الصورة.', error);
  }
  return data.signedUrl;
}

/**
 * Records the completion. Requires the uploaded photo path (and, when the reading has a
 * question, a saved answer) — the database rejects it otherwise. The server sets the timestamp.
 */
export async function markReadingComplete(assignmentId: string, studentId: string, photoPath: string, today: string = localDateKey()): Promise<ReadingCompletion> {
  const inserted = await supabase
    .from('reading_completions')
    .insert({ assignment_id: assignmentId, student_id: studentId, local_date: today, photo_path: photoPath })
    .select(COMPLETION_SELECT)
    .single();
  if (!inserted.error && inserted.data) return mapCompletion(inserted.data);

  if (inserted.error?.code === '23505') {
    const existing = await supabase
      .from('reading_completions')
      .select(COMPLETION_SELECT)
      .eq('assignment_id', assignmentId)
      .eq('student_id', studentId)
      .single();
    if (!existing.error && existing.data) return mapCompletion(existing.data);
  }
  throw friendlyError(inserted.error, 'تعذر تسجيل إتمام القراءة.');
}

/** Day a completion counts for in the Streak. */
export const creditedDateOf = (completion: ReadingCompletion) => completion.creditedDate ?? completion.localDate;

/**
 * Missed readings the student can still restore: scheduled earlier in this
 * Friday → Thursday week and not completed yet. Oldest first.
 */
export function restorableMissedReadings(assignments: ReadingAssignment[], completions: ReadingCompletion[], today: string = localDateKey()): ReadingAssignment[] {
  const done = new Set(completions.map((completion) => completion.assignmentId));
  return assignments
    .filter((assignment) => assignment.status === 'published' && assignment.scheduledDate < today && canCompleteReadingOn(assignment.scheduledDate, today) && !done.has(assignment.id))
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate) || a.createdAt.localeCompare(b.createdAt));
}

/** The verse used in the daily reminder (falls back to the first verse of the passage). */
export function reminderVerseOf(assignment: ReadingAssignment): BibleVerse | undefined {
  const verses = assignment.passage.verses;
  if (verses.length === 0) return undefined;
  return verses.find((verse) => verse.number === assignment.reminderVerse) ?? verses[0];
}

/* -------------------------------------------------------------------------- */
/* Pure logic (shared by screens, also used for TEST-role previews)            */
/* -------------------------------------------------------------------------- */

export function isAssignedTo(assignment: ReadingAssignment, student: ReadingStudent): boolean {
  if (assignment.targetType === 'all') return true;
  if (assignment.targetType === 'grade') return Boolean(student.gradeLevel) && assignment.targetGrade === student.gradeLevel;
  return assignment.recipientIds.includes(student.id);
}

export function readingCellStatus(
  assignment: ReadingAssignment,
  student: ReadingStudent,
  completion: ReadingCompletion | undefined,
  today: string = localDateKey(),
): ReadingCellStatus {
  if (!isAssignedTo(assignment, student)) return 'not-assigned';
  if (completion) return 'completed';
  const order = compareDateKeys(assignment.scheduledDate, today);
  if (order > 0) return 'upcoming';
  if (order === 0) return 'incomplete';
  return 'overdue';
}

/**
 * Client-side mirror of `public.get_reading_streaks` (used for previews and to
 * update the UI instantly after "Mark as read").
 */
export function computeReadingStreak(studentId: string, completionDates: string[], today: string = localDateKey()): ReadingStreak {
  const days = Array.from(new Set(completionDates)).sort();
  let longest = 0;
  let run = 0;
  let previous: string | null = null;
  for (const day of days) {
    run = previous !== null && addDaysToKey(previous, 1) === day ? run + 1 : 1;
    longest = Math.max(longest, run);
    previous = day;
  }
  // `run` is now the length of the run ending on the most recent reading day.
  // It stays alive if it reached yesterday, or if every day missed since then can
  // still be restored (inside this Friday → Thursday week) — mirrors the database.
  const last = days.length ? days[days.length - 1] : undefined;
  const yesterday = addDaysToKey(today, -1);
  const beforeThisWeek = addDaysToKey(readingWeekStart(today), -1);
  const aliveFrom = beforeThisWeek < yesterday ? beforeThisWeek : yesterday;
  const alive = last !== undefined && compareDateKeys(last, aliveFrom) >= 0;
  return {
    studentId,
    currentStreak: alive ? run : 0,
    longestStreak: longest,
    lastCompletedDate: last,
    totalReadingDays: days.length,
    completedToday: days.includes(today),
  };
}

/* -------------------------------------------------------------------------- */
/* Demo data for TEST-role previews (never written to the database)           */
/* -------------------------------------------------------------------------- */

const DEMO_VERSES: Record<string, BibleVerse[]> = {
  john3: [
    { number: 16, text: 'لأَنَّهُ هكَذَا أَحَبَّ اللهُ الْعَالَمَ حَتَّى بَذَلَ ابْنَهُ الْوَحِيدَ، لِكَيْ لاَ يَهْلِكَ كُلُّ مَنْ يُؤْمِنُ بِهِ، بَلْ تَكُونُ لَهُ الْحَيَاةُ الأَبَدِيَّةُ.' },
    { number: 17, text: 'لأَنَّهُ لَمْ يُرْسِلِ اللهُ ابْنَهُ إِلَى الْعَالَمِ لِيَدِينَ الْعَالَمَ، بَلْ لِيَخْلُصَ بِهِ الْعَالَمُ.' },
    { number: 18, text: 'اَلَّذِي يُؤْمِنُ بِهِ لاَ يُدَانُ، وَالَّذِي لاَ يُؤْمِنُ قَدْ دِينَ، لأَنَّهُ لَمْ يُؤْمِنْ بِاسْمِ ابْنِ اللهِ الْوَحِيدِ.' },
  ],
  matt5: [
    { number: 14, text: 'أَنْتُمْ نُورُ الْعَالَمِ. لاَ يُمْكِنُ أَنْ تُخْفَى مَدِينَةٌ مَوْضُوعَةٌ عَلَى جَبَل،' },
    { number: 15, text: 'وَلاَ يُوقِدُونَ سِرَاجًا وَيَضَعُونَهُ تَحْتَ الْمِكْيَالِ، بَلْ عَلَى الْمَنَارَةِ فَيُضِيءُ لِجَمِيعِ الَّذِينَ فِي الْبَيْتِ.' },
    { number: 16, text: 'فَلْيُضِئْ نُورُكُمْ هكَذَا قُدَّامَ النَّاسِ، لِكَيْ يَرَوْا أَعْمَالَكُمُ الْحَسَنَةَ، وَيُمَجِّدُوا أَبَاكُمُ الَّذِي فِي السَّمَاوَاتِ.' },
  ],
  psalm23: [
    { number: 1, text: 'اَلرَّبُّ رَاعِيَّ فَلاَ يُعْوِزُنِي شَيْءٌ.' },
    { number: 2, text: 'فِي مَرَاعٍ خُضْرٍ يُرْبِضُنِي. إِلَى مِيَاهِ الرَّاحَةِ يُورِدُنِي.' },
    { number: 3, text: 'يَرُدُّ نَفْسِي. يَهْدِينِي إِلَى سُبُلِ الْبِرِّ مِنْ أَجْلِ اسْمِهِ.' },
  ],
};

function demoPassage(id: string, bookId: string, chapter: number, verses: BibleVerse[], reference: string): BiblePassage {
  return { id, bookId, chapter, verseStart: verses[0].number, verseEnd: verses[verses.length - 1].number, reference, verses };
}

export function buildDemoReadingData(grade: MiddleSchoolGrade, studentIds: string[], today: string = localDateKey()) {
  const john = findBibleBook('john');
  const matt = findBibleBook('matt');
  const psalm = findBibleBook('psalm');
  const make = (id: string, offset: number, passage: BiblePassage, question?: string): ReadingAssignment => ({
    reminderVerse: passage.verses[0]?.number,
    id,
    createdBy: 'preview-servant',
    creatorName: 'خادم الفصل (تجريبي)',
    targetType: 'grade',
    targetGrade: grade,
    recipientIds: [],
    scheduledDate: addDaysToKey(today, offset),
    timezone: 'Africa/Cairo',
    questionText: question,
    status: 'published',
    publishedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    passage,
  });
  const assignments: ReadingAssignment[] = [
    make('preview-reading-next', 1, demoPassage('p3', psalm?.id || 'psalm', 23, DEMO_VERSES.psalm23, 'سفر المزامير ٢٣:١–٣')),
    make('preview-reading-today', 0, demoPassage('p1', john?.id || 'john', 3, DEMO_VERSES.john3, 'إنجيل يوحنا ٣:١٦–١٨'), 'ما الذي تعلّمته عن محبة الله من هذه الآيات؟'),
    make('preview-reading-yesterday', -1, demoPassage('p2', matt?.id || 'matt', 5, DEMO_VERSES.matt5, 'إنجيل متى ٥:١٤–١٦'), 'كيف يمكنك أن تكون نورًا في مدرستك هذا الأسبوع؟'),
    make('preview-reading-2', -2, demoPassage('p4', psalm?.id || 'psalm', 23, DEMO_VERSES.psalm23, 'سفر المزامير ٢٣:١–٣')),
  ];
  const completions: ReadingCompletion[] = [];
  const answers: ReadingAnswer[] = [];
  studentIds.forEach((studentId, index) => {
    if (index % 3 !== 2) {
      const at = new Date();
      at.setDate(at.getDate() - 1);
      at.setHours(18, 42 - index, 0, 0);
      completions.push({ id: `pc-y-${studentId}`, assignmentId: 'preview-reading-yesterday', studentId, completedAt: at.toISOString(), localDate: addDaysToKey(today, -1), photoPath: 'preview/demo-photo' });
      answers.push({ id: `pa-y-${studentId}`, assignmentId: 'preview-reading-yesterday', studentId, answerText: 'أن أساعد زملائي وأتكلم بلطف.', submittedAt: at.toISOString(), updatedAt: at.toISOString() });
    }
    if (index % 2 === 0) {
      const at = new Date();
      at.setDate(at.getDate() - 2);
      at.setHours(20, 5 + index, 0, 0);
      completions.push({ id: `pc-2-${studentId}`, assignmentId: 'preview-reading-2', studentId, completedAt: at.toISOString(), localDate: addDaysToKey(today, -2), photoPath: 'preview/demo-photo' });
    }
    if (index === 0) {
      const at = new Date();
      at.setHours(Math.min(at.getHours(), 9), 15, 0, 0);
      completions.push({ id: `pc-t-${studentId}`, assignmentId: 'preview-reading-today', studentId, completedAt: at.toISOString(), localDate: today, photoPath: 'preview/demo-photo' });
    }
  });
  return { assignments, completions, answers };
}
