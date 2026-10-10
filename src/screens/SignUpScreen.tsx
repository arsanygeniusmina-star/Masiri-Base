import React, { useState } from 'react';
import {
  User as UserIcon,
  Mail,
  Lock,
  Phone,
  GraduationCap,
  ShieldCheck,
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
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Role is assigned by the database using the authenticated user's account
  // and the server-managed teacher allowlist. Never infer privileges from a typed email.
  const isStudent = true;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!name.trim()) {
      setErrorMsg('يرجى إدخال الاسم كاملاً.');
      return;
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('يرجى إدخال بريد إلكتروني صالح.');
      return;
    }
    if (password.length < 8) {
      setErrorMsg('يجب أن تتكون كلمة المرور من 8 أحرف على الأقل.');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            name: name.trim(),
            phone: phone.trim() || null,
            grade_level: gradeLevel,
          },
        },
      });

      if (error || !data.user) {
        setErrorMsg(error?.message || 'تعذر إنشاء الحساب. تحقق من البيانات وحاول مرة أخرى.');
        return;
      }

      if (!data.session) {
        setSuccessMsg('تم إنشاء الحساب. افتح رسالة التأكيد المرسلة إلى بريدك الإلكتروني، ثم ارجع وسجّل الدخول.');
        return;
      }

      const profile = await fetchUserProfile(data.user.id);
      if (!profile) {
        await supabase.auth.signOut();
        setErrorMsg('تم إنشاء حساب الدخول لكن ملف مسيري لم يظهر بعد. تواصل مع مسؤول التطبيق قبل إعادة المحاولة.');
        return;
      }

      onSignUpSuccess(profile);
    } catch (error) {
      console.error('Masiri sign-up failed:', error);
      setErrorMsg('حدث خطأ أثناء إنشاء الحساب أو الاتصال بقاعدة البيانات. حاول مرة أخرى.');
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
        {/* Header with Church Symbol & Glass Glow */}
        <div className="text-center space-y-2.5">
          <div
            className="w-16 h-16 rounded-2xl mx-auto overflow-hidden shadow-xl transition-transform hover:scale-105 active:scale-95 border"
            style={{
              borderColor: theme === 'dark' ? 'rgba(214, 184, 120, 0.45)' : 'rgba(118, 36, 58, 0.25)',
              boxShadow: theme === 'dark' ? '0 10px 25px rgba(214, 184, 120, 0.25)' : '0 10px 25px rgba(118, 36, 58, 0.25)',
            }}
          >
            <img
              src="/src/assets/images/maseery_app_logo_1791622420580.jpg"
              alt="شعار مَسِيري"
              className="w-full h-full object-cover"
            />
          </div>
          <h1
            className="text-2xl sm:text-3xl font-extrabold tracking-tight"
            style={{ color: theme === 'dark' ? '#F5F1F0' : '#272329' }}
          >
            إنشاء حساب جديد في مَسِيري
          </h1>
          <p
            className="text-xs sm:text-sm font-medium"
            style={{ color: theme === 'dark' ? '#B8B1BB' : '#77717A' }}
          >
            منصة المرحلة الإعدادية الكنسية للنمو الروحي والخدمة
          </p>
        </div>

        <div
          className="rounded-2xl border p-4 text-right text-xs"
          style={{
            backgroundColor: theme === 'dark' ? 'rgba(52,45,32,.45)' : 'rgba(246,240,227,.7)',
            borderColor: theme === 'dark' ? 'rgba(214,184,120,.3)' : 'rgba(197,161,90,.35)',
            color: theme === 'dark' ? '#D6B878' : '#765A22',
          }}
        >
          <div className="flex items-center gap-2 font-bold">
            <ShieldCheck className="h-4 w-4 shrink-0" />
            <span>تحديد الصلاحيات يتم بأمان من قاعدة البيانات</span>
          </div>
          <p className="mt-1 leading-relaxed opacity-90">
            يتم اعتماد دور الطالب أو الخادم من سجلات الخدمة، ولا يمكن اختيار صلاحيات أمين الخدمة من نموذج التسجيل.
          </p>
        </div>

        {/* Success notification */}
        {successMsg && (
          <div
            role="status"
            className="flex items-start gap-2 rounded-2xl border p-3.5 text-xs"
            style={{
              backgroundColor: theme === 'dark' ? 'rgba(32,53,42,.8)' : '#E9F4EC',
              color: theme === 'dark' ? '#75C695' : '#347653',
              borderColor: theme === 'dark' ? '#3A3540' : '#B8D7C1',
            }}
          >
            <ShieldCheck className="h-4 w-4 shrink-0" />
            <span>{successMsg}</span>
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
              الاسم بالكامل
            </label>
            <div className="relative">
              <input
                id="signup-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: مارك عماد رفعت"
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
              البريد الإلكتروني
            </label>
            <div className="relative">
              <input
                id="signup-email"
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
            <div className="flex items-center justify-between text-[11px] pt-1">
              <span className="text-[#77717A] dark:text-[#B8B1BB]">
                بريد أمين الخدمة العام يحصل تلقائياً على لوحة الإشراف
              </span>
              <button
                type="button"
                onClick={() => {
                  setEmail('minasamehdeif@gmail.com');
                  if (!name) setName('مينا سامح ضيف');
                }}
                className="font-bold hover:underline"
                style={{ color: theme === 'dark' ? '#D6B878' : '#76243A' }}
              >
                تعبئة بريد أمين الخدمة
              </button>
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label
              htmlFor="signup-password"
              className="block text-xs font-bold"
              style={{ color: theme === 'dark' ? '#F5F1F0' : '#272329' }}
            >
              كلمة المرور
            </label>
            <div className="relative">
              <input
                id="signup-password"
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

          {/* Phone */}
          <div className="space-y-1.5">
            <label
              htmlFor="signup-phone"
              className="block text-xs font-bold"
              style={{ color: theme === 'dark' ? '#F5F1F0' : '#272329' }}
            >
              رقم الهاتف أو الواتساب
            </label>
            <div className="relative">
              <input
                id="signup-phone"
                type="tel"
                dir="ltr"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01234567890"
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
                  المرحلة الإعدادية
                </span>
                <label className="block text-xs font-bold" style={{ color: theme === 'dark' ? '#F5F1F0' : '#272329' }}>
                  الصف الدراسي:
                </label>
              </div>

              {/* 7th, 8th, and 9th Grade Super Liquid Glass Tiles */}
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { id: 'grade-1' as const, label: 'الصف السابع', sub: 'أولى إعدادي / 7th' },
                  { id: 'grade-2' as const, label: 'الصف الثامن', sub: 'تانية إعدادي / 8th' },
                  { id: 'grade-3' as const, label: 'الصف التاسع', sub: 'تالتة إعدادي / 9th' },
                ].map((g) => {
                  const isSelected = gradeLevel === g.id;
                  return (
                    <button
                      key={g.id}
                      type="button"
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
                        className="text-[10px]"
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
                <span>جاري إنشاء الحساب والتحقق...</span>
              </div>
            ) : (
              <>
                <span>إنشاء الحساب وبدء المسيرة</span>
                <ChevronLeft className="w-4 h-4" style={{ color: theme === 'dark' ? '#F3DEAB' : '#FFFFFF' }} />
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div
          className="text-center pt-4 border-t text-xs space-y-2"
          style={{ borderColor: theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}
        >
          <p style={{ color: theme === 'dark' ? '#B8B1BB' : '#77717A' }}>
            لديك حساب مسجل بالفعل؟{' '}
            <button
              type="button"
              onClick={() => onNavigate('login')}
              className="font-bold underline hover:opacity-85 text-[#76243A] dark:text-[#B65370]"
            >
              تسجيل الدخول
            </button>
          </p>

          <button
            type="button"
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
