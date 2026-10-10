import React, { useCallback, useEffect, useState } from 'react';
import {
  Activity, AlertTriangle, CheckCircle2, Database, RefreshCw,
  ShieldCheck, Table2, Trash2, Users, Eye, Clock3, Copy,
} from 'lucide-react';
import { supabase, SUPABASE_URL } from '../lib/supabase';
import { clearTestRuntimeLogs, getTestRuntimeLogs, type TestRuntimeLog } from '../lib/testRuntimeLogs';

type DiagnosticColumn = { name: string; type: string; nullable: boolean };
type DiagnosticTable = {
  schema: string;
  row_count: number;
  columns: DiagnosticColumn[];
  rows: Record<string, unknown>[];
  sample_limit: number;
};
type DiagnosticSnapshot = {
  project_ref: string;
  generated_at: string;
  available_schema: string;
  tables: Record<string, DiagnosticTable>;
  security_note: string;
};

interface TestDashboardScreenProps {
  theme: 'light' | 'dark';
}

const tableLabels: Record<string, string> = {
  users: 'المستخدمون',
  teachers_whitelist: 'اعتماد الخدام',
  daily_tasks: 'المهام اليومية',
  student_daily_logs: 'سجلات إنجاز الطلاب',
  prayer_requests: 'طلبات الصلاة',
  attendance_records: 'الحضور',
  student_points_history: 'سجل النقاط',
  student_badges: 'الأوسمة',
  student_points_award_requests: 'طلبات منح النقاط',
};

function displayValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  if (typeof value === 'boolean') return value ? 'نعم' : 'لا';
  return String(value);
}

