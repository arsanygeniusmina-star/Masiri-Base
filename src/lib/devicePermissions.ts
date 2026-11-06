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

const CAMERA_OK_KEY = 'masiri.camera-ok.v1';

/** Remembers on this phone that the camera worked (some browsers can't report it). */
export function rememberCameraWorks() {
  try {
    window.localStorage.setItem(CAMERA_OK_KEY, '1');
  } catch {
    // Storage blocked: harmless.
  }
}

function cameraKnownToWork(): boolean {
  try {
    return window.localStorage.getItem(CAMERA_OK_KEY) === '1';
  } catch {
    return false;
  }
}

export async function cameraState(): Promise<PermissionResult> {
  if (!cameraSupported()) return 'unsupported';
  try {
    const status = await navigator.permissions.query({ name: 'camera' as PermissionName });
    if (status.state === 'granted') rememberCameraWorks();
    return status.state === 'prompt' && cameraKnownToWork() ? 'granted' : (status.state as PermissionResult);
  } catch {
    // Permissions API not available for camera (e.g. some iOS versions).
    return cameraKnownToWork() ? 'granted' : 'prompt';
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
    rememberCameraWorks();
    return 'granted';
  } catch (error) {
    const name = error instanceof DOMException ? error.name : '';
    return name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'unsupported';
  }
}
