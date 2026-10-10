import React from 'react';
import {
  Compass,
  ChevronLeft,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import { User } from '../types';
import { AppScreen } from '../components/NavigationTaskbar';

interface GetStartedScreenProps {
  onNavigate: (screen: AppScreen) => void;
  currentUser: User | null;
  theme: 'light' | 'dark';
}

export const GetStartedScreen: React.FC<GetStartedScreenProps> = ({
  onNavigate,
  currentUser,
  theme,
}) => {
  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-8">
      {/* 1. Flutter Hero Card - Central Spiritual Sanctuary Experience */}
      <section
        className="relative overflow-hidden rounded-3xl p-6 sm:p-10 lg:p-12 transition-all liquid-glass-card shadow-2xl backdrop-blur-3xl text-center flex flex-col items-center"
      >
        {/* Sacred Aureole Glow behind Brand Emblem */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-[#D6B878]/15 blur-3xl pointer-events-none" />
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-[#76243A]/15 blur-3xl pointer-events-none" />

        {/* Brand Logo Emblem with Liturgical Golden Halo */}
        <div className="relative mb-6">
          <div
            className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl p-2.5 shadow-2xl border transition-transform hover:scale-105 active:scale-95 duration-300 relative z-10 flex items-center justify-center"
            style={{
              backgroundColor: theme === 'dark' ? '#1F1B24' : '#FFFFFF',
              borderColor: theme === 'dark' ? 'rgba(214, 184, 120, 0.55)' : 'rgba(118, 36, 58, 0.25)',
              boxShadow:
                theme === 'dark'
                  ? '0 16px 40px rgba(0,0,0,0.8), 0 0 35px rgba(214, 184, 120, 0.35)'
                  : '0 16px 36px rgba(118, 36, 58, 0.22), 0 0 25px rgba(214, 184, 120, 0.2)',
            }}
          >
            <img
              src="/masiri-journey-icon.jpg?v=20261010-2"
              alt="طريق مسيري إلى الصليب"
              className="w-full h-full object-cover rounded-2xl"
            />
          </div>

          {/* Golden Badge floating on emblem */}
          <div
            className="absolute -bottom-2 -left-2 px-3 py-0.5 rounded-full text-[11px] font-black shadow-md border flex items-center gap-1 z-20"
            style={{
              backgroundColor: theme === 'dark' ? '#38232C' : '#F3E7EB',
              borderColor: theme === 'dark' ? 'rgba(214, 184, 120, 0.6)' : '#76243A',
              color: theme === 'dark' ? '#F3DEAB' : '#76243A',
            }}
          >
            <Sparkles className="w-3 h-3 text-[#D6B878]" />
            <span>خدمة إعدادي</span>
          </div>
        </div>

        {/* Title & Spiritual Calling */}
        <div className="max-w-3xl space-y-3">
          <div className="flex items-center justify-center gap-2">
            <span
              className="text-xs font-black px-4 py-1.5 rounded-full shadow-sm tracking-wide"
              style={{
                backgroundColor: theme === 'dark' ? 'rgba(56, 35, 44, 0.85)' : '#F3E7EB',
                color: theme === 'dark' ? '#F3DEAB' : '#76243A',
                border: `1px solid ${theme === 'dark' ? 'rgba(214, 184, 120, 0.45)' : '#DFC0CA'}`,
              }}
            >
              كنيستنا القبطية الأرثوذكسية · خدمة المرحلة الإعدادية
            </span>
          </div>

          <h1
            className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight"
            style={{ color: theme === 'dark' ? '#F5F1F0' : '#272329' }}
          >
            مَسِيري
          </h1>

          <p
            className="text-xl sm:text-2xl font-black"
            style={{ color: theme === 'dark' ? '#F3DEAB' : '#8C2B45' }}
          >
            رحلتك اليومية للنمو والشهادة للمسيح
          </p>

          <p
            className="text-sm sm:text-base max-w-2xl mx-auto leading-relaxed font-medium pt-1"
            style={{ color: theme === 'dark' ? '#B8B1BB' : '#6B6670' }}
          >
            منصة تلمذة روحية تفاعلية ترافق شباب وبنات إعدادي وخدامهم؛ لتوثيق الصلاة اليومية، حفظ آيات وترانيم الكنيسة، وتعميق المحبة والتواصل في جسد المسيح الحي.
          </p>
        </div>

        {/* Holy Scripture Glass Ribbon */}
        <div
          className="mt-6 px-6 py-3 rounded-2xl max-w-xl mx-auto border shadow-sm flex items-center justify-center gap-2.5 text-center"
          style={{
            backgroundColor: theme === 'dark' ? 'rgba(32, 28, 38, 0.75)' : 'rgba(255, 255, 255, 0.85)',
            borderColor: theme === 'dark' ? 'rgba(214, 184, 120, 0.35)' : 'rgba(197, 161, 90, 0.35)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <BookOpen className="w-4 h-4 text-[#D6B878] shrink-0" />
          <span
            className="text-xs sm:text-sm font-bold"
            style={{ color: theme === 'dark' ? '#F3DEAB' : '#5D192D' }}
          >
            «سِرَاجٌ لِرِجْلِي كَلاَمُكَ وَنُورٌ لِسَبِيلِي» (مزامير ١١٩ : ١٠٥)
          </span>
        </div>

        {/* Main Flutter Action Controls (CTA Buttons) */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4 w-full max-w-md">
          {currentUser ? (
            <button
              onClick={() => onNavigate('profile')}
              className="w-full py-4 px-6 rounded-2xl text-base font-bold transition-all hover:scale-[1.02] active:scale-98 flex items-center justify-center gap-3 shadow-xl church-btn-primary"
              style={{
                background:
                  theme === 'dark'
                    ? 'linear-gradient(135deg, #76243A 0%, #541424 100%)'
                    : 'linear-gradient(135deg, #76243A 0%, #5D192D 100%)',
                color: theme === 'dark' ? '#F3DEAB' : '#FFFFFF',
                border: theme === 'dark' ? '1px solid rgba(214, 184, 120, 0.55)' : '1px solid rgba(255, 255, 255, 0.3)',
                boxShadow:
                  theme === 'dark'
                    ? '0 12px 32px rgba(118, 36, 58, 0.7), 0 0 20px rgba(214, 184, 120, 0.25)'
                    : '0 12px 30px rgba(118, 36, 58, 0.35)',
              }}
            >
              <Compass className="w-5 h-5 text-[#D6B878]" />
              <span>متابعة رحلتي ({currentUser.name})</span>
              <ChevronLeft className="w-5 h-5" />
            </button>
          ) : (
            <>
              {/* Primary: Sign Up Button */}
              <button
                onClick={() => onNavigate('signup')}
                className="w-full sm:flex-1 py-4 px-6 rounded-2xl text-base font-black transition-all hover:scale-[1.02] active:scale-98 flex items-center justify-center gap-2.5 shadow-xl church-btn-primary"
                style={{
                  background:
                    theme === 'dark'
                      ? 'linear-gradient(135deg, #76243A 0%, #541424 100%)'
                      : 'linear-gradient(135deg, #76243A 0%, #5D192D 100%)',
                  color: theme === 'dark' ? '#F3DEAB' : '#FFFFFF',
                  border: theme === 'dark' ? '1px solid rgba(214, 184, 120, 0.55)' : '1px solid rgba(255, 255, 255, 0.3)',
                  boxShadow:
                    theme === 'dark'
                      ? '0 12px 32px rgba(118, 36, 58, 0.7), 0 0 20px rgba(214, 184, 120, 0.25)'
                      : '0 12px 30px rgba(118, 36, 58, 0.35)',
                }}
              >
                <Sparkles className="w-5 h-5 text-[#D6B878]" />
                <span>ابدأ رحلتك (إنشاء حساب)</span>
                <ChevronLeft className="w-5 h-5" />
              </button>

              {/* Secondary: Login Button */}
              <button
                onClick={() => onNavigate('login')}
                className="w-full sm:w-auto px-7 py-4 rounded-2xl text-sm font-bold transition-all hover:scale-[1.02] active:scale-98 shadow-md border"
                style={{
                  borderColor: theme === 'dark' ? 'rgba(214, 184, 120, 0.45)' : 'rgba(118, 36, 58, 0.25)',
                  backgroundColor: theme === 'dark' ? 'rgba(32, 28, 38, 0.85)' : '#FFFFFF',
                  color: theme === 'dark' ? '#F3DEAB' : '#76243A',
                }}
              >
                تسجيل الدخول
              </button>
            </>
          )}
        </div>
      </section>
    </div>
  );
};

