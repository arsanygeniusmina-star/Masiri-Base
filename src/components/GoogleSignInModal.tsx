import React, { useState } from 'react';
import { X, CheckCircle2, ShieldAlert, Sparkles, BookOpen, ArrowRight } from 'lucide-react';
import { User } from '../types';
import { Database, HEAD_EMAIL_DEFAULT } from '../db/storage';

interface GoogleSignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User) => void;
  theme: 'light' | 'dark';
}

export const GoogleSignInModal: React.FC<GoogleSignInModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  theme,
}) => {
  const [customEmail, setCustomEmail] = useState('');
  const [customName, setCustomName] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  if (!isOpen) return null;

  // Pre-configured Google mock accounts for rapid testing
  const googleAccounts = [
    {
      name: 'مينا سامح ضيف',
      email: HEAD_EMAIL_DEFAULT,
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=mina_head',
      roleHint: 'أمين الخدمة العام (Head)',
      badgeColor: '#76243A',
    },
    {
      name: 'أرساني مينا (حسابك الحالي)',
      email: 'arsany.genius.mina@gmail.com',
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=arsany',
      roleHint: 'أمين الخدمة (Head)',
      badgeColor: '#76243A',
    },
    {
      name: 'أ/ فادي يوسف (خادم معتمد)',
      email: 'teacher.fady@maseery.org',
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=fady_teacher',
      roleHint: 'خادم فصلي معتمد (Teacher)',
      badgeColor: '#A96F19',
    },
    {
      name: 'مارك عماد (طالب إعدادي)',
      email: 'mark.emad@maseery.org',
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=mark_student',
      roleHint: 'طالب مرحلة إعدادية (Student)',
      badgeColor: '#347653',
    },
  ];

  const handleSelectAccount = (accountEmail: string, accountName: string) => {
    const cleanEmail = accountEmail.trim().toLowerCase();
    
    // Resolve role using the user's rule
    let resolvedRole: 'head' | 'teacher' | 'student' = 'student';
    if (Database.isHeadEmail(cleanEmail)) {
      resolvedRole = 'head';
    } else if (Database.isEmailWhitelistedForTeacher(cleanEmail)) {
      resolvedRole = 'teacher';
    } else {
      resolvedRole = 'student';
    }

    const existingUsers = Database.getUsers();
    let user = existingUsers.find(u => u.email.toLowerCase() === cleanEmail);

    if (!user) {
      user = {
        id: `usr-google-${Date.now()}`,
        name: accountName,
        email: cleanEmail,
        role: resolvedRole,
        churchName: 'كنيسة السيدة العذراء والشهيد مارمرقس',
        gradeLevel: resolvedRole === 'student' ? 'grade-2' : undefined,
        streakDays: 1,
        points: resolvedRole === 'student' ? 200 : 800,
        createdAt: new Date().toISOString(),
      };
      Database.saveUser(user);
    } else {
      user.role = resolvedRole;
      Database.saveUser(user);
    }

    Database.setCurrentUser(user);
    onSuccess(user);
    onClose();
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmail.trim() || !customEmail.includes('@')) return;
    handleSelectAccount(customEmail, customName.trim() || customEmail.split('@')[0]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-md rounded-3xl border p-6 sm:p-7 space-y-5 shadow-2xl relative overflow-hidden transition-all text-right"
        style={{
          background: theme === 'dark' 
            ? 'linear-gradient(135deg, rgba(33, 31, 37, 0.95) 0%, rgba(22, 20, 25, 0.98) 100%)' 
            : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 247, 244, 0.98) 100%)',
          borderColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(118,36,58,0.15)',
          boxShadow: theme === 'dark' 
            ? '0 20px 50px rgba(0,0,0,0.6), 0 0 30px rgba(182,83,112,0.15)' 
            : '0 20px 50px rgba(118,36,58,0.12), 0 0 30px rgba(197,161,90,0.15)',
        }}
      >
        {/* Subtle Ambient Glass Highlight */}
        <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full bg-[#76243A]/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 rounded-full bg-[#C5A15A]/20 blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b pb-4"
          style={{ borderColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }}
        >
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-[#77717A] dark:text-[#B8B1BB]" />
          </button>

          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold" style={{ color: theme === 'dark' ? '#F5F1F0' : '#272329' }}>
              المتابعة باستخدام Google
            </h3>
            {/* Google SVG Icon */}
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
          </div>
        </div>

        <p className="text-xs text-[#77717A] dark:text-[#B8B1BB] leading-relaxed">
          اختر حساباً للمتابعة إلى منصة «مسيري». سيقوم النظام تلقائياً بتحديد دورك (أمين الخدمة، أو خادم معتمد، أو طالب إعدادي) استناداً إلى بريدك الإلكتروني.
        </p>

        {/* Accounts List */}
        <div className="space-y-2.5">
          {googleAccounts.map((acc, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelectAccount(acc.email, acc.name)}
              className="w-full p-3 rounded-2xl border text-right transition-all flex items-center justify-between gap-3 group hover:scale-[1.01] hover:border-[#76243A] dark:hover:border-[#B65370]"
              style={{
                backgroundColor: theme === 'dark' ? 'rgba(42, 39, 48, 0.6)' : 'rgba(255, 255, 255, 0.8)',
                borderColor: theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                backdropFilter: 'blur(12px)',
              }}
            >
              <ArrowRight className="w-4 h-4 text-[#77717A] group-hover:text-[#76243A] dark:group-hover:text-[#B65370] transition-colors" />

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="flex items-center gap-2 justify-end">
                    <span className="text-xs font-bold" style={{ color: theme === 'dark' ? '#F5F1F0' : '#272329' }}>
                      {acc.name}
                    </span>
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                      style={{
                        backgroundColor: `${acc.badgeColor}15`,
                        color: acc.badgeColor,
                        border: `1px solid ${acc.badgeColor}30`,
                      }}
                    >
                      {acc.roleHint}
                    </span>
                  </div>
                  <span className="text-[11px] text-[#77717A] dark:text-[#B8B1BB] font-mono block" dir="ltr">
                    {acc.email}
                  </span>
                </div>

                <div className="w-10 h-10 rounded-full border overflow-hidden shrink-0 bg-white/20">
                  <img src={acc.avatar} alt={acc.name} className="w-full h-full object-cover" />
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Custom Google Account Option */}
        {!showCustomInput ? (
          <button
            type="button"
            onClick={() => setShowCustomInput(true)}
            className="w-full py-2 text-xs font-medium text-[#77717A] dark:text-[#B8B1BB] hover:underline text-center"
          >
            + استخدام بريد إلكتروني آخر لحساب Google
          </button>
        ) : (
          <form onSubmit={handleCustomSubmit} className="space-y-3 pt-2 border-t"
            style={{ borderColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }}
          >
            <div className="space-y-1">
              <label className="text-[11px] font-semibold">بريد Google:</label>
              <input
                type="email"
                required
                dir="ltr"
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
                placeholder="your.name@gmail.com"
                className="w-full px-3 py-2 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-[#76243A]"
                style={{
                  backgroundColor: theme === 'dark' ? '#2A2730' : '#FFFFFF',
                  borderColor: theme === 'dark' ? '#3A3540' : '#E7E2E0',
                  color: theme === 'dark' ? '#F5F1F0' : '#272329',
                }}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold">اسمك:</label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="مثال: بيشوي عادل"
                className="w-full px-3 py-2 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-[#76243A]"
                style={{
                  backgroundColor: theme === 'dark' ? '#2A2730' : '#FFFFFF',
                  borderColor: theme === 'dark' ? '#3A3540' : '#E7E2E0',
                  color: theme === 'dark' ? '#F5F1F0' : '#272329',
                }}
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl text-xs font-bold text-white shadow-md hover:opacity-95"
              style={{ backgroundColor: theme === 'dark' ? '#B65370' : '#76243A' }}
            >
              تسجيل الدخول بهذا الحساب
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
