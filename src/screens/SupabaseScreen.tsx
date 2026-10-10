import React, { useState } from 'react';
import { Database } from '../db/storage';
import { SupabaseConfig } from '../types';
import { testSupabaseConnection } from '../lib/supabase';
import {
  Database as DbIcon,
  Copy,
  Check,
  Download,
  Link,
  ShieldCheck,
  Server,
  Table,
  CheckCircle2,
  AlertCircle,
  Code2,
} from 'lucide-react';

interface SupabaseScreenProps {
  theme: 'light' | 'dark';
}

export const SupabaseScreen: React.FC<SupabaseScreenProps> = ({ theme }) => {
  const [config, setConfig] = useState<SupabaseConfig>(Database.getSupabaseConfig());
  const [url, setUrl] = useState(config.url);
  const [anonKey, setAnonKey] = useState(config.anonKey);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedSQL, setCopiedSQL] = useState(false);

  const sqlSchema = Database.generateSupabaseSQLSchema();

  const handleCopySQL = () => {
    navigator.clipboard.writeText(sqlSchema);
    setCopiedSQL(true);
    setTimeout(() => setCopiedSQL(false), 2500);
  };

  const handleDownloadSQL = () => {
    const element = document.createElement('a');
    const file = new Blob([sqlSchema], { type: 'text/plain;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = 'maseery_supabase_schema.sql';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleSaveAndTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsTesting(true);
    setTestResult(null);

    const cleanUrl = url.trim();
    const cleanKey = anonKey.trim();

    if (!cleanUrl || !cleanKey) {
      setIsTesting(false);
      setTestResult({
        success: false,
        message: 'يرجى إدخال رابط مشروع Supabase ومفتاح Anon API المفتاح العام.',
      });
      return;
    }

    try {
      const res = await testSupabaseConnection();
      setIsTesting(false);

      const updatedConfig: SupabaseConfig = {
        url: cleanUrl,
        anonKey: cleanKey,
        isConnected: res.connected,
        lastSync: new Date().toISOString(),
        autoSync: true,
      };

      Database.saveSupabaseConfig(updatedConfig);
      setConfig(updatedConfig);
      setTestResult({
        success: res.connected,
        message: res.message,
      });
    } catch (err: any) {
      setIsTesting(false);
      setTestResult({
        success: false,
        message: err?.message || 'تعذر فحص الاتصال.',
      });
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Header Banner - Liquid Glassmorphism */}
      <div
        className="rounded-3xl border p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 liquid-glass-card backdrop-blur-3xl"
      >
        <div className="space-y-2 text-right">
          <div className="flex items-center gap-2">
            <span
              className="text-xs font-semibold px-2.5 py-0.5 rounded-md"
              style={{
                backgroundColor: theme === 'dark' ? '#342D20' : '#F6F0E3',
                color: theme === 'dark' ? '#D6B878' : '#A96F19',
              }}
            >
              جاهز للربط مع Supabase
            </span>
            <span className="text-xs text-[#77717A] dark:text-[#B8B1BB]">·</span>
            <span className="text-xs text-[#77717A] dark:text-[#B8B1BB]">PostgreSQL + Row Level Security</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: theme === 'dark' ? '#F5F1F0' : '#272329' }}>
            مركز إعداد وقاعدة بيانات Supabase
          </h1>
          <p className="text-xs sm:text-sm text-[#77717A] dark:text-[#B8B1BB] max-w-xl">
            تطبيق «مسيري» يعمل الآن بقاعدة بيانات محلية نشطة متوافقة 100% مع مخطط Supabase. يمكنك تصدير ملف الـ SQL وإنشاء الجداول على مشروعك بضغطة واحدة.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleCopySQL}
            className="px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 shadow-sm hover:opacity-95 church-btn-primary"
            style={{
              background:
                theme === 'dark'
                  ? 'linear-gradient(135deg, #76243A 0%, #541424 100%)'
                  : 'linear-gradient(135deg, #76243A 0%, #5D192D 100%)',
              color: theme === 'dark' ? '#F3DEAB' : '#FFFFFF',
              border: theme === 'dark' ? '1px solid rgba(214, 184, 120, 0.45)' : 'none',
            }}
          >
            {copiedSQL ? (
              <Check className="w-4 h-4" style={{ color: theme === 'dark' ? '#F3DEAB' : '#FFFFFF' }} />
            ) : (
              <Copy className="w-4 h-4" style={{ color: theme === 'dark' ? '#F3DEAB' : '#FFFFFF' }} />
            )}
            <span>{copiedSQL ? 'تم نسخ كود SQL!' : 'نسخ كود إنشاء الجداول SQL'}</span>
          </button>

          <button
            onClick={handleDownloadSQL}
            className="px-3.5 py-2.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5"
            style={{
              borderColor: theme === 'dark' ? '#3A3540' : '#E7E2E0',
              color: theme === 'dark' ? '#F5F1F0' : '#272329',
              backgroundColor: theme === 'dark' ? '#2A2730' : '#F2F0ED',
            }}
          >
            <Download className="w-4 h-4" />
            <span>تحميل schema.sql</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Supabase Connection Credentials Form */}
        <div className="lg:col-span-5 space-y-6">
          <div
            className="rounded-3xl border p-6 sm:p-7 space-y-4 text-right liquid-glass-card backdrop-blur-3xl"
          >
            <div className="border-b pb-3" style={{ borderColor: theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
              <h2 className="text-base font-bold" style={{ color: theme === 'dark' ? '#F5F1F0' : '#272329' }}>
                ربط مشروع Supabase الخاص بك
              </h2>
              <p className="text-xs text-[#77717A] dark:text-[#B8B1BB] mt-0.5">
                أدخل مفاتيح مشروعك من Supabase Dashboard &gt; Project Settings &gt; API
              </p>
            </div>

            {testResult && (
              <div
                className="p-3.5 rounded-xl border text-xs flex items-center gap-2"
                style={{
                  backgroundColor: testResult.success
                    ? theme === 'dark'
                      ? '#20352A'
                      : '#E9F4EC'
                    : theme === 'dark'
                    ? '#3D242A'
                    : '#F9E9EB',
                  color: testResult.success
                    ? theme === 'dark'
                      ? '#75C695'
                      : '#347653'
                    : theme === 'dark'
                    ? '#F08089'
                    : '#B33B49',
                  borderColor: testResult.success
                    ? theme === 'dark'
                      ? '#3A3540'
                      : '#DFC0CA'
                    : theme === 'dark'
                    ? '#69404D'
                    : '#DFC0CA',
                }}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}

            <form onSubmit={handleSaveAndTest} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold" style={{ color: theme === 'dark' ? '#F5F1F0' : '#272329' }}>
                  Project URL رابط المشروع:
                </label>
                <input
                  type="url"
                  dir="ltr"
                  placeholder="https://xyzabcdefg.supabase.co"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-xs border focus:outline-none focus:ring-1 focus:ring-[#76243A]"
                  style={{
                    backgroundColor: theme === 'dark' ? '#2A2730' : '#FFFFFF',
                    borderColor: theme === 'dark' ? '#3A3540' : '#E7E2E0',
                    color: theme === 'dark' ? '#F5F1F0' : '#272329',
                  }}
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold" style={{ color: theme === 'dark' ? '#F5F1F0' : '#272329' }}>
                  Anon Public API Key المفتاح العام:
                </label>
                <input
                  type="password"
                  dir="ltr"
                  placeholder="eyJh......"
                  value={anonKey}
                  onChange={(e) => setAnonKey(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-xs border focus:outline-none focus:ring-1 focus:ring-[#76243A]"
                  style={{
                    backgroundColor: theme === 'dark' ? '#2A2730' : '#FFFFFF',
                    borderColor: theme === 'dark' ? '#3A3540' : '#E7E2E0',
                    color: theme === 'dark' ? '#F5F1F0' : '#272329',
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={isTesting}
                className="w-full py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm hover:opacity-95 church-btn-primary"
                style={{
                  background:
                    theme === 'dark'
                      ? 'linear-gradient(135deg, #76243A 0%, #541424 100%)'
                      : 'linear-gradient(135deg, #76243A 0%, #5D192D 100%)',
                  color: theme === 'dark' ? '#F3DEAB' : '#FFFFFF',
                  border: theme === 'dark' ? '1px solid rgba(214, 184, 120, 0.45)' : 'none',
                }}
              >
                <Link className="w-3.5 h-3.5" style={{ color: theme === 'dark' ? '#F3DEAB' : '#FFFFFF' }} />
                <span>{isTesting ? 'جاري فحص الاتصال...' : 'حفظ واختبار الاتصال مع Supabase'}</span>
              </button>
            </form>
          </div>

          {/* Database Tables Overview */}
          <div
            className="rounded-3xl border p-6 sm:p-7 space-y-3 text-right liquid-glass-card backdrop-blur-3xl"
          >
            <h3 className="text-sm font-bold" style={{ color: theme === 'dark' ? '#F5F1F0' : '#272329' }}>
              جداول قاعدة بيانات «مسيري»:
            </h3>
            <ul className="text-xs space-y-2 text-[#77717A] dark:text-[#B8B1BB]">
              <li className="flex items-center justify-between p-2 rounded-lg bg-black/5 dark:bg-white/5">
                <span className="font-mono" dir="ltr">public.users</span>
                <span>بيانات الحسابات والأدوار الـ 3 (Head, Teacher, Student)</span>
              </li>
              <li className="flex items-center justify-between p-2 rounded-lg bg-black/5 dark:bg-white/5">
                <span className="font-mono" dir="ltr">public.teachers_whitelist</span>
                <span>قائمة الخدام المعتمدين حصرياً من أمين الخدمة</span>
              </li>
              <li className="flex items-center justify-between p-2 rounded-lg bg-black/5 dark:bg-white/5">
                <span className="font-mono" dir="ltr">public.daily_tasks</span>
                <span>المهام الروحية لطلاب إعدادي (الأجبية، الإنجيل)</span>
              </li>
              <li className="flex items-center justify-between p-2 rounded-lg bg-black/5 dark:bg-white/5">
                <span className="font-mono" dir="ltr">public.prayer_requests</span>
                <span>صندوق طلبات الصلاة والأسئلة الخاصة بالخدام</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Right Column: SQL Migration Code Viewer */}
        <div className="lg:col-span-7 space-y-4">
          <div
            className="rounded-2xl border p-6 space-y-4 text-right"
            style={{
              backgroundColor: theme === 'dark' ? '#211F25' : '#FFFFFF',
              borderColor: theme === 'dark' ? '#3A3540' : '#E7E2E0',
            }}
          >
            <div className="flex items-center justify-between border-b pb-3">
              <span className="text-xs font-mono text-[#77717A] dark:text-[#B8B1BB]">
                PostgreSQL DDL + RLS Policies
              </span>
              <div className="flex items-center gap-1.5">
                <Code2 className="w-4 h-4 text-[#76243A] dark:text-[#B65370]" />
                <h2 className="text-base font-bold" style={{ color: theme === 'dark' ? '#F5F1F0' : '#272329' }}>
                  سكربت إنشاء الجداول (SQL Script)
                </h2>
              </div>
            </div>

            <p className="text-xs text-[#77717A] dark:text-[#B8B1BB]">
              انسخ هذا السكربت والصقه في <strong>SQL Editor</strong> داخل لوحة تحكم مشروع Supabase لإنشاء كافة الجداول وقواعد الأمان (RLS) فوراً.
            </p>

            <div
              className="rounded-xl border p-4 text-xs font-mono overflow-x-auto max-h-[460px] text-left"
              dir="ltr"
              style={{
                backgroundColor: theme === 'dark' ? '#161419' : '#F8F7F4',
                borderColor: theme === 'dark' ? '#3A3540' : '#E7E2E0',
                color: theme === 'dark' ? '#F5F1F0' : '#272329',
              }}
            >
              <pre className="whitespace-pre">{sqlSchema}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
