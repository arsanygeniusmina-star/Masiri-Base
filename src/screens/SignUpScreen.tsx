import React, { useEffect, useState } from 'react';
import {
  User as UserIcon,
  Mail,
  Lock,
  Phone,
  GraduationCap,
  Sparkles,
  AlertCircle,
  ChevronLeft,
  BookOpen,
  Eye,
  EyeOff,
} from 'lucide-react';
import { supabase, fetchUserProfile } from '../lib/supabase';
import { User, MiddleSchoolGrade } from '../types';
import { AppScreen } from '../components/NavigationTaskbar';
import { BrandSpinner, FormLoadingOverlay } from '../components/BrandLoadingSkeleton';

type SignupRole = 'student' | 'teacher' | 'head' | 'test';

const signupRoleLabels: Record<SignupRole, string> = {
  student: 'طالب إعدادي',
  teacher: 'خادم / معلم',
  head: 'أمين الخدمة',
  test: 'حساب تجريبي',
};

interface SignUpScreenProps {
  onSignUpSuccess: (user: User) => void;
  onNavigate: (screen: AppScreen) => void;
  theme: 'light' | 'dark';
}

export const SignUpScreen: React.FC<SignUpScreenProps> = ({
  onSignUpSuccess,
  onNavigate,
  theme,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState('');
  const [gradeLevel, setGradeLevel] = useState<MiddleSchoolGrade>('grade-2');
  const [detectedRole, setDetectedRole] = useState<SignupRole | null>(null);
  const [isDetectingRole, setIsDetectingRole] = useState(false);
  const [roleDetectionError, setRoleDetectionError] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [submitFeedback, setSubmitFeedback] = useState<{ tone: 'info' | 'success' | 'error'; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const cleanEmail = email.trim().toLowerCase();

  // This is only a UI hint. Final permissions are assigned by the database trigger,
  // never by client-submitted role metadata.
  const isStudent = detectedRole === 'student';

  useEffect(() => {
    const candidate = email.trim().toLowerCase();
    let active = true;
    setDetectedRole(null);
    setRoleDetectionError('');

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate)) {
      setIsDetectingRole(false);
      return () => { active = false; };
    }

    setIsDetectingRole(true);
    const timeout = window.setTimeout(async () => {
      try {
        const { data, error } = await supabase.rpc('detect_signup_role', { p_email: candidate });
        if (error) throw error;
        if (!['student', 'teacher', 'head', 'test'].includes(String(data))) {
          throw new Error('Unexpected signup role response');
        }
        if (active) setDetectedRole(data as SignupRole);
      } catch (error) {
        console.error('Unable to detect Masiri signup role:', error);
        if (active) setRoleDetectionError('تعذر التعرف على نوع الحساب الآن. تحقق من الاتصال ثم حاول مجددًا.');
      } finally {
        if (active) setIsDetectingRole(false);
      }
    }, 400);

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSubmitFeedback(null);

    if (!name.trim()) {
      const message = 'اكتب اسمك بالكامل الأول.';
      setErrorMsg(message);
      setSubmitFeedback({ tone: 'error', text: message });
      return;
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      const message = 'يرجى إدخال بريد إلكتروني صالح.';
      setErrorMsg(message);
      setSubmitFeedback({ tone: 'error', text: message });
      return;
    }
    if (password.length < 8) {
      const message = 'كلمة السر لازم تكون 8 حروف على الأقل.';
      setErrorMsg(message);
      setSubmitFeedback({ tone: 'error', text: message });
      return;
    }

    setIsLoading(true);
    setSubmitFeedback({ tone: 'info', text: 'تمام، بنراجع نوع الحساب وبنجهّز حسابك...' });
    try {
      // Re-check on submit so a stale UI hint can never choose signup metadata.
      const { data: roleData, error: roleError } = await supabase.rpc('detect_signup_role', { p_email: cleanEmail });
      if (roleError) throw new Error('تعذر تحديد نوع الحساب من قاعدة البيانات. تحقق من الاتصال ثم أعد المحاولة.');
      if (!['student', 'teacher', 'head', 'test'].includes(String(roleData))) {
        throw new Error('تعذر تحديد نوع الحساب لهذا الإيميل.');
      }
      const signupRole = roleData as SignupRole;
      setDetectedRole(signupRole);

      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            name: name.trim(),
            phone: phone.trim() || null,
            ...(signupRole === 'student' ? { grade_level: gradeLevel } : {}),
          },
        },
      });

      if (error || !data.user) {
        const reason = error?.message ?? '';
        const normalizedReason = reason.toLowerCase();
        const isEmailRateLimit =
          error?.status === 429 ||
          normalizedReason.includes('email rate limit exceeded') ||
          normalizedReason.includes('over_email_send_rate_limit');
        const isAlreadyRegistered =
          error?.code === 'user_already_exists' ||
          normalizedReason.includes('user already registered') ||
          normalizedReason.includes('already been registered');
        const message = isAlreadyRegistered
          ? 'الإيميل ده مسجل بالفعل. ادخل على حسابك أو استرجع كلمة السر بدل ما تعمل حساب تاني.'
          : isEmailRateLimit
            ? 'Supabase رفض التسجيل بسبب كثرة محاولات إرسال رسائل التأكيد (429). إعداد التأكيد لازم يتغيّر من لوحة Supabase قبل ما التسجيل يشتغل. لو الإيميل ده مسجل بالفعل، جرّب تدخل بدل ما تسجل تاني.'
            : reason
              ? `تعذر إنشاء الحساب: ${reason}`
              : 'لم يُرجع نظام الدخول حساباً جديداً. تحقق من البيانات وحاول مرة أخرى.';
        console.error('Masiri signup rejected by Supabase Auth:', error ?? 'No user returned');
        setErrorMsg(message);
        setSubmitFeedback({ tone: 'error', text: message });
        return;
      }

      // Supabase can return an empty identities list for a duplicate email.
      if (Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        const message = 'الإيميل ده مسجل بالفعل. ادخل على حسابك أو استرجع كلمة السر؛ مش هنعمل حساب مكرر.';
        setErrorMsg(message);
        setSubmitFeedback({ tone: 'error', text: message });
        return;
      }

      if (!data.session) {
        const message = 'لم يُرجع خادم الحسابات جلسة دخول بعد التسجيل. لا تعِد المحاولة بالبريد نفسه فوراً؛ جرّب ادخل على حسابك، وإذا استمر الخطأ أرسل هذه الرسالة إلى أمين الخدمة.';
        setErrorMsg(message);
        setSubmitFeedback({ tone: 'error', text: message });
        return;
      }

      setSubmitFeedback({ tone: 'info', text: 'تم ادخل على حسابك بنجاح. جارٍ تحميل الملف الشخصي...' });
      const profile = await fetchUserProfile(data.user.id);
      if (!profile) {
        await supabase.auth.signOut();
        const message = 'تم إنشاء حساب الدخول لكن ملف THE APOSTLES لم يظهر بعد. تواصل مع مسؤول التطبيق قبل إعادة المحاولة.';
        setErrorMsg(message);
        setSubmitFeedback({ tone: 'error', text: message });
        return;
      }

      setSubmitFeedback({ tone: 'success', text: 'تمام! حسابك اتعمل، بنفتحلك الملف الشخصي...' });
      onSignUpSuccess(profile);
    } catch (error) {
      console.error('Masiri sign-up failed:', error);
      const detail = error instanceof Error ? error.message : String(error);
      const message = `حدث خطأ أثناء إنشاء الحساب أو الاتصال بقاعدة البيانات: ${detail}`;
      setErrorMsg(message);
      setSubmitFeedback({ tone: 'error', text: message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[90vh] flex items-center justify-center py-10 px-4 sm:px-6 relative overflow-hidden">
      {/* Super Liquid Glassmorphism Chromatic Background Orbs (Church Burgundy & Warm Gold) */}
      <div className="absolute top-1/6 -right-24 w-96 h-96 rounded-full bg-[#76243A]/28 dark:bg-[#B65370]/22 blur-3xl pointer-events-none liquid-orb-burgundy" />
      <div className="absolute bottom-1/6 -left-24 w-96 h-96 rounded-full bg-[#C5A15A]/25 dark:bg-[#D6B878]/18 blur-3xl pointer-events-none liquid-orb-gold" />
      <div className="absolute top-2/3 right-1/3 w-64 h-64 rounded-full bg-[#76243A]/15 dark:bg-[#B65370]/12 blur-2xl pointer-events-none" />

      {/* Super Liquid Glass Card */}
      <div
        className="w-full max-w-lg rounded-3xl p-7 sm:p-10 space-y-7 shadow-2xl relative transition-all text-right liquid-glass-card overflow-hidden"
      >
        {/* Subtle Brand Loading Overlay during database validation */}
        {isLoading && (
          <FormLoadingOverlay
            theme={theme}
            message="جاري حفظ الحساب والتحقق من الصلاحيات الكنسية..."
          />
        )}
        {/* Header: large app logo + title */}
        <div className="text-center space-y-4">
          <div
            className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl mx-auto overflow-hidden shadow-2xl transition-transform hover:scale-105 active:scale-95 border"
            style={{
              borderColor: theme === 'dark' ? 'rgba(214, 184, 120, 0.55)' : 'rgba(118, 36, 58, 0.25)',
              boxShadow: theme === 'dark'
                ? '0 16px 40px rgba(0,0,0,0.6), 0 0 35px rgba(214, 184, 120, 0.35)'
                : '0 16px 36px rgba(118, 36, 58, 0.22), 0 0 25px rgba(214, 184, 120, 0.2)',
            }}
          >
            <img
              src="/masiri-journey-icon.jpg?v=20261010-2"
              alt="شعار THE APOSTLES"
              className="w-full h-full object-cover"
            />
          </div>
          <h1
            dir="ltr"
            lang="en"
            className="text-2xl sm:text-3xl uppercase leading-tight"
            style={{
              color: theme === 'dark' ? '#F3DEAB' : '#76243A',
              fontFamily: "'Cinzel', 'Times New Roman', serif",
              fontWeight: 900,
              letterSpacing: '0.06em',
            }}
          >
            Create New Account
          </h1>
        </div>

        {/* Signup errors must be visible: previously the handler updated errorMsg but the
            screen never rendered it, making failed requests look like an instant no-op. */}
        {errorMsg && (
          <div
            role="alert"
            aria-live="assertive"
            className="flex items-start gap-2.5 rounded-2xl border p-4 text-sm leading-relaxed"
            style={{
              backgroundColor: theme === 'dark' ? 'rgba(75, 28, 38, 0.72)' : '#FCEBEC',
              color: theme === 'dark' ? '#FFB3B8' : '#912C3B',
              borderColor: theme === 'dark' ? 'rgba(240, 128, 137, 0.42)' : '#E7B6BE',
            }}
          >
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="min-w-0">
              <p className="font-extrabold">لم يتم إنشاء الحساب</p>
              <p className="mt-1 break-words">{errorMsg}</p>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4.5">
          {/* Full Name */}
          <div className="space-y-1.5">
            <label
              htmlFor="signup-name"
              className="block text-xs font-bold"
              style={{ color: theme === 'dark' ? '#F5F1F0' : '#272329' }}
            >
              اسمك بالكامل
            </label>
            <div className="relative">
              <input
                id="signup-name"
                type="text"
                required
                value={name}
                disabled={isLoading}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 pl-11 rounded-2xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#76243A] dark:focus:ring-[#B65370] liquid-glass-input"
                style={{
                  color: theme === 'dark' ? '#F5F1F0' : '#272329',
                }}
              />
              <UserIcon className="w-4 h-4 text-[#77717A] dark:text-[#B8B1BB] absolute left-3.5 top-3.5 pointer-events-none" />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label
              htmlFor="signup-email"
              className="block text-xs font-bold"
              style={{ color: theme === 'dark' ? '#F5F1F0' : '#272329' }}
            >
              الإيميل
            </label>
            <div className="relative">
              <input
                id="signup-email"
                type="email"
                required
                dir="ltr"
                value={email}
                disabled={isLoading}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 pl-11 rounded-2xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#76243A] dark:focus:ring-[#B65370] liquid-glass-input"
                style={{
                  color: theme === 'dark' ? '#F5F1F0' : '#272329',
                }}
              />
              <Mail className="w-4 h-4 text-[#77717A] dark:text-[#B8B1BB] absolute left-3.5 top-3.5 pointer-events-none" />
            </div>
            {(isDetectingRole || detectedRole || roleDetectionError) && (
            <div
              role="status"
              aria-live="polite"
              className="mt-3 rounded-2xl border px-3.5 py-3 text-sm sm:text-[15px] leading-relaxed"
              style={{
                backgroundColor: theme === 'dark' ? 'rgba(39,34,44,.72)' : 'rgba(246,240,227,.85)',
                borderColor: theme === 'dark' ? 'rgba(214,184,120,.3)' : 'rgba(197,161,90,.38)',
                color: theme === 'dark' ? '#F3DEAB' : '#765A22',
              }}
            >
              {isDetectingRole ? (
                <span>ثواني وبنتعرّف على نوع حسابك...</span>
              ) : detectedRole ? (
                <span>الإيميل ده متسجل كـ <strong>{signupRoleLabels[detectedRole]}</strong>. الصلاحيات بتتراجع بأمان من قاعدة البيانات.</span>
              ) : (
                <span>{roleDetectionError}</span>
              )}
            </div>
            )}
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label
              htmlFor="signup-password"
              className="block text-xs font-bold"
              style={{ color: theme === 'dark' ? '#F5F1F0' : '#272329' }}
            >
              كلمة السر
            </label>
            <div className="relative">
              <input
                id="signup-password"
                type={showPassword ? 'text' : 'password'}
                required
                dir="ltr"
                value={password}
                disabled={isLoading}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 pl-11 pr-11 rounded-2xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#76243A] dark:focus:ring-[#B65370] liquid-glass-input"
                style={{
                  color: theme === 'dark' ? '#F5F1F0' : '#272329',
                }}
              />
              <Lock className="w-4 h-4 text-[#77717A] dark:text-[#B8B1BB] absolute right-3.5 top-3.5 pointer-events-none" />
              <button
                type="button"
                disabled={isLoading}
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'إخفاء كلمة السر' : 'إظهار كلمة السر'}
                title={showPassword ? 'إخفاء كلمة السر' : 'إظهار كلمة السر'}
                className="absolute left-1 top-1/2 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-xl text-[#77717A] hover:bg-black/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A15A] dark:text-[#B8B1BB] dark:hover:bg-white/5"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <label
              htmlFor="signup-phone"
              className="block text-xs font-bold"
              style={{ color: theme === 'dark' ? '#F5F1F0' : '#272329' }}
            >
              رقم موبايلك أو واتساب
            </label>
            <div className="relative">
              <input
                id="signup-phone"
                type="tel"
                dir="ltr"
                value={phone}
                disabled={isLoading}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-3 pl-11 rounded-2xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#76243A] dark:focus:ring-[#B65370] liquid-glass-input"
                style={{
                  color: theme === 'dark' ? '#F5F1F0' : '#272329',
                }}
              />
              <Phone className="w-4 h-4 text-[#77717A] dark:text-[#B8B1BB] absolute left-3.5 top-3.5 pointer-events-none" />
            </div>
          </div>

          {/* USER SPECIFICATION:
              "while signing up, if the email is recognized as a student email, I want then the middle school,
               like the seventh, eighth, and ninth grade thing to show up. If it isn't recognized as a student, it won't show up."
          */}
          {isStudent && (
            <div className="space-y-2 pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#76243A] dark:text-[#B65370]">
                  اختار صفك
                </span>
                <label className="block text-xs font-bold" style={{ color: theme === 'dark' ? '#F5F1F0' : '#272329' }}>
                  صفك:
                </label>
              </div>

              {/* 7th, 8th, and 9th Grade Super Liquid Glass Tiles */}
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { id: 'grade-1' as const, label: 'أولى إعدادي (7)', sub: 'أولى إعدادي / 7th' },
                  { id: 'grade-2' as const, label: 'تانية إعدادي (8)', sub: 'تانية إعدادي / 8th' },
                  { id: 'grade-3' as const, label: 'تالتة إعدادي (9)', sub: 'تالتة إعدادي / 9th' },
                ].map((g) => {
                  const isSelected = gradeLevel === g.id;
                  return (
                    <button
                      key={g.id}
                      type="button"
                      disabled={isLoading}
                      onClick={() => setGradeLevel(g.id)}
                      className="p-3.5 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 hover:scale-[1.02] active:scale-[0.98]"
                      style={{
                        background: isSelected
                          ? theme === 'dark'
                            ? 'linear-gradient(135deg, #76243A 0%, #541424 100%)'
                            : 'linear-gradient(135deg, rgba(118, 36, 58, 0.15) 0%, rgba(243, 231, 235, 0.9) 100%)'
                          : theme === 'dark'
                          ? 'rgba(42, 39, 48, 0.45)'
                          : 'rgba(255, 255, 255, 0.65)',
                        borderColor: isSelected
                          ? theme === 'dark' ? '#D6B878' : '#76243A'
                          : theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                        boxShadow: isSelected
                          ? theme === 'dark'
                            ? '0 8px 24px rgba(118,36,58,0.5), 0 0 12px rgba(214,184,120,0.25)'
                            : '0 8px 20px rgba(118,36,58,0.2)'
                          : 'none',
                      }}
                    >
                      <GraduationCap
                        className={`w-5 h-5`}
                        style={{
                          color: isSelected
                            ? theme === 'dark' ? '#F3DEAB' : '#76243A'
                            : theme === 'dark' ? '#B8B1BB' : '#77717A',
                        }}
                      />
                      <span
                        className="text-xs font-bold"
                        style={{
                          color: isSelected
                            ? theme === 'dark' ? '#F3DEAB' : '#76243A'
                            : theme === 'dark' ? '#B8B1BB' : '#272329',
                        }}
                      >
                        {g.label}
                      </span>
                      <span
                        className="text-[11px] leading-snug"
                        style={{
                          color: isSelected
                            ? theme === 'dark' ? '#D6B878' : '#76243A'
                            : theme === 'dark' ? '#B8B1BB' : '#77717A',
                        }}
                      >
                        {g.sub}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

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
                <span>جارٍ إنشاء الحساب...</span>
              </div>
            ) : (
              <>
                <span>اعمل حساب جديد</span>
                <ChevronLeft className="w-4 h-4" style={{ color: theme === 'dark' ? '#F3DEAB' : '#FFFFFF' }} />
              </>
            )}
          </button>

          {submitFeedback && (
            <div
              role={submitFeedback.tone === 'error' ? 'alert' : 'status'}
              aria-live={submitFeedback.tone === 'error' ? 'assertive' : 'polite'}
              className="mt-3 rounded-2xl border px-4 py-3.5 text-sm leading-relaxed break-words"
              style={{
                backgroundColor: submitFeedback.tone === 'error'
                  ? (theme === 'dark' ? 'rgba(75, 28, 38, 0.86)' : '#FCEBEC')
                  : submitFeedback.tone === 'success'
                    ? (theme === 'dark' ? 'rgba(32, 53, 42, 0.86)' : '#E9F4EC')
                    : (theme === 'dark' ? 'rgba(39, 34, 44, 0.92)' : '#F6F0E3'),
                color: submitFeedback.tone === 'error'
                  ? (theme === 'dark' ? '#FFB3B8' : '#912C3B')
                  : submitFeedback.tone === 'success'
                    ? (theme === 'dark' ? '#75C695' : '#286844')
                    : (theme === 'dark' ? '#F3DEAB' : '#765A22'),
                borderColor: submitFeedback.tone === 'error'
                  ? (theme === 'dark' ? 'rgba(240, 128, 137, 0.42)' : '#E7B6BE')
                  : submitFeedback.tone === 'success'
                    ? (theme === 'dark' ? '#3A3540' : '#B8D7C1')
                    : (theme === 'dark' ? 'rgba(214,184,120,.35)' : 'rgba(197,161,90,.45)'),
              }}
            >
              <p className="font-extrabold">
                {submitFeedback.tone === 'error' ? 'لم يكتمل التسجيل' : submitFeedback.tone === 'success' ? 'تمت الاستجابة' : 'حالة التسجيل'}
              </p>
              <p className="mt-1">{submitFeedback.text}</p>
              {submitFeedback.tone === 'error' && submitFeedback.text.includes('مسجل بالفعل') && (
                <button
                  type="button"
                  onClick={() => onNavigate('login')}
                  className="mt-3 inline-flex min-h-10 items-center justify-center rounded-xl border px-4 py-2.5 text-sm font-bold underline underline-offset-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A15A]"
                  style={{ borderColor: theme === 'dark' ? 'rgba(214,184,120,.4)' : '#DFC0CA', color: theme === 'dark' ? '#F3DEAB' : '#76243A' }}
                >
                  ادخل على حسابك لهذا البريد
                </button>
              )}
            </div>
          )}
        </form>

        {/* Footer */}
        <div
          className="text-center pt-4 border-t text-xs space-y-2"
          style={{ borderColor: theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}
        >
          <p style={{ color: theme === 'dark' ? '#B8B1BB' : '#77717A' }}>
            عندك حساب بالفعل؟{' '}
            <button
              type="button"
              onClick={() => onNavigate('login')}
              className="inline-flex min-h-10 items-center rounded-lg px-2 font-bold underline underline-offset-2 hover:opacity-85 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A15A] text-[#76243A] dark:text-[#B65370]"
            >
              ادخل على حسابك
            </button>
          </p>

          <button
            type="button"
            onClick={() => onNavigate('get-started')}
            className="text-[11px] text-[#77717A] dark:text-[#B8B1BB] hover:underline block mx-auto pt-1"
          >
            ← ارجع للبداية
          </button>
        </div>
      </div>
    </div>
  );
};
