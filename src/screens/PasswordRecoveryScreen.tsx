import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

interface PasswordRecoveryScreenProps {
  theme: 'light' | 'dark';
  onComplete: () => void;
}

export const PasswordRecoveryScreen: React.FC<PasswordRecoveryScreenProps> = ({ theme, onComplete }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage('');
    if (password.length < 8) {
      setIsError(true);
      setMessage('يجب أن تتكون كلمة المرور من 8 أحرف على الأقل.');
      return;
    }
    if (password !== confirmPassword) {
      setIsError(true);
      setMessage('كلمتا المرور غير متطابقتين.');
      return;
    }
    setIsSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setIsSaving(false);
    if (error) {
      setIsError(true);
      setMessage('انتهت صلاحية رابط الاستعادة أو تعذر حفظ كلمة المرور. اطلب رابطاً جديداً.');
      return;
    }
    setIsError(false);
    setMessage('تم تحديث كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة.');
    await supabase.auth.signOut();
    window.setTimeout(onComplete, 900);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-10">
      <form onSubmit={submit} className="w-full max-w-md rounded-3xl border p-7 sm:p-9 space-y-5 text-right liquid-glass-card">
        <div className="text-center space-y-2">
          <img src="/logo.jpg" alt="شعار THE APOSTLES" className="w-16 h-16 mx-auto rounded-2xl object-cover" />
          <h1 className="text-2xl font-extrabold" style={{ color: theme === 'dark' ? '#F5F1F0' : '#272329' }}>تعيين كلمة مرور جديدة</h1>
          <p className="text-sm" style={{ color: theme === 'dark' ? '#B8B1BB' : '#77717A' }}>اختر كلمة مرور جديدة لحسابك في THE APOSTLES.</p>
        </div>
        <label className="block space-y-2 text-xs font-bold">
          <span>كلمة المرور الجديدة</span>
          <input type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-2xl border px-4 py-3 text-sm liquid-glass-input" dir="ltr" />
        </label>
        <label className="block space-y-2 text-xs font-bold">
          <span>تأكيد كلمة المرور</span>
          <input type="password" autoComplete="new-password" required minLength={8} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="w-full rounded-2xl border px-4 py-3 text-sm liquid-glass-input" dir="ltr" />
        </label>
        {message && <p role="status" className="rounded-xl border p-3 text-xs leading-relaxed" style={{ backgroundColor: isError ? (theme === 'dark' ? 'rgba(61,36,42,.75)' : '#F9E9EB') : (theme === 'dark' ? 'rgba(32,53,42,.8)' : '#E9F4EC'), color: isError ? (theme === 'dark' ? '#F08089' : '#B33B49') : (theme === 'dark' ? '#75C695' : '#347653') }}>{message}</p>}
        <button type="submit" disabled={isSaving} className="w-full rounded-2xl px-5 py-3.5 text-sm font-bold disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #76243A 0%, #5D192D 100%)', color: '#FFFFFF' }}>
          {isSaving ? 'جاري حفظ كلمة المرور...' : 'حفظ كلمة المرور الجديدة'}
        </button>
      </form>
    </div>
  );
};
