import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  BookOpen,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Loader2,
  Search,
  Send,
  Users,
  X,
} from 'lucide-react';
import type {
  BiblePassageSelection,
  MiddleSchoolGrade,
  ReadingStudent,
  ReadingTargetType,
  User,
} from '../../types';
import { createReadingAssignment } from '../../lib/readings';
import { arabicCount, toArabicDigits } from '../../lib/bible/bibleService';
import { addDaysToKey, deviceTimeZone, formatLongDate, localDateKey } from '../../lib/readingDates';
import {
  GRADE_LABELS,
  chipStyle,
  primaryButtonStyle,
  readingPalette,
  secondaryButtonStyle,
} from './readingTheme';

interface AssignReadingWizardProps {
  passage: BiblePassageSelection;
  currentUser: User;
  students: ReadingStudent[];
  theme: 'light' | 'dark';
  simulationMode?: boolean;
  onClose: () => void;
  onSaved: (result: { assignmentId: string; published: boolean }) => void;
}

type RecipientMode = 'single' | 'multiple' | 'grade' | 'everyone';

const STEPS = [
  { title: 'تأكيد النص', icon: BookOpen },
  { title: 'المستلمون', icon: Users },
  { title: 'موعد القراءة', icon: CalendarDays },
  { title: 'سؤال للتأمل', icon: HelpCircle },
  { title: 'المراجعة والنشر', icon: Send },
] as const;

const GRADES: MiddleSchoolGrade[] = ['grade-1', 'grade-2', 'grade-3'];

