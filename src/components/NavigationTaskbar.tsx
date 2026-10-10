import React from 'react';
import {
  Compass,
  LogIn,
  UserPlus,
  User as UserIcon,
  ShieldAlert,
  Sparkles,
  Moon,
  Sun,
  LogOut,
} from 'lucide-react';
import { User } from '../types';

export type AppScreen = 'get-started' | 'login' | 'signup' | 'profile';

interface NavigationTaskbarProps {
  currentScreen: AppScreen;
  onNavigate: (screen: AppScreen) => void;
  currentUser: User | null;
  onLogout: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export const NavigationTaskbar: React.FC<NavigationTaskbarProps> = ({
  currentScreen,
  onNavigate,
  currentUser,
  onLogout,
  theme,
  onToggleTheme,
}) => {
  const isHead = currentUser?.role === 'head';
  const isTeacher = currentUser?.role === 'teacher';

  // Only the 4 requested screens: welcome, login, signup, profile
  const navItems = [
    {
      id: 'get-started' as const,
      label: 'الترحيب',
      icon: Compass,
      description: 'شاشة البداية والترحيب الكنسي',
    },
    {
      id: 'login' as const,
      label: 'تسجيل الدخول',
      icon: LogIn,
      description: 'دخول الخدام والطلاب',
    },
    {
      id: 'signup' as const,
      label: 'إنشاء حساب',
      icon: UserPlus,
      description: 'تسجيل حساب جديد بالخدمة',
    },
    {
      id: 'profile' as const,
      label: 'الملف الشخصي',
      icon: UserIcon,
      description: 'بيانات الحساب وإدارة الخدام',
    },
  ];

  return (
    <header
      className="sticky top-0 z-40 w-full transition-all backdrop-blur-3xl"
      style={{
        backgroundColor: theme === 'dark' ? 'rgba(20, 17, 23, 0.72)' : 'rgba(255, 255, 255, 0.75)',
        borderBottom: theme === 'dark' ? '1px solid rgba(214, 184, 120, 0.18)' : '1px solid rgba(223, 192, 202, 0.45)',
        boxShadow:
          theme === 'dark'
            ? '0 12px 36px rgba(0,0,0,0.6), inset 0 1px 1px rgba(214, 184, 120, 0.25)'
            : '0 12px 36px rgba(118,36,58,0.08), inset 0 1px 2px rgba(255,255,255,0.9)',
        height: '68px',
      }}
    >
      <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => onNavigate('get-started')}
            className="group flex items-center gap-2.5 text-right focus:outline-none focus-visible:ring-2 focus-visible:ring-[#76243A] rounded-2xl"
          >
            <div
              className="w-10 h-10 rounded-2xl overflow-hidden shadow-md transition-all group-hover:scale-105 active:scale-95 border shrink-0"
              style={{
                borderColor: theme === 'dark' ? 'rgba(214, 184, 120, 0.45)' : 'rgba(118, 36, 58, 0.25)',
                boxShadow: theme === 'dark' ? '0 0 16px rgba(214, 184, 120, 0.25)' : '0 4px 12px rgba(118, 36, 58, 0.2)',
              }}
            >
              <img
                src="/src/assets/images/maseery_app_logo_1791622420580.jpg"
                alt="شعار مَسِيري"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex flex-col leading-tight">
              <span
                className="text-xl font-black tracking-tight whitespace-nowrap"
                style={{ color: theme === 'dark' ? '#F5F1F0' : '#272329' }}
              >
                مَسِيري
              </span>
              <span className="text-[10px] text-[#77717A] dark:text-[#D6B878] font-semibold">
                للمرحلة الإعدادية
              </span>
            </div>
          </button>
        </div>

        {/* Zone 2: Horizontal Taskbar Links (Only welcome, login, signup, profile) */}
        <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar py-1">
          {navItems.map((item) => {
            const isActive = currentScreen === item.id;
            const IconComponent = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap shrink-0 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#76243A]"
                style={{
                  backgroundColor: isActive
                    ? theme === 'dark'
                      ? '#76243A'
                      : '#F3E7EB'
                    : 'transparent',
                  color: isActive
                    ? theme === 'dark'
                      ? '#F3DEAB'
                      : '#76243A'
                    : theme === 'dark'
                    ? '#B8B1BB'
                    : '#77717A',
                  border: isActive
                    ? `1px solid ${theme === 'dark' ? 'rgba(214, 184, 120, 0.45)' : '#DFC0CA'}`
                    : '1px solid transparent',
                  boxShadow: isActive && theme === 'dark'
                    ? '0 4px 14px rgba(118, 36, 58, 0.5), inset 0 1px 1px rgba(214, 184, 120, 0.3)'
                    : 'none',
                }}
              >
                <IconComponent
                  className="w-4 h-4 shrink-0"
                  style={{ color: isActive && theme === 'dark' ? '#F3DEAB' : undefined }}
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Actions & User / Role Indicator */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Theme Switcher Button */}
          <button
            onClick={onToggleTheme}
            aria-label="تبديل المظهر"
            className="p-2 rounded-xl border transition-colors hover:bg-black/5 dark:hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#76243A]"
            style={{
              borderColor: theme === 'dark' ? 'rgba(214, 184, 120, 0.3)' : '#E7E2E0',
              color: theme === 'dark' ? '#D6B878' : '#77717A',
              backgroundColor: theme === 'dark' ? 'rgba(42, 39, 48, 0.6)' : 'transparent',
            }}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-[#D6B878]" /> : <Moon className="w-4 h-4" />}
          </button>

          {currentUser ? (
            <div className="flex items-center gap-2">
              {/* Role badge */}
              <div
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold"
                style={{
                  backgroundColor: isHead
                    ? theme === 'dark'
                      ? '#38232C'
                      : '#F3E7EB'
                    : isTeacher
                    ? theme === 'dark'
                      ? '#342D20'
                      : '#F6F0E3'
                    : theme === 'dark'
                    ? '#20352A'
                    : '#E9F4EC',
                  color: isHead
                    ? theme === 'dark'
                      ? '#F3DEAB'
                      : '#76243A'
                    : isTeacher
                    ? theme === 'dark'
                      ? '#D6B878'
                      : '#A96F19'
                    : theme === 'dark'
                    ? '#75C695'
                    : '#347653',
                  border: `1px solid ${
                    isHead
                      ? theme === 'dark'
                        ? '#69404D'
                        : '#DFC0CA'
                      : theme === 'dark'
                      ? '#3A3540'
                      : '#E7E2E0'
                  }`,
                }}
              >
                {isHead && <ShieldAlert className="w-3.5 h-3.5" />}
                {isTeacher && <Sparkles className="w-3.5 h-3.5" />}
                <span>{isHead ? 'أمين الخدمة' : isTeacher ? 'خادم فصلي' : 'طالب إعدادي'}</span>
              </div>

              {/* Profile Shortcut */}
              <button
                onClick={() => onNavigate('profile')}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-transform hover:scale-105 active:scale-95 shadow-sm church-btn-primary"
                style={{
                  background:
                    theme === 'dark'
                      ? 'linear-gradient(135deg, #76243A 0%, #541424 100%)'
                      : 'linear-gradient(135deg, #76243A 0%, #5D192D 100%)',
                  color: theme === 'dark' ? '#F3DEAB' : '#FFFFFF',
                  border: theme === 'dark' ? '1px solid rgba(214, 184, 120, 0.45)' : 'none',
                }}
              >
                <span className="max-w-[90px] truncate" style={{ color: theme === 'dark' ? '#F3DEAB' : '#FFFFFF' }}>
                  {currentUser.name.split(' ')[0]}
                </span>
              </button>

              {/* Logout Button */}
              <button
                onClick={onLogout}
                title="تسجيل الخروج"
                className="p-2 rounded-xl border text-xs transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                style={{
                  borderColor: theme === 'dark' ? 'rgba(214, 184, 120, 0.3)' : '#E7E2E0',
                  color: theme === 'dark' ? '#B8B1BB' : '#77717A',
                }}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onNavigate('login')}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5 shadow-sm church-btn-primary"
                style={{
                  background:
                    theme === 'dark'
                      ? 'linear-gradient(135deg, #76243A 0%, #541424 100%)'
                      : 'linear-gradient(135deg, #76243A 0%, #5D192D 100%)',
                  color: theme === 'dark' ? '#F3DEAB' : '#FFFFFF',
                  border: theme === 'dark' ? '1px solid rgba(214, 184, 120, 0.45)' : 'none',
                }}
              >
                <LogIn className="w-3.5 h-3.5" style={{ color: theme === 'dark' ? '#F3DEAB' : '#FFFFFF' }} />
                <span style={{ color: theme === 'dark' ? '#F3DEAB' : '#FFFFFF' }}>دخول</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
