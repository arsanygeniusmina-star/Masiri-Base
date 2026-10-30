import React, { useMemo, useRef, useState } from 'react';
import { CalendarRange, CheckCircle2, ChevronDown, ChevronUp, Download, Loader2, Square } from 'lucide-react';
import type { ReadingAssignment } from '../../types';
import { buildReadingPlan, DEFAULT_PLAN_QUESTION, DEFAULT_PLAN_START, type ReadingPlanDay } from '../../lib/readingPlans';
import { buildPassageSelection, fetchBibleChapter, formatBibleReference, toArabicDigits } from '../../lib/bible/bibleService';
import { createReadingAssignment } from '../../lib/readings';
import { deviceTimeZone, formatLongDate, formatShortDate } from '../../lib/readingDates';
import { chipStyle, primaryButtonStyle, readingPalette, secondaryButtonStyle } from './readingTheme';

interface ReadingPlanImporterProps {
  theme: 'light' | 'dark';
  existing: ReadingAssignment[];
  simulationMode?: boolean;
  onImported: () => void;
}

type ImportState = { running: boolean; done: number; total: number; current?: string; failures: { day: ReadingPlanDay; reason: string }[]; finished: boolean };

const planKey = (date: string, bookId: string, chapter: number) => `${date}|${bookId}|${chapter}`;

/**
 * Head-only tool: creates one published reading per day for ALL students from
 * the built-in plan. Chapter text is downloaded on this device (Van Dyck) and
 * saved with each reading, so students never depend on the text provider.
 * Safe to run again: days that already exist are skipped.
 */
