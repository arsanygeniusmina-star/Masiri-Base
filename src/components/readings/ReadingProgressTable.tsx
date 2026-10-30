import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Camera, CheckCircle2, Circle, Clock, Loader2, MessageSquareText, Search, X, XCircle } from 'lucide-react';
import type {
  MiddleSchoolGrade,
  ReadingAnswer,
  ReadingAssignment,
  ReadingCellStatus,
  ReadingCompletion,
  ReadingStreak,
  ReadingStudent,
} from '../../types';
import { getReadingPhotoUrl, isAssignedTo, readingCellStatus } from '../../lib/readings';
import { StreakBadge } from './StreakBadge';
import { toArabicDigits } from '../../lib/bible/bibleService';
import { addDaysToKey, formatLocalDateTime, formatLocalTime, formatLongDate, formatShortDate, localDateKey } from '../../lib/readingDates';
import { GRADE_LABELS, GRADE_SHORT_LABELS, chipStyle, readingPalette, secondaryButtonStyle, statusVisual } from './readingTheme';

interface ReadingProgressTableProps {
  theme: 'light' | 'dark';
  assignments: ReadingAssignment[];
  students: ReadingStudent[];
  completions: ReadingCompletion[];
  answers: ReadingAnswer[];
  streaks: ReadingStreak[];
  showGradeFilter?: boolean;
}

type WindowFilter = '7' | '14' | '30';

type CellDetail = {
  student: ReadingStudent;
  assignment: ReadingAssignment;
  status: ReadingCellStatus;
  completion?: ReadingCompletion;
  answer?: ReadingAnswer;
};

const GRADES: MiddleSchoolGrade[] = ['grade-1', 'grade-2', 'grade-3'];

