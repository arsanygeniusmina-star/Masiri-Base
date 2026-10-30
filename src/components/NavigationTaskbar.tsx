import React from 'react';
import {
  Compass,
  LogIn,
  UserPlus,
  User as UserIcon,
  ShieldCheck,
  Sparkles,
  Moon,
  Sun,
  LogOut,
  LayoutDashboard,
  Database,
  BookOpen,
  BookMarked,
} from 'lucide-react';
import type { User } from '../types';
import { StreakBadge } from './readings/StreakBadge';
import type { StreakState } from '../lib/useReadingStreak';

export type AppScreen =
  | 'get-started'
  | 'login'
  | 'signup'
  | 'profile'
  | 'dashboard'
  | 'student-dashboard'
  | 'servant-dashboard'
  | 'supabase'
  | 'test'
  | 'my-readings'
  | 'bible-study';

interface NavigationTaskbarProps {
  currentScreen: AppScreen;
  onNavigate: (screen: AppScreen) => void;
  currentUser: User | null;
  onLogout: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  simulationMode?: boolean;
  /** Student reading Streak (null/undefined hides the badge). */
  streak?: StreakState | null;
  /** Opens the first missed reading that can still be restored this week. */
  onRestore?: () => void;
}

type NavigationItem = {
  id: AppScreen | 'logout';
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  action?: 'logout';
};

