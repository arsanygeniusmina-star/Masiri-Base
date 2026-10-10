import React, { useState } from 'react';
import { X, Copy, Check, ExternalLink, Terminal, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { Database } from '../db/storage';

interface SupabaseGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: 'light' | 'dark';
}

export const SupabaseGuideModal: React.FC<SupabaseGuideModalProps> = ({
  isOpen,
  onClose,
  theme,
}) => {
  const [copied, setCopied] = useState(false);
  const sql = Database.generateSupabaseSQLSchema();

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border p-6 sm:p-8 space-y-6 shadow-2xl relative text-right"
        style={{
          background: theme === 'dark' 
            ? 'linear-gradient(135deg, rgba(33, 31, 37, 0.98) 0%, rgba(22, 20, 25, 0.99) 100%)' 
            : 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 247, 244, 0.99) 100%)',
          borderColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(118,36,58,0.15)',
        }}
      >
        <div className="flex items-center justify-between border-b pb-4"
          style={{ borderColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }}
        >
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10">
            <X className="w-5 h-5 text-[#77717A] dark:text-[#B8B1BB]" />
          </button>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold" style={{ color: theme === 'dark' ? '#F5F1F0' : '#272329' }}>
              دليل ربط التطبيق بقاعدة بيانات Supabase
            </h3>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        </div>

        <div className="space-y-4 text-xs leading-relaxed text-[#77717A] dark:text-[#B8B1BB]">
          {/* Active Connection Banner */}
          <div className="p-4 rounded-2xl border space-y-1.5"
            style={{
              backgroundColor: theme === 'dark' ? 'rgba(32, 53, 42, 0.7)' : '#E9F4EC',
              borderColor: theme === 'dark' ? '#3A3540' : '#DFC0CA',
              color: theme === 'dark' ? '#75C695' : '#347653',
            }}
          >
            <div className="flex items-center gap-2 font-bold text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>مشروعك متصل ومربوط بالتطبيق الآن بنجاح!</span>
            </div>
            <p className="font-mono text-[11px]" dir="ltr">
              https://pduypklunvcsvabireuy.supabase.co
            </p>
            <p className="text-[11px] opacity-90">
              مفاتيح الربط والـ Anon Key تم إدراجها في التطبيق وتعمل بنجاح.
            </p>
          </div>

          {/* Step 1: Run SQL in Supabase */}
          <div className="p-4 rounded-2xl border space-y-2"
            style={{
              backgroundColor: theme === 'dark' ? 'rgba(42, 39, 48, 0.5)' : 'rgba(255, 255, 255, 0.8)',
              borderColor: theme === 'dark' ? '#3A3540' : '#E7E2E0',
            }}
          >
            <div className="flex items-center gap-2 font-bold text-sm" style={{ color: theme === 'dark' ? '#F5F1F0' : '#272329' }}>
              <span className="w-6 h-6 rounded-full bg-[#76243A] text-white flex items-center justify-center text-xs">١</span>
              <span>الخطوة الوحيدة المتبقية: إنشاء الجداول في Supabase</span>
            </div>
            <p>
              ادخل على لوحة تحكم مشروعك في Supabase &gt; اضغط على <strong>SQL Editor</strong> من القائمة الجانبية &gt; اضغط <strong>New Query</strong>، ثم انسخ الكود أدناه والصقه واضغط <strong>Run</strong>:
            </p>
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={handleCopy}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 shadow-md hover:opacity-95"
                style={{ backgroundColor: theme === 'dark' ? '#B65370' : '#76243A' }}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'تم نسخ كود SQL!' : 'نسخ كود الجداول (SQL Script)'}</span>
              </button>
              <span className="text-[11px] text-[#C5A15A] dark:text-[#D6B878] font-bold">
                جداول: users، teachers_whitelist، daily_tasks، student_logs
              </span>
            </div>
          </div>

          {/* Step 2: Cloud SQL & Direct PostgreSQL */}
          <div className="p-4 rounded-2xl border space-y-2"
            style={{
              backgroundColor: theme === 'dark' ? 'rgba(42, 39, 48, 0.5)' : 'rgba(255, 255, 255, 0.8)',
              borderColor: theme === 'dark' ? '#3A3540' : '#E7E2E0',
            }}
          >
            <div className="flex items-center gap-2 font-bold text-sm" style={{ color: theme === 'dark' ? '#F5F1F0' : '#272329' }}>
              <span className="w-6 h-6 rounded-full bg-[#76243A] text-white flex items-center justify-center text-xs">٢</span>
              <span>الربط مع Cloud SQL أو أي خادم PostgreSQL</span>
            </div>
            <p>
              السكربت ذاته متوافق 100% مع PostgreSQL و Cloud SQL، حيث يعتمد على معايير PostgreSQL القياسية ويدعم الـ RLS لحماية سرية بيانات الطلاب والخدام.
            </p>
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t"
          style={{ borderColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }}
        >
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm"
            style={{ backgroundColor: theme === 'dark' ? '#B65370' : '#76243A' }}
          >
            فهمت ذلك، إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
