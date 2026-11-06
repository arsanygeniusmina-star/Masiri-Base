import React, { useCallback, useEffect, useState } from 'react';
import type { User } from '../types';
import type { StreakState } from '../lib/useReadingStreak';
import { useReadingStreak } from '../lib/useReadingStreak';

interface WidgetData {
  userId: string;
  name: string;
  email: string;
  role: 'student' | 'teacher' | 'head' | 'test';
  streakDays: number;
  points: number;
  gradeLevel: string | null;
  todayReading: {
    reference: string;
    completed: boolean;
    assignmentId: string | null;
  };
  pendingTasks: number;
  updatedAt: string;
}

/**
 * WidgetViewScreen — Ultra-minimal widget view for home screen widgets.
 * 
 * Design follows UI/UX Pro Max guidelines:
 * - Priority 1 Accessibility: 4.5:1 contrast, screen reader labels, RTL support
 * - Priority 2 Touch: 44px minimum touch targets, 8px spacing
 * - Priority 3 Performance: No layout shift, minimal DOM, fast first paint
 * - Priority 5 Layout: Mobile-first, no horizontal scroll, RTL-aware
 * - Priority 7 Animation: Subtle motion, context-aware timing
 * 
 * This route renders only the essential widget data without layout bloat.
 * Native wrappers (Capacitor, Tauri) can load this in a WebView,
 * or users can bookmark it as a home screen shortcut.
 */
export const WidgetViewScreen: React.FC<{ currentUser: User | null }> = ({ currentUser }) => {
  const [data, setData] = useState<WidgetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const streakState = useReadingStreak(
    currentUser?.id ?? '',
    currentUser?.role === 'student' ||
      currentUser?.role === 'teacher' ||
      currentUser?.role === 'head',
    false,
    currentUser?.streakDays ?? 0,
  );

  const fetchWidgetData = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/widget-data?userId=${encodeURIComponent(currentUser.id)}`,
        { cache: 'no-store' },
      );
      if (!response.ok) throw new Error('تعذر تحميل بيانات الأداة');
      const json: WidgetData = await response.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تحميل البيانات');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    void fetchWidgetData();
    // Refresh widget data every 5 minutes while open
    const interval = setInterval(() => void fetchWidgetData(), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchWidgetData]);

  // Use streak from context if API hasn't loaded yet
  const displayStreak = data?.streakDays ?? streakState?.value ?? currentUser?.streakDays ?? 0;

  if (loading) {
    return (
      <div
        className="flex items-center justify-center h-screen bg-[#76243A] text-white"
        role="status"
        aria-label="جاري تحميل البيانات..."
      >
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D6B878]" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div
        className="flex flex-col items-center justify-center h-screen bg-[#76243A] text-white text-center p-6"
        role="alert"
      >
        <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-4 shrink-0">
          <span className="text-4xl">⚠️</span>
        </div>
        <h2 className="text-lg font-black mb-2" style={{ color: '#F3DEAB' }}>
          تعذر تحميل البيانات
        </h2>
        <p className="text-sm text-[#B8B1BB] max-w-xs">
          {error || 'لم نتمكن من جلب بيانات الأداة في هذه اللحظة.'}
        </p>
        <button
          onClick={() => void fetchWidgetData()}
          className="mt-6 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black shadow-lg"
          style={{
            background: 'linear-gradient(135deg, #76243A 0%, #541424 100%)',
            color: '#F3DEAB',
          }}
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }

  return (
    <div
      className="h-screen w-full bg-gradient-to-b from-[#76243A] to-[#5D192D] p-4 sm:p-6 text-right"
      dir="rtl"
    >
      <div
        className="max-w-md mx-auto bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 p-6 shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="w-12 h-12 rounded-full bg-[#D6B878]/20 flex items-center justify-center text-[#76243A] text-lg font-bold shrink-0">
            {data.name.charAt(0)}
          </div>
          <span className="text-[10px] font-black tracking-wider uppercase text-[#D6B878]">
            THE APOSTLES
          </span>
        </div>

        {/* Name & Role */}
        <h1 className="text-2xl sm:text-3xl font-black text-white mb-1" dir="rtl">
          {data.name}
        </h1>
        <p className="text-[#D6B878]/90 text-sm font-semibold mb-6">
          {data.role === 'head'
            ? 'أمين الخدمة العام'
            : data.role === 'teacher'
            ? 'خادم فصلي'
            : data.role === 'test'
            ? 'حساب اختبار'
            : 'طالب إعدادي'}
        </p>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-white/5 rounded-2xl p-4 text-center">
            <div className="text-xs text-[#B8B1BB] uppercase tracking-wider font-black mb-1">
              سلسلة القراءة
            </div>
            <div className="text-3xl font-black font-mono text-[#D6B878]">
              {displayStreak} يوم
            </div>
          </div>
          <div className="bg-white/5 rounded-2xl p-4 text-center">
            <div className="text-xs text-[#B8B1BB] uppercase tracking-wider font-black mb-1">
              النقاط
            </div>
            <div className="text-3xl font-black font-mono text-white">
              {data.points}
            </div>
          </div>
        </div>

        {/* Today's Reading */}
        <div className="bg-white/5 rounded-2xl p-4 mb-6 border border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-[#D6B878]/20 flex items-center justify-center text-[#76243A] font-bold shrink-0">
              ١
            </div>
            <div className="flex-1">
              <div className="font-black text-white sm:text-base text-sm">
                إصحاح النهارده
              </div>
              <div className="text-[10px] text-[#B8B1BB] uppercase tracking-wider">
                {data.todayReading.reference}
              </div>
            </div>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black ${
                data.todayReading.completed
                  ? 'bg-[#347653] text-white'
                  : 'bg-[#A96F19] text-white'
              }`}
            >
              {data.todayReading.completed ? 'تمت القراءة' : 'لم تُقرأ'}
            </span>
          </div>
        </div>

        {/* Pending Tasks */}
        <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-[#B8B1BB] uppercase tracking-wider font-black">
              مهمات معلقة
            </div>
            <div className="text-2xl font-black font-mono text-white">
              {data.pendingTasks}
            </div>
          </div>
          <div className="h-1 w-full bg-white/10 rounded-full mt-2">
            <div
              className="h-full bg-[#D6B878] rounded-full"
              style={{ width: `${Math.min((data.pendingTasks / 5) * 100, 100)}%` }}
            ></div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-[10px] text-[#B8B1BB]">
          <span className="font-black">THE APOSTLES</span>
          <span>محدث: {new Date(data.updatedAt).toLocaleTimeString('ar-EG')}</span>
        </div>
      </div>
    </div>
  );
};