export const ReadingPlanImporter: React.FC<ReadingPlanImporterProps> = ({ theme, existing, simulationMode = false, onImported }) => {
  const p = readingPalette(theme);
  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState(DEFAULT_PLAN_START);
  const [question, setQuestion] = useState(DEFAULT_PLAN_QUESTION);
  const [state, setState] = useState<ImportState>({ running: false, done: 0, total: 0, failures: [], finished: false });
  const cancelRef = useRef(false);

  const validStart = /^\d{4}-\d{2}-\d{2}$/.test(startDate);
  const plan = useMemo(() => buildReadingPlan(validStart ? startDate : DEFAULT_PLAN_START, question), [startDate, question, validStart]);

  const existingKeys = useMemo(
    () => new Set(existing.filter((a) => a.targetType === 'all').map((a) => planKey(a.scheduledDate, a.passage.bookId, a.passage.chapter))),
    [existing],
  );
  const missing = plan.days.filter((day) => !existingKeys.has(planKey(day.date, day.book.id, day.chapter)));
  const lastDay = plan.days[plan.days.length - 1];

  const importDay = async (day: ReadingPlanDay) => {
    const verses = await fetchBibleChapter(day.book, day.chapter);
    const first = verses[0].number;
    const last = verses[verses.length - 1].number;
    const selection = buildPassageSelection(day.book, day.chapter, verses, first, last);
    if (selection.verses.length !== last - first + 1) throw new Error('نص الإصحاح ناقص من المصدر');
    const reminderVerse = day.reminderVerse >= first && day.reminderVerse <= last ? day.reminderVerse : first;
    await createReadingAssignment({
      passage: { ...selection, reference: formatBibleReference(day.book.name, day.chapter) },
      title: `${plan.title} — اليوم ${toArabicDigits(day.index + 1)} من ${toArabicDigits(plan.days.length)}`,
      targetType: 'all',
      studentIds: [],
      scheduledDate: day.date,
      timezone: deviceTimeZone(),
      questionText: question.trim() || undefined,
      publish: true,
      reminderVerse,
    });
  };

  const run = async (days: ReadingPlanDay[]) => {
    if (days.length === 0) return;
    cancelRef.current = false;
    setState({ running: true, done: 0, total: days.length, failures: [], finished: false });
    const failures: ImportState['failures'] = [];
    for (let index = 0; index < days.length; index += 1) {
      if (cancelRef.current) break;
      const day = days[index];
      setState((current) => ({ ...current, current: formatBibleReference(day.book.name, day.chapter) }));
      try {
        if (simulationMode) await new Promise((resolve) => window.setTimeout(resolve, 15));
        else await importDay(day);
      } catch (error) {
        failures.push({ day, reason: error instanceof Error ? error.message : 'خطأ غير معروف' });
      }
      setState((current) => ({ ...current, done: index + 1, failures: [...failures] }));
    }
    setState((current) => ({ ...current, running: false, finished: true, current: undefined }));
    if (!simulationMode) onImported();
  };

  const percent = state.total ? Math.round((state.done / state.total) * 100) : 0;

  return (
    <section className="liquid-glass-card space-y-4 rounded-3xl p-5" aria-labelledby="reading-plan-title">
      <button type="button" onClick={() => setOpen((value) => !value)} className="flex w-full items-center justify-between gap-3 text-right" aria-expanded={open}>
        <span className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ backgroundColor: p.soft, color: p.accentText }}>
            <CalendarRange className="h-5 w-5" />
          </span>
          <span>
            <span id="reading-plan-title" className="block text-base font-black" style={{ color: p.text }}>
              خطة القراءة اليومية — إصحاح كل يوم لكل الطلاب
            </span>
            <span className="block text-xs font-semibold" style={{ color: p.muted }}>
              {toArabicDigits(plan.days.length)} يوم · {validStart ? `${formatShortDate(plan.startDate)} ← ${formatShortDate(lastDay.date)}` : '—'} ·{' '}
              {missing.length === 0 ? 'تم استيراد الخطة بالكامل ✓' : `متبقي ${toArabicDigits(missing.length)} يوم للاستيراد`}
            </span>
          </span>
        </span>
        {open ? <ChevronUp className="h-5 w-5" style={{ color: p.muted }} /> : <ChevronDown className="h-5 w-5" style={{ color: p.muted }} />}
      </button>

      {open && (
        <div className="space-y-4 border-t pt-4" style={{ borderColor: p.divider }}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block space-y-1.5">
              <span className="text-xs font-bold" style={{ color: p.muted }}>تاريخ أول يوم</span>
              <input type="date" value={startDate} disabled={state.running} onChange={(event) => setStartDate(event.target.value)} className="liquid-glass-input w-full rounded-xl px-3 py-2.5 text-sm" style={{ color: p.text, colorScheme: p.dark ? 'dark' : 'light' }} />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-bold" style={{ color: p.muted }}>سؤال كل يوم</span>
              <input value={question} disabled={state.running} onChange={(event) => setQuestion(event.target.value.slice(0, 300))} className="liquid-glass-input w-full rounded-xl px-3 py-2.5 text-sm" style={{ color: p.text }} />
            </label>
          </div>

          <p className="text-xs leading-6" style={{ color: p.muted }}>
            كل إصحاح يُفتح للطلاب في يومه فقط، ومعاه تذكير بآية منه. نص الإصحاح يتحمّل من على هذا الجهاز ويتحفظ مع القراءة.
            لو الاستيراد اتقطع، اضغط تاني: الأيام اللي اتعملت قبل كده هتتخطى.
          </p>

          <ol className="max-h-48 space-y-1 overflow-y-auto rounded-2xl p-3 text-xs" style={{ backgroundColor: p.surfaceAlt }}>
            {plan.days.slice(0, 400).map((day) => {
              const exists = existingKeys.has(planKey(day.date, day.book.id, day.chapter));
              return (
                <li key={day.index} className="flex items-center justify-between gap-2" style={{ color: exists ? p.success : p.text }}>
                  <span className="font-bold">
                    {toArabicDigits(day.index + 1)}. {formatBibleReference(day.book.name, day.chapter)}
                    <span className="font-normal" style={{ color: p.muted }}> — آية التذكير {toArabicDigits(day.reminderVerse)}</span>
                  </span>
                  <span className="shrink-0" style={{ color: exists ? p.success : p.muted }}>
                    {exists ? '✓ ' : ''}{formatShortDate(day.date)}
                  </span>
                </li>
              );
            })}
          </ol>

          {(state.running || state.finished) && (
            <div className="space-y-2" role="status">
              <div className="flex justify-between text-xs font-bold" style={{ color: p.muted }}>
                <span>{state.running ? `جاري الاستيراد: ${state.current ?? ''}` : 'انتهى الاستيراد'}</span>
                <span>{toArabicDigits(state.done)}/{toArabicDigits(state.total)}</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full" style={{ backgroundColor: p.divider }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${percent}%`, background: 'linear-gradient(90deg, #76243A 0%, #C5A15A 100%)' }} />
              </div>
              {state.finished && state.failures.length === 0 && (
                <p className="inline-flex items-center gap-1 text-sm font-bold" style={{ color: p.success }}>
                  <CheckCircle2 className="h-4 w-4" /> تم استيراد {toArabicDigits(state.done)} يوم بنجاح{simulationMode ? ' (تجريبي — لم يُحفظ شيء)' : ''}.
                </p>
              )}
              {state.failures.length > 0 && (
                <div className="space-y-1 rounded-2xl p-3 text-xs" style={{ backgroundColor: p.errorSoft, color: p.error }}>
                  <p className="font-black">تعذر استيراد {toArabicDigits(state.failures.length)} يوم — اضغط «استيراد» مرة أخرى لإعادة المحاولة:</p>
                  {state.failures.slice(0, 6).map(({ day, reason }) => (
                    <p key={day.index}>• {formatBibleReference(day.book.name, day.chapter)} ({formatLongDate(day.date)}): {reason}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {!state.running ? (
              <button
                type="button"
                onClick={() => void run(missing)}
                disabled={!validStart || missing.length === 0 || !question.trim()}
                className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-black shadow-lg disabled:opacity-50"
                style={primaryButtonStyle(p)}
              >
                <Download className="h-4 w-4" />
                استيراد {toArabicDigits(missing.length)} يوم ونشرها لكل الطلاب
              </button>
            ) : (
              <>
                <Loader2 className="h-5 w-5 animate-spin" style={{ color: p.accent }} />
                <button type="button" onClick={() => { cancelRef.current = true; }} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold" style={secondaryButtonStyle(p)}>
                  <Square className="h-3.5 w-3.5" /> إيقاف
                </button>
              </>
            )}
            <span className="text-[11px]" style={{ color: p.muted }}>
              <span style={chipStyle(p, false)} className="rounded-full px-2 py-0.5">للأمين العام فقط</span>
            </span>
          </div>
        </div>
      )}
    </section>
  );
};
