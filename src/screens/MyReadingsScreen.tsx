import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpen, Camera, CalendarDays, CheckCircle2, Circle, Clock, Loader2, RefreshCw, RotateCcw, Send } from 'lucide-react';
import type { ReadingAnswer, ReadingAssignment, ReadingCompletion, ReadingStreak, User } from '../types';
import {
  buildDemoReadingData,
  creditedDateOf,
  restorableMissedReadings,
  computeReadingStreak,
  getReadingPhotoUrl,
  uploadReadingPhoto,
  fetchReadingAnswers,
  fetchReadingAssignments,
  fetchReadingCompletions,
  fetchReadingStreaks,
  markReadingComplete,
  saveReadingAnswer,
} from '../lib/readings';
import { toArabicDigits } from '../lib/bible/bibleService';
import { addDaysToKey, canCompleteReadingOn, formatLocalTime, formatLongDate, formatShortDate, localDateKey, relativeDayLabel } from '../lib/readingDates';
import { DailyVerseCard } from '../components/readings/DailyVerseCard';
import { StreakBadge } from '../components/readings/StreakBadge';
import { CameraCapture } from '../components/readings/CameraCapture';
import { announceReadingStreakChanged } from '../lib/useReadingStreak';
import {
  READINGS_PREVIEW_MODE,
  loadPreviewReadings,
  makePreviewThumbnail,
  previewPhotoUrl,
  savePreviewAnswer,
  savePreviewCompletion,
} from '../lib/readingsPreview';
import { primaryButtonStyle, readingPalette, secondaryButtonStyle, statusVisual } from '../components/readings/readingTheme';

interface MyReadingsScreenProps {
  currentUser: User;
  theme: 'light' | 'dark';
  simulationMode?: boolean;
  /** Step through missed (restorable) readings, oldest first, then land on today. */
  restoreMode?: boolean;
  onRestoreDone?: () => void;
}

