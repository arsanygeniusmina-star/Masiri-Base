import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Archive, BookOpen, CalendarDays, CheckCircle2, ClipboardList, Loader2, RefreshCw, Send, Trash2, Users } from 'lucide-react';
import type {
  BiblePassageSelection,
  ReadingAnswer,
  ReadingAssignment,
  ReadingAssignmentStatus,
  ReadingCompletion,
  ReadingStreak,
  ReadingStudent,
  User,
} from '../types';
import { FullBibleNavigator } from '../components/bible/FullBibleNavigator';
import { AssignReadingWizard } from '../components/readings/AssignReadingWizard';
import { ReadingProgressTable } from '../components/readings/ReadingProgressTable';
import { ReadingPlanImporter } from '../components/readings/ReadingPlanImporter';
import {
  GRADE_LABELS,
  chipStyle,
  primaryButtonStyle,
  readingPalette,
  secondaryButtonStyle,
} from '../components/readings/readingTheme';
import {
  buildDemoReadingData,
  computeReadingStreak,
  deleteDraftReadingAssignment,
  fetchReadingAnswers,
  fetchReadingAssignments,
  fetchReadingCompletions,
  fetchReadingStreaks,
  fetchScopedStudents,
  isAssignedTo,
  updateReadingAssignmentStatus,
} from '../lib/readings';
import { toArabicDigits } from '../lib/bible/bibleService';
import { addDaysToKey, formatLongDate, localDateKey, relativeDayLabel } from '../lib/readingDates';

interface BibleStudyScreenProps {
  currentUser: User;
  theme: 'light' | 'dark';
  simulationMode?: boolean;
}

type Tab = 'reader' | 'assignments' | 'progress';

const DEMO_STUDENT_NAMES = ['مارك عماد رفعت', 'مينا فادي جرجس', 'كيرلس سامح عادل', 'بيشوي أمير فوزي', 'جورج بيتر عادل'];

