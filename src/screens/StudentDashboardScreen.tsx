import React, { useEffect, useState } from 'react';
import { User, DailySpiritualTask, MemoryVerse, AchievementBadge, PrayerRequest } from '../types';
import { Database, CURRENT_WEEK_VERSE } from '../db/storage';
import { supabase, fetchUserProfile } from '../lib/supabase';
import { buildDemoReadingData, fetchReadingAssignments, fetchReadingCompletions } from '../lib/readings';
import { DailyVerseCard } from '../components/readings/DailyVerseCard';
import { StreakBadge } from '../components/readings/StreakBadge';
import { useReadingStreak } from '../lib/useReadingStreak';
import { READINGS_PREVIEW_MODE, loadPreviewReadings } from '../lib/readingsPreview';
import type { ReadingAssignment } from '../types';
import { localDateKey } from '../lib/readingDates';
import {
  CheckCircle2,
  Circle,
  Award,
  BookOpen,
  Volume2,
  VolumeX,
  Heart,
  Send,
  Star,
  Sparkles,
  Share2,
  Calendar,
  Lock,
  BookMarked,
  ChevronLeft,
} from 'lucide-react';

interface StudentDashboardScreenProps {
  currentUser: User;
  onUpdateUser: (updated: User) => void;
  theme: 'light' | 'dark';
  simulationMode?: boolean;
  /** Opens the student's daily readings screen (إصحاح النهارده). */
  onOpenReadings?: () => void;
}

