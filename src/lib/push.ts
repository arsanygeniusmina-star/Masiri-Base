import { supabase } from './supabase';

/** Converts the base64url VAPID public key into the bytes PushManager expects. */
function keyBytes(base64: string): Uint8Array {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(padded);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

async function readyRegistration(timeoutMs = 6000): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<null>((resolve) => window.setTimeout(() => resolve(null), timeoutMs)),
  ]).catch(() => null);
}

/**
 * Registers this phone/browser for push notifications (daily chapter, flagged
 * answers for head servants). Needs: signed in, notifications allowed, and the
 * installed/HTTPS app (service worker). Safe to call often.
 */
export async function ensurePushSubscription(): Promise<'ok' | 'unsupported' | 'not-allowed' | 'error'> {
  try {
    if (typeof window === 'undefined' || !('PushManager' in window) || typeof Notification === 'undefined') return 'unsupported';
    if (Notification.permission !== 'granted') return 'not-allowed';
    const registration = await readyRegistration();
    if (!registration) return 'unsupported';

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      const { data, error } = await supabase.functions.invoke('send-push', { body: { type: 'public-key' } });
      if (error || !data?.publicKey) return 'error';
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: keyBytes(String(data.publicKey)) as BufferSource,
      });
    }
    const keys = subscription.toJSON().keys ?? {};
    if (!keys.p256dh || !keys.auth) return 'error';
    const { error } = await supabase.rpc('save_push_subscription', {
      p_endpoint: subscription.endpoint,
      p_p256dh: keys.p256dh,
      p_auth: keys.auth,
      p_user_agent: navigator.userAgent,
    });
    return error ? 'error' : 'ok';
  } catch {
    return 'error';
  }
}