export const AssignReadingWizard: React.FC<AssignReadingWizardProps> = ({
  passage,
  currentUser,
  students,
  theme,
  simulationMode = false,
  onClose,
  onSaved,
}) => {
  const p = readingPalette(theme);
  const isHead = currentUser.role === 'head';
  const teacherGrade = currentUser.gradeLevel;
  const today = localDateKey();
  const timezone = deviceTimeZone();

  const [step, setStep] = useState(0);
  const [title, setTitle] = useState('');
  const [mode, setMode] = useState<RecipientMode>('grade');
  const [grade, setGrade] = useState<MiddleSchoolGrade>(teacherGrade ?? 'grade-1');
  const [studentFilterGrade, setStudentFilterGrade] = useState<'all' | MiddleSchoolGrade>(isHead ? 'all' : teacherGrade ?? 'all');
  const [studentQuery, setStudentQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [scheduledDate, setScheduledDate] = useState(today);
  const [question, setQuestion] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, saving]);

  const visibleStudents = useMemo(() => {
    const needle = studentQuery.trim();
    return students.filter((student) =>
      (studentFilterGrade === 'all' || student.gradeLevel === studentFilterGrade) &&
      (!needle || student.name.includes(needle)),
    );
  }, [students, studentFilterGrade, studentQuery]);

  const gradeRecipientCount = useMemo(() => students.filter((student) => student.gradeLevel === grade).length, [students, grade]);
  const selectedStudents = useMemo(() => students.filter((student) => selectedIds.includes(student.id)), [students, selectedIds]);

  const toggleStudent = (id: string) => {
    if (mode === 'single') {
      setSelectedIds([id]);
      return;
    }
    setSelectedIds((current) => (current.includes(id) ? current.filter((value) => value !== id) : [...current, id]));
  };

  const changeMode = (next: RecipientMode) => {
    setMode(next);
    if (next === 'single') setSelectedIds((current) => current.slice(0, 1));
  };

  const targetType: ReadingTargetType = mode === 'grade' ? 'grade' : mode === 'everyone' ? 'all' : 'students';

  const stepError = (index: number): string => {
    if (index === 0 && passage.verses.length === 0) return 'لا توجد آيات محددة.';
    if (index === 1) {
      if (mode === 'grade' && !isHead && !teacherGrade) return 'لم يتم تحديد فصل لحسابك بعد. تواصل مع أمين الخدمة.';
      if ((mode === 'single' || mode === 'multiple') && selectedIds.length === 0) return mode === 'single' ? 'اختر طالبًا.' : 'اختر طالبًا واحدًا على الأقل.';
    }
    if (index === 2) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(scheduledDate)) return 'اختر تاريخًا صحيحًا.';
      if (scheduledDate < addDaysToKey(today, -7)) return 'لا يمكن جدولة قراءة لأكثر من أسبوع مضى.';
    }
    if (index === 3 && question.trim().length > 1000) return 'السؤال طويل جدًا (الحد ١٠٠٠ حرف).';
    return '';
  };

  const goNext = () => {
    const message = stepError(step);
    if (message) {
      setError(message);
      return;
    }
    setError('');
    setStep((value) => Math.min(value + 1, STEPS.length - 1));
  };

  const goBack = () => {
    setError('');
    setStep((value) => Math.max(value - 1, 0));
  };

  const save = async (publish: boolean) => {
    for (let index = 0; index < STEPS.length - 1; index += 1) {
      const message = stepError(index);
      if (message) {
        setStep(index);
        setError(message);
        return;
      }
    }
    setSaving(true);
    setError('');
    try {
      if (simulationMode) {
        await new Promise((resolve) => window.setTimeout(resolve, 400));
        onSaved({ assignmentId: `preview-${Date.now()}`, published: publish });
        return;
      }
      const assignmentId = await createReadingAssignment({
        passage,
        title: title.trim() || undefined,
        targetType,
        targetGrade: mode === 'grade' ? (isHead ? grade : teacherGrade) : undefined,
        studentIds: mode === 'single' || mode === 'multiple' ? selectedIds : [],
        scheduledDate,
        timezone,
        questionText: question.trim() || undefined,
        publish,
      });
      onSaved({ assignmentId, published: publish });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'تعذر حفظ القراءة.');
    } finally {
      setSaving(false);
    }
  };

  const effectiveGrade = isHead ? grade : teacherGrade;
  const audienceSummary =
    mode === 'everyone'
      ? `كل الطلاب في كل الصفوف — ${arabicCount(students.length, 'طالب', 'طالبان', 'طلاب')} حاليًا، ويشمل من ينضم لاحقًا`
      : mode === 'grade'
      ? `${effectiveGrade ? GRADE_LABELS[effectiveGrade] : 'فصلك'} — ${arabicCount(gradeRecipientCount, 'طالب', 'طالبان', 'طلاب')} حاليًا، ويشمل من ينضم لاحقًا`
      : `${arabicCount(selectedStudents.length, 'طالب', 'طالبان', 'طلاب')}: ${selectedStudents.slice(0, 4).map((student) => student.name.split(' ')[0]).join('، ')}${selectedStudents.length > 4 ? '…' : ''}`;

  // Rendered into <body> so the dialog sits above the app's sticky/bottom navigation.
  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="assign-reading-title" dir="rtl">
      <button type="button" className="absolute inset-0 cursor-default" style={{ backgroundColor: p.overlay }} aria-label="إغلاق" onClick={() => !saving && onClose()} />
      <div
        className="relative z-10 flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border shadow-2xl sm:rounded-3xl"
        style={{ backgroundColor: p.surface, borderColor: p.border }}
      >
        {/* Header & stepper */}
        <div className="space-y-4 border-b p-5" style={{ borderColor: p.divider }}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold" style={{ color: p.accent }}>تعيين قراءة يومية</p>
              <h2 id="assign-reading-title" className="text-lg font-black" style={{ color: p.text }}>{passage.reference}</h2>
            </div>
            <button type="button" onClick={onClose} disabled={saving} className="inline-flex h-9 w-9 items-center justify-center rounded-xl disabled:opacity-50" style={secondaryButtonStyle(p)} aria-label="إغلاق">
              <X className="h-4 w-4" />
            </button>
          </div>
          <ol className="grid grid-cols-5 gap-1.5" aria-label="خطوات التعيين">
            {STEPS.map((item, index) => {
              const Icon = item.icon;
              const done = index < step;
              const active = index === step;
              return (
                <li key={item.title} className="flex flex-col items-center gap-1 text-center" aria-current={active ? 'step' : undefined}>
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-black"
                    style={{
                      backgroundColor: done || active ? p.primary : p.surfaceAlt,
                      color: done || active ? '#F3DEAB' : p.muted,
                      border: `1px solid ${active ? p.accent : p.border}`,
                    }}
                  >
                    {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </span>
                  <span className="hidden text-[10px] font-bold sm:block" style={{ color: active ? p.accentText : p.muted }}>{item.title}</span>
                </li>
              );
            })}
          </ol>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <h3 className="mb-4 text-base font-black" style={{ color: p.text }}>
            {toArabicDigits(step + 1)}. {STEPS[step].title}
          </h3>

          {step === 0 && (
            <div className="space-y-4">
              <div className="max-h-64 space-y-2 overflow-y-auto rounded-2xl p-4" style={{ backgroundColor: p.goldSoft }}>
                {passage.verses.map((verse) => (
                  <p key={verse.number} className="text-base leading-9" style={{ color: p.text }}>
                    <span className="ml-1 text-xs font-black" style={{ color: p.accentText }}>({toArabicDigits(verse.number)})</span>
                    {verse.text}
                  </p>
                ))}
              </div>
              <label className="block space-y-1.5">
                <span className="text-xs font-bold" style={{ color: p.muted }}>عنوان اختياري للقراءة</span>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value.slice(0, 120))}
                  placeholder="مثال: محبة الله لنا"
                  className="liquid-glass-input w-full rounded-xl px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#C5A15A]"
                  style={{ color: p.text }}
                />
              </label>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className={`grid gap-2 ${isHead ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'}`} role="radiogroup" aria-label="نوع المستلمين">
                {([
                  ...(isHead ? [['everyone', 'كل الطلاب'] as const] : []),
                  ['grade', 'فصل كامل'] as const,
                  ['multiple', 'عدة طلاب'] as const,
                  ['single', 'طالب واحد'] as const,
                ]).map(([value, label]) => (
                  <button key={value} type="button" role="radio" aria-checked={mode === value} onClick={() => changeMode(value)} className="rounded-xl px-3 py-2.5 text-xs font-bold" style={chipStyle(p, mode === value)}>
                    {label}
                  </button>
                ))}
              </div>

              {mode === 'grade' && (
                <div className="space-y-3">
                  {isHead ? (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      {GRADES.map((value) => (
                        <button key={value} type="button" onClick={() => setGrade(value)} aria-pressed={grade === value} className="rounded-xl px-3 py-3 text-xs font-bold" style={chipStyle(p, grade === value)}>
                          {GRADE_LABELS[value]}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-2xl p-4 text-sm font-bold" style={{ backgroundColor: p.soft, color: p.accentText }}>
                      {teacherGrade ? `سيتم التعيين لكل طلاب ${GRADE_LABELS[teacherGrade]}.` : 'لم يتم تحديد فصل لحسابك بعد.'}
                    </p>
                  )}
                  <p className="text-xs" style={{ color: p.muted }}>
                    عدد الطلاب الحاليين: {toArabicDigits(gradeRecipientCount)}. الطلاب الذين ينضمون للفصل لاحقًا سيرون القراءة أيضًا.
                  </p>
                </div>
              )}

              {mode === 'everyone' && (
                <p className="rounded-2xl p-4 text-sm font-bold" style={{ backgroundColor: p.soft, color: p.accentText }}>
                  سيتم التعيين لكل طلاب الصف السابع والثامن والتاسع ({arabicCount(students.length, 'طالب', 'طالبان', 'طلاب')} حاليًا).
                </p>
              )}

              {(mode === 'single' || mode === 'multiple') && (
                <div className="space-y-3">
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <label className="relative block flex-1">
                      <span className="sr-only">ابحث عن طالب</span>
                      <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: p.muted }} />
                      <input value={studentQuery} onChange={(event) => setStudentQuery(event.target.value)} placeholder="ابحث بالاسم..." className="liquid-glass-input w-full rounded-xl py-2.5 pr-9 pl-3 text-sm outline-none" style={{ color: p.text }} />
                    </label>
                    {isHead && (
                      <select value={studentFilterGrade} onChange={(event) => setStudentFilterGrade(event.target.value as 'all' | MiddleSchoolGrade)} className="liquid-glass-input rounded-xl px-3 py-2.5 text-sm" style={{ color: p.text }} aria-label="تصفية حسب الصف">
                        <option value="all">كل الصفوف</option>
                        {GRADES.map((value) => <option key={value} value={value}>{GRADE_LABELS[value]}</option>)}
                      </select>
                    )}
                  </div>
                  {mode === 'multiple' && visibleStudents.length > 0 && (
                    <div className="flex items-center justify-between text-xs">
                      <span style={{ color: p.muted }}>تم اختيار {toArabicDigits(selectedIds.length)}</span>
                      <button
                        type="button"
                        className="font-bold"
                        style={{ color: p.accentText }}
                        onClick={() => {
                          const ids = visibleStudents.map((student) => student.id);
                          const allSelected = ids.every((id) => selectedIds.includes(id));
                          setSelectedIds((current) => (allSelected ? current.filter((id) => !ids.includes(id)) : Array.from(new Set([...current, ...ids]))));
                        }}
                      >
                        تحديد / إلغاء تحديد الظاهرين
                      </button>
                    </div>
                  )}
                  <ul className="max-h-72 space-y-1.5 overflow-y-auto">
                    {visibleStudents.length === 0 && (
                      <li className="py-6 text-center text-xs" style={{ color: p.muted }}>لا يوجد طلاب في نطاقك يطابقون البحث.</li>
                    )}
                    {visibleStudents.map((student) => {
                      const checked = selectedIds.includes(student.id);
                      return (
                        <li key={student.id}>
                          <button
                            type="button"
                            role={mode === 'single' ? 'radio' : 'checkbox'}
                            aria-checked={checked}
                            onClick={() => toggleStudent(student.id)}
                            className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-right text-sm"
                            style={{ backgroundColor: checked ? p.soft : p.surfaceAlt, border: `1px solid ${checked ? p.softBorder : 'transparent'}`, color: p.text }}
                          >
                            <span className="flex min-w-0 items-center gap-2">
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md" style={{ backgroundColor: checked ? p.primary : 'transparent', border: `1px solid ${checked ? p.primary : p.border}` }}>
                                {checked && <Check className="h-3.5 w-3.5 text-[#F3DEAB]" />}
                              </span>
                              <span className="truncate font-bold">{student.name}</span>
                            </span>
                            {student.gradeLevel && <span className="shrink-0 text-[10px]" style={{ color: p.muted }}>{GRADE_LABELS[student.gradeLevel]}</span>}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {[
                  ['اليوم', today],
                  ['غدًا', addDaysToKey(today, 1)],
                  ['بعد غد', addDaysToKey(today, 2)],
                  ['بعد أسبوع', addDaysToKey(today, 7)],
                ].map(([label, value]) => (
                  <button key={label} type="button" onClick={() => setScheduledDate(value)} className="rounded-xl px-3 py-2 text-xs font-bold" style={chipStyle(p, scheduledDate === value)}>
                    {label}
                  </button>
                ))}
              </div>
              <label className="block space-y-1.5">
                <span className="text-xs font-bold" style={{ color: p.muted }}>أو اختر تاريخًا</span>
                <input
                  type="date"
                  value={scheduledDate}
                  min={addDaysToKey(today, -7)}
                  onChange={(event) => setScheduledDate(event.target.value)}
                  className="liquid-glass-input w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                  style={{ color: p.text, colorScheme: p.dark ? 'dark' : 'light' }}
                />
              </label>
              {/^\d{4}-\d{2}-\d{2}$/.test(scheduledDate) && (
                <p className="rounded-2xl p-4 text-sm font-bold" style={{ backgroundColor: p.goldSoft, color: p.text }}>
                  ستظهر القراءة للطلاب يوم {formatLongDate(scheduledDate)} حسب التوقيت المحلي لكل طالب، ويمكنهم إتمامها في نفس اليوم أو لاحقًا.
                </p>
              )}
              <p className="text-[11px]" style={{ color: p.muted }}>المنطقة الزمنية للخدمة: {timezone}</p>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <p className="text-xs" style={{ color: p.muted }}>اختياري — سؤال قصير يجيب عنه الطالب بعد القراءة، وستظهر إجاباتهم في لوحة المتابعة.</p>
              <textarea
                value={question}
                onChange={(event) => setQuestion(event.target.value.slice(0, 1000))}
                rows={5}
                placeholder="مثال: ما الآية التي لمستك أكثر ولماذا؟"
                className="liquid-glass-input w-full resize-y rounded-2xl px-3 py-3 text-sm leading-7 outline-none focus-visible:ring-2 focus-visible:ring-[#C5A15A]"
                style={{ color: p.text }}
              />
              <p className="text-left text-[11px]" style={{ color: p.muted }}>{toArabicDigits(question.length)} / ١٠٠٠</p>
            </div>
          )}

          {step === 4 && (
            <dl className="space-y-3 text-sm">
              {[
                ['النص', passage.reference + (title.trim() ? ` — ${title.trim()}` : '')],
                ['عدد الآيات', toArabicDigits(passage.verses.length)],
                ['المستلمون', audienceSummary],
                ['موعد القراءة', /^\d{4}-\d{2}-\d{2}$/.test(scheduledDate) ? formatLongDate(scheduledDate) : '—'],
                ['سؤال التأمل', question.trim() || 'بدون سؤال'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl p-3" style={{ backgroundColor: p.surfaceAlt }}>
                  <dt className="text-[11px] font-bold" style={{ color: p.muted }}>{label}</dt>
                  <dd className="mt-0.5 font-bold leading-7" style={{ color: p.text }}>{value}</dd>
                </div>
              ))}
              {simulationMode && (
                <p className="rounded-2xl p-3 text-xs font-bold" style={{ backgroundColor: p.warningSoft, color: p.warning }}>
                  وضع التجربة: لن يتم حفظ أي شيء في قاعدة البيانات.
                </p>
              )}
            </dl>
          )}

          {error && (
            <p className="mt-4 rounded-2xl p-3 text-sm font-bold" style={{ backgroundColor: p.errorSoft, color: p.error }} role="alert">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:pb-4" style={{ borderColor: p.divider }}>
          <button type="button" onClick={goBack} disabled={step === 0 || saving} className="inline-flex items-center gap-1 rounded-xl px-4 py-2.5 text-sm font-bold disabled:opacity-40" style={secondaryButtonStyle(p)}>
            <ChevronRight className="h-4 w-4" />
            السابق
          </button>
          {step < STEPS.length - 1 ? (
            <button type="button" onClick={goNext} className="inline-flex items-center gap-1 rounded-xl px-5 py-2.5 text-sm font-black" style={primaryButtonStyle(p)}>
              التالي
              <ChevronLeft className="h-4 w-4" />
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => void save(false)} disabled={saving} className="rounded-xl px-4 py-2.5 text-sm font-bold disabled:opacity-50" style={secondaryButtonStyle(p)}>
                حفظ كمسودة
              </button>
              <button type="button" onClick={() => void save(true)} disabled={saving} className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-black shadow-lg disabled:opacity-60" style={primaryButtonStyle(p)}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                نشر القراءة
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
};