export const MyReadingsScreen: React.FC<MyReadingsScreenProps> = ({ currentUser, theme, simulationMode = false, restoreMode = false, onRestoreDone }) => {
  // TEMPORARY: local Matthew 6 test mode until the database is linked (see lib/readingsPreview.ts).
  const localPreview = READINGS_PREVIEW_MODE && !simulationMode;
  const p = readingPalette(theme);
  const [today, setToday] = useState(() => localDateKey());
  const [assignments, setAssignments] = useState<ReadingAssignment[]>([]);
  const [completions, setCompletions] = useState<ReadingCompletion[]>([]);
  const [answers, setAnswers] = useState<ReadingAnswer[]>([]);
  const [streak, setStreak] = useState<ReadingStreak>(() => computeReadingStreak(currentUser.id, []));
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [focusId, setFocusId] = useState<string | null>(null);
  const [answerDraft, setAnswerDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState('');
  const [celebrate, setCelebrate] = useState(false);
  const [answerSaved, setAnswerSaved] = useState(false);
  // Photo proof (taken with the phone camera after reading)
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [uploadedPhotoPath, setUploadedPhotoPath] = useState<string | null>(null);
  const [savedPhotoUrl, setSavedPhotoUrl] = useState<string | null>(null);
  const [demoPhotoUrls, setDemoPhotoUrls] = useState<Record<string, string>>({});
  const [cameraOpen, setCameraOpen] = useState(false);

  // Keep "today" correct if the app stays open past midnight.
  useEffect(() => {
    const refreshToday = () => setToday(localDateKey());
    const interval = window.setInterval(refreshToday, 60_000);
    window.addEventListener('focus', refreshToday);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', refreshToday);
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    if (simulationMode) {
      const demo = buildDemoReadingData(currentUser.gradeLevel ?? 'grade-1', ['preview-other-1', 'preview-other-2'], today);
      setAssignments(demo.assignments);
      const own = demo.completions.filter((completion) => completion.studentId === 'preview-other-1').map((completion) => ({ ...completion, studentId: currentUser.id }))
        .filter((completion) => completion.assignmentId !== 'preview-reading-today');
      setCompletions(own);
      setAnswers([]);
      setStreak(computeReadingStreak(currentUser.id, own.map(creditedDateOf), today));
      setLoading(false);
      return;
    }
    if (localPreview) {
      try {
        const preview = await loadPreviewReadings(currentUser.id, today);
        setAssignments(preview.assignments);
        setCompletions(preview.completions);
        setAnswers(preview.answers);
        setStreak(preview.streak);
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : 'تعذر تحميل إنجيل متى ٦.');
      } finally {
        setLoading(false);
      }
      return;
    }
    try {
      const [visible, ownCompletions, ownAnswers, streaks] = await Promise.all([
        // Last 30 days (history/catch-up) + next 7 days (upcoming), so a long plan stays light on phones.
        fetchReadingAssignments({ fromDate: addDaysToKey(today, -30), toDate: addDaysToKey(today, 7) }),
        fetchReadingCompletions({ studentId: currentUser.id }),
        fetchReadingAnswers({ studentId: currentUser.id }),
        fetchReadingStreaks([currentUser.id], today),
      ]);
      setAssignments(visible);
      setCompletions(ownCompletions);
      setAnswers(ownAnswers);
      setStreak(streaks[0] ?? computeReadingStreak(currentUser.id, ownCompletions.map(creditedDateOf), today));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'تعذر تحميل قراءاتك.');
    } finally {
      setLoading(false);
    }
  }, [simulationMode, localPreview, currentUser.id, currentUser.gradeLevel, today]);

  useEffect(() => {
    void load();
  }, [load]);

  const completionByAssignment = useMemo(() => new Map(completions.map((completion) => [completion.assignmentId, completion])), [completions]);
  const answerByAssignment = useMemo(() => new Map(answers.map((answer) => [answer.assignmentId, answer])), [answers]);

  const todays = useMemo(() => assignments.filter((assignment) => assignment.scheduledDate === today), [assignments, today]);
  const upcoming = useMemo(
    () => assignments.filter((assignment) => assignment.scheduledDate > today).sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate)),
    [assignments, today],
  );
  const past = useMemo(
    () => assignments.filter((assignment) => assignment.scheduledDate < today).sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate)),
    [assignments, today],
  );
  // Missed readings that can still be restored (this Friday → Thursday week), oldest first.
  const missed = useMemo(() => restorableMissedReadings(assignments, completions, today), [assignments, completions, today]);

  // Restore flow: jump to the earliest missed reading; finish on today's.
  useEffect(() => {
    if (!restoreMode || loading) return;
    const first = missed[0];
    if (first) {
      setFocusId(first.id);
    } else {
      setFocusId(todays[0]?.id ?? null);
      onRestoreDone?.();
    }
    // Only when restore mode starts or data first arrives.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restoreMode, loading]);

  // Pick what to show first: today's pending → today's done → oldest restorable missed.
  useEffect(() => {
    if (focusId && assignments.some((assignment) => assignment.id === focusId && canCompleteReadingOn(assignment.scheduledDate, today))) return;
    const next =
      todays.find((assignment) => !completionByAssignment.has(assignment.id)) ??
      todays[0] ??
      missed[0] ??
      null;
    setFocusId(next ? next.id : null);
  }, [assignments, todays, missed, completionByAssignment, focusId, today]);

  const focus = assignments.find((assignment) => assignment.id === focusId) ?? null;
  const focusCompletion = focus ? completionByAssignment.get(focus.id) : undefined;
  const focusAnswer = focus ? answerByAssignment.get(focus.id) : undefined;

  useEffect(() => {
    setAnswerDraft(focusAnswer?.answerText ?? '');
    setActionError('');
    setAnswerSaved(false);
  }, [focusId, focusAnswer?.answerText]);

  // A new reading starts with a fresh camera step.
  useEffect(() => {
    setPhotoBlob(null);
    setUploadedPhotoPath(null);
    setPhotoPreview((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return null;
    });
  }, [focusId]);

  useEffect(() => () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
  }, [photoPreview]);

  // Show the student's own saved proof photo for completed readings.
  const focusPhotoPath = focusCompletion?.photoPath;
  useEffect(() => {
    let cancelled = false;
    setSavedPhotoUrl(null);
    if (!focusPhotoPath) return;
    if (simulationMode) {
      setSavedPhotoUrl(demoPhotoUrls[focusPhotoPath] ?? null);
      return;
    }
    if (localPreview) {
      setSavedPhotoUrl(previewPhotoUrl(currentUser.id, focusPhotoPath));
      return;
    }
    getReadingPhotoUrl(focusPhotoPath)
      .then((url) => { if (!cancelled) setSavedPhotoUrl(url); })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [focusPhotoPath, simulationMode, localPreview, demoPhotoUrls, currentUser.id]);

  // Photos come ONLY from the live in-app camera (no gallery / file uploads).
  const handleCameraPhoto = (photo: Blob) => {
    setCameraOpen(false);
    setActionError('');
    setPhotoBlob(photo);
    setUploadedPhotoPath(null);
    setPhotoPreview((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return URL.createObjectURL(photo);
    });
  };

  const applyCompletion = (completion: ReadingCompletion) => {
    const next = [completion, ...completions.filter((item) => item.assignmentId !== completion.assignmentId)];
    setCompletions(next);
    const nextStreak = computeReadingStreak(currentUser.id, next.map(creditedDateOf), today);
    setStreak(nextStreak);
    const remaining = restorableMissedReadings(assignments, next, today);
    announceReadingStreakChanged({ value: nextStreak.currentStreak, completedToday: nextStreak.completedToday, restoreCount: remaining.length });
    // In restore mode, move on to the next missed day, and finally to today.
    if (restoreMode) {
      const following = remaining[0] ?? todays[0];
      if (following) {
        window.setTimeout(() => {
          setFocusId(following.id);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 1600);
      }
      if (remaining.length === 0) onRestoreDone?.();
    }
  };

  const applyAnswer = (answer: ReadingAnswer) => {
    setAnswers((current) => [answer, ...current.filter((item) => item.assignmentId !== answer.assignmentId)]);
  };

  const needsAnswer = Boolean(focus?.questionText);
  const answerReady = !needsAnswer || answerDraft.trim().length > 0;
  const photoReady = Boolean(photoBlob);
  const canComplete = answerReady && photoReady && !photoBusy;

  const handleMarkRead = async () => {
    if (!focus || submitting) return;
    const text = answerDraft.trim();
    if (!answerReady) {
      setActionError('اكتب إجابتك عن سؤال التأمل أولًا.');
      return;
    }
    if (!photoBlob) {
      setActionError('التقط صورة بالكاميرا بعد القراءة أولًا.');
      return;
    }
    setSubmitting(true);
    setActionError('');
    try {
      if (simulationMode || localPreview) {
        const now = new Date().toISOString();
        const demoPath = `preview/${focus.id}`;
        setDemoPhotoUrls((current) => ({ ...current, [demoPath]: URL.createObjectURL(photoBlob) }));
        const answer: ReadingAnswer = { id: `preview-answer-${focus.id}`, assignmentId: focus.id, studentId: currentUser.id, answerText: text, submittedAt: now, updatedAt: now };
        const completion: ReadingCompletion = { id: `preview-completion-${focus.id}`, assignmentId: focus.id, studentId: currentUser.id, completedAt: now, localDate: today, creditedDate: focus.scheduledDate, photoPath: demoPath };
        if (focus.questionText && text) applyAnswer(answer);
        applyCompletion(completion);
        if (localPreview) {
          if (focus.questionText && text) savePreviewAnswer(currentUser.id, answer);
          const thumbnail = await makePreviewThumbnail(photoBlob).catch(() => undefined);
          savePreviewCompletion(currentUser.id, completion, thumbnail);
          if (thumbnail) setSavedPhotoUrl(thumbnail);
        }
      } else {
        // 1) answer (required by the database when there is a question)
        if (focus.questionText && text) applyAnswer(await saveReadingAnswer(focus.id, currentUser.id, text));
        // 2) photo (uploaded once; reused if the completion step has to be retried)
        const photoPath = uploadedPhotoPath ?? (await uploadReadingPhoto(focus.id, currentUser.id, photoBlob));
        setUploadedPhotoPath(photoPath);
        // 3) completion → this is what counts for the streak
        applyCompletion(await markReadingComplete(focus.id, currentUser.id, photoPath, today));
        // Re-sync the authoritative streak from the database.
        fetchReadingStreaks([currentUser.id], today).then((rows) => {
          if (!rows[0]) return;
          setStreak(rows[0]);
          announceReadingStreakChanged({ value: rows[0].currentStreak, completedToday: rows[0].completedToday });
        }).catch(() => undefined);
      }
      setCelebrate(true);
      window.setTimeout(() => setCelebrate(false), 3500);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'تعذر تسجيل القراءة.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveAnswer = async () => {
    if (!focus || !focus.questionText || submitting) return;
    const text = answerDraft.trim();
    if (!text) {
      setActionError('اكتب إجابتك أولًا.');
      return;
    }
    setSubmitting(true);
    setActionError('');
    try {
      if (simulationMode || localPreview) {
        const now = new Date().toISOString();
        const answer: ReadingAnswer = { id: `preview-answer-${focus.id}`, assignmentId: focus.id, studentId: currentUser.id, answerText: text, submittedAt: focusAnswer?.submittedAt ?? now, updatedAt: now };
        applyAnswer(answer);
        if (localPreview) savePreviewAnswer(currentUser.id, answer);
      } else {
        applyAnswer(await saveReadingAnswer(focus.id, currentUser.id, text));
      }
      setAnswerSaved(true);
      window.setTimeout(() => setAnswerSaved(false), 2500);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'تعذر حفظ إجابتك.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 lg:px-8" dir="rtl">
      {/* Header + streak */}
      <div className="liquid-glass-card relative flex flex-col gap-5 overflow-hidden rounded-3xl p-6 sm:p-7 md:flex-row md:items-center md:justify-between">
        <div className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full bg-[#C5A15A]/15 blur-2xl" />
        <div className="relative space-y-2">
          <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black" style={{ backgroundColor: p.soft, color: p.accentText, border: `1px solid ${p.softBorder}` }}>
            <CalendarDays className="h-3.5 w-3.5" />
            {formatLongDate(today)}
          </span>
          <h1 className="text-2xl font-black sm:text-3xl" style={{ color: p.text }}>إصحاح النهارده</h1>
        </div>
        <div className="relative">
          <div className="liquid-glass-pill flex min-w-[110px] items-center justify-center rounded-3xl px-4 py-4">
            <StreakBadge value={streak.currentStreak} active={streak.completedToday} size="lg" color={p.text} />
          </div>
        </div>
      </div>

      {simulationMode && (
        <p className="rounded-2xl p-3 text-center text-xs font-bold" style={{ backgroundColor: p.warningSoft, color: p.warning }}>
          بيانات تجريبية — زر «تمت القراءة» هنا لا يحفظ شيئًا في قاعدة البيانات.
        </p>
      )}

      {celebrate && (
        <div className="flex items-center gap-3 rounded-2xl p-4 text-sm font-black shadow-lg" style={{ backgroundColor: p.successSoft, color: p.success }} role="status">
          <CheckCircle2 className="h-5 w-5" />
          ربنا يباركك! تم تسجيل قراءتك <StreakBadge value={streak.currentStreak} size="md" />
        </div>
      )}

      {loadError && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4" style={{ backgroundColor: p.errorSoft }} role="alert">
          <p className="text-sm font-bold" style={{ color: p.error }}>{loadError}</p>
          <button type="button" onClick={() => void load()} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold" style={secondaryButtonStyle(p)}>
            <RefreshCw className="h-4 w-4" /> إعادة المحاولة
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16" role="status" aria-label="جاري التحميل">
          <Loader2 className="h-7 w-7 animate-spin" style={{ color: p.accent }} />
        </div>
      ) : (
        <>
          {/* Daily reminder verse (آية اليوم) */}
          {todays[0] && (
            <DailyVerseCard
              theme={theme}
              assignment={todays[0]}
              completed={completionByAssignment.has(todays[0].id)}
              today={today}
              simulationMode={simulationMode}
            />
          )}

          {/* Today's selector when there is more than one reading */}
          {todays.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {todays.map((assignment) => {
                const done = completionByAssignment.has(assignment.id);
                return (
                  <button
                    key={assignment.id}
                    type="button"
                    onClick={() => setFocusId(assignment.id)}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-2xl px-3 py-2 text-xs font-bold"
                    style={{
                      backgroundColor: focusId === assignment.id ? p.soft : 'transparent',
                      color: focusId === assignment.id ? p.accentText : p.muted,
                      border: `1px solid ${focusId === assignment.id ? p.softBorder : p.border}`,
                    }}
                  >
                    {done ? <CheckCircle2 className="h-4 w-4" style={{ color: p.success }} /> : <Clock className="h-4 w-4" />}
                    {assignment.passage.reference}
                  </button>
                );
              })}
            </div>
          )}

          {/* Focus reading */}
          {focus ? (
            <article className="liquid-glass-card space-y-5 rounded-3xl p-5 sm:p-7" aria-labelledby="focus-reading-title">
              <header className="flex flex-wrap items-start justify-between gap-3 border-b pb-4" style={{ borderColor: p.divider }}>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold" style={{ color: focus.scheduledDate < today ? p.error : p.accent }}>
                    {focus.scheduledDate === today ? 'قراءة اليوم' : focusCompletion ? `قراءة ${relativeDayLabel(focus.scheduledDate, today)} — تمت` : `Restore · ${formatLongDate(focus.scheduledDate)} — متاحة حتى الخميس ١١:٥٩ م`}
                  </p>
                  <h2 id="focus-reading-title" className="text-xl font-black sm:text-2xl" style={{ color: p.text }}>{focus.passage.reference}</h2>
                  {focus.title && <p className="text-sm font-semibold" style={{ color: p.muted }}>{focus.title}</p>}
                </div>
                {focusCompletion && (
                  <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black" style={{ backgroundColor: p.successSoft, color: p.success }}>
                    <CheckCircle2 className="h-4 w-4" />
                    تمت القراءة {formatLocalTime(focusCompletion.completedAt)}
                  </span>
                )}
              </header>

              <div className="space-y-3">
                {focus.passage.verses.map((verse) => (
                  <p key={verse.number} className="text-lg leading-10 sm:text-xl sm:leading-[2.6rem]" style={{ color: p.text }}>
                    <sup className="ml-1 text-xs font-black" style={{ color: p.accentText }}>{toArabicDigits(verse.number)}</sup>
                    {verse.text}
                  </p>
                ))}
                {focus.passage.verses.length === 0 && (
                  <p className="text-sm" style={{ color: p.muted }}>لا يتوفر نص هذه القراءة حاليًا.</p>
                )}
              </div>

              {focus.questionText && (
                <div className="space-y-2 rounded-2xl p-4" style={{ backgroundColor: p.goldSoft }}>
                  <label htmlFor="reading-answer" className="block text-sm font-black" style={{ color: p.accentText }}>
                    {!focusCompletion && <span className="ml-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs" style={{ backgroundColor: p.primary, color: '#F3DEAB' }}>١</span>}
                    سؤال للتأمل: {focus.questionText}
                  </label>
                  <textarea
                    id="reading-answer"
                    value={answerDraft}
                    onChange={(event) => setAnswerDraft(event.target.value.slice(0, 2000))}
                    rows={4}
                    placeholder={focusCompletion ? 'إجابتك...' : 'اكتب إجابتك هنا...'}
                    className="liquid-glass-input w-full resize-y rounded-2xl px-3 py-3 text-sm leading-7 outline-none focus-visible:ring-2 focus-visible:ring-[#C5A15A]"
                    style={{ color: p.text }}
                  />
                  {focusAnswer && (
                    <p className="text-[11px]" style={{ color: p.muted }}>أرسلت إجابتك {formatLocalTime(focusAnswer.submittedAt)} — يمكنك تعديلها.</p>
                  )}
                </div>
              )}

              {/* Photo proof */}
              {!focusCompletion ? (
                <div className="space-y-3 rounded-2xl p-4" style={{ backgroundColor: p.surfaceAlt, border: `1px dashed ${photoReady ? p.success : p.softBorder}` }}>
                  <p className="text-sm font-black" style={{ color: p.accentText }}>
                    <span className="ml-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs" style={{ backgroundColor: p.primary, color: '#F3DEAB' }}>{needsAnswer ? '٢' : '١'}</span>
                    صورة بعد القراءة
                  </p>
                  <p className="text-xs" style={{ color: p.muted }}>التقط أي صورة بكاميرا الموبايل بعد ما تخلّص القراءة — مثلًا الإنجيل المفتوح أو كراسة التأمل. الصورة يراها خادم فصلك فقط.</p>
                  {photoPreview ? (
                    <div className="flex flex-wrap items-center gap-3">
                      <img src={photoPreview} alt="الصورة الملتقطة" className="h-28 w-28 rounded-2xl object-cover shadow-md" />
                      <div className="space-y-2">
                        <p className="inline-flex items-center gap-1 text-sm font-bold" style={{ color: p.success }}>
                          <CheckCircle2 className="h-4 w-4" /> تم التقاط الصورة
                        </p>
                        <button type="button" onClick={() => setCameraOpen(true)} disabled={submitting || photoBusy} className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold disabled:opacity-50" style={secondaryButtonStyle(p)}>
                          <RotateCcw className="h-3.5 w-3.5" /> إعادة التصوير
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setCameraOpen(true)}
                      disabled={photoBusy || submitting}
                      className="inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-black disabled:opacity-60"
                      style={secondaryButtonStyle(p)}
                    >
                      {photoBusy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
                      افتح الكاميرا والتقط صورة
                    </button>
                  )}
                </div>
              ) : (
                (savedPhotoUrl || focusCompletion.photoPath) && (
                  <div className="flex items-center gap-3 rounded-2xl p-3" style={{ backgroundColor: p.successSoft }}>
                    {savedPhotoUrl ? (
                      <img src={savedPhotoUrl} alt="صورة إتمام القراءة" className="h-20 w-20 rounded-xl object-cover" />
                    ) : (
                      <span className="flex h-20 w-20 items-center justify-center rounded-xl" style={{ backgroundColor: p.surfaceAlt }}><Camera className="h-6 w-6" style={{ color: p.success }} /></span>
                    )}
                    <p className="text-sm font-bold" style={{ color: p.success }}>تم إرفاق صورة الإتمام ✓</p>
                  </div>
                )
              )}

              {!focusCompletion && (
                <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-bold" aria-label="خطوات إتمام القراءة">
                  {needsAnswer && (
                    <li className="inline-flex items-center gap-1" style={{ color: answerReady ? p.success : p.muted }}>
                      {answerReady ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />} الإجابة عن السؤال
                    </li>
                  )}
                  <li className="inline-flex items-center gap-1" style={{ color: photoReady ? p.success : p.muted }}>
                    {photoReady ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />} صورة بعد القراءة
                  </li>
                </ul>
              )}

              {actionError && (
                <p className="rounded-2xl p-3 text-sm font-bold" style={{ backgroundColor: p.errorSoft, color: p.error }} role="alert">{actionError}</p>
              )}

              <div className="flex flex-wrap items-center gap-3">
                {!focusCompletion ? (
                  <button
                    type="button"
                    onClick={() => void handleMarkRead()}
                    disabled={submitting || !canComplete}
                    className="inline-flex items-center gap-2 rounded-2xl px-6 py-3.5 text-base font-black shadow-lg transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-60"
                    style={primaryButtonStyle(p)}
                  >
                    {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
                    تمت القراءة
                  </button>
                ) : (
                  focus.questionText && (
                    <button
                      type="button"
                      onClick={() => void handleSaveAnswer()}
                      disabled={submitting || answerDraft.trim() === (focusAnswer?.answerText ?? '')}
                      className="inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-black disabled:opacity-50"
                      style={primaryButtonStyle(p)}
                    >
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      {focusAnswer ? 'حفظ التعديل' : 'إرسال الإجابة'}
                    </button>
                  )
                )}
                {answerSaved && <span className="text-sm font-bold" style={{ color: p.success }}>تم حفظ إجابتك ✓</span>}
              </div>
            </article>
          ) : (
            <div className="liquid-glass-card rounded-3xl p-10 text-center">
              <BookOpen className="mx-auto h-10 w-10" style={{ color: p.accent }} />
              <p className="mt-3 text-base font-black" style={{ color: p.text }}>لا توجد قراءة مطلوبة اليوم</p>
              <p className="mt-1 text-sm" style={{ color: p.muted }}>
                {upcoming[0] ? `قراءتك القادمة ${relativeDayLabel(upcoming[0].scheduledDate, today)}: ${upcoming[0].passage.reference}` : 'سيظهر هنا ما يعيّنه لك خادم فصلك.'}
              </p>
            </div>
          )}
        </>
      )}

      {cameraOpen && <CameraCapture theme={theme} onCapture={handleCameraPhoto} onClose={() => setCameraOpen(false)} />}
    </div>
  );
};
