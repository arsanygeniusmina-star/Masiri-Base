import React, { useState } from 'react';
import { X, ShieldCheck, AlertCircle, Chrome } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface GoogleSignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  theme: 'light' | 'dark';
}

export const GoogleSignInModal: React.FC<GoogleSignInModalProps> = ({
  isOpen,
  onClose,
  theme,
}) => {
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMessage('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) {
      setErrorMessage('تعذر بدء تسجيل الدخول عبر Google. تأكد من تفعيل مزود Google في إعدادات Supabase.');
      setIsLoading(false);
    }
    // A successful OAuth request redirects to Google and back; App restores the verified session.
  };

  const gold = theme === 'dark' ? '#D6B878' : '#C5A15A';
  const primaryText = theme === 'dark' ? '#F5F1F0' : '#272329';
  const secondaryText = theme === 'dark' ? '#B8B1BB' : '#77717A';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md" role="presentation">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="google-signin-title"
        className="liquid-glass-card relative w-full max-w-md space-y-5 overflow-hidden rounded-3xl p-6 text-right sm:p-8"
      >
        <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: theme === 'dark' ? 'rgba(214,184,120,.18)' : '#E7E2E0' }}>
          <button type="button" onClick={onClose} aria-label="إغلاق" className="rounded-full p-2 hover:bg-black/5 dark:hover:bg-white/10">
            <X className="h-5 w-5" style={{ color: secondaryText }} />
          </button>
          <h2 id="google-signin-title" className="text-lg font-black" style={{ color: primaryText }}>تسجيل الدخول إلى THE APOSTLES</h2>
        </div>

        <div className="space-y-2 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: theme === 'dark' ? 'rgba(118,36,58,.28)' : '#F3E7EB', color: gold }}>
            <ShieldCheck className="h-7 w-7" />
          </div>
          <p className="text-sm leading-relaxed" style={{ color: secondaryText }}>
            سيتم التحقق من حساب Google عبر Supabase. لا توجد حسابات تجريبية أو صلاحيات تُمنح من المتصفح.
          </p>
        </div>

        {errorMessage && (
          <div role="alert" className="flex items-start gap-2 rounded-xl border p-3 text-xs" style={{ backgroundColor: theme === 'dark' ? 'rgba(61,36,42,.7)' : '#F9E9EB', borderColor: '#B33B49', color: theme === 'dark' ? '#F08089' : '#B33B49' }}>
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <button
          type="button"
          onClick={() => { void handleGoogleSignIn(); }}
          disabled={isLoading}
          className="flex w-full items-center justify-center gap-3 rounded-2xl border px-5 py-3.5 text-sm font-bold transition-opacity disabled:opacity-60"
          style={{ backgroundColor: theme === 'dark' ? '#211F25' : '#FFFFFF', borderColor: theme === 'dark' ? 'rgba(214,184,120,.3)' : '#E7E2E0', color: primaryText }}
        >
          <Chrome className="h-5 w-5" style={{ color: gold }} />
          {isLoading ? 'جارٍ تحويلك إلى Google...' : 'المتابعة باستخدام Google'}
        </button>
      </section>
    </div>
  );
};
