import React, { useCallback, useEffect, useState } from 'react';
import { Activity, CheckCircle2, RefreshCw, AlertCircle, Database, ShieldCheck, Users, BookOpen, HeartHandshake, ListChecks } from 'lucide-react';
import { supabase, testSupabaseConnection } from '../lib/supabase';

interface SupabaseScreenProps {
  theme: 'light' | 'dark';
}

type TableStatus = {
  key: string;
  label: string;
  description: string;
  count: number | null;
  error?: string;
  icon: React.ComponentType<{ className?: string }>;
};

const initialTables: TableStatus[] = [
  { key: 'users', label: 'حسابات المستخدمين', description: 'الملفات الشخصية والأدوار', count: null, icon: Users },
  { key: 'teachers_whitelist', label: 'الخدام المعتمدون', description: 'قائمة اعتماد الخدام التي يديرها أمين الخدمة', count: null, icon: ShieldCheck },
  { key: 'daily_tasks', label: 'المهام الروحية', description: 'المهام اليومية المشتركة', count: null, icon: BookOpen },
  { key: 'student_daily_logs', label: 'إنجازات الطلاب', description: 'حالة إنجاز المهام والنقاط', count: null, icon: ListChecks },
  { key: 'prayer_requests', label: 'طلبات الصلاة', description: 'الطلبات وحالتها مع احترام سياسات الخصوصية', count: null, icon: HeartHandshake },
];

export const SupabaseScreen: React.FC<SupabaseScreenProps> = ({ theme }) => {
  const [tables, setTables] = useState<TableStatus[]>(initialTables);
  const [isLoading, setIsLoading] = useState(false);
  const [connectionMessage, setConnectionMessage] = useState('');
  const [hasError, setHasError] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const runDiagnostics = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);
    setConnectionMessage('');
    try {
      const [connection, ...results] = await Promise.all([
        testSupabaseConnection(),
        supabase.from('users').select('id', { count: 'exact', head: true }),
        supabase.from('teachers_whitelist').select('id', { count: 'exact', head: true }),
        supabase.from('daily_tasks').select('id', { count: 'exact', head: true }),
        supabase.from('student_daily_logs').select('id', { count: 'exact', head: true }),
        supabase.from('prayer_requests').select('id', { count: 'exact', head: true }),
      ]);

      const nextTables = initialTables.map((table, index) => {
        const result = results[index] as { count: number | null; error: { message: string } | null };
        return {
          ...table,
          count: result.error ? null : result.count ?? 0,
          error: result.error?.message,
        };
      });
      setTables(nextTables);
      const failed = nextTables.some((table) => Boolean(table.error)) || !connection.connected || !connection.hasTables;
      setHasError(failed);
      setConnectionMessage(
        failed
          ? 'تم الاتصال جزئياً، لكن بعض الجداول أو الصلاحيات لم تجتز الفحص. راجع التفاصيل أدناه.'
          : 'الاتصال ناجح، والجداول الخمسة متاحة لهذا الحساب وفقاً لصلاحيات قاعدة البيانات.'
      );
      setLastChecked(new Date());
    } catch (error) {
      console.error('Supabase diagnostics failed:', error);
      setHasError(true);
      setConnectionMessage('تعذر إكمال فحص Supabase. تحقق من الاتصال أو إعدادات المشروع.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void runDiagnostics();
  }, [runDiagnostics]);

  const primary = theme === 'dark' ? '#F5F1F0' : '#272329';
  const secondary = theme === 'dark' ? '#B8B1BB' : '#77717A';

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <section className="liquid-glass-card space-y-5 rounded-3xl p-5 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold" style={{ color: theme === 'dark' ? '#D6B878' : '#76243A' }}>
              <Database className="h-4 w-4" />
              <span>مركز فحص قاعدة البيانات</span>
            </div>
            <h1 className="text-2xl font-black sm:text-3xl" style={{ color: primary }}>اتصال مسيري بـ Supabase</h1>
            <p className="max-w-2xl text-sm leading-relaxed" style={{ color: secondary }}>
              فحص مباشر للاتصال والجداول المتاحة لهذا الحساب. لا يتم عرض مفاتيح سرية أو إنشاء جداول مكررة من المتصفح.
            </p>
          </div>
          <button type="button" onClick={() => { void runDiagnostics(); }} disabled={isLoading}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg,#76243A 0%,#541424 100%)', color: '#F3DEAB', border: '1px solid rgba(214,184,120,.4)' }}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'جارٍ الفحص...' : 'إعادة فحص الاتصال'}
          </button>
        </div>

        {connectionMessage && (
          <div role={hasError ? 'alert' : 'status'} className="flex items-start gap-2 rounded-2xl border p-4 text-sm"
            style={{
              backgroundColor: hasError ? (theme === 'dark' ? 'rgba(61,36,42,.7)' : '#F9E9EB') : (theme === 'dark' ? 'rgba(32,53,42,.7)' : '#E9F4EC'),
              borderColor: hasError ? '#B33B49' : '#347653',
              color: hasError ? (theme === 'dark' ? '#F08089' : '#B33B49') : (theme === 'dark' ? '#75C695' : '#347653'),
            }}>
            {hasError ? <AlertCircle className="h-5 w-5 shrink-0" /> : <CheckCircle2 className="h-5 w-5 shrink-0" />}
            <span>{connectionMessage}</span>
          </div>
        )}
        {lastChecked && <p className="text-xs" style={{ color: secondary }}>آخر فحص: {lastChecked.toLocaleString('ar-EG')}</p>}
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {tables.map((table) => {
          const Icon = table.icon;
          return (
            <article key={table.key} className="liquid-glass-card flex min-w-0 items-start gap-3 rounded-2xl p-4 sm:p-5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                style={{ backgroundColor: theme === 'dark' ? 'rgba(118,36,58,.3)' : '#F3E7EB', color: theme === 'dark' ? '#D6B878' : '#76243A' }}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-sm font-bold" style={{ color: primary }}>{table.label}</h2>
                  <span className="rounded-lg px-2 py-1 text-xs font-bold" style={{
                    backgroundColor: table.error ? (theme === 'dark' ? 'rgba(61,36,42,.75)' : '#F9E9EB') : (theme === 'dark' ? 'rgba(32,53,42,.7)' : '#E9F4EC'),
                    color: table.error ? (theme === 'dark' ? '#F08089' : '#B33B49') : (theme === 'dark' ? '#75C695' : '#347653'),
                  }}>
                    {table.count === null ? 'غير متاح' : `${table.count} سجل`}
                  </span>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: secondary }}>{table.description}</p>
                {table.error && <p className="break-words text-xs" style={{ color: theme === 'dark' ? '#F08089' : '#B33B49' }}>{table.error}</p>}
                <code className="block text-[11px]" dir="ltr" style={{ color: secondary }}>public.{table.key}</code>
              </div>
            </article>
          );
        })}
      </section>

      <p className="text-xs leading-relaxed" style={{ color: secondary }}>
        ملاحظة: عدد السجلات الظاهر يطابق ما تسمح به سياسات RLS لهذا الحساب، وليس بالضرورة العدد الإجمالي المرئي لمسؤول قاعدة البيانات.
      </p>
    </div>
  );
};