export const BibleStudyScreen: React.FC<BibleStudyScreenProps> = ({ currentUser, theme, simulationMode = false }) => {
  const p = readingPalette(theme);
  const isHead = currentUser.role === 'head';
  const [tab, setTab] = useState<Tab>('reader');
  const [students, setStudents] = useState<ReadingStudent[]>([]);
  const [assignments, setAssignments] = useState<ReadingAssignment[]>([]);
  const [completions, setCompletions] = useState<ReadingCompletion[]>([]);
  const [answers, setAnswers] = useState<ReadingAnswer[]>([]);
  const [streaks, setStreaks] = useState<ReadingStreak[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [wizardPassage, setWizardPassage] = useState<BiblePassageSelection | null>(null);
  const [notice, setNotice] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [showFarFuture, setShowFarFuture] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    if (simulationMode) {
      const grade = currentUser.gradeLevel ?? 'grade-1';
      const demoStudents: ReadingStudent[] = DEMO_STUDENT_NAMES.map((name, index) => ({ id: `preview-student-${index + 1}`, name, gradeLevel: grade }));
      const demo = buildDemoReadingData(grade, demoStudents.map((student) => student.id));
      setStudents(demoStudents);
      setAssignments(demo.assignments);
      setCompletions(demo.completions);
      setAnswers(demo.answers);
      setStreaks(demoStudents.map((student) => computeReadingStreak(student.id, demo.completions.filter((c) => c.studentId === student.id).map((c) => c.localDate))));
      setLoading(false);
      return;
    }
    try {
      const [scopedStudents, visibleAssignments] = await Promise.all([
        fetchScopedStudents(),
        fetchReadingAssignments({ includeDrafts: true, includeArchived: true, includeVerses: false }),
      ]);
      // Progress is shown for the last 30 days, so only load completions/answers for those readings.
      const todayKey = localDateKey();
      const windowStart = addDaysToKey(todayKey, -30);
      const ids = visibleAssignments
        .filter((assignment) => assignment.status !== 'draft' && assignment.scheduledDate >= windowStart && assignment.scheduledDate <= todayKey)
        .map((assignment) => assignment.id);
      const [completionRows, answerRows, streakRows] = await Promise.all([
        fetchReadingCompletions({ assignmentIds: ids }),
        fetchReadingAnswers({ assignmentIds: ids }),
        fetchReadingStreaks(scopedStudents.map((student) => student.id), localDateKey()),
      ]);
      setStudents(scopedStudents);
      setAssignments(visibleAssignments);
      setCompletions(completionRows);
      setAnswers(answerRows);
      setStreaks(streakRows);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'تعذر تحميل بيانات القراءات.');
    } finally {
      setLoading(false);
    }
  }, [simulationMode, currentUser.gradeLevel]);

  useEffect(() => {
    void load();
  }, [load, currentUser.id, currentUser.role]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(''), 4000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const completionKeys = useMemo(() => new Set(completions.map((c) => `${c.assignmentId}:${c.studentId}`)), [completions]);
  const today = localDateKey();

  const todayStats = useMemo(() => {
    const todays = assignments.filter((assignment) => assignment.status === 'published' && assignment.scheduledDate === today);
    let assigned = 0;
    let done = 0;
    todays.forEach((assignment) => {
      students.forEach((student) => {
        if (!isAssignedTo(assignment, student)) return;
        assigned += 1;
        if (completionKeys.has(`${assignment.id}:${student.id}`)) done += 1;
      });
    });
    return { count: todays.length, assigned, done };
  }, [assignments, students, completionKeys, today]);

  const canManage = (assignment: ReadingAssignment) => isHead || assignment.createdBy === currentUser.id;

  const changeStatus = async (assignment: ReadingAssignment, status: ReadingAssignmentStatus) => {
    setBusyId(assignment.id);
    setConfirmId(null);
    try {
      if (!simulationMode) await updateReadingAssignmentStatus(assignment.id, status);
      setAssignments((current) => current.map((item) => (item.id === assignment.id ? { ...item, status } : item)));
      setNotice(status === 'published' ? 'تم نشر القراءة للطلاب.' : status === 'archived' ? 'تمت أرشفة القراءة وإخفاؤها عن الطلاب.' : 'تم التحديث.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'تعذر التحديث.');
    } finally {
      setBusyId(null);
    }
  };

  const removeDraft = async (assignment: ReadingAssignment) => {
    setBusyId(assignment.id);
    setConfirmId(null);
    try {
      if (!simulationMode) await deleteDraftReadingAssignment(assignment.id);
      setAssignments((current) => current.filter((item) => item.id !== assignment.id));
      setNotice('تم حذف المسودة.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'تعذر حذف المسودة.');
    } finally {
      setBusyId(null);
    }
  };

  const audienceLabel = (assignment: ReadingAssignment) => {
    if (assignment.targetType === 'all') return 'كل الطلاب (كل الصفوف)';
    if (assignment.targetType === 'grade') return assignment.targetGrade ? GRADE_LABELS[assignment.targetGrade] : 'فصل';
    const names = students.filter((student) => assignment.recipientIds.includes(student.id)).map((student) => student.name.split(' ')[0]);
    if (names.length === 0) return `${toArabicDigits(assignment.recipientIds.length)} طالب`;
    return names.length > 3 ? `${names.slice(0, 3).join('، ')} و${toArabicDigits(names.length - 3)} آخرين` : names.join('، ');
  };

  const tabs: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'reader', label: 'الكتاب المقدس', icon: BookOpen },
    { id: 'assignments', label: 'القراءات المعيّنة', icon: ClipboardList },
    { id: 'progress', label: 'متابعة الطلاب', icon: Users },
  ];

  // Long plans would make this list huge: readings more than a week ahead are hidden by default.
  const farFutureFrom = addDaysToKey(today, 8);
  const hiddenFutureCount = useMemo(() => assignments.filter((a) => a.status !== 'draft' && a.scheduledDate >= farFutureFrom).length, [assignments, farFutureFrom]);
  const sortedAssignments = useMemo(
    () =>
      [...assignments]
        .filter((a) => showFarFuture || a.status === 'draft' || a.scheduledDate < farFutureFrom)
        .sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate) || b.createdAt.localeCompare(a.createdAt)),
    [assignments, showFarFuture, farFutureFrom],
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8" dir="rtl">
      {/* Header */}
      <div className="liquid-glass-card flex flex-col gap-5 rounded-3xl p-6 sm:p-7 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black" style={{ backgroundColor: p.soft, color: p.accentText, border: `1px solid ${p.softBorder}` }}>
            <BookOpen className="h-3.5 w-3.5" />
            دراسة الكتاب المقدس والقراءات اليومية
          </span>
          <h1 className="text-2xl font-black sm:text-3xl" style={{ color: p.text }}>
            «سِرَاجٌ لِرِجْلِي كَلاَمُكَ وَنُورٌ لِسَبِيلِي»
          </h1>
          <p className="text-xs font-semibold sm:text-sm" style={{ color: p.muted }}>
            {isHead
              ? 'اختر مقطعًا من الكتاب المقدس وعيّنه لأي فصل أو طلاب محددين، وتابع قراءات كل الفصول.'
              : `اختر مقطعًا وعيّنه لطلاب ${currentUser.gradeLevel ? GRADE_LABELS[currentUser.gradeLevel] : 'فصلك'}، وتابع من قرأ ومتى.`}
          </p>
        </div>
        <div className="grid shrink-0 grid-cols-2 gap-3">
          <div className="liquid-glass-pill min-w-[120px] rounded-3xl p-4 text-center">
            <p className="flex items-center justify-center gap-1 text-xs font-bold" style={{ color: p.muted }}>
              <CalendarDays className="h-4 w-4" style={{ color: p.accent }} />
              قراءات اليوم
            </p>
            <p className="mt-1 text-2xl font-black" style={{ color: p.accentText }}>{toArabicDigits(todayStats.count)}</p>
          </div>
          <div className="liquid-glass-pill min-w-[120px] rounded-3xl p-4 text-center">
            <p className="flex items-center justify-center gap-1 text-xs font-bold" style={{ color: p.muted }}>
              <CheckCircle2 className="h-4 w-4" style={{ color: p.success }} />
              أتمّوا اليوم
            </p>
            <p className="mt-1 text-2xl font-black" style={{ color: p.accentText }}>
              {toArabicDigits(todayStats.done)}<span className="text-sm" style={{ color: p.muted }}>/{toArabicDigits(todayStats.assigned)}</span>
            </p>
          </div>
        </div>
      </div>

      {simulationMode && (
        <p className="rounded-2xl p-3 text-center text-xs font-bold" style={{ backgroundColor: p.warningSoft, color: p.warning }}>
          بيانات تجريبية — التعيين والأرشفة هنا لا تُحفظ في قاعدة البيانات.
        </p>
      )}

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="أقسام دراسة الكتاب">
        {tabs.map((item) => {
          const Icon = item.icon;
          return (
            <button key={item.id} type="button" role="tab" aria-selected={tab === item.id} onClick={() => setTab(item.id)} className="inline-flex shrink-0 items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold" style={chipStyle(p, tab === item.id)}>
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
        <button type="button" onClick={() => void load()} disabled={loading} className="mr-auto inline-flex shrink-0 items-center gap-1.5 rounded-2xl px-3 py-2.5 text-xs font-bold disabled:opacity-50" style={secondaryButtonStyle(p)} aria-label="تحديث البيانات">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          تحديث
        </button>
      </div>

      {notice && (
        <p className="rounded-2xl p-3 text-sm font-bold" style={{ backgroundColor: p.successSoft, color: p.success }} role="status">{notice}</p>
      )}
      {loadError && tab !== 'reader' && (
        <p className="rounded-2xl p-3 text-sm font-bold" style={{ backgroundColor: p.errorSoft, color: p.error }} role="alert">{loadError}</p>
      )}

      {tab === 'reader' && <FullBibleNavigator theme={theme} onAssignPassage={(selection) => setWizardPassage(selection)} />}

      {tab === 'assignments' && isHead && !loading && (
        <ReadingPlanImporter theme={theme} existing={assignments} simulationMode={simulationMode} onImported={() => void load()} />
      )}

      {tab === 'assignments' && !loading && hiddenFutureCount > 0 && (
        <button type="button" onClick={() => setShowFarFuture((value) => !value)} className="rounded-xl px-3 py-2 text-xs font-bold" style={secondaryButtonStyle(p)}>
          {showFarFuture ? 'إخفاء القراءات البعيدة' : `عرض ${toArabicDigits(hiddenFutureCount)} قراءة مجدولة بعد أكثر من أسبوع`}
        </button>
      )}

      {tab === 'assignments' && (
        loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin" style={{ color: p.accent }} /></div>
        ) : sortedAssignments.length === 0 ? (
          <div className="liquid-glass-card rounded-3xl p-10 text-center">
            <p className="text-sm font-bold" style={{ color: p.text }}>لم يتم تعيين أي قراءة بعد.</p>
            <button type="button" onClick={() => setTab('reader')} className="mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black" style={primaryButtonStyle(p)}>
              <BookOpen className="h-4 w-4" />
              افتح الكتاب المقدس
            </button>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {sortedAssignments.map((assignment) => {
              const assigned = students.filter((student) => isAssignedTo(assignment, student));
              const done = assigned.filter((student) => completionKeys.has(`${assignment.id}:${student.id}`)).length;
              const percent = assigned.length ? Math.round((done / assigned.length) * 100) : 0;
              const manageable = canManage(assignment);
              const busy = busyId === assignment.id;
              const statusStyle =
                assignment.status === 'published'
                  ? { label: 'منشورة', color: p.success, background: p.successSoft }
                  : assignment.status === 'draft'
                  ? { label: 'مسودة', color: p.warning, background: p.warningSoft }
                  : { label: 'مؤرشفة', color: p.muted, background: p.surfaceAlt };
              return (
                <li key={assignment.id} className="liquid-glass-card space-y-3 rounded-3xl p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold" style={{ color: p.accent }}>
                        {relativeDayLabel(assignment.scheduledDate, today)} · {formatLongDate(assignment.scheduledDate)}
                      </p>
                      <h3 className="truncate text-base font-black" style={{ color: p.text }}>{assignment.passage.reference}</h3>
                      {assignment.title && <p className="truncate text-xs font-semibold" style={{ color: p.muted }}>{assignment.title}</p>}
                    </div>
                    <span className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black" style={{ color: statusStyle.color, backgroundColor: statusStyle.background }}>{statusStyle.label}</span>
                  </div>
                  <p className="flex items-center gap-1.5 text-xs" style={{ color: p.muted }}>
                    <Users className="h-3.5 w-3.5" />
                    {audienceLabel(assignment)}
                    {assignment.creatorName && <span>· بواسطة {assignment.creatorName}</span>}
                  </p>
                  {assignment.questionText && (
                    <p className="rounded-2xl p-3 text-xs leading-6" style={{ backgroundColor: p.surfaceAlt, color: p.text }}>
                      <span className="font-black" style={{ color: p.accentText }}>سؤال: </span>{assignment.questionText}
                    </p>
                  )}
                  {assignment.status !== 'draft' && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-bold" style={{ color: p.muted }}>
                        <span>أتمّ القراءة {toArabicDigits(done)} من {toArabicDigits(assigned.length)}</span>
                        <span>{toArabicDigits(percent)}٪</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full" style={{ backgroundColor: p.divider }}>
                        <div className="h-full rounded-full" style={{ width: `${percent}%`, background: 'linear-gradient(90deg, #76243A 0%, #C5A15A 100%)' }} />
                      </div>
                    </div>
                  )}
                  {manageable && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {assignment.status === 'draft' && (
                        <>
                          <button type="button" disabled={busy} onClick={() => void changeStatus(assignment, 'published')} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-black disabled:opacity-50" style={primaryButtonStyle(p)}>
                            <Send className="h-3.5 w-3.5" /> نشر
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => (confirmId === assignment.id ? void removeDraft(assignment) : setConfirmId(assignment.id))}
                            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold disabled:opacity-50"
                            style={{ ...secondaryButtonStyle(p), color: p.error }}
                          >
                            <Trash2 className="h-3.5 w-3.5" /> {confirmId === assignment.id ? 'تأكيد الحذف' : 'حذف المسودة'}
                          </button>
                        </>
                      )}
                      {assignment.status === 'published' && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => (confirmId === assignment.id ? void changeStatus(assignment, 'archived') : setConfirmId(assignment.id))}
                          className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold disabled:opacity-50"
                          style={secondaryButtonStyle(p)}
                        >
                          <Archive className="h-3.5 w-3.5" /> {confirmId === assignment.id ? 'تأكيد الأرشفة' : 'أرشفة'}
                        </button>
                      )}
                      {assignment.status === 'archived' && (
                        <button type="button" disabled={busy} onClick={() => void changeStatus(assignment, 'published')} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold disabled:opacity-50" style={secondaryButtonStyle(p)}>
                          <Send className="h-3.5 w-3.5" /> إعادة النشر
                        </button>
                      )}
                      {busy && <Loader2 className="h-4 w-4 animate-spin self-center" style={{ color: p.accent }} />}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )
      )}

      {tab === 'progress' && (
        loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin" style={{ color: p.accent }} /></div>
        ) : (
          <ReadingProgressTable
            theme={theme}
            assignments={assignments}
            students={students}
            completions={completions}
            answers={answers}
            streaks={streaks}
            showGradeFilter={isHead}
          />
        )
      )}

      {wizardPassage && (
        <AssignReadingWizard
          passage={wizardPassage}
          currentUser={currentUser}
          students={students}
          theme={theme}
          simulationMode={simulationMode}
          onClose={() => setWizardPassage(null)}
          onSaved={({ published }) => {
            setWizardPassage(null);
            setNotice(published ? 'تم نشر القراءة! ستظهر للطلاب في «إصحاح النهارده» في موعدها.' : 'تم حفظ القراءة كمسودة في «القراءات المعيّنة».');
            setTab('assignments');
            if (!simulationMode) void load();
          }}
        />
      )}
    </div>
  );
};
