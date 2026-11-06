import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BookOpen, Clock, Home, Phone, Plus, Star, Trash2 } from 'lucide-react';
import type { User } from '../types';
import { useReadingStreak } from '../lib/useReadingStreak';

declare global {
  interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[];
    readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
    prompt(): Promise<void>;
  }
}

interface WidgetConfig {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  enabled: boolean;
  preview: boolean;
}

interface WidgetsScreenProps {
  currentUser: User | null;
  theme: 'light' | 'dark';
}

export const WidgetsScreen: React.FC<WidgetsScreenProps> = ({ currentUser, theme }) => {
  const streakState = useReadingStreak(
    currentUser?.id ?? '',
    currentUser?.role === 'student' || currentUser?.role === 'teacher' || currentUser?.role === 'head',
    false,
    currentUser?.streakDays ?? 0,
  );

  const [widgets, setWidgets] = useState<WidgetConfig[]>([
    { id: 'streak', label: 'سلسلة القراءة', icon: Clock, enabled: true, preview: true },
    { id: 'verse', label: 'آية الأسبوع', icon: Star, enabled: true, preview: true },
    { id: 'prayer', label: 'طلب الصلاة', icon: Plus, enabled: false, preview: false },
    { id: 'reading', label: 'إصحاح النهارده', icon: BookOpen, enabled: true, preview: true },
  ]);

  const [isInstalled, setIsInstalled] = useState(false);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [badgeSet, setBadgeSet] = useState(false);
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    setIsInstalled(window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      deferredPromptRef.current = e as BeforeInstallPromptEvent;
      setShowInstallPrompt(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const setAppBadge = useCallback(async () => {
    if (!('setAppBadge' in navigator)) return;
    try {
      const streakValue = streakState?.value ?? currentUser?.streakDays ?? 0;
      if (streakValue > 0) {
        await (navigator as any).setAppBadge(streakValue);
        setBadgeSet(true);
      } else {
        await (navigator as any).clearAppBadge();
        setBadgeSet(false);
      }
    } catch {
      // Badge API not supported or permission denied
    }
  }, [streakState?.value, currentUser?.streakDays]);

  useEffect(() => {
    void setAppBadge();
  }, [setAppBadge]);

  const toggleWidget = (id: string) => {
    setWidgets((prev) => prev.map((w) => (w.id === id ? { ...w, enabled: !w.enabled, preview: !w.enabled } : w)));
  };

  const installApp = async () => {
    if (!deferredPromptRef.current) return;
    deferredPromptRef.current.prompt();
    const { outcome } = await deferredPromptRef.current.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setShowInstallPrompt(false);
    }
    deferredPromptRef.current = null;
  };

  const togglePreview = (id: string) => {
    setWidgets((prev) => prev.map((w) => (w.id === id ? { ...w, preview: !w.preview } : w)));
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6 sm:px-6 lg:px-8" dir="rtl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black sm:text-3xl" style={{ color: theme === 'dark' ? '#F5F1F0' : '#272329' }}>
            الأدوات المصغرة
          </h1>
          <p className="text-xs sm:text-sm text-[#77717A] dark:text-[#B8B1BB] mt-1">
            أضف أدوات THE APOSTLES لشاشة هاتفك أو لاب توب للوصول السريع لمسارك الروحي.
          </p>
        </div>
      </div>

      {!isInstalled && showInstallPrompt && (
        <div className="rounded-3xl border p-4 sm:p-6 backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-300"
          style={{ backgroundColor: theme === 'dark' ? 'rgba(32,24,34,.96)' : '#FFFFFF', borderColor: theme === 'dark' ? 'rgba(255,255,255,.1)' : 'rgba(0,0,0,.06)' }}>
          <div className="flex items-start gap-3">
            <Plus className="w-6 h-6 shrink-0 mt-0.5" style={{ color: theme === 'dark' ? '#D6B878' : '#76243A' }} />
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold" style={{ color: theme === 'dark' ? '#F5F1F0' : '#272329' }}>
                ثبّت التطبيق على شاشتك الرئيسية
              </h3>
              <p className="text-xs text-[#77717A] dark:text-[#B8B1BB] mt-1">
                أضف اختصار THE APOSTLES إلى شاشة هاتفك أو لاب توب للوصول السريع والأدوات المصغرة.
              </p>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={installApp}
              className="flex-1 py-2.5 rounded-2xl text-xs font-bold shadow-lg church-btn-primary"
              style={{ background: 'linear-gradient(135deg, #76243A 0%, #541424 100%)', color: theme === 'dark' ? '#F3DEAB' : '#FFFFFF' }}
            >
              تثبيت التطبيق
            </button>
            <button
              type="button"
              onClick={() => setShowInstallPrompt(false)}
              className="flex-1 py-2.5 rounded-2xl text-xs font-bold border"
              style={{ borderColor: theme === 'dark' ? 'rgba(255,255,255,.12)' : 'rgba(0,0,0,.08)', color: theme === 'dark' ? '#F5F1F0' : '#272329' }}
            >
              لاحقاً
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 rounded-2xl border p-3 sm:p-4 backdrop-blur-md"
        style={{ backgroundColor: theme === 'dark' ? 'rgba(32,24,34,.7)' : 'rgba(248,247,244,.8)', borderColor: theme === 'dark' ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.06)' }}>
        <div className="flex items-center gap-2">
          <Phone className="w-4 h-4" style={{ color: theme === 'dark' ? '#D6B878' : '#76243A' }} />
          <span className="font-bold text-sm" style={{ color: theme === 'dark' ? '#F5F1F0' : '#272329' }}>
            شارة التطبيق (الشارة على الأيقونة)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badgeSet ? 'bg-[#76243A] text-[#F3DEAB]' : 'bg-transparent border border-[#76243A]/30 text-[#76243A]'}`}>
            {badgeSet ? streakState?.value ?? currentUser?.streakDays ?? 0 : 'موقوف'}
          </span>
          <button
            type="button"
            onClick={setAppBadge}
            disabled={!('setAppBadge' in navigator)}
            className="text-xs font-bold px-3 py-1 rounded-xl border transition-all hover:scale-105"
            style={{ borderColor: theme === 'dark' ? 'rgba(214,184,120,.45)' : '#DFC0CA', color: theme === 'dark' ? '#D6B878' : '#76243A' }}
          >
            {badgeSet ? 'مفعل' : 'فعل الشارة'}
          </button>
          {!('setAppBadge' in navigator) && (
            <span className="text-[10px] text-[#77717A] dark:text-[#B8B1BB]">غير مدعوم في هذا المتصفح</span>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-sm font-black" style={{ color: theme === 'dark' ? '#F5F1F0' : '#272329' }}>
          اختر الأدوات المصغرة
        </h2>
        <div className="space-y-3">
          {widgets.map((widget) => {
            const Icon = widget.icon;
            return (
              <div
                key={widget.id}
                className="rounded-2xl border p-3.5 sm:p-4 flex items-center justify-between gap-3 transition-all hover:border-[#C5A15A]/50"
                style={{
                  backgroundColor: theme === 'dark' ? 'rgba(42,39,48,.5)' : 'rgba(255,255,255,.7)',
                  borderColor: theme === 'dark' ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.06)',
                }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: widget.enabled ? (theme === 'dark' ? 'rgba(118,36,58,.4)' : 'rgba(118,36,58,.12)') : (theme === 'dark' ? 'rgba(255,255,255,.06)' : '#F2F0ED'),
                      color: widget.enabled ? (theme === 'dark' ? '#F3DEAB' : '#76243A') : (theme === 'dark' ? '#B8B1BB' : '#77717A'),
                    }}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="block font-bold text-sm truncate" style={{ color: theme === 'dark' ? '#F5F1F0' : '#272329' }}>
                      {widget.label}
                    </span>
                    <span className="block text-[10px] text-[#77717A] dark:text-[#B8B1BB] truncate">
                      {widget.enabled ? 'مفعل على الشاشة الرئيسية' : 'مخفي'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleWidget(widget.id)}
                    className={`p-2 rounded-xl border transition-colors ${widget.enabled ? 'bg-[#76243A] text-white border-[#76243A]' : 'bg-transparent border-transparent text-[#77717A] dark:text-[#B8B1BB]'}`}
                    aria-label={widget.enabled ? `إخفاء ${widget.label}` : `إظهار ${widget.label}`}
                  >
                    <Star className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-[#77717A] dark:text-[#B8B1BB] mt-2">
          الأدوات المختارة ستظهر عند إضافة اختصار THE APOSTLES إلى شاشة هاتفك أو لاب توب (اضغط مطولاً على الأيقونة لعرض الاختصارات السريعة).
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="text-sm font-black" style={{ color: theme === 'dark' ? '#F5F1F0' : '#272329' }}>
          معاينة الأدوات
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {widgets.filter((w) => w.preview).map((widget) => {
            const Icon = widget.icon;
            return (
              <div
                key={widget.id}
                className="rounded-3xl border p-4 relative overflow-hidden"
                style={{
                  background: widget.id === 'streak'
                    ? theme === 'dark' ? 'linear-gradient(135deg, rgba(118,36,58,.9) 0%, rgba(64,14,24,1) 100%)' : 'linear-gradient(135deg, #76243A 0%, #5D192D 100%)'
                    : widget.id === 'verse'
                      ? theme === 'dark' ? 'linear-gradient(135deg, rgba(56,35,44,.9) 0%, rgba(24,20,27,1) 100%)' : 'linear-gradient(135deg, #F3E7EB 0%, #E9F4EC 100%)'
                      : theme === 'dark' ? 'linear-gradient(135deg, rgba(32,24,34,.9) 0%, rgba(20,17,23,1) 100%)' : 'linear-gradient(135deg, #FFFFFF 0%, #F8F7F4 100%)',
                  borderColor: theme === 'dark' ? 'rgba(255,255,255,.1)' : 'rgba(0,0,0,.06)',
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: widget.id === 'streak' ? 'rgba(214,184,120,.2)' : 'rgba(118,36,58,.2)', color: widget.id === 'streak' ? '#D6B878' : '#76243A' }}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <button
                    type="button"
                    onClick={() => togglePreview(widget.id)}
                    className="w-6 h-6 rounded-full hover:bg-white/10 dark:hover:bg-black/10 transition-colors"
                    style={{ color: theme === 'dark' ? '#F5F1F0' : '#272329' }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider"
                    style={{ color: widget.id === 'streak' ? '#D6B878' : theme === 'dark' ? '#B65370' : '#76243A' }}>
                    {widget.label}
                  </span>
                  {widget.id === 'streak' && (
                    <div className="text-2xl font-black font-mono" style={{ color: theme === 'dark' ? '#F3DEAB' : '#76243A' }}>
                      {streakState?.value ?? currentUser?.streakDays ?? 0} يوم متتالي
                    </div>
                  )}
                  {widget.id === 'verse' && (
                    <>
                      <div className="text-sm font-bold leading-relaxed" style={{ color: theme === 'dark' ? '#F5F1F0' : '#272329' }}>
                        «حفظ آية الأسبوع» — مراجعة الآية وحفظها في قلبك.
                      </div>
                      <span className="text-[10px] text-[#77717A] dark:text-[#B8B1BB]">سفر · الأسبوع الحالي</span>
                    </>
                  )}
                  {widget.id === 'reading' && (
                    <>
                      <div className="text-sm font-bold" style={{ color: theme === 'dark' ? '#F5F1F0' : '#272329' }}>
                        إصحاح النهارده
                      </div>
                      <span className="text-[10px] text-[#77717A] dark:text-[#B8B1BB]">اضغط لفتح قراءة اليوم</span>
                    </>
                  )}
                  {widget.id === 'prayer' && (
                    <>
                      <div className="text-sm font-bold" style={{ color: theme === 'dark' ? '#F5F1F0' : '#272329' }}>
                        طلب صلاة جديد
                      </div>
                      <span className="text-[10px] text-[#77717A] dark:text-[#B8B1BB]">أرسل طلباً للسادة الخدام</span>
                    </>
                  )}
                </div>
                <div className="mt-4 pt-2 border-t border-white/10 dark:border-white/5 flex items-center justify-between text-[10px]">
                  <span className="font-bold text-[#77717A] dark:text-[#B8B1BB]">THE APOSTLES</span>
                  <span className="font-bold" style={{ color: widget.id === 'streak' ? '#D6B878' : theme === 'dark' ? '#B65370' : '#76243A' }}>
                    انقر لفتح التطبيق
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-3xl border p-4 sm:p-6 backdrop-blur-md"
        style={{ backgroundColor: theme === 'dark' ? 'rgba(32,24,34,.6)' : 'rgba(248,247,244,.7)', borderColor: theme === 'dark' ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.06)' }}>
        <h3 className="text-sm font-bold mb-3" style={{ color: theme === 'dark' ? '#F5F1F0' : '#272329' }}>
          كيف تضيف THE APOSTLES لشاشتك الرئيسية
        </h3>
        <ol className="space-y-2 text-xs text-[#77717A] dark:text-[#B8B1BB] list-disc list-inside dir-rtl">
          <li>افتح المتصفح (كروم أو سفاري) على هاتفك أو لاب توب.</li>
          <li>اذهب إلى موقع THE APOSTLES وسجل الدخول.</li>
          <li>اضغط على زر المشاركة (مشاركة) أو «تثبيت التطبيق» من قائمة المتصفح.</li>
          <li>اختر «إضافة إلى الشاشة الرئيسية» أو «Install App».</li>
          <li>بعد التثبيت، اضغط مطولاً على أيقونة التطبيق لرؤية الاختصارات السريعة: <strong>إصحاح النهارده، سلسلة القراءة، طلب صلاة.</strong></li>
        </ol>
        <p className="mt-3 text-[10px] text-[#77717A] dark:text-[#B8B1BB]">
          ملاحظة: الأدوات المصغرة الحقيقية (Widgets) تحتاج تطبيق أصلي من متجر التطبيقات. هذه الأدوات هي اختصارات سريعة عبر متصفح الويب (PWA).
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-2xl border p-3 sm:p-4 backdrop-blur-md"
        style={{ backgroundColor: theme === 'dark' ? 'rgba(32,24,34,.7)' : 'rgba(248,247,244,.8)', borderColor: theme === 'dark' ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.06)' }}>
        <div className="flex items-center gap-2">
          <Home className="w-4 h-4" style={{ color: theme === 'dark' ? '#D6B878' : '#76243A' }} />
          <span className="font-bold text-sm" style={{ color: theme === 'dark' ? '#F5F1F0' : '#272329' }}>
            حالة التثبيت
          </span>
        </div>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isInstalled ? 'bg-[#76243A]/10 text-[#D6B878] border border-[#D6B878]/30' : 'bg-transparent border border-[#76243A]/30 text-[#77717A] dark:text-[#B8B1BB]'}`}>
          {isInstalled ? 'مثبّت على جهازك' : 'غير مثبت'}
        </span>
      </div>
    </div>
  );
};