export const StudentDashboardScreen: React.FC<StudentDashboardScreenProps> = ({
  currentUser,
  onUpdateUser,
  theme,
  simulationMode = false,
  onOpenReadings,
}) => {
  const [tasks, setTasks] = useState<DailySpiritualTask[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [simulationPoints, setSimulationPoints] = useState(0);
  const [dashboardError, setDashboardError] = useState('');
  const [verse] = useState<MemoryVerse>(CURRENT_WEEK_VERSE);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [badges, setBadges] = useState<AchievementBadge[]>(Database.getBadges());
  const [prayerContent, setPrayerContent] = useState('');
  const [prayerIsPrivate, setPrayerIsPrivate] = useState(true);
  const [prayerSentMessage, setPrayerSentMessage] = useState('');
  const [prayerRequests, setPrayerRequests] = useState<PrayerRequest[]>([]);
  // Streak = consecutive days with a completed reading (answer + photo).
  const readingStreak = useReadingStreak(currentUser.id, true, simulationMode, currentUser.streakDays);
  // Today's reading for the «آية اليوم» reminder card.
  const [todayReading, setTodayReading] = useState<{ assignment: ReadingAssignment; completed: boolean } | null>(null);
  const todayKey = localDateKey();

  useEffect(() => {
    let cancelled = false;
    if (simulationMode) {
      const demo = buildDemoReadingData(currentUser.gradeLevel ?? 'grade-1', [], todayKey);
      const assignment = demo.assignments.find((item) => item.scheduledDate === todayKey);
      setTodayReading(assignment ? { assignment, completed: false } : null);
      return () => { cancelled = true; };
    }
    if (READINGS_PREVIEW_MODE) {
      loadPreviewReadings(currentUser.id, todayKey)
        .then((preview) => {
          if (cancelled) return;
          const assignment = preview.assignments.find((item) => item.scheduledDate === todayKey);
          setTodayReading(assignment ? { assignment, completed: preview.completions.some((c) => c.assignmentId === assignment.id) } : null);
        })
        .catch(() => { if (!cancelled) setTodayReading(null); });
      return () => { cancelled = true; };
    }
    (async () => {
      try {
        const todays = await fetchReadingAssignments({ fromDate: todayKey, toDate: todayKey });
        if (cancelled || todays.length === 0) {
          if (!cancelled) setTodayReading(null);
          return;
        }
        const own = await fetchReadingCompletions({ studentId: currentUser.id, assignmentIds: todays.map((item) => item.id) });
        if (cancelled) return;
        const done = new Set(own.map((completion) => completion.assignmentId));
        const pending = todays.find((item) => !done.has(item.id));
        const assignment = pending ?? todays[0];
        setTodayReading({ assignment, completed: done.has(assignment.id) });
      } catch {
        // Readings not enabled in the database yet: simply hide the card.
        if (!cancelled) setTodayReading(null);
      }
    })();
    return () => { cancelled = true; };
  }, [currentUser.id, currentUser.gradeLevel, simulationMode, todayKey]);

  useEffect(() => {
    let cancelled = false;
    if (simulationMode) {
      setDashboardError('');
      setSimulationPoints(currentUser.points);
      setTasks([
        { id: 'preview-task-prayer', title: 'صلاة الصباح', subtitle: 'ابدأ يومك بالشكر والصلاة', category: 'prayer', points: 10, completed: false },
        { id: 'preview-task-bible', title: 'قراءة الإنجيل', subtitle: 'اقرأ الإصحاح المحدد لهذا الأسبوع', category: 'bible', points: 15, completed: false },
        { id: 'preview-task-verse', title: 'حفظ آية الأسبوع', subtitle: 'راجع الآية ومرجعها', category: 'verse', points: 20, completed: false },
        { id: 'preview-task-kindness', title: 'عمل محبة', subtitle: 'ساعد شخصاً اليوم بمحبة', category: 'kindness', points: 10, completed: false },
      ]);
      setBadges(Database.getBadges().map((badge, index) => ({ ...badge, isUnlocked: index === 0 })));
      setPrayerRequests([{
        id: 'preview-prayer-existing',
        studentId: currentUser.id,
        studentName: currentUser.name,
        content: 'أرجو الصلاة من أجل عائلتي ونجاحي في الدراسة.',
        isPrivate: true,
        status: 'pending',
        createdAt: new Date().toISOString(),
      }]);
      setTasksLoading(false);
      return () => { cancelled = true; };
    }
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const loadDashboard = async () => {
      setTasksLoading(true);
      setDashboardError('');
      const [taskResult, logResult, prayerResult, badgesResult] = await Promise.all([
        supabase.from('daily_tasks').select('id,title,subtitle,category,points').eq('is_active', true).order('title'),
        supabase.from('student_daily_logs').select('task_id,completed').eq('student_id', currentUser.id).eq('date', today),
        supabase.from('prayer_requests').select('*').eq('student_id', currentUser.id).order('created_at', { ascending: false }),
        supabase.from('student_badges').select('badge_code').eq('student_id', currentUser.id),
      ]);

      if (cancelled) return;
      if (taskResult.error || logResult.error || prayerResult.error || badgesResult.error) {
        console.error('Unable to load student dashboard data:', taskResult.error || logResult.error || prayerResult.error || badgesResult.error);
        setDashboardError('تعذر تحميل بعض البيانات من قاعدة البيانات. تحقق من اتصالك أو صلاحيات الحساب.');
      }

      const completedIds = new Set(
        (logResult.data || []).filter((row: any) => row.completed).map((row: any) => row.task_id as string)
      );
      const mappedTasks: DailySpiritualTask[] = (taskResult.data || []).map((row: any) => ({
        id: row.id,
        title: row.title,
        subtitle: row.subtitle || '',
        category: (['prayer', 'bible', 'liturgy', 'verse', 'kindness'].includes(row.category) ? row.category : 'prayer') as DailySpiritualTask['category'],
        points: Number(row.points || 0),
        completed: completedIds.has(row.id),
      }));
      setTasks(mappedTasks);
      const earnedBadgeCodes = new Set((badgesResult.data || []).map((row: any) => row.badge_code));
      setBadges(Database.getBadges().map((badge) => ({ ...badge, isUnlocked: earnedBadgeCodes.has(badge.id) })));

      setPrayerRequests((prayerResult.data || []).map((row: any) => ({
        id: row.id,
        studentId: row.student_id,
        studentName: row.student_name,
        content: row.content,
        isPrivate: Boolean(row.is_private),
        status: row.status === 'prayed' ? 'prayed' : 'pending',
        createdAt: row.created_at,
      })));
      setTasksLoading(false);
    };

    void loadDashboard();
    return () => { cancelled = true; };
  }, [currentUser.id, currentUser.name, simulationMode]);

  const [showConfettiNotice, setShowConfettiNotice] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState<AchievementBadge | null>(null);
  const [copiedVerse, setCopiedVerse] = useState(false);

  // Persist task completion to Supabase; the database trigger keeps points consistent.
  const handleToggleTask = async (taskId: string) => {
    const task = tasks.find((item) => item.id === taskId);
    if (!task) return;

    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const nextCompleted = !task.completed;
    setDashboardError('');

    if (simulationMode) {
      const updatedTasks = tasks.map((item) => item.id === taskId ? { ...item, completed: nextCompleted } : item);
      setTasks(updatedTasks);
      setSimulationPoints((points) => Math.max(0, points + (nextCompleted ? task.points : -task.points)));
      const completedTasks = updatedTasks.filter((item) => item.completed).length;
      setBadges(Database.getBadges().map((badge, index) => ({ ...badge, isUnlocked: index < completedTasks })));
      if (updatedTasks.length > 0 && updatedTasks.every((item) => item.completed)) {
        setShowConfettiNotice(true);
        window.setTimeout(() => setShowConfettiNotice(false), 5000);
      }
      return;
    }

    const { error } = await supabase
      .from('student_daily_logs')
      .upsert({
        student_id: currentUser.id,
        task_id: taskId,
        date: today,
        completed: nextCompleted,
      }, { onConflict: 'student_id,task_id,date' });

    if (error) {
      console.error('Unable to save task completion:', error);
      setDashboardError('لم يتم حفظ المهمة. حاول مرة أخرى بعد التحقق من الاتصال.');
      return;
    }

    const updatedTasks = tasks.map((item) => item.id === taskId ? { ...item, completed: nextCompleted } : item);
    setTasks(updatedTasks);
    const { data: earnedBadges } = await supabase.from('student_badges').select('badge_code').eq('student_id', currentUser.id);
    if (earnedBadges) {
      const earnedCodes = new Set(earnedBadges.map((row: any) => row.badge_code));
      setBadges(Database.getBadges().map((badge) => ({ ...badge, isUnlocked: earnedCodes.has(badge.id) })));
    }
    if (updatedTasks.length > 0 && updatedTasks.every((item) => item.completed)) {
      setShowConfettiNotice(true);
      window.setTimeout(() => setShowConfettiNotice(false), 5000);
    }

    try {
      const updatedUser = await fetchUserProfile(currentUser.id);
      if (updatedUser) onUpdateUser(updatedUser);
    } catch (error) {
      console.error('Unable to refresh student points:', error);
    }
  };

  const handleShareVerse = () => {
    navigator.clipboard?.writeText?.(`${verse.verseText} — (${verse.reference})`);
    setCopiedVerse(true);
    setTimeout(() => setCopiedVerse(false), 2500);
  };

  const handleVerseAudio = () => {
    if (!('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') {
      setDashboardError('ميزة قراءة الآية صوتياً غير مدعومة في هذا المتصفح. جرّب متصفحاً أحدث.');
      return;
    }
    if (isPlayingAudio) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(`${verse.verseText}. ${verse.reference}`);
    utterance.lang = 'ar';
    utterance.onend = () => setIsPlayingAudio(false);
    utterance.onerror = () => {
      setIsPlayingAudio(false);
      setDashboardError('تعذرت قراءة الآية صوتياً. تحقق من إعدادات الصوت في جهازك.');
    };
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setIsPlayingAudio(true);
  };

  useEffect(() => () => { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); }, []);

  // Completed count
  const completedCount = tasks.filter(t => t.completed).length;
  const progressPercent = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0;

  // Store prayer requests in the shared database with the authenticated student's ID.
  const handleSendPrayer = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = prayerContent.trim();
    if (!content) return;

    setDashboardError('');
    if (simulationMode) {
      const newRequest: PrayerRequest = {
        id: `preview-prayer-${Date.now()}`,
        studentId: currentUser.id,
        studentName: currentUser.name,
        content,
        isPrivate: prayerIsPrivate,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
      setPrayerRequests((previous) => [newRequest, ...previous]);
      setPrayerContent('');
      setPrayerSentMessage('تمت إضافة طلب الصلاة في وضع المحاكاة فقط؛ لم تُرسل بيانات إلى قاعدة البيانات.');
      window.setTimeout(() => setPrayerSentMessage(''), 4000);
      return;
    }

    const { data, error } = await supabase
      .from('prayer_requests')
      .insert({
        student_id: currentUser.id,
        content,
        is_private: prayerIsPrivate,
      })
      .select('*')
      .single();

    if (error) {
      console.error('Unable to save prayer request:', error);
      setDashboardError('تعذر إرسال طلب الصلاة. حاول مرة أخرى.');
      return;
    }

    const newRequest: PrayerRequest = {
      id: data.id,
      studentId: data.student_id,
      studentName: data.student_name,
      content: data.content,
      isPrivate: Boolean(data.is_private),
      status: data.status === 'prayed' ? 'prayed' : 'pending',
      createdAt: data.created_at,
    };
    setPrayerRequests((previous) => [newRequest, ...previous]);
    setPrayerContent('');
    setPrayerSentMessage('تم حفظ طلب الصلاة في قاعدة البيانات. نذكرك في صلواتنا دائماً!');
    window.setTimeout(() => setPrayerSentMessage(''), 4000);
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8 relative">
      {(dashboardError || (tasksLoading && 'جاري تحميل مهامك من قاعدة البيانات...')) && (
        <div role={dashboardError ? 'alert' : 'status'} className="relative z-10 rounded-2xl border p-3.5 text-sm"
          style={{
            backgroundColor: dashboardError ? (theme === 'dark' ? 'rgba(61,36,42,.75)' : '#F9E9EB') : (theme === 'dark' ? 'rgba(52,45,32,.55)' : '#F6F0E3'),
            color: dashboardError ? (theme === 'dark' ? '#F08089' : '#B33B49') : (theme === 'dark' ? '#D6B878' : '#765A22'),
            borderColor: theme === 'dark' ? '#69404D' : '#DFC0CA',
          }}>
          {dashboardError || 'جاري تحميل مهامك من قاعدة البيانات...'}
        </div>
      )}

      {/* Background Ambient Glow */}
      <div className="absolute top-10 right-10 w-96 h-96 rounded-full bg-[#76243A]/15 dark:bg-[#B65370]/15 blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-96 h-96 rounded-full bg-[#C5A15A]/15 dark:bg-[#D6B878]/10 blur-3xl pointer-events-none" />

      {/* Confetti Celebration Banner when all tasks completed */}
      {showConfettiNotice && (
        <div className="p-4 rounded-3xl border text-sm flex items-center justify-between gap-3 text-right shadow-2xl animate-in slide-in-from-top-4 duration-300 church-btn-primary">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-xl shrink-0">
              🎉
            </div>
            <div>
              <h4 className="font-black text-sm">مبارك! أكملت جميع مهام مسارك الروحي لليوم! ✝️</h4>
              <p className="text-xs opacity-90">حافظت على شعلة الالتزام وحصلت على النقاط كاملة!</p>
            </div>
          </div>
          <Sparkles className="w-6 h-6 text-yellow-300 shrink-0 glow-pulse" />
        </div>
      )}

      {/* Student Welcome & Gamification Banner - Super Liquid Glassmorphism */}
      <div
        className="liquid-glass-card rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden backdrop-blur-3xl"
      >
        {/* Decorative Caustic Liquid Ring */}
        <div className="absolute -top-16 -left-16 w-48 h-48 rounded-full bg-[#C5A15A]/15 dark:bg-[#D6B878]/15 blur-2xl pointer-events-none" />
        
        <div className="space-y-2 text-right relative z-10">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="text-xs font-black px-3.5 py-1 rounded-full shadow-sm flex items-center gap-1.5"
              style={{
                backgroundColor: theme === 'dark' ? 'rgba(56, 35, 44, 0.8)' : '#F3E7EB',
                color: theme === 'dark' ? '#F3DEAB' : '#76243A',
                border: `1px solid ${theme === 'dark' ? 'rgba(214, 184, 120, 0.45)' : '#DFC0CA'}`,
              }}
            >
              <Sparkles className="w-3.5 h-3.5 text-[#C5A15A] dark:text-[#D6B878]" />
              <span>مرحلة إعدادي (Middle School)</span>
            </span>
            <span className="text-xs text-[#77717A] dark:text-[#B8B1BB]">·</span>
            <span
              className="text-xs font-bold px-3 py-0.5 rounded-full"
              style={{
                backgroundColor: theme === 'dark' ? 'rgba(38, 32, 44, 0.7)' : '#F2F0ED',
                color: theme === 'dark' ? '#D6B878' : '#76243A',
                border: `1px solid ${theme === 'dark' ? 'rgba(214, 184, 120, 0.25)' : 'rgba(0,0,0,0.06)'}`,
              }}
            >
              {currentUser.gradeLevel === 'grade-1'
                ? 'الصف السابع (أولى إعدادي / 7th Grade)'
                : currentUser.gradeLevel === 'grade-3'
                ? 'الصف التاسع (تالتة إعدادي / 9th Grade)'
                : 'الصف الثامن (تانية إعدادي / 8th Grade)'}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black" style={{ color: theme === 'dark' ? '#F5F1F0' : '#272329' }}>
            سلام ونعمة، يا {currentUser.name.split(' ')[0]}! 🌟
          </h1>
          <p className="text-xs sm:text-sm text-[#77717A] dark:text-[#B8B1BB] max-w-xl font-medium">
            «لاَ يَمْنَعْكَ صِبَاكَ مِنْ أَنْ تَكُونَ قُدْوَةً لِلْمُؤْمِنِينَ» (١ تيموثاوس ٤ : ١٢). أكمل مسارك اليومي لحصد الأوسمة.
          </p>

          {/* Progress Bar with Liquid Glow */}
          <div className="pt-2 max-w-md space-y-1.5">
            <div className="flex justify-between text-xs font-bold" style={{ color: theme === 'dark' ? '#D6B878' : '#76243A' }}>
              <span>إنجاز المهام الروحية اليومية ({completedCount} من {tasks.length})</span>
              <span>{progressPercent}%</span>
            </div>
            <div className="w-full h-3 rounded-full overflow-hidden bg-black/10 dark:bg-white/10 p-0.5 border border-white/20">
              <div
                className="h-full rounded-full transition-all duration-700 shadow-sm"
                style={{
                  width: `${progressPercent}%`,
                  background:
                    theme === 'dark'
                      ? 'linear-gradient(90deg, #76243A 0%, #D6B878 100%)'
                      : 'linear-gradient(90deg, #76243A 0%, #C5A15A 100%)',
                }}
              />
            </div>
          </div>
        </div>

        {/* Gamification Stats Island - Liquid Floating Badges */}
        <div className="flex items-center gap-3 shrink-0 relative z-10">
          <div
            className="p-4 rounded-3xl border text-center min-w-[115px] liquid-glass-pill transition-all hover:scale-105"
          >
            <div className="flex items-center justify-center py-2">
              <StreakBadge value={readingStreak?.value ?? currentUser.streakDays} active={readingStreak?.completedToday ?? false} size="lg" color={theme === 'dark' ? '#F5F1F0' : '#272329'} />
            </div>
          </div>

          <div
            className="p-4 rounded-3xl border text-center min-w-[115px] liquid-glass-pill transition-all hover:scale-105"
          >
            <div className="flex items-center justify-center gap-1.5 text-xs text-[#77717A] dark:text-[#B8B1BB] font-bold">
              <Star className="w-4 h-4 text-[#C5A15A] dark:text-[#D6B878] glow-pulse" />
              <span>نقاطي</span>
            </div>
            <p className="text-2xl font-black font-mono mt-1" style={{ color: theme === 'dark' ? '#F3DEAB' : '#76243A' }}>
              {simulationMode ? simulationPoints : currentUser.points}
            </p>
          </div>
        </div>
      </div>

      {/* Daily reminder verse (آية اليوم) */}
      {todayReading && (
        <DailyVerseCard
          theme={theme}
          assignment={todayReading.assignment}
          completed={todayReading.completed}
          today={todayKey}
          onOpen={onOpenReadings}
          simulationMode={simulationMode}
        />
      )}

      {/* Daily readings shortcut (إصحاح النهارده) */}
      {onOpenReadings && (
        <button
          type="button"
          onClick={onOpenReadings}
          className="liquid-glass-card w-full rounded-3xl p-5 flex items-center justify-between gap-4 text-right transition-all hover:scale-[1.01] active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A15A]"
        >
          <span className="flex items-center gap-3 min-w-0">
            <span
              className="w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: theme === 'dark' ? 'rgba(56, 35, 44, 0.8)' : '#F3E7EB', color: theme === 'dark' ? '#F3DEAB' : '#76243A' }}
            >
              <BookMarked className="w-6 h-6" />
            </span>
            <span className="min-w-0">
              <span className="block text-base font-black" style={{ color: theme === 'dark' ? '#F5F1F0' : '#272329' }}>إصحاح النهارده</span>
              <span className="block text-xs font-semibold" style={{ color: theme === 'dark' ? '#B8B1BB' : '#77717A' }}>
                اقرأ النص الذي عيّنه لك خادم فصلك اليوم وحافظ على سلسلة القراءة.
              </span>
            </span>
          </span>
          <ChevronLeft className="w-5 h-5 shrink-0" style={{ color: theme === 'dark' ? '#D6B878' : '#C5A15A' }} />
        </button>
      )}

      {/* Main Grid: Checklist + Weekly Verse */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Daily Spiritual Tasks Checklist */}
        <div className="lg:col-span-7 space-y-6">
          <div
            className="liquid-glass-card rounded-3xl p-6 sm:p-7 space-y-4 text-right backdrop-blur-3xl"
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
              <span className="text-xs font-bold text-[#76243A] dark:text-[#D6B878]">
                +15 إلى +25 نقطة لكل مهمة مكتملة
              </span>
              <h2 className="text-lg font-black" style={{ color: theme === 'dark' ? '#F5F1F0' : '#272329' }}>
                جدول مساري لليوم
              </h2>
            </div>

            <div className="space-y-3">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => handleToggleTask(task.id)}
                  className="p-4 rounded-2xl border flex items-center justify-between gap-3 cursor-pointer select-none transition-all hover:scale-[1.01] active:scale-[0.99] backdrop-blur-md"
                  style={{
                    backgroundColor: task.completed
                      ? theme === 'dark'
                        ? 'rgba(32, 53, 42, 0.7)'
                        : 'rgba(233, 244, 236, 0.85)'
                      : theme === 'dark'
                      ? 'rgba(38, 32, 44, 0.55)'
                      : 'rgba(255, 255, 255, 0.75)',
                    borderColor: task.completed
                      ? theme === 'dark'
                        ? '#75C695'
                        : '#347653'
                      : theme === 'dark'
                      ? 'rgba(214, 184, 120, 0.2)'
                      : 'rgba(223, 192, 202, 0.5)',
                    boxShadow: task.completed
                      ? theme === 'dark'
                        ? '0 4px 20px rgba(117, 198, 149, 0.15)'
                        : '0 4px 16px rgba(52, 118, 83, 0.12)'
                      : 'none',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      aria-label="تحديد المهمة"
                      className="transition-transform hover:scale-110 active:scale-95"
                    >
                      {task.completed ? (
                        <CheckCircle2 className="w-5 h-5 text-[#347653] dark:text-[#75C695]" />
                      ) : (
                        <Circle className="w-5 h-5 text-[#77717A] dark:text-[#B8B1BB]" />
                      )}
                    </button>
                    <div>
                      <h3
                        className={`text-sm font-bold ${
                          task.completed ? 'line-through opacity-75' : ''
                        }`}
                        style={{ color: theme === 'dark' ? '#F5F1F0' : '#272329' }}
                      >
                        {task.title}
                      </h3>
                      <p className="text-xs text-[#77717A] dark:text-[#B8B1BB] mt-0.5 font-medium">
                        {task.subtitle}
                      </p>
                    </div>
                  </div>

                  <span
                    className="text-xs font-black px-2.5 py-1 rounded-xl shrink-0"
                    style={{
                      backgroundColor: theme === 'dark' ? '#76243A' : '#F3E7EB',
                      color: theme === 'dark' ? '#F3DEAB' : '#76243A',
                      border: theme === 'dark' ? '1px solid rgba(214, 184, 120, 0.35)' : 'none',
                    }}
                  >
                    +{task.points} ن
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Badges Gallery - Liquid Glass Pill Showcase */}
          <div
            className="liquid-glass-card rounded-3xl p-6 sm:p-7 space-y-4 text-right backdrop-blur-3xl"
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
              <span className="text-xs text-[#C5A15A] dark:text-[#D6B878] font-black">
                أوسمة التميز لشباب إعدادي
              </span>
              <h2 className="text-lg font-black" style={{ color: theme === 'dark' ? '#F5F1F0' : '#272329' }}>
                أوسمة THE APOSTLES الكنسية
              </h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {badges.map((badge) => (
                <div
                  key={badge.id}
                  onClick={() => setSelectedBadge(badge)}
                  className="p-3.5 rounded-2xl border flex flex-col items-center text-center space-y-2 transition-all cursor-pointer hover:scale-105 active:scale-95"
                  style={{
                    backgroundColor: badge.isUnlocked
                      ? theme === 'dark'
                        ? 'rgba(56, 35, 44, 0.7)'
                        : 'rgba(246, 240, 227, 0.85)'
                      : theme === 'dark'
                      ? 'rgba(38, 32, 44, 0.4)'
                      : 'rgba(242, 240, 237, 0.6)',
                    borderColor: badge.isUnlocked
                      ? theme === 'dark'
                        ? 'rgba(214, 184, 120, 0.6)'
                        : '#C5A15A'
                      : theme === 'dark'
                      ? 'rgba(255, 255, 255, 0.08)'
                      : 'rgba(0,0,0,0.06)',
                    boxShadow: badge.isUnlocked
                      ? theme === 'dark'
                        ? '0 8px 24px rgba(214, 184, 120, 0.2)'
                        : '0 8px 20px rgba(197, 161, 90, 0.2)'
                      : 'none',
                    opacity: badge.isUnlocked ? 1 : 0.65,
                  }}
                >
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-md transition-transform"
                    style={{
                      background: badge.isUnlocked
                        ? 'linear-gradient(135deg, #C5A15A 0%, #76243A 100%)'
                        : '#77717A',
                      color: '#FFFFFF',
                    }}
                  >
                    {badge.isUnlocked ? <Award className="w-5 h-5" /> : <Lock className="w-4 h-4" />}
                  </div>
                  <h4 className="text-xs font-black" style={{ color: theme === 'dark' ? '#F5F1F0' : '#272329' }}>
                    {badge.title}
                  </h4>
                  <p className="text-[10px] text-[#77717A] dark:text-[#B8B1BB] line-clamp-2">
                    {badge.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Weekly Memory Verse & Prayer Request Box */}
        <div className="lg:col-span-5 space-y-6">
          {/* Weekly Verse Card with Church Theme & Equalizer Visualizer */}
          <div
            className="liquid-glass-card rounded-3xl p-6 sm:p-7 space-y-4 text-right relative overflow-hidden backdrop-blur-3xl"
          >
            <div className="flex items-center justify-between">
              <span
                className="text-[11px] font-black px-3 py-1 rounded-full"
                style={{
                  backgroundColor: theme === 'dark' ? '#76243A' : '#F6F0E3',
                  color: theme === 'dark' ? '#F3DEAB' : '#A96F19',
                  border: theme === 'dark' ? '1px solid rgba(214, 184, 120, 0.45)' : '1px solid #DFC0CA',
                }}
              >
                آية الأسبوع للحفظ والترتيل
              </span>
              <span className="text-xs text-[#77717A] dark:text-[#D6B878] font-bold">
                {verse.weekTitle}
              </span>
            </div>

            <div
              className="p-5 rounded-2xl border space-y-3 relative overflow-hidden"
              style={{
                backgroundColor: theme === 'dark' ? 'rgba(34, 28, 38, 0.75)' : 'rgba(255, 255, 255, 0.75)',
                borderColor: theme === 'dark' ? 'rgba(214, 184, 120, 0.35)' : '#DFC0CA',
                boxShadow: theme === 'dark' ? '0 10px 25px rgba(0,0,0,0.4)' : '0 8px 20px rgba(118,36,58,0.06)',
              }}
            >
              <p
                className="text-lg sm:text-xl font-black leading-relaxed"
                style={{ color: theme === 'dark' ? '#F3DEAB' : '#76243A' }}
              >
                {verse.verseText}
              </p>
              
              <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
                <span className="text-xs font-bold text-[#77717A] dark:text-[#B8B1BB] font-mono">
                  {verse.reference}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleShareVerse}
                    title="مشاركة الآية"
                    className="p-1.5 rounded-xl border transition-colors hover:scale-105 active:scale-95"
                    style={{
                      borderColor: theme === 'dark' ? 'rgba(214, 184, 120, 0.3)' : '#DFC0CA',
                      color: theme === 'dark' ? '#F3DEAB' : '#76243A',
                    }}
                  >
                    {copiedVerse ? <span className="text-[10px] font-bold px-1 text-green-500">تم النسخ!</span> : <Share2 className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    onClick={handleVerseAudio}
                    className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-xl border transition-all hover:scale-105 active:scale-95"
                    style={{
                      backgroundColor: theme === 'dark' ? '#76243A' : '#76243A',
                      color: theme === 'dark' ? '#F3DEAB' : '#FFFFFF',
                      borderColor: theme === 'dark' ? 'rgba(214, 184, 120, 0.45)' : 'none',
                      boxShadow: theme === 'dark' ? '0 4px 15px rgba(118, 36, 58, 0.5)' : '0 4px 12px rgba(118, 36, 58, 0.25)',
                    }}
                  >
                    {/* Playback indicator for the browser's Arabic text-to-speech voice */}
                    {isPlayingAudio ? (
                      <div className="flex items-center gap-0.5 h-3">
                        <span className="w-0.5 h-3 bg-current animate-pulse" />
                        <span className="w-0.5 h-2 bg-current animate-bounce" />
                        <span className="w-0.5 h-3.5 bg-current animate-pulse" />
                      </div>
                    ) : (
                      <Volume2 className="w-3.5 h-3.5" style={{ color: theme === 'dark' ? '#F3DEAB' : '#FFFFFF' }} />
                    )}
                    <span>{isPlayingAudio ? 'إيقاف الترتيل' : 'استماع للتلاوة'}</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-1 text-xs text-[#77717A] dark:text-[#B8B1BB] leading-relaxed">
              <span className="font-bold block" style={{ color: theme === 'dark' ? '#F5F1F0' : '#272329' }}>
                كيف نعيش الآية هذا الأسبوع؟
              </span>
              <p>{verse.meaning}</p>
            </div>
          </div>

          {/* Student Prayer Box (طلب صلاة لخادم الفصل) */}
          <div
            className="liquid-glass-card rounded-3xl p-6 sm:p-7 space-y-4 text-right backdrop-blur-3xl"
          >
            <div className="border-b pb-3" style={{ borderColor: theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
              <h2 className="text-base font-black" style={{ color: theme === 'dark' ? '#F5F1F0' : '#272329' }}>
                صندوق طلبات الصلاة والتواصل
              </h2>
              <p className="text-xs text-[#77717A] dark:text-[#B8B1BB] mt-0.5">
                أرسل طلب صلاة أو سؤال روحي يراه خادم فصلك وأمين الخدمة في سرية تامة
              </p>
            </div>

            {prayerSentMessage && (
              <div
                className="p-3.5 rounded-2xl text-xs flex items-center gap-2"
                style={{
                  backgroundColor: theme === 'dark' ? 'rgba(32, 53, 42, 0.85)' : '#E9F4EC',
                  color: theme === 'dark' ? '#75C695' : '#347653',
                  border: `1px solid ${theme === 'dark' ? '#75C695' : '#347653'}`,
                }}
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{prayerSentMessage}</span>
              </div>
            )}

            <form onSubmit={handleSendPrayer} className="space-y-3.5">
              <textarea
                required
                rows={3}
                value={prayerContent}
                onChange={(e) => setPrayerContent(e.target.value)}
                placeholder="اكتب طلب الصلاة الخاص بك، امتحاناتك، صحتك، أو مسألة تشغل بالك..."
                className="w-full p-3.5 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-[#76243A] resize-none liquid-glass-input"
                style={{
                  color: theme === 'dark' ? '#F5F1F0' : '#272329',
                }}
              />

              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prayerIsPrivate}
                    onChange={(e) => setPrayerIsPrivate(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-[#76243A]"
                  />
                  <span className="text-[#77717A] dark:text-[#B8B1BB]">سرّي (للخادم فقط)</span>
                </label>

                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-1.5 hover:opacity-95 shadow-lg church-btn-primary"
                  style={{
                    background:
                      theme === 'dark'
                        ? 'linear-gradient(135deg, #76243A 0%, #541424 100%)'
                        : 'linear-gradient(135deg, #76243A 0%, #5D192D 100%)',
                    color: theme === 'dark' ? '#F3DEAB' : '#FFFFFF',
                    border: theme === 'dark' ? '1px solid rgba(214, 184, 120, 0.45)' : 'none',
                  }}
                >
                  <Send className="w-3.5 h-3.5" style={{ color: theme === 'dark' ? '#F3DEAB' : '#FFFFFF' }} />
                  <span>إرسال الطلب</span>
                </button>
              </div>
            </form>

            {prayerRequests.length > 0 && (
              <div className="space-y-2.5 pt-2 border-t" style={{ borderColor: theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
                <span className="text-[11px] font-bold text-[#77717A] dark:text-[#B8B1BB]">
                  طلباتي المرسلة مؤخراً:
                </span>
                {prayerRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-3 rounded-2xl border text-xs text-right space-y-1.5 backdrop-blur-md"
                    style={{
                      backgroundColor: theme === 'dark' ? 'rgba(38, 32, 44, 0.5)' : 'rgba(255, 255, 255, 0.65)',
                      borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0,0,0,0.06)',
                    }}
                  >
                    <p style={{ color: theme === 'dark' ? '#F5F1F0' : '#272329' }}>{req.content}</p>
                    <div className="flex items-center justify-between text-[10px] text-[#77717A] dark:text-[#B8B1BB]">
                      <span>{new Date(req.createdAt).toLocaleDateString('ar-EG')}</span>
                      <span className={req.status === 'prayed' ? 'text-green-500 font-bold' : 'text-amber-500'}>
                        {req.status === 'prayed' ? '✓ صلينا من أجلك' : 'قيد المتابعة والصلاة'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Badge Inspect Modal for Middle School Students */}
      {selectedBadge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl p-6 text-center space-y-4 liquid-glass-card shadow-2xl relative">
            <div
              className="w-16 h-16 rounded-3xl mx-auto flex items-center justify-center shadow-xl text-white font-bold text-2xl"
              style={{
                background: selectedBadge.isUnlocked
                  ? 'linear-gradient(135deg, #C5A15A 0%, #76243A 100%)'
                  : '#77717A',
              }}
            >
              {selectedBadge.isUnlocked ? <Award className="w-8 h-8 text-white" /> : <Lock className="w-8 h-8 text-white" />}
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black" style={{ color: theme === 'dark' ? '#F5F1F0' : '#272329' }}>
                {selectedBadge.title}
              </h3>
              <span
                className="text-xs font-bold px-3 py-1 rounded-full inline-block"
                style={{
                  backgroundColor: selectedBadge.isUnlocked
                    ? theme === 'dark' ? 'rgba(56, 35, 44, 0.8)' : '#F6F0E3'
                    : theme === 'dark' ? 'rgba(42, 39, 48, 0.6)' : '#F2F0ED',
                  color: selectedBadge.isUnlocked
                    ? theme === 'dark' ? '#F3DEAB' : '#A96F19'
                    : theme === 'dark' ? '#B8B1BB' : '#77717A',
                }}
              >
                {selectedBadge.isUnlocked ? '🌟 وسام مُكتسب ومُفعّل' : '🔒 يحتاج لإكمال المهام لفتحه'}
              </span>
            </div>

            <p className="text-xs leading-relaxed text-[#77717A] dark:text-[#B8B1BB]">
              {selectedBadge.description}
            </p>

            <button
              onClick={() => setSelectedBadge(null)}
              className="w-full py-2.5 rounded-2xl text-xs font-bold church-btn-primary"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