export const TestDashboardScreen: React.FC<TestDashboardScreenProps> = ({ theme }) => {
  const [snapshot, setSnapshot] = useState<DiagnosticSnapshot | null>(null);
  const [selectedTable, setSelectedTable] = useState('users');
  const [loading, setLoading] = useState(false);
  const [diagnosticError, setDiagnosticError] = useState('');
  const [runtimeLogs, setRuntimeLogs] = useState<TestRuntimeLog[]>(getTestRuntimeLogs());
  const [showLogs, setShowLogs] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const dark = theme === 'dark';
  const primary = dark ? '#F5F1F0' : '#272329';
  const secondary = dark ? '#B8B1BB' : '#77717A';
  const border = dark ? 'rgba(214,184,120,.22)' : '#E7E2E0';
  const card = dark ? 'rgba(38,32,44,.68)' : 'rgba(255,255,255,.82)';
  const burgundy = dark ? '#D6B878' : '#76243A';

  const refreshDiagnostics = useCallback(async () => {
    setLoading(true);
    setDiagnosticError('');
    try {
      // The RPC validates the signed-in email and the server-side TEST role.
      const diagnosticClient = supabase as unknown as {
        rpc: (fn: string) => Promise<{ data: unknown; error: { message?: string } | null }>;
      };
      const { data, error } = await diagnosticClient.rpc('get_test_diagnostics');
      if (error) throw new Error(error.message || 'تعذر قراءة بيانات الفحص.');
      if (!data || typeof data !== 'object' || !('tables' in data)) {
        throw new Error('وصل رد غير متوقع من مركز الفحص.');
      }
      const nextSnapshot = data as DiagnosticSnapshot;
      setSnapshot(nextSnapshot);
      if (!nextSnapshot.tables[selectedTable]) {
        setSelectedTable(Object.keys(nextSnapshot.tables)[0] || 'users');
      }
      setLastRefresh(new Date());
    } catch (error) {
      setDiagnosticError(error instanceof Error ? error.message : 'تعذر تحميل معلومات قاعدة البيانات.');
    } finally {
      setLoading(false);
      setRuntimeLogs(getTestRuntimeLogs());
    }
  }, [selectedTable]);

  useEffect(() => { void refreshDiagnostics(); }, [refreshDiagnostics]);
  useEffect(() => {
    const interval = window.setInterval(() => setRuntimeLogs(getTestRuntimeLogs()), 1500);
    return () => window.clearInterval(interval);
  }, []);

  const tables = snapshot?.tables ?? {};
  const tableNames = Object.keys(tables);
  const activeTable = tables[selectedTable];
  const errors = runtimeLogs.filter((log) => log.level === 'error').length;
  const warnings = runtimeLogs.filter((log) => log.level === 'warning').length;

  return (
    <div className="mx-auto max-w-[1440px] space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8" dir="rtl">
      <section className="liquid-glass-card overflow-hidden rounded-3xl border p-5 sm:p-8" style={{ borderColor: border }}>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-black"
              style={{ borderColor: border, background: dark ? 'rgba(118,36,58,.25)' : '#F3E7EB', color: burgundy }}>
              <ShieldCheck className="h-4 w-4" /> صلاحية TEST مقيّدة
            </div>
            <h1 className="text-2xl font-black sm:text-3xl" style={{ color: primary }}>مركز الاختبار والتشخيص</h1>
            <p className="max-w-3xl text-sm leading-7" style={{ color: secondary }}>
              لوحة داخلية لعرض أخطاء المتصفح، ومعلومات اتصال Supabase، وأسماء الجداول وأعمدتها وعينات من السجلات.
              صلاحية القراءة هنا لا تغيّر أدوار الحسابات ولا تمنح صلاحيات الكتابة في قاعدة البيانات.
            </p>
          </div>
          <button type="button" onClick={() => void refreshDiagnostics()} disabled={loading}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-black shadow-lg disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg,#76243A 0%,#541424 100%)', color: '#F3DEAB', border: '1px solid rgba(214,184,120,.45)' }}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'جارٍ الفحص...' : 'تحديث التشخيص'}
          </button>
        </div>

        {diagnosticError && (
          <div role="alert" className="mt-5 flex items-start gap-2 rounded-2xl border p-4 text-sm"
            style={{ borderColor: '#B33B49', background: dark ? 'rgba(179,59,73,.14)' : '#F9E9EB', color: dark ? '#F08089' : '#B33B49' }}>
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div><strong>تعذر إكمال الفحص</strong><p className="mt-1 break-words">{diagnosticError}</p></div>
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-2xl border p-4" style={{ borderColor: border, background: card }}>
            <div className="flex items-center gap-2 text-xs font-bold" style={{ color: secondary }}><Database className="h-4 w-4" /> مشروع قاعدة البيانات</div>
            <p className="mt-2 break-all font-mono text-sm font-black" dir="ltr" style={{ color: primary }}>{snapshot?.project_ref || 'pduypklunvcsvabireuy'}</p>
            <p className="mt-1 text-xs" style={{ color: secondary }}>{new URL(SUPABASE_URL).hostname}</p>
          </article>
          <article className="rounded-2xl border p-4" style={{ borderColor: border, background: card }}>
            <div className="flex items-center gap-2 text-xs font-bold" style={{ color: secondary }}><Table2 className="h-4 w-4" /> الجداول المعروضة</div>
            <p className="mt-2 text-3xl font-black" style={{ color: primary }}>{tableNames.length}</p>
            <p className="mt-1 text-xs" style={{ color: secondary }}>جداول من مخطط public</p>
          </article>
          <article className="rounded-2xl border p-4" style={{ borderColor: border, background: card }}>
            <div className="flex items-center gap-2 text-xs font-bold" style={{ color: secondary }}><Activity className="h-4 w-4" /> أخطاء الجلسة</div>
            <p className="mt-2 text-3xl font-black" style={{ color: errors ? '#B33B49' : primary }}>{errors}</p>
            <p className="mt-1 text-xs" style={{ color: secondary }}>{warnings} تحذير في السجل المحلي</p>
          </article>
          <article className="rounded-2xl border p-4" style={{ borderColor: border, background: card }}>
            <div className="flex items-center gap-2 text-xs font-bold" style={{ color: secondary }}><Clock3 className="h-4 w-4" /> آخر تحديث</div>
            <p className="mt-2 text-sm font-black" style={{ color: primary }}>{lastRefresh ? lastRefresh.toLocaleTimeString('ar-EG') : 'لم يتم بعد'}</p>
            <p className="mt-1 text-xs" style={{ color: secondary }}>{snapshot?.generated_at ? new Date(snapshot.generated_at).toLocaleString('ar-EG') : 'بانتظار رد قاعدة البيانات'}</p>
          </article>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="liquid-glass-card rounded-3xl border p-4 sm:p-5" style={{ borderColor: border }}>
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="font-black" style={{ color: primary }}>جداول قاعدة البيانات</h2>
            <span className="text-xs" style={{ color: secondary }}>{tableNames.length} جدول</span>
          </div>
          <div className="space-y-2">
            {tableNames.map((tableName) => {
              const table = tables[tableName];
              const active = selectedTable === tableName;
              return (
                <button key={tableName} type="button" onClick={() => setSelectedTable(tableName)}
                  className="flex w-full items-center justify-between gap-3 rounded-2xl border p-3 text-right transition-all"
                  style={{
                    borderColor: active ? (dark ? '#D6B878' : '#76243A') : border,
                    background: active ? (dark ? 'rgba(118,36,58,.34)' : '#F3E7EB') : card,
                    color: active ? burgundy : primary,
                  }}>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold">{tableLabels[tableName] || tableName}</span>
                    <span className="mt-1 block font-mono text-[10px]" dir="ltr">{tableName}</span>
                  </span>
                  <span className="shrink-0 rounded-lg px-2 py-1 text-xs font-black" style={{ background: dark ? 'rgba(0,0,0,.22)' : '#FFFFFF', color: primary }}>{table.row_count}</span>
                </button>
              );
            })}
            {!tableNames.length && !loading && <p className="py-6 text-center text-sm" style={{ color: secondary }}>لا توجد بيانات جداول متاحة.</p>}
          </div>
        </aside>

        <section className="liquid-glass-card min-w-0 rounded-3xl border p-4 sm:p-6" style={{ borderColor: border }}>
          {activeTable ? (
            <>
              <div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-start sm:justify-between" style={{ borderColor: border }}>
                <div>
                  <p className="text-xs font-bold" style={{ color: burgundy }}>مخطط {activeTable.schema}</p>
                  <h2 className="mt-1 text-xl font-black" style={{ color: primary }}>{tableLabels[selectedTable] || selectedTable}</h2>
                  <p className="mt-1 font-mono text-xs" dir="ltr" style={{ color: secondary }}>{selectedTable}</p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded-xl border px-3 py-2" style={{ borderColor: border, color: primary }}>{activeTable.row_count} سجل إجمالي</span>
                  <span className="rounded-xl border px-3 py-2" style={{ borderColor: border, color: primary }}>{activeTable.columns.length} عمود</span>
                  <span className="rounded-xl border px-3 py-2" style={{ borderColor: border, color: primary }}>عينة حتى {activeTable.sample_limit}</span>
                </div>
              </div>

              <div className="mt-5">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-black" style={{ color: primary }}><Table2 className="h-4 w-4" /> تعريف الأعمدة</h3>
                <div className="flex flex-wrap gap-2">
                  {activeTable.columns.map((column) => (
                    <span key={column.name} title={`${column.type} · ${column.nullable ? 'nullable' : 'not null'}`}
                      className="rounded-xl border px-3 py-2 text-xs" style={{ borderColor: border, background: card, color: primary }}>
                      <strong dir="ltr">{column.name}</strong><span className="mx-1" style={{ color: secondary }}>·</span><span style={{ color: secondary }}>{column.type}</span>
                      {column.nullable && <span className="mr-1 text-[10px]" style={{ color: secondary }}>اختياري</span>}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-6">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h3 className="flex items-center gap-2 text-sm font-black" style={{ color: primary }}><Eye className="h-4 w-4" /> عينات السجلات</h3>
                  <span className="text-xs" style={{ color: secondary }}>قراءة فقط</span>
                </div>
                {activeTable.rows.length ? (
                  <div className="max-w-full overflow-auto rounded-2xl border" style={{ borderColor: border }}>
                    <table className="min-w-full border-collapse text-right text-xs">
                      <thead style={{ background: dark ? 'rgba(118,36,58,.34)' : '#F3E7EB', color: primary }}>
                        <tr>{activeTable.columns.map((column) => <th key={column.name} className="whitespace-nowrap border-b px-3 py-3 font-black" style={{ borderColor: border }} dir="auto">{column.name}</th>)}</tr>
                      </thead>
                      <tbody>
                        {activeTable.rows.map((row, index) => (
                          <tr key={String(row.id ?? index)} style={{ background: index % 2 ? card : 'transparent', color: primary }}>
                            {activeTable.columns.map((column) => (
                              <td key={column.name} className="max-w-[300px] border-b px-3 py-3 align-top" style={{ borderColor: border }}>
                                <span className="block max-h-24 min-w-[70px] overflow-auto whitespace-pre-wrap break-words" dir="auto">{displayValue(row[column.name])}</span>
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="rounded-2xl border p-8 text-center" style={{ borderColor: border, background: card }}>
                    <Users className="mx-auto h-8 w-8" style={{ color: secondary }} />
                    <p className="mt-2 text-sm font-bold" style={{ color: primary }}>لا توجد سجلات في هذا الجدول حالياً</p>
                    <p className="mt-1 text-xs" style={{ color: secondary }}>يمكنك تحديث التشخيص بعد إضافة بيانات تجريبية أو حقيقية.</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex min-h-64 items-center justify-center text-sm" style={{ color: secondary }}>{loading ? 'جارٍ تحميل تفاصيل الجداول...' : 'اختر جدولاً من القائمة لعرض تفاصيله.'}</div>
          )}
        </section>
      </section>

      <section className="liquid-glass-card rounded-3xl border p-4 sm:p-6" style={{ borderColor: border }}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-black" style={{ color: primary }}><Activity className="h-5 w-5" /> سجلات التطبيق في هذا المتصفح</h2>
            <p className="mt-1 text-xs leading-6" style={{ color: secondary }}>يتم جمع console.error وconsole.warn وأخطاء JavaScript والوعود غير المعالجة منذ فتح التطبيق. السجل محلي داخل الجلسة ولا يُرفع إلى قاعدة البيانات.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setShowLogs((previous) => !previous)} className="rounded-xl border px-3 py-2 text-xs font-bold" style={{ borderColor: border, color: primary }}>{showLogs ? 'إخفاء السجل' : 'عرض السجل'}</button>
            <button type="button" onClick={() => { clearTestRuntimeLogs(); setRuntimeLogs([]); }} className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold" style={{ borderColor: border, color: primary }}><Trash2 className="h-3.5 w-3.5" /> مسح السجل المحلي</button>
          </div>
        </div>
        {showLogs && (
          <div className="mt-4 max-h-[460px] space-y-2 overflow-auto">
            {runtimeLogs.length ? runtimeLogs.map((log) => (
              <article key={log.id} className="rounded-2xl border p-3" style={{
                borderColor: log.level === 'error' ? (dark ? 'rgba(240,128,137,.4)' : '#DFC0CA') : border,
                background: log.level === 'error' ? (dark ? 'rgba(179,59,73,.12)' : '#FDF3F3') : card,
              }}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-black" style={{ color: log.level === 'error' ? (dark ? '#F08089' : '#B33B49') : secondary }}>
                    {log.level === 'error' ? 'خطأ' : 'تحذير'} #{log.id}
                  </span>
                  <time className="text-[10px]" style={{ color: secondary }}>{new Date(log.time).toLocaleString('ar-EG')}</time>
                </div>
                <p className="mt-2 break-words text-xs leading-6" dir="auto" style={{ color: primary }}>{log.message}</p>
              </article>
            )) : (
              <div className="rounded-2xl border p-6 text-center" style={{ borderColor: border, color: secondary }}>
                <CheckCircle2 className="mx-auto h-7 w-7" />
                <p className="mt-2 text-sm font-bold">لا توجد أخطاء مسجلة حتى الآن</p>
              </div>
            )}
          </div>
        )}
      </section>

      <p className="px-2 text-xs leading-6" style={{ color: secondary }}>
        تنبيه خصوصية: يتيح هذا الحساب قراءة البيانات التي يعرضها قسم التشخيص، بما في ذلك بيانات المستخدمين وطلبات الصلاة. سجلات المتصفح لا تتضمن كلمات مرور، ويتم تنقيح عناوين البريد الإلكتروني والرموز الشائعة قبل عرض رسائل السجل. لا تعرض هذه اللوحة auth.users أو المخطط الخاص أو المفاتيح السرية.
      </p>
    </div>
  );
};
