import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, AlertCircle, ArrowRight, Sparkles } from 'lucide-react';
import { supabase, fetchUserProfile } from '../lib/supabase';
import { User } from '../types';
import { AppScreen } from '../components/NavigationTaskbar';
import { BrandSpinner, FormLoadingOverlay } from '../components/BrandLoadingSkeleton';

interface LoginScreenProps {
  onLoginSuccess: (user: User) => void;
  onNavigate: (screen: AppScreen) => void;
  theme: 'light' | 'dark';
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLoginSuccess,
  onNavigate,
  theme,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const cleanEmail = email.trim().toLowerCase();

  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) {
      setErrorMsg('تسجيل الدخول بجوجل غير مُفعّل بعد. يلزم إعداد Google OAuth في لوحة Supabase أولاً.');
      setIsLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('يرجى إدخال بريد إلكتروني صحيح.');
      return;
    }
    if (!password) {
      setErrorMsg('يرجى كتابة كلمة المرور.');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error || !data.user) {
        setErrorMsg('تعذر تسجيل الدخول. راجع البريد الإلكتروني وكلمة المرور، وتأكد من تأكيد بريدك الإلكتروني.');
        return;
      }

      const profile = await fetchUserProfile(data.user.id);
      if (!profile) {
        await supabase.auth.signOut();
        setErrorMsg('تم التحقق من الحساب لكن ملف المستخدم غير موجود. تواصل مع مسؤول مسيري لإصلاح ملف الحساب.');
        return;
      }

      onLoginSuccess(profile);
    } catch (error) {
      console.error('Masiri sign-in failed:', error);
      setErrorMsg('حدث خطأ أثناء الاتصال بقاعدة البيانات. تحقق من الإنترنت ثم حاول مرة أخرى.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[88vh] flex items-center justify-center py-10 px-4 sm:px-6 relative overflow-hidden">
      {/* Super Liquid Glassmorphism Chromatic Background Orbs (Church Burgundy & Warm Gold) */}
      <div className="absolute top-1/6 -right-24 w-96 h-96 rounded-full bg-[#76243A]/28 dark:bg-[#B65370]/22 blur-3xl pointer-events-none liquid-orb-burgundy" />
      <div className="absolute bottom-1/6 -left-24 w-96 h-96 rounded-full bg-[#C5A15A]/25 dark:bg-[#D6B878]/18 blur-3xl pointer-events-none liquid-orb-gold" />
      <div className="absolute top-2/3 right-1/3 w-64 h-64 rounded-full bg-[#76243A]/15 dark:bg-[#B65370]/12 blur-2xl pointer-events-none" />

      {/* Super Liquid Glass Card */}
      <div
        className="w-full max-w-md rounded-3xl p-7 sm:p-10 space-y-7 shadow-2xl relative transition-all text-right liquid-glass-card overflow-hidden"
      >
        {/* Subtle Brand Loading Overlay during database validation */}
        {isLoading && (
          <FormLoadingOverlay
            theme={theme}
            message="جاري التحقق من بيانات الدخول مع قاعدة البيانات..."
          />
        )}
        {/* Top Church Crest Header */}
        <div className="text-center space-y-2.5">
          <div
            className="w-16 h-16 rounded-2xl mx-auto overflow-hidden shadow-xl transition-transform hover:scale-105 active:scale-95 border"
            style={{
              borderColor: theme === 'dark' ? 'rgba(214, 184, 120, 0.45)' : 'rgba(118, 36, 58, 0.25)',
              boxShadow: theme === 'dark' ? '0 10px 25px rgba(214, 184, 120, 0.25)' : '0 10px 25px rgba(118, 36, 58, 0.25)',
            }}
          >
            <img
              src="/masiri-journey-icon-v2.jpg?v=20261010-3"
              alt="شعار مَسِيري"
              className="w-full h-full object-cover"
            />
          </div>
          <h1
            className="text-2xl sm:text-3xl font-extrabold tracking-tight"
            style={{ color: theme === 'dark' ? '#F5F1F0' : '#272329' }}
          >
            تسجيل الدخول إلى مَسِيري
          </h1>
          <p
            className="text-xs sm:text-sm font-medium"
            style={{ color: theme === 'dark' ? '#B8B1BB' : '#77717A' }}
          >
            منصة خدمة المرحلة الإعدادية الكنسية
          </p>
        </div>

        {successMsg && <div role="status" className="rounded-2xl border p-3.5 text-xs leading-relaxed" style={{ backgroundColor: theme === 'dark' ? 'rgba(32,53,42,.8)' : '#E9F4EC', color: theme === 'dark' ? '#75C695' : '#347653', borderColor: theme === 'dark' ? '#3A3540' : '#B8D7C1' }}>{successMsg}</div>}

        {/* Error notification */}
        {errorMsg && (
          <div
            className="p-3.5 rounded-2xl text-xs flex items-center gap-2 animate-in fade-in"
            style={{
              backgroundColor: theme === 'dark' ? 'rgba(61, 36, 42, 0.75)' : '#F9E9EB',
              color: theme === 'dark' ? '#F08089' : '#B33B49',
              border: `1px solid ${theme === 'dark' ? '#69404D' : '#DFC0CA'}`,
            }}
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLoginSubmit} className="space-y-4.5">
          {/* Email input */}
          <div className="space-y-1.5 text-right">
            <label
              htmlFor="email"
              className="block text-xs font-bold"
              style={{ color: theme === 'dark' ? '#F5F1F0' : '#272329' }}
            >
              البريد الإلكتروني
            </label>
            <div className="relative">
              <input
                id="email"
                type="email"
                required
                dir="ltr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@maseery.org"
                className="w-full px-4 py-3 pl-11 rounded-2xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#76243A] dark:focus:ring-[#B65370] liquid-glass-input"
                style={{
                  color: theme === 'dark' ? '#F5F1F0' : '#272329',
                }}
              />
              <Mail className="w-4 h-4 text-[#77717A] dark:text-[#B8B1BB] absolute left-3.5 top-3.5 pointer-events-none" />
            </div>
          </div>

          {/* Password input */}
          <div className="space-y-1.5 text-right">
            <div className="flex items-center justify-between">
              <label
                htmlFor="password"
                className="block text-xs font-bold"
                style={{ color: theme === 'dark' ? '#F5F1F0' : '#272329' }}
              >
                كلمة المرور
              </label>
              <span
                className="text-[11px] font-semibold"
                style={{ color: theme === 'dark' ? '#D6B878' : '#76243A' }}
              >
                أدخل كلمة المرور المستخدمة عند التسجيل.
              </span>
            </div>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                dir="ltr"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 pl-11 pr-11 rounded-2xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#76243A] dark:focus:ring-[#B65370] liquid-glass-input"
                style={{
                  color: theme === 'dark' ? '#F5F1F0' : '#272329',
                }}
              />
              <Lock className="w-4 h-4 text-[#77717A] dark:text-[#B8B1BB] absolute right-3.5 top-3.5 pointer-events-none" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3.5 top-3.5 text-[#77717A] dark:text-[#B8B1BB] hover:text-[#272329]"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <p className="pt-1 text-center text-[11px]" style={{ color: theme === 'dark' ? '#B8B1BB' : '#77717A' }}>
            ستظل جلسة الدخول محفوظة على هذا الجهاز حتى تسجيل الخروج.
          </p>

          <button type="button" disabled={isLoading} onClick={async () => {
            setErrorMsg('');
            setSuccessMsg('');
            if (!cleanEmail || !cleanEmail.includes('@')) {
              setErrorMsg('اكتب بريدك الإلكتروني أولاً لاستعادة كلمة المرور.');
              return;
            }
            setIsLoading(true);
            const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, { redirectTo: `${window.location.origin}/?password-reset=1` });
            setIsLoading(false);
            if (error) setErrorMsg('تعذر إرسال رابط الاستعادة. تحقق من إعدادات البريد الإلكتروني.');
            else setSuccessMsg('إذا كان البريد مسجلاً، فستصلك رسالة لإعادة تعيين كلمة المرور.');
          }} className="w-full text-xs font-bold underline underline-offset-4" style={{ color: theme === 'dark' ? '#D6B878' : '#76243A' }}>
            نسيت كلمة المرور؟ إرسال رابط استعادة
          </button>

          {/* Submit button with Church Burgundy & Gold in Dark Mode */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 px-5 rounded-2xl text-sm font-bold transition-all hover:scale-[1.01] active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#76243A] flex items-center justify-center gap-2 shadow-xl mt-4 church-btn-primary"
            style={{
              background:
                theme === 'dark'
                  ? 'linear-gradient(135deg, #76243A 0%, #541424 100%)'
                  : 'linear-gradient(135deg, #76243A 0%, #5D192D 100%)',
              color: theme === 'dark' ? '#F3DEAB' : '#FFFFFF',
              boxShadow:
                theme === 'dark'
                  ? '0 12px 30px rgba(118, 36, 58, 0.6), 0 0 16px rgba(214, 184, 120, 0.2)'
                  : '0 12px 30px rgba(118, 36, 58, 0.35)',
              border:
                theme === 'dark'
                  ? '1px solid rgba(214, 184, 120, 0.45)'
                  : '1px solid rgba(255, 255, 255, 0.25)',
            }}
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-2.5">
                <BrandSpinner size="sm" theme={theme} />
                <span>جاري تسجيل الدخول والتحقق...</span>
              </div>
            ) : (
              <>
                <span>تسجيل الدخول</span>
                <ArrowRight className="w-4 h-4" style={{ color: theme === 'dark' ? '#F3DEAB' : '#FFFFFF' }} />
              </>
            )}
          </button>
        </form>

        <button type="button" onClick={() => void handleGoogleSignIn()} disabled={isLoading}
          className="mt-4 w-full rounded-2xl border px-5 py-3.5 text-sm font-bold transition-all hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-50"
          style={{ borderColor: theme === 'dark' ? 'rgba(214,184,120,.35)' : 'rgba(118,36,58,.2)', color: theme === 'dark' ? '#F5F1F0' : '#272329' }}>
          <span className="inline-flex items-center justify-center gap-2"><span className="font-black text-base">G</span> المتابعة باستخدام Google</span>
        </button>

        {/* Footer Link to Signup */}
        <div
          className="text-center pt-4 border-t text-xs space-y-2"
          style={{ borderColor: theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}
        >
          <p style={{ color: theme === 'dark' ? '#B8B1BB' : '#77717A' }}>
            ليس لديك حساب بعد في مسيري؟{' '}
            <button
              onClick={() => onNavigate('signup')}
              className="font-bold underline hover:opacity-85 text-[#76243A] dark:text-[#B65370]"
            >
              إنشاء حساب جديد
            </button>
          </p>

          <button
            onClick={() => onNavigate('get-started')}
            className="text-[11px] text-[#77717A] dark:text-[#B8B1BB] hover:underline block mx-auto pt-1"
          >
            ← العودة لشاشة البداية والترحيب
          </button>
        </div>
      </div>
    </div>
  );
};
