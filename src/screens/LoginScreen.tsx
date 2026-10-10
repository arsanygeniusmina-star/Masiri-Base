import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, AlertCircle, ArrowRight, Sparkles } from 'lucide-react';
import { Database, HEAD_EMAIL_DEFAULT } from '../db/storage';
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
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const cleanEmail = email.trim().toLowerCase();

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('يرجى إدخال بريد إلكتروني صحيح.');
      return;
    }

    if (!password.trim()) {
      setErrorMsg('يرجى كتابة كلمة المرور.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);

      // 1. Is it Head email?
      if (Database.isHeadEmail(cleanEmail)) {
        const headUser: User = {
          id: 'usr-head-01',
          name: 'مينا سامح ضيف',
          email: cleanEmail,
          role: 'head',
          phone: '01223456789',
          churchName: 'كنيسة السيدة العذراء والشهيد مارمرقس',
          streakDays: 45,
          points: 1250,
          createdAt: new Date().toISOString(),
        };
        Database.saveUser(headUser);
        Database.setCurrentUser(headUser);
        onLoginSuccess(headUser);
        return;
      }

      // 2. Is it in the teachers whitelist added by the Head?
      const isTeacherWhitelisted = Database.isEmailWhitelistedForTeacher(cleanEmail);
      if (isTeacherWhitelisted) {
        const whitelistEntry = Database.getTeachersWhitelist().find(t => t.email.toLowerCase() === cleanEmail);
        const teacherUser: User = {
          id: `usr-teacher-${Date.now()}`,
          name: whitelistEntry?.name || 'خادم معتمد',
          email: cleanEmail,
          role: 'teacher',
          gradeLevel: whitelistEntry?.assignedGrade || 'grade-2',
          churchName: 'كنيسة السيدة العذراء والشهيد مارمرقس',
          streakDays: 1,
          points: 500,
          createdAt: new Date().toISOString(),
        };
        Database.saveUser(teacherUser);
        Database.setCurrentUser(teacherUser);
        onLoginSuccess(teacherUser);
        return;
      }

      // 3. Otherwise student!
      const users = Database.getUsers();
      const existing = users.find(u => u.email.toLowerCase() === cleanEmail);
      if (existing) {
        Database.setCurrentUser(existing);
        onLoginSuccess(existing);
        return;
      }

      // Fresh student account on login
      const newStudent: User = {
        id: `usr-${Date.now()}`,
        name: cleanEmail.split('@')[0],
        email: cleanEmail,
        role: 'student',
        gradeLevel: 'grade-2',
        churchName: 'كنيسة السيدة العذراء والشهيد مارمرقس',
        streakDays: 1,
        points: 100,
        createdAt: new Date().toISOString(),
      };
      Database.saveUser(newStudent);
      Database.setCurrentUser(newStudent);
      onLoginSuccess(newStudent);
    }, 280);
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
              src="/src/assets/images/maseery_app_logo_1791622420580.jpg"
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
                تلقائياً: أي كلمة مرور للحساب المسجل
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

          {/* Remember me */}
          <div className="flex items-center justify-between text-xs pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded text-[#76243A] focus:ring-[#76243A]"
              />
              <span style={{ color: theme === 'dark' ? '#B8B1BB' : '#77717A' }}>تذكر تسجيل دخولي</span>
            </label>
          </div>

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