export const NavigationTaskbar: React.FC<NavigationTaskbarProps> = ({
  currentScreen,
  onNavigate,
  currentUser,
  onLogout,
  theme,
  onToggleTheme,
  simulationMode = false,
  streak = null,
  onRestore,
}) => {
  const isHead = currentUser?.role === 'head';
  const isTeacher = currentUser?.role === 'teacher';
  const isTest = currentUser?.role === 'test';
  const isStudent = currentUser?.role === 'student';
  const isServant = isHead || isTeacher;
  const readingItem: NavigationItem[] = isStudent
    ? [{ id: 'my-readings', label: 'إصحاح النهارده', icon: BookMarked }]
    : isServant
    ? [{ id: 'bible-study', label: 'الكتاب المقدس', icon: BookOpen }]
    : [];
  const isDashboard = currentScreen === 'dashboard' ||
    currentScreen === 'student-dashboard' ||
    currentScreen === 'servant-dashboard';

  const desktopItems: NavigationItem[] = [
    { id: 'get-started', label: 'الرئيسية', icon: Compass },
    ...(currentUser ? [{ id: 'dashboard' as const, label: 'مشواري', icon: LayoutDashboard }] : []),
    ...readingItem,
    ...(!currentUser
      ? [
          { id: 'login' as const, label: 'دخول', icon: LogIn },
          { id: 'signup' as const, label: 'حساب جديد', icon: UserPlus },
        ]
      : [{ id: 'profile' as const, label: 'حسابي', icon: UserIcon }]),
    ...(isHead && !simulationMode ? [{ id: 'supabase' as const, label: 'قاعدة البيانات', icon: Database }] : []),
    ...(isTest ? [{ id: 'test' as const, label: 'مركز الاختبار', icon: Database }] : []),
  ];

  // The phone taskbar is deliberately compact. Session controls stay reachable
  // without squeezing desktop navigation into a tiny horizontal strip.
  const mobileItems: NavigationItem[] = currentUser
    ? [
        { id: 'get-started', label: 'الرئيسية', icon: Compass },
        { id: 'dashboard', label: 'مشواري', icon: LayoutDashboard },
        ...readingItem.map((item) => ({ ...item, label: item.id === 'bible-study' ? 'الكتاب' : item.label })),
        { id: 'profile', label: 'حسابي', icon: UserIcon },
        ...(isHead && !simulationMode ? [{ id: 'supabase' as const, label: 'البيانات', icon: Database }] : []),
        ...(isTest ? [{ id: 'test' as const, label: 'اختبار', icon: Database }] : []),
        { id: 'logout', label: 'خروج', icon: LogOut, action: 'logout' },
      ]
    : [
        { id: 'get-started', label: 'الرئيسية', icon: Compass },
        { id: 'login', label: 'دخول', icon: LogIn },
        { id: 'signup', label: 'حساب جديد', icon: UserPlus },
        { id: 'profile', label: 'حسابي', icon: UserIcon },
      ];

  const isActive = (id: AppScreen | 'logout') =>
    id === 'dashboard' ? isDashboard : currentScreen === id;

  const handleItemClick = (item: NavigationItem) => {
    if (item.action === 'logout') {
      onLogout();
      return;
    }
    if (item.id === 'dashboard' && !currentUser) {
      onNavigate('login');
      return;
    }
    onNavigate(item.id as AppScreen);
  };

  const showRestore = Boolean(onRestore && streak && (streak.restoreCount ?? 0) > 0);
  const RestoreButton = () => (
    <button
      type="button"
      onClick={onRestore}
      className="inline-flex h-8 shrink-0 items-center rounded-xl border px-3 text-xs font-black tracking-wide transition-transform hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A15A]"
      style={{
        borderColor: theme === 'dark' ? 'rgba(214,184,120,.55)' : '#C5A15A',
        backgroundColor: theme === 'dark' ? 'rgba(118,36,58,.55)' : '#F6F0E3',
        color: theme === 'dark' ? '#F3DEAB' : '#76243A',
      }}
      title={`استعادة ${streak?.restoreCount ?? 0} قراءة فاتتك هذا الأسبوع`}
      aria-label={`Restore — استعادة ${streak?.restoreCount ?? 0} قراءة فاتتك هذا الأسبوع`}
    >
      Restore
    </button>
  );

  const ThemeButton = ({ compact = false }: { compact?: boolean }) => (
    <button
      type="button"
      onClick={onToggleTheme}
      aria-label={theme === 'dark' ? 'تفعيل المظهر الفاتح' : 'تفعيل المظهر الداكن'}
      title={theme === 'dark' ? 'المظهر الفاتح' : 'المظهر الداكن'}
      className={`inline-flex items-center justify-center rounded-xl border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A15A] ${compact ? 'h-10 w-10' : 'h-9 w-9'}`}
      style={{
        borderColor: theme === 'dark' ? 'rgba(214,184,120,.32)' : '#E7E2E0',
        color: theme === 'dark' ? '#D6B878' : '#77717A',
        backgroundColor: theme === 'dark' ? 'rgba(42,39,48,.72)' : 'rgba(255,255,255,.72)',
      }}
    >
      {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );

  const Brand = ({ small = false }: { small?: boolean }) => (
    <button
      type="button"
      onClick={() => onNavigate('get-started')}
      aria-label="العودة إلى الصفحة الرئيسية"
      className="flex min-w-0 items-center gap-2.5 rounded-2xl text-right focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A15A]"
    >
      <span
        className={`block shrink-0 overflow-hidden rounded-xl border ${small ? 'h-11 w-11' : 'h-12 w-12'}`}
        style={{
          borderColor: theme === 'dark' ? 'rgba(214,184,120,.45)' : 'rgba(118,36,58,.22)',
          boxShadow: theme === 'dark' ? '0 0 14px rgba(214,184,120,.14)' : '0 3px 12px rgba(118,36,58,.12)',
        }}
      >
        <img src="/logo-family.jpg?v=20261010-1" alt="شعار أسرة الرسل" className="h-full w-full object-cover" />
      </span>
      <span className="flex min-w-0 flex-col leading-tight">
        <span
          dir="ltr"
          lang="en"
          className={`whitespace-nowrap uppercase ${small ? 'text-base' : 'text-xl'}`}
          style={{
            color: theme === 'dark' ? '#F3DEAB' : '#76243A',
            fontFamily: "'Cinzel', 'Times New Roman', serif",
            fontWeight: 900,
            letterSpacing: '0.06em',
            textAlign: 'right',
          }}
        >
          THE APOSTLES
        </span>
        <span className="text-[10px] font-semibold" style={{ color: theme === 'dark' ? '#D6B878' : '#77717A' }}>أسرة الرسل · مشوارك مع ربنا</span>
      </span>
    </button>
  );

  return (
    <>
      {/* Small mobile brand row. Navigation itself lives at the bottom on phones. */}
      <header
        className="sticky top-0 z-40 flex h-[60px] items-center justify-between gap-3 px-4 backdrop-blur-2xl md:hidden"
        style={{
          backgroundColor: theme === 'dark' ? 'rgba(20,17,23,.84)' : 'rgba(250,248,245,.86)',
          borderBottom: theme === 'dark' ? '1px solid rgba(214,184,120,.16)' : '1px solid rgba(231,226,224,.88)',
        }}
      >
        <Brand small />
        <div className="flex min-w-0 items-center gap-1.5">
          {showRestore && <RestoreButton />}
          {currentUser && (
            <span className={`truncate text-xs font-bold ${showRestore ? 'max-w-[64px]' : 'max-w-[110px]'}`} style={{ color: theme === 'dark' ? '#D6B878' : '#76243A' }}>
              {currentUser.name.split(' ')[0]}
            </span>
          )}
          {streak && (
            <StreakBadge value={streak.value} active={streak.completedToday} size="md" color={theme === 'dark' ? '#F5F1F0' : '#272329'} />
          )}
          <ThemeButton compact />
        </div>
      </header>

      {/* Desktop / tablet landscape top taskbar */}
      <header
        className="sticky top-0 z-40 hidden w-full items-center backdrop-blur-3xl md:flex"
        style={{
          minHeight: '72px',
          backgroundColor: theme === 'dark' ? 'rgba(20,17,23,.88)' : 'rgba(255,255,255,.88)',
          borderBottom: theme === 'dark' ? '1px solid rgba(214,184,120,.18)' : '1px solid rgba(231,226,224,.9)',
          boxShadow: theme === 'dark' ? '0 10px 30px rgba(0,0,0,.22)' : '0 8px 24px rgba(118,36,58,.05)',
        }}
      >
        <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between gap-4 px-5 lg:px-8">
          <Brand />
          <nav aria-label="التنقل الرئيسي" className="flex min-w-0 items-center justify-center gap-1 overflow-x-auto py-2">
            {desktopItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleItemClick(item)}
                  aria-current={active ? 'page' : undefined}
                  className="flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold transition-all lg:px-3.5 lg:text-sm"
                  style={{
                    backgroundColor: active ? (theme === 'dark' ? 'rgba(118,36,58,.82)' : '#F3E7EB') : 'transparent',
                    color: active ? (theme === 'dark' ? '#F3DEAB' : '#76243A') : (theme === 'dark' ? '#B8B1BB' : '#77717A'),
                    border: active ? `1px solid ${theme === 'dark' ? 'rgba(214,184,120,.4)' : '#DFC0CA'}` : '1px solid transparent',
                  }}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            {showRestore && <RestoreButton />}
            {currentUser && (
              <span className="hidden max-w-[140px] flex-col items-end leading-tight xl:flex">
                <span className="max-w-full truncate text-sm font-bold" style={{ color: theme === 'dark' ? '#F5F1F0' : '#272329' }}>{currentUser.name}</span>
                <span className="flex items-center gap-1 text-[10px]" style={{ color: theme === 'dark' ? '#D6B878' : '#77717A' }}>
                  {isHead ? <ShieldCheck className="h-3 w-3" /> : isTeacher ? <Sparkles className="h-3 w-3" /> : null}
                  {isHead ? 'أمين الخدمة' : isTeacher ? 'خادم فصلي' : isTest ? 'اختبار داخلي' : 'طالب إعدادي'}
                </span>
              </span>
            )}
            {streak && (
              <span
                className="inline-flex h-9 items-center rounded-xl border px-2.5"
                style={{ borderColor: theme === 'dark' ? 'rgba(214,184,120,.32)' : '#E7E2E0', backgroundColor: theme === 'dark' ? 'rgba(42,39,48,.72)' : 'rgba(255,255,255,.72)' }}
              >
                <StreakBadge value={streak.value} active={streak.completedToday} size="md" color={theme === 'dark' ? '#F5F1F0' : '#272329'} />
              </span>
            )}
            <ThemeButton />
            {currentUser ? (
              <button
                type="button"
                onClick={onLogout}
                aria-label="تسجيل الخروج"
                title="تسجيل الخروج"
                className="flex h-9 w-9 items-center justify-center rounded-xl border transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                style={{ borderColor: theme === 'dark' ? 'rgba(214,184,120,.28)' : '#E7E2E0', color: theme === 'dark' ? '#D6B878' : '#77717A' }}
              >
                <LogOut className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>
      </header>

      {/* Fixed phone bottom navigation with safe-area inset for iOS / Android gesture areas */}
      <nav
        aria-label="التنقل السفلي"
        className="fixed inset-x-0 bottom-0 z-50 grid gap-1 border-t px-2 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] shadow-[0_-8px_28px_rgba(20,17,23,.10)] backdrop-blur-3xl md:hidden"
        style={{
          gridTemplateColumns: `repeat(${mobileItems.length}, minmax(0, 1fr))`,
          backgroundColor: theme === 'dark' ? 'rgba(24,20,27,.94)' : 'rgba(255,255,255,.94)',
          borderColor: theme === 'dark' ? 'rgba(214,184,120,.22)' : '#E7E2E0',
        }}
      >
        {mobileItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.id);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleItemClick(item)}
              aria-current={active ? 'page' : undefined}
              aria-label={item.label}
              title={item.label}
              className="flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-[11px] font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A15A] sm:text-xs"
              style={{
                color: active ? (theme === 'dark' ? '#F3DEAB' : '#76243A') : (theme === 'dark' ? '#B8B1BB' : '#77717A'),
                backgroundColor: active ? (theme === 'dark' ? 'rgba(118,36,58,.45)' : '#F8EEF1') : 'transparent',
              }}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="max-w-full truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
