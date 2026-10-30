import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Camera, Check, Loader2, RefreshCw, RotateCcw, SwitchCamera, X } from 'lucide-react';
import { cameraSupported } from '../../lib/devicePermissions';

interface CameraCaptureProps {
  theme: 'light' | 'dark';
  onCapture: (photo: Blob) => void;
  onClose: () => void;
}

const MAX_EDGE = 1600;

/**
 * Full-screen in-app camera. Photos can ONLY be taken live here — there is no
 * way to pick an existing picture from the gallery or files.
 */
export const CameraCapture: React.FC<CameraCaptureProps> = ({ theme, onCapture, onClose }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [shot, setShot] = useState<{ blob: Blob; url: string } | null>(null);
  const dark = theme === 'dark';

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const startStream = useCallback(async () => {
    stopStream();
    setReady(false);
    setError('');
    if (!cameraSupported()) {
      setError('الكاميرا غير متاحة. افتح التطبيق من الرابط الآمن (https) واسمح باستخدام الكاميرا.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facingMode }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
      setReady(true);
    } catch (cameraError) {
      const name = cameraError instanceof DOMException ? cameraError.name : '';
      setError(
        name === 'NotAllowedError'
          ? 'إذن الكاميرا مرفوض. فعّله من إعدادات الموبايل للتطبيق، ثم حاول مرة أخرى.'
          : 'تعذر تشغيل الكاميرا. تأكد إن مفيش تطبيق تاني بيستخدمها وحاول مرة أخرى.',
      );
    }
  }, [facingMode, stopStream]);

  useEffect(() => {
    if (!shot) void startStream();
    return stopStream;
  }, [startStream, stopStream, shot]);

  useEffect(() => () => {
    if (shot) URL.revokeObjectURL(shot.url);
  }, [shot]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const takePhoto = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const scale = Math.min(1, MAX_EDGE / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const context = canvas.getContext('2d');
    if (!context) return;
    if (facingMode === 'user') {
      context.translate(canvas.width, 0);
      context.scale(-1, 1);
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) return;
      stopStream();
      setShot({ blob, url: URL.createObjectURL(blob) });
    }, 'image/jpeg', 0.85);
  };

  const retake = () => {
    if (shot) URL.revokeObjectURL(shot.url);
    setShot(null);
  };

  const accept = () => {
    if (!shot) return;
    onCapture(shot.blob);
  };

  const roundButton = 'inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-md transition-transform active:scale-90';

  return createPortal(
    <div className="fixed inset-0 z-[90] flex flex-col bg-black" role="dialog" aria-modal="true" aria-label="الكاميرا" dir="rtl">
      {/* Top bar */}
      <div className="flex items-center justify-between p-4 pt-[calc(env(safe-area-inset-top)+1rem)]">
        <button type="button" onClick={onClose} className={roundButton} aria-label="إغلاق الكاميرا">
          <X className="h-6 w-6" />
        </button>
        <p className="text-sm font-bold text-white/90">صورة بعد القراءة</p>
        {!shot && !error ? (
          <button
            type="button"
            onClick={() => setFacingMode((mode) => (mode === 'environment' ? 'user' : 'environment'))}
            className={roundButton}
            aria-label="تبديل الكاميرا"
          >
            <SwitchCamera className="h-6 w-6" />
          </button>
        ) : (
          <span className="h-12 w-12" />
        )}
      </div>

      {/* Viewfinder / preview */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden">
        {shot ? (
          <img src={shot.url} alt="الصورة الملتقطة" className="max-h-full max-w-full object-contain" />
        ) : (
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className="h-full w-full object-cover"
            style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : undefined }}
          />
        )}
        {!shot && !ready && !error && <Loader2 className="absolute h-10 w-10 animate-spin text-white/80" />}
        {error && (
          <div className="absolute inset-x-6 space-y-4 rounded-3xl p-6 text-center" style={{ backgroundColor: dark ? 'rgba(32,24,34,.95)' : 'rgba(255,255,255,.96)' }} role="alert">
            <Camera className="mx-auto h-10 w-10" style={{ color: '#C5A15A' }} />
            <p className="text-sm font-bold leading-7" style={{ color: dark ? '#F5F1F0' : '#272329' }}>{error}</p>
            <button type="button" onClick={() => void startStream()} className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black text-white" style={{ background: '#76243A' }}>
              <RefreshCw className="h-4 w-4" /> حاول مرة أخرى
            </button>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-10 p-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
        {shot ? (
          <>
            <button type="button" onClick={retake} className="inline-flex items-center gap-2 rounded-2xl bg-white/15 px-5 py-3 text-sm font-black text-white">
              <RotateCcw className="h-5 w-5" /> إعادة
            </button>
            <button type="button" onClick={accept} className="inline-flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-black" style={{ background: '#F3DEAB', color: '#5D192D' }}>
              <Check className="h-5 w-5" /> استخدم الصورة
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={takePhoto}
            disabled={!ready}
            aria-label="التقاط الصورة"
            className="h-20 w-20 rounded-full border-4 border-white bg-white/30 transition-transform active:scale-90 disabled:opacity-40"
          />
        )}
      </div>
    </div>,
    document.body,
  );
};
