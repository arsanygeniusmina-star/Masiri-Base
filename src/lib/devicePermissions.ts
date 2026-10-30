/**
 * Device permissions used by the app: notifications (daily reminder) and the
 * camera (photo proof for the Streak — camera only, no gallery uploads).
 */

export type PermissionResult = 'granted' | 'denied' | 'prompt' | 'unsupported';

/** True when running as an installed web app (added to the home screen). */
export function isInstalledWebApp(): boolean {
  try {
    const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
    return iosStandalone || window.matchMedia('(display-mode: standalone)').matches || window.matchMedia('(display-mode: fullscreen)').matches;
  } catch {
    return false;
  }
}

export function cameraSupported(): boolean {
  return typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia) && window.isSecureContext;
}

export function notificationState(): PermissionResult {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission === 'default' ? 'prompt' : (Notification.permission as PermissionResult);
}

export async function cameraState(): Promise<PermissionResult> {
  if (!cameraSupported()) return 'unsupported';
  try {
    const status = await navigator.permissions.query({ name: 'camera' as PermissionName });
    return status.state as PermissionResult;
  } catch {
    return 'prompt'; // Permissions API not available for camera (e.g. some iOS versions).
  }
}

/** Must run from a tap. */
export async function requestNotificationPermission(): Promise<PermissionResult> {
  if (notificationState() === 'unsupported') return 'unsupported';
  try {
    const result = await Notification.requestPermission();
    return result === 'default' ? 'prompt' : (result as PermissionResult);
  } catch {
    return notificationState();
  }
}

/** Opens and immediately closes the camera so the browser asks for permission once. */
export async function requestCameraPermission(): Promise<PermissionResult> {
  if (!cameraSupported()) return 'unsupported';
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
    stream.getTracks().forEach((track) => track.stop());
    return 'granted';
  } catch (error) {
    const name = error instanceof DOMException ? error.name : '';
    return name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'unsupported';
  }
}
