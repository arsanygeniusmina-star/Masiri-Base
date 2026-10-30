import React from 'react';
import { X, Database, ShieldCheck, ExternalLink, BookOpen, KeyRound } from 'lucide-react';

interface SupabaseGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: 'light' | 'dark';
}

export const SupabaseGuideModal: React.FC<SupabaseGuideModalProps> = ({ isOpen, onClose, theme }) => {
  if (!isOpen) return null;
  const primary = theme === 'dark' ? '#F5F1F0' : '#272329';
  const secondary = theme === 'dark' ? '#B8B1BB' : '#77717A';
  const border = theme === 'dark' ? '#3A3540' : '#E7E2E0';
  const surface = theme === 'dark' ? 'rgba(33,31,37,.98)' : 'rgba(255,255,255,.98)';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md" role="presentation">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="supabase-guide-title"
        className="relative max-h-[90dvh] w-full max-w-xl space-y-5 overflow-y-auto rounded-3xl border p-5 shadow-2xl sm:p-7"
        style={{ background: surface, borderColor: border }}
      >
        <div className="flex items-center justify-between gap-3 border-b pb-4" style={{ borderColor: border }}>
          <button type="button" onClick={onClose} aria-label="إغلاق" className="rounded-full p-2 transition-colors hover:bg-black/5 dark:hover:bg-white/10">
            <X className="h-5 w-5" style={{ color: secondary }} />
          </button>
          <h2 id="supabase-guide-title" className="text-lg font-black sm:text-xl" style={{ color: primary }}>إعداد وأمان قاعدة بيانات مسيري</h2>
        </div>

        <div className="flex items-start gap-3 rounded-2xl border p-4" style={{ borderColor: border, backgroundColor: theme === 'dark' ? 'rgba(118,36,58,.18)' : '#F8F2F3' }}>
          <Database className="mt-0.5 h-5 w-5 shrink-0" style={{ color: theme === 'dark' ? '#D6B878' : '#76243A' }} />
          <div className="space-y-1">
            <h3 className="text-sm font-bold" style={{ color: primary }}>إعداد المشروع</h3>
            <p className="break-all text-xs leading-relaxed" style={{ color: secondary }} dir="ltr">https://pduypklunvcsvabireuy.supabase.co</p>
            <p className="text-xs leading-relaxed" style={{ color: secondary }}>تستخدم الواجهة Supabase Auth والملفات الشخصية والجداول المشتركة في قاعدة بيانات PostgreSQL.</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" style={{ color: '#C5A15A' }} />
            <div className="space-y-1">
              <h3 className="text-sm font-bold" style={{ color: primary }}>الأمان والصلاحيات</h3>
              <p className="text-xs leading-relaxed" style={{ color: secondary }}>تُحدد صلاحيات أمين الخدمة والخادم والطالب من سجلات قاعدة البيانات وسياسات RLS، وليس من البريد المكتوب داخل المتصفح. تُحصر إدارة قائمة الخدام على حساب أمين الخدمة المعتمد.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <KeyRound className="mt-0.5 h-5 w-5 shrink-0" style={{ color: '#C5A15A' }} />
            <div className="space-y-1">
              <h3 className="text-sm font-bold" style={{ color: primary }}>مفتاح الاتصال</h3>
              <p className="text-xs leading-relaxed" style={{ color: secondary }}>استخدم مفتاح anon/publishable فقط في إعدادات الواجهة. لا تضع service_role أو أي مفتاح سري في كود المتصفح أو متغيرات VITE_.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <BookOpen className="mt-0.5 h-5 w-5 shrink-0" style={{ color: '#C5A15A' }} />
            <div className="space-y-1">
              <h3 className="text-sm font-bold" style={{ color: primary }}>الإعداد الأولي</h3>
              <p className="text-xs leading-relaxed" style={{ color: secondary }}>راجع ملف SETUP في المستودع لإعداد أول حساب أمين الخدمة وتفعيل Google OAuth. لن يتم إنشاء حساب أمين خدمة تلقائياً لمجرد إدخال البريد الإلكتروني.</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-1 sm:flex-row">
          <a href="https://supabase.com/dashboard/project/pduypklunvcsvabireuy" target="_blank" rel="noreferrer"
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-bold"
            style={{ background: 'linear-gradient(135deg,#76243A 0%,#541424 100%)', color: '#F3DEAB', border: '1px solid rgba(214,184,120,.4)' }}>
            فتح لوحة Supabase <ExternalLink className="h-4 w-4" />
          </a>
          <a href="https://github.com/arsanygeniusmina-star/Masiri-Middle/blob/fix/responsive-auth-supabase/supabase/SETUP.md" target="_blank" rel="noreferrer"
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-xs font-bold"
            style={{ borderColor: border, color: primary }}>
            قراءة دليل الإعداد <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </section>
    </div>
  );
};
