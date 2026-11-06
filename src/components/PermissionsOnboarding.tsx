import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bell, Camera, Check, Loader2, X } from 'lucide-react';
import {
  cameraState,
  isInstalledWebApp,
  notificationState,
  requestCameraPermission,
  requestNotificationPermission,
  type PermissionResult,
} from '../lib/devicePermissions';
import { ensurePushSubscription } from '../lib/push';

// Shown at most once a day while notifications or the camera are not allowed yet.
const SHOWN_DAY_KEY = 'masiri.permissions-onboarding.day.v2';
const todayKey = () => new Date().toISOString().slice(0, 10);

function shownToday(): boolean {
  try {
    return window.localStorage.getItem(SHOWN_DAY_KEY) === todayKey();
  } catch {
    return false;
  }
}

function markDone() {
  try {
    window.localStorage.setItem(SHOWN_DAY_KEY, todayKey());
  } catch {
    // Storage blocked: the screen may show again next launch, which is harmless.
  }
}

/** Forced with ?permissions=1 (e.g. from the «ask_permissions» notification). */
export function permissionsForcedByLink(): boolean {
  return typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('permissions') === '1';
}

/**
 * True when the signed-in user should see the permissions screen: notifications
 * or the camera are not allowed yet (asked once a day), or the link forces it.
 */
const isIphone = () => typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);
const isAndroid = () => typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent);

/** iPhone Safari only allows notifications for apps added to the home screen. */
function iphoneNeedsHomeScreen(): boolean {
  return isIphone() && !isInstalledWebApp() && notificationState() === 'unsupported';
}

export async function needsPermissionsPrompt(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (permissionsForcedByLink()) return true;
  const missing = (state: PermissionResult) => state === 'prompt' || state === 'denied';
  // Notifications are required: ask on every app open until allowed.
  if (missing(notificationState()) || iphoneNeedsHomeScreen()) return true;
  if (shownToday()) return false;
  return missing(await cameraState());
}

interface PermissionsOnboardingProps {
  theme: 'light' | 'dark';
  onDone: () => void;
}

/**
 * First thing the installed app shows: asks for notifications (daily chapter
 * reminder) and the camera (the Streak photo is camera-only). Phones only show
 * the system prompts after a tap, hence the single «سماح» button.
 */
