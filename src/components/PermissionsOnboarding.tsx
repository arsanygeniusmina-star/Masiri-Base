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

const DONE_KEY = 'masiri.permissions-onboarding.v1';

function alreadyDone(): boolean {
  try {
    return window.localStorage.getItem(DONE_KEY) === '1';
  } catch {
    return false;
  }
}

function markDone() {
  try {
    window.localStorage.setItem(DONE_KEY, '1');
  } catch {
    // Storage blocked: the screen may show again next launch, which is harmless.
  }
}

/** Show on the first launch of the installed app (or with ?permissions=1 for testing). */
export function shouldShowPermissionsOnboarding(): boolean {
  if (typeof window === 'undefined') return false;
  const forced = new URLSearchParams(window.location.search).get('permissions') === '1';
  return forced || (isInstalledWebApp() && !alreadyDone());
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
  }, []);

  const finish = () => {
    markDone();
    onDone();
  };

  const allow = async () => {
    setBusy(true);
    // Ask one after the other: browsers show one system prompt at a time.
    const n = notifications === 'granted' ? 'granted' : await requestNotificationPermission();
    setNotifications(n);
    const c = camera === 'granted' ? 'granted' : await requestCameraPermission();
    setCamera(c);
    setBusy(false);
    if (n !== 'prompt' && c !== 'prompt') window.setTimeout(finish, 900);
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

  const anyDenied = notifications === 'denied' || camera === 'denied';

  return createPortal(
    <div className="fixed inset-0 z-[95] flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="permissions-title" dir="rtl">
      <div className="absolute inset-0" style={{ backgroundColor: dark ? 'rgba(10,8,12,.8)' : 'rgba(39,35,41,.55)' }} />
      <div
        className="relative z-10 w-full max-w-md space-y-5 rounded-t-3xl border p-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] text-center shadow-2xl sm:rounded-3xl sm:pb-6"
        style={{ backgroundColor: dark ? 'rgba(32,24,34,.98)' : '#FFFFFF', borderColor: dark ? 'rgba(214,184,120,.35)' : '#E7E2E0' }}
      >
        <button type="button" onClick={finish} className="absolute left-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-xl" style={{ color: dark ? '#B8B1BB' : '#77717A' }} aria-label="لاحقًا">
          <X className="h-5 w-5" />
        </button>
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
        {anyDenied && (
          <p className="text-xs leading-6" style={{ color: dark ? '#F08089' : '#B33B49' }}>
            لو رفضت إذن، تقدر تفعّله بعدين من إعدادات الموبايل ← التطبيقات ← THE APOSTLES.
          </p>
        )}
        <button
          type="button"
          onClick={() => void (notifications !== 'prompt' && camera !== 'prompt' ? finish() : allow())}
          disabled={busy}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-base font-black shadow-lg disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, #76243A 0%, #5D192D 100%)', color: dark ? '#F3DEAB' : '#FFFFFF' }}
        >
          {busy && <Loader2 className="h-5 w-5 animate-spin" />}
          {notifications !== 'prompt' && camera !== 'prompt' ? 'يلا نبدأ' : 'سماح'}
        </button>
      </div>
    </div>,
    document.body,
  );
};
