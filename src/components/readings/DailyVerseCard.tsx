import React, { useEffect, useState } from 'react';
import { Bell, BellRing, BookOpen, CheckCircle2, ChevronLeft, Sparkles } from 'lucide-react';
import type { ReadingAssignment } from '../../types';
import {
  reminderPermission,
  reminderVerseDetails,
  requestReminderPermission,
  showDailyReadingReminder,
  type ReminderPermission,
} from '../../lib/readingReminders';
import { primaryButtonStyle, readingPalette, secondaryButtonStyle } from './readingTheme';

interface DailyVerseCardProps {
  theme: 'light' | 'dark';
  assignment: ReadingAssignment;
  completed: boolean;
  today: string;
  /** Opens the reading (e.g. navigates to إصحاح النهارده). Hidden when already on that screen. */
  onOpen?: () => void;
  simulationMode?: boolean;
}

/** «آية اليوم»: the daily reminder verse, plus the switch for phone notifications. */
export const DailyVerseCard: React.FC<DailyVerseCardProps> = ({ theme, assignment, completed, today, onOpen, simulationMode = false }) => {
  const p = readingPalette(theme);
  const details = reminderVerseDetails(assignment);
  const [permission, setPermission] = useState<ReminderPermission>(() => reminderPermission());

  // Once a day, remind with a system notification while the reading is pending.
  useEffect(() => {
    if (completed || simulationMode) return;
    void showDailyReadingReminder(assignment, today);
  }, [assignment, completed, today, simulationMode, permission]);

  const enable = async () => {
    const result = await requestReminderPermission();
    setPermission(result);
  };

  return (
    <section
      className="relative overflow-hidden rounded-3xl border p-5 sm:p-6"
      style={{
        background: p.dark
          ? 'linear-gradient(135deg, rgba(84, 20, 36, 0.92) 0%, rgba(32, 24, 34, 0.96) 100%)'
          : 'linear-gradient(135deg, #76243A 0%, #5D192D 100%)',
        borderColor: p.dark ? 'rgba(214, 184, 120, 0.4)' : 'transparent',
        color: '#F8EEF1',
      }}
      aria-labelledby={`daily-verse-${assignment.id}`}
    >
      <div className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full bg-[#C5A15A]/25 blur-2xl" />
      <div className="relative space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p id={`daily-verse-${assignment.id}`} className="inline-flex items-center gap-1.5 text-xs font-black" style={{ color: '#F3DEAB' }}>
            <Sparkles className="h-4 w-4" />
            آية اليوم · {assignment.passage.reference}
          </p>
          {completed && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-black">
              <CheckCircle2 className="h-3.5 w-3.5" /> قرأت إصحاح اليوم
            </span>
          )}
        </div>
        {details ? (
          <blockquote className="text-lg font-bold leading-9 sm:text-xl sm:leading-10">
            «{details.text}»
            <footer className="mt-1 text-xs font-black" style={{ color: '#F3DEAB' }}>({details.reference})</footer>
          </blockquote>
        ) : (
          <p className="text-sm font-bold">إصحاح اليوم: {assignment.passage.reference}</p>
        )}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {onOpen && !completed && (
            <button type="button" onClick={onOpen} className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-black shadow-lg" style={{ ...primaryButtonStyle(p), background: '#F3DEAB', color: '#5D192D', border: 'none' }}>
              <BookOpen className="h-4 w-4" /> اقرأ الإصحاح
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
          {permission === 'default' && (
            <button type="button" onClick={() => void enable()} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold" style={{ ...secondaryButtonStyle(p), backgroundColor: 'rgba(255,255,255,0.12)', color: '#F8EEF1', border: '1px solid rgba(243,222,171,0.4)' }}>
              <Bell className="h-4 w-4" /> فعّل تذكير القراءة على الموبايل
            </button>
          )}
          {permission === 'granted' && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold" style={{ color: '#F3DEAB' }}>
              <BellRing className="h-3.5 w-3.5" /> التذكير مفعّل
            </span>
          )}
          {permission === 'denied' && (
            <span className="text-[11px] font-semibold opacity-80">الإشعارات مقفولة من إعدادات المتصفح.</span>
          )}
        </div>
      </div>
    </section>
  );
};