export const PermissionsOnboarding: React.FC<PermissionsOnboardingProps> = ({ theme, onDone }) => {
  const dark = theme === 'dark';
  const [notifications, setNotifications] = useState<PermissionResult>(() => notificationState());
  const [camera, setCamera] = useState<PermissionResult>('prompt');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void cameraState().then(setCamera);
    // Coming back from the phone's settings: read the permissions again.
    const recheck = () => {
      if (document.visibilityState !== 'visible') return;
      const n = notificationState();
      setNotifications(n);
      if (n === 'granted') void ensurePushSubscription();
      void cameraState().then(setCamera);
    };
    document.addEventListener('visibilitychange', recheck);
    return () => document.removeEventListener('visibilitychange', recheck);
  }, []);

  const needsHomeScreen = iphoneNeedsHomeScreen();
  // Notifications are required (unless this phone/browser can't do them at all).
  const notificationsMissing = notifications === 'prompt' || notifications === 'denied';
  const canClose = !notificationsMissing;

  const finish = () => {
    markDone();
    onDone();
  };

  const allow = async () => {
    setBusy(true);
    // Ask one after the other: browsers show one system prompt at a time.
    const n = notifications === 'granted' ? 'granted' : await requestNotificationPermission();
    setNotifications(n);
    if (n === 'granted') void ensurePushSubscription();
    const c = camera === 'granted' ? 'granted' : await requestCameraPermission();
    setCamera(c);
    setBusy(false);
    if (n === 'granted' || n === 'unsupported') {
      if (c !== 'prompt') window.setTimeout(finish, 900);
    }
  };

  const row = (icon: React.ReactNode, title: string, why: string, state: PermissionResult) => (
    <li className="flex items-center gap-3 rounded-2xl p-3.5" style={{ backgroundColor: dark ? 'rgba(42,39,48,.7)' : 'rgba(248,247,244,.9)' }}>
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl" style={{ backgroundColor: dark ? 'rgba(118,36,58,.55)' : '#F3E7EB', color: dark ? '#F3DEAB' : '#76243A' }}>
        {icon}
      </span>
      <span className="min-w-0 flex-1 text-right">
        <span className="block text-sm font-black" style={{ color: dark ? '#F5F1F0' : '#272329' }}>{title}</span>
        <span className="block text-xs leading-5" style={{ color: dark ? '#B8B1BB' : '#77717A' }}>{why}</span>
      </span>
      <span className="shrink-0 text-xs font-black" style={{ color: state === 'granted' ? (dark ? '#75C695' : '#347653') : state === 'denied' ? (dark ? '#F08089' : '#B33B49') : (dark ? '#B8B1BB' : '#77717A') }}>
        {state === 'granted' ? <Check className="h-5 w-5" /> : state === 'denied' ? 'مرفوض' : state === 'unsupported' ? 'غير متاح' : ''}
      </span>
    </li>
  );


  return createPortal(
    <div className="fixed inset-0 z-[95] flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="permissions-title" dir="rtl">
      <div className="absolute inset-0" style={{ backgroundColor: dark ? 'rgba(10,8,12,.8)' : 'rgba(39,35,41,.55)' }} />
      <div
        className="relative z-10 w-full max-w-md space-y-5 rounded-t-3xl border p-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] text-center shadow-2xl sm:rounded-3xl sm:pb-6"
        style={{ backgroundColor: dark ? 'rgba(32,24,34,.98)' : '#FFFFFF', borderColor: dark ? 'rgba(214,184,120,.35)' : '#E7E2E0' }}
      >
        {canClose && <button type="button" onClick={finish} className="absolute left-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-xl" style={{ color: dark ? '#B8B1BB' : '#77717A' }} aria-label="لاحقًا">
          <X className="h-5 w-5" />
        </button>}
        <img
          src="/masiri-journey-icon.jpg?v=20261010-2"
          alt="شعار THE APOSTLES"
          className="mx-auto h-20 w-20 rounded-3xl border object-cover shadow-xl"
          style={{ borderColor: dark ? 'rgba(214,184,120,.55)' : 'rgba(118,36,58,.25)' }}
        />
        <h2
          id="permissions-title"
          dir="ltr"
          lang="en"
          className="text-2xl uppercase"
          style={{ color: dark ? '#F3DEAB' : '#76243A', fontFamily: "'Cinzel', 'Times New Roman', serif", fontWeight: 900, letterSpacing: '0.06em' }}
        >
          THE APOSTLES
        </h2>
        <ul className="space-y-2.5">
          {row(<Bell className="h-5 w-5" />, 'الإشعارات', 'تذكير يومي بإصحاح النهارده وآية منه.', notifications)}
          {row(<Camera className="h-5 w-5" />, 'الكاميرا', 'صورة بعد القراءة عشان يتحسب اليوم في الـ 🔥.', camera)}
        </ul>
        {needsHomeScreen && (
          <div className="space-y-1.5 rounded-2xl p-3.5 text-right text-xs leading-6" style={{ backgroundColor: dark ? 'rgba(118,36,58,.35)' : '#F3E7EB', color: dark ? '#F5F1F0' : '#272329' }}>
            <p className="font-black">📲 على الآيفون الإشعارات بتشتغل بس لما التطبيق يكون على الشاشة الرئيسية:</p>
            <p>١. دوس زر المشاركة <b>⬆️</b> تحت في Safari</p>
            <p>٢. اختار <b>«إضافة إلى الشاشة الرئيسية»</b></p>
            <p>٣. افتح التطبيق من الأيقونة الجديدة ودوس <b>«سماح»</b></p>
          </div>
        )}
        {notifications === 'denied' && (
          <div className="space-y-1.5 rounded-2xl p-3.5 text-right text-xs leading-6" style={{ backgroundColor: dark ? 'rgba(179,59,73,.18)' : '#F9E9EB', color: dark ? '#F5F1F0' : '#272329' }}>
            <p className="font-black" style={{ color: dark ? '#F08089' : '#B33B49' }}>الإشعارات مقفولة — لازم تفتحها عشان توصلك قراءة كل يوم:</p>
            {isIphone() ? (
              <p>الإعدادات ← <b>الإشعارات</b> ← <b>THE APOSTLES</b> ← شغّل <b>«السماح بالإشعارات»</b></p>
            ) : isAndroid() ? (
              <>
                <p>الإعدادات ← <b>التطبيقات</b> ← <b>THE APOSTLES</b> (أو <b>Chrome</b>) ← <b>الإشعارات</b> ← تشغيل</p>
                <p>أو من المتصفح: دوس <b>🔒</b> جنب الرابط ← <b>الأذونات / Permissions</b> ← <b>الإشعارات</b> ← سماح</p>
              </>
            ) : (
              <p>دوس <b>🔒</b> جنب الرابط ← <b>الإشعارات</b> ← سماح</p>
            )}
            <p>وبعدين ارجع هنا — هتتحدث لوحدها.</p>
          </div>
        )}
        {camera === 'denied' && (
          <p className="text-xs leading-6" style={{ color: dark ? '#F08089' : '#B33B49' }}>
            الكاميرا مقفولة: فعّلها بنفس الطريقة من الإعدادات (الكاميرا ← سماح) عشان تقدر تصور بعد القراءة.
          </p>
        )}
        <button
          type="button"
          onClick={() => {
            if (notifications === 'denied') {
              // Re-read after the user changed it in the phone's settings.
              const n = notificationState();
              setNotifications(n);
              if (n === 'granted') void ensurePushSubscription();
              return;
            }
            void (notifications !== 'prompt' && camera !== 'prompt' ? finish() : allow());
          }}
          disabled={busy}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-base font-black shadow-lg disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, #76243A 0%, #5D192D 100%)', color: dark ? '#F3DEAB' : '#FFFFFF' }}
        >
          {busy && <Loader2 className="h-5 w-5 animate-spin" />}
          {notifications === 'denied' ? 'فعّلتها — تحقق تاني' : notifications !== 'prompt' && camera !== 'prompt' ? 'يلا نبدأ' : 'سماح'}
        </button>
      </div>
    </div>,
    document.body,
  );
};
