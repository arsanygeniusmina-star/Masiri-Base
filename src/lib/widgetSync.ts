/**
 * Widget Sync — Periodic Background Sync for widget data.
 * 
 * Registers a periodic background sync event that refreshes widget data
 * once per day (Chrome/Edge support). Falls back gracefully on browsers
 * that don't support Periodic Background Sync API.
 * 
 * UI/UX Pro Max Guidelines:
 * - Priority 3 Performance: Minimal background work, respects battery/data
 * - Priority 7 Animation: Subtle, context-aware timing
 */

const SYNC_TAG = 'widget-sync';
const MIN_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Register periodic background sync for widget data refresh.
 * Call after successful login/authentication.
 */
export async function registerWidgetSync(): Promise<void> {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const reg = registration as RegistrationWithPeriodicSync;

    if ('periodicSync' in reg) {
      await reg.periodicSync.register(SYNC_TAG, {
        minInterval: MIN_INTERVAL_MS,
      });
    }
  } catch (err) {
    // Periodic sync not supported or permission denied — silent fallback
    console.debug('Widget periodic sync not available:', err);
  }
}

/**
 * Unregister periodic background sync (e.g., on logout).
 */
export async function unregisterWidgetSync(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.ready;
    const reg = registration as RegistrationWithPeriodicSync;
    if ('periodicSync' in reg) {
      await reg.periodicSync.unregister(SYNC_TAG);
    }
  } catch (err) {
    console.debug('Widget periodic sync unregister failed:', err);
  }
}

/**
 * Check if periodic background sync is supported.
 */
export function isPeriodicSyncSupported(): boolean {
  return 'serviceWorker' in navigator && 'periodicSync' in ServiceWorkerRegistration.prototype;
}

interface RegistrationWithPeriodicSync extends ServiceWorkerRegistration {
  periodicSync: {
    register(tag: string, options: { minInterval: number }): Promise<void>;
    unregister(tag: string): Promise<boolean>;
    getTags(): Promise<string[]>;
    state: 'registered' | 'active';
  };
}