export const ReadingProgressTable: React.FC<ReadingProgressTableProps> = ({
  theme,
  assignments,
  students,
  completions,
  answers,
  streaks,
  showGradeFilter = false,
}) => {
  const p = readingPalette(theme);
  const today = localDateKey();
  const [windowFilter, setWindowFilter] = useState<WindowFilter>('14');
  const [gradeFilter, setGradeFilter] = useState<'all' | MiddleSchoolGrade>('all');
  const [query, setQuery] = useState('');
  const [detail, setDetail] = useState<CellDetail | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoState, setPhotoState] = useState<'idle' | 'loading' | 'error' | 'demo'>('idle');

  // Load a short-lived private link for the proof photo when a cell is opened.
  const detailPhotoPath = detail?.completion?.photoPath;
  useEffect(() => {
    let cancelled = false;
    setPhotoUrl(null);
    if (!detailPhotoPath) {
      setPhotoState('idle');
      return;
    }
    if (detailPhotoPath.startsWith('preview/')) {
      setPhotoState('demo');
      return;
    }
    setPhotoState('loading');
    getReadingPhotoUrl(detailPhotoPath)
      .then((url) => {
        if (cancelled) return;
        setPhotoUrl(url);
        setPhotoState('idle');
      })
      .catch(() => { if (!cancelled) setPhotoState('error'); });
    return () => { cancelled = true; };
  }, [detailPhotoPath]);

  useEffect(() => {
    if (!detail) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDetail(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [detail]);

  const completionIndex = useMemo(() => {
    const map = new Map<string, ReadingCompletion>();
    completions.forEach((completion) => map.set(`${completion.assignmentId}:${completion.studentId}`, completion));
    return map;
  }, [completions]);

  const answerIndex = useMemo(() => {
    const map = new Map<string, ReadingAnswer>();
    answers.forEach((answer) => map.set(`${answer.assignmentId}:${answer.studentId}`, answer));
    return map;
  }, [answers]);

  const streakIndex = useMemo(() => new Map(streaks.map((streak) => [streak.studentId, streak])), [streaks]);

  const columns = useMemo(() => {
    const from = addDaysToKey(today, -Number(windowFilter));
    const to = addDaysToKey(today, 3);
    return assignments
      .filter((assignment) => assignment.status !== 'draft')
      .filter((assignment) => assignment.scheduledDate >= from && assignment.scheduledDate <= to)
      .filter((assignment) => gradeFilter === 'all' || assignment.targetType !== 'grade' || assignment.targetGrade === gradeFilter)
      .sort((a, b) => (a.scheduledDate === b.scheduledDate ? a.createdAt.localeCompare(b.createdAt) : a.scheduledDate.localeCompare(b.scheduledDate)));
  }, [assignments, windowFilter, gradeFilter, today]);

  const rows = useMemo(() => {
    const needle = query.trim();
    return students
      .filter((student) => gradeFilter === 'all' || student.gradeLevel === gradeFilter)
      .filter((student) => !needle || student.name.includes(needle))
      .filter((student) => columns.length === 0 || columns.some((assignment) => isAssignedTo(assignment, student)));
  }, [students, gradeFilter, query, columns]);

  const columnStats = useMemo(
    () =>
      columns.map((assignment) => {
        const assigned = rows.filter((student) => isAssignedTo(assignment, student));
        const done = assigned.filter((student) => completionIndex.has(`${assignment.id}:${student.id}`)).length;
        return { assigned: assigned.length, done };
      }),
    [columns, rows, completionIndex],
  );

  const StatusIcon = ({ status }: { status: ReadingCellStatus }) => {
    if (status === 'completed') return <CheckCircle2 className="h-4 w-4" />;
    if (status === 'overdue') return <XCircle className="h-4 w-4" />;
    if (status === 'upcoming') return <Clock className="h-4 w-4" />;
    if (status === 'incomplete') return <Circle className="h-4 w-4" />;
    return null;
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* Filters */}
      <div className="liquid-glass-card flex flex-col gap-3 rounded-3xl p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {([
            ['7', 'آخر ٧ أيام'],
            ['14', 'آخر ١٤ يوم'],
            ['30', 'آخر ٣٠ يوم'],
          ] as const).map(([value, label]) => (
            <button key={value} type="button" onClick={() => setWindowFilter(value)} className="rounded-xl px-3 py-2 text-xs font-bold" style={chipStyle(p, windowFilter === value)}>
              {label}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="relative block">
            <span className="sr-only">ابحث عن طالب</span>
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: p.muted }} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث عن طالب..." className="liquid-glass-input w-full rounded-xl py-2 pr-9 pl-3 text-sm outline-none sm:w-56" style={{ color: p.text }} />
          </label>
          {showGradeFilter && (
            <select value={gradeFilter} onChange={(event) => setGradeFilter(event.target.value as 'all' | MiddleSchoolGrade)} className="liquid-glass-input rounded-xl px-3 py-2 text-sm" style={{ color: p.text }} aria-label="تصفية حسب الصف">
              <option value="all">كل الصفوف</option>
              {GRADES.map((grade) => <option key={grade} value={grade}>{GRADE_LABELS[grade]}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 px-1 text-[11px] font-bold">
        {(['completed', 'incomplete', 'overdue', 'upcoming'] as ReadingCellStatus[]).map((status) => {
          const visual = statusVisual(p, status);
          return (
            <span key={status} className="inline-flex items-center gap-1 rounded-full px-2.5 py-1" style={{ color: visual.color, backgroundColor: visual.background }}>
              <StatusIcon status={status} />
              {visual.label}
            </span>
          );
        })}
      </div>

      {columns.length === 0 ? (
        <div className="liquid-glass-card rounded-3xl p-10 text-center">
          <p className="text-sm font-bold" style={{ color: p.text }}>لا توجد قراءات منشورة في هذه الفترة.</p>
          <p className="mt-1 text-xs" style={{ color: p.muted }}>افتح الكتاب المقدس، حدّد مقطعًا ثم اضغط «تعيين هذا النص».</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="liquid-glass-card rounded-3xl p-10 text-center text-sm font-bold" style={{ color: p.muted }}>
          لا يوجد طلاب مطابقون في نطاقك.
        </div>
      ) : (
        <div className="liquid-glass-card overflow-hidden rounded-3xl">
          <div className="max-h-[70vh] overflow-auto">
            <table className="min-w-full border-separate border-spacing-0 text-sm">
              <caption className="sr-only">متابعة القراءات اليومية لكل طالب</caption>
              <thead>
                <tr>
                  <th
                    scope="col"
                    className="sticky right-0 top-0 z-30 min-w-[180px] border-b px-4 py-3 text-right text-xs font-black"
                    style={{ backgroundColor: p.surface, borderColor: p.divider, color: p.text }}
                  >
                    الطالب
                  </th>
                  {columns.map((assignment, index) => (
                    <th
                      key={assignment.id}
                      scope="col"
                      className="sticky top-0 z-20 min-w-[130px] border-b px-3 py-3 text-center align-bottom"
                      style={{ backgroundColor: assignment.scheduledDate === today ? p.goldSoft : p.surface, borderColor: p.divider }}
                    >
                      <span className="block text-xs font-black" style={{ color: assignment.scheduledDate === today ? p.accentText : p.text }}>
                        {assignment.scheduledDate === today ? 'اليوم' : formatShortDate(assignment.scheduledDate)}
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] font-semibold" style={{ color: p.muted }} title={assignment.passage.reference}>
                        {assignment.passage.reference}
                      </span>
                      <span className="mt-1 block text-[10px] font-bold" style={{ color: p.accent }}>
                        {toArabicDigits(columnStats[index].done)}/{toArabicDigits(columnStats[index].assigned)}
                        {assignment.status === 'archived' ? ' · مؤرشفة' : ''}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((student) => {
                  const streak = streakIndex.get(student.id);
                  return (
                    <tr key={student.id}>
                      <th
                        scope="row"
                        className="sticky right-0 z-10 border-b px-4 py-2.5 text-right"
                        style={{ backgroundColor: p.surface, borderColor: p.divider }}
                      >
                        <span className="block truncate text-sm font-bold" style={{ color: p.text }}>{student.name}</span>
                        <span className="mt-0.5 flex items-center gap-2 text-[10px]" style={{ color: p.muted }}>
                          {student.gradeLevel && <span>{GRADE_SHORT_LABELS[student.gradeLevel]}</span>}
                          <StreakBadge value={streak?.currentStreak ?? 0} active={streak?.completedToday ?? false} size="sm" color={p.text} />
                        </span>
                      </th>
                      {columns.map((assignment) => {
                        const key = `${assignment.id}:${student.id}`;
                        const completion = completionIndex.get(key);
                        const answer = answerIndex.get(key);
                        const status = readingCellStatus(assignment, student, completion, today);
                        const visual = statusVisual(p, status);
                        if (status === 'not-assigned') {
                          return (
                            <td key={assignment.id} className="border-b px-2 py-2 text-center text-xs" style={{ borderColor: p.divider, color: p.faint }}>
                              —
                            </td>
                          );
                        }
                        const late = completion && completion.localDate > assignment.scheduledDate;
                        return (
                          <td key={assignment.id} className="border-b px-2 py-2 text-center" style={{ borderColor: p.divider }}>
                            <button
                              type="button"
                              onClick={() => setDetail({ student, assignment, status, completion, answer })}
                              className="inline-flex w-full flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[11px] font-bold transition-transform hover:scale-[1.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A15A]"
                              style={{ color: visual.color, backgroundColor: visual.background }}
                              aria-label={`${student.name} — ${assignment.passage.reference}: ${visual.label}`}
                            >
                              <span className="inline-flex items-center gap-1">
                                <StatusIcon status={status} />
                                {status === 'completed' && completion ? formatLocalTime(completion.completedAt) : visual.label}
                                {answer && <MessageSquareText className="h-3.5 w-3.5" aria-label="أجاب على السؤال" />}
                                {completion?.photoPath && <Camera className="h-3.5 w-3.5" aria-label="أرفق صورة" />}
                              </span>
                              {late && <span className="text-[10px] font-semibold opacity-80">متأخرة</span>}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail modal */}
      {detail && createPortal(
        <div dir="rtl" className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="reading-detail-title">
          <button type="button" className="absolute inset-0 cursor-default" style={{ backgroundColor: p.overlay }} aria-label="إغلاق" onClick={() => setDetail(null)} />
          <div className="relative z-10 max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-t-3xl border p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] shadow-2xl sm:rounded-3xl sm:pb-5" style={{ backgroundColor: p.surface, borderColor: p.border }}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold" style={{ color: p.accent }}>{formatLongDate(detail.assignment.scheduledDate)}</p>
                <h3 id="reading-detail-title" className="text-lg font-black" style={{ color: p.text }}>{detail.student.name}</h3>
                <p className="text-sm font-bold" style={{ color: p.muted }}>{detail.assignment.passage.reference}</p>
              </div>
              <button type="button" onClick={() => setDetail(null)} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={secondaryButtonStyle(p)} aria-label="إغلاق">
                <X className="h-4 w-4" />
              </button>
            </div>

            {(() => {
              const visual = statusVisual(p, detail.status);
              return (
                <div className="flex items-center gap-2 rounded-2xl p-3 text-sm font-bold" style={{ color: visual.color, backgroundColor: visual.background }}>
                  <StatusIcon status={detail.status} />
                  {detail.completion
                    ? `تمت القراءة ${formatLocalDateTime(detail.completion.completedAt)}${detail.completion.localDate > detail.assignment.scheduledDate ? ' (بعد موعدها)' : ''}`
                    : visual.label}
                </div>
              );
            })()}

            {detail.completion && (
              <div className="space-y-2">
                <p className="text-xs font-bold" style={{ color: p.muted }}>صورة بعد القراءة</p>
                {!detail.completion.photoPath ? (
                  <p className="rounded-2xl p-3 text-sm" style={{ backgroundColor: p.surfaceAlt, color: p.muted }}>لا توجد صورة لهذه القراءة.</p>
                ) : photoState === 'loading' ? (
                  <div className="flex h-40 items-center justify-center rounded-2xl" style={{ backgroundColor: p.surfaceAlt }}>
                    <Loader2 className="h-6 w-6 animate-spin" style={{ color: p.accent }} />
                  </div>
                ) : photoState === 'demo' ? (
                  <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-2xl" style={{ backgroundColor: p.goldSoft, color: p.accentText }}>
                    <Camera className="h-8 w-8" />
                    <span className="text-xs font-bold">صورة تجريبية</span>
                  </div>
                ) : photoUrl ? (
                  <a href={photoUrl} target="_blank" rel="noreferrer" className="block">
                    <img src={photoUrl} alt={`صورة ${detail.student.name} بعد القراءة`} className="max-h-72 w-full rounded-2xl object-contain" style={{ backgroundColor: p.surfaceAlt }} />
                  </a>
                ) : (
                  <p className="rounded-2xl p-3 text-sm" style={{ backgroundColor: p.errorSoft, color: p.error }}>تعذر تحميل الصورة.</p>
                )}
              </div>
            )}

            {detail.assignment.questionText ? (
              <div className="space-y-2">
                <p className="text-xs font-bold" style={{ color: p.muted }}>السؤال</p>
                <p className="rounded-2xl p-3 text-sm leading-7" style={{ backgroundColor: p.surfaceAlt, color: p.text }}>{detail.assignment.questionText}</p>
                <p className="text-xs font-bold" style={{ color: p.muted }}>إجابة الطالب</p>
                {detail.answer ? (
                  <div className="rounded-2xl p-3" style={{ backgroundColor: p.goldSoft }}>
                    <p className="whitespace-pre-wrap text-sm leading-7" style={{ color: p.text }}>{detail.answer.answerText}</p>
                    <p className="mt-2 text-[11px]" style={{ color: p.muted }}>
                      أُرسلت {formatLocalDateTime(detail.answer.submittedAt)}
                      {detail.answer.updatedAt !== detail.answer.submittedAt ? ` · آخر تعديل ${formatLocalDateTime(detail.answer.updatedAt)}` : ''}
                    </p>
                  </div>
                ) : (
                  <p className="rounded-2xl p-3 text-sm" style={{ backgroundColor: p.surfaceAlt, color: p.muted }}>لم يُرسل إجابة بعد.</p>
                )}
              </div>
            ) : (
              <p className="text-xs" style={{ color: p.muted }}>لا يوجد سؤال مرفق بهذه القراءة.</p>
            )}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
};
