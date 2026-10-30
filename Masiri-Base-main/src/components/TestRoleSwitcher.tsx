import React from 'react';
import { Code2, GraduationCap, ShieldCheck, Sparkles } from 'lucide-react';
import type { UserRole } from '../types';

interface TestRoleSwitcherProps {
  activeRole: UserRole | null;
  onSelect: (role: UserRole | null) => void;
  theme: 'light' | 'dark';
}

const options: { role: UserRole | null; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { role: null, label: 'TEST / التشخيص', icon: Code2 },
  { role: 'student', label: 'تجربة الطالب', icon: GraduationCap },
  { role: 'teacher', label: 'تجربة الخادم', icon: Sparkles },
  { role: 'head', label: 'تجربة أمين الخدمة', icon: ShieldCheck },
];

export const TestRoleSwitcher: React.FC<TestRoleSwitcherProps> = ({ activeRole, onSelect, theme }) => {
  const dark = theme === 'dark';
  const border = dark ? 'rgba(214,184,120,.26)' : '#E7E2E0';
  const primary = dark ? '#F5F1F0' : '#272329';
  const selected = dark ? '#F3DEAB' : '#76243A';

  return (
    <section className="relative z-30 border-b px-4 py-3 sm:px-6" style={{
      borderColor: border,
      background: dark ? 'rgba(29,23,31,.94)' : 'rgba(255,255,255,.94)',
      backdropFilter: 'blur(24px)',
    }}>
      <div className="mx-auto flex max-w-[1440px] flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Code2 className="h-4 w-4 shrink-0" style={{ color: selected }} />
            <p className="text-xs font-black" style={{ color: primary }}>وضع التجربة</p>
            <span className="rounded-full border px-2 py-0.5 text-[10px] font-black" style={{ borderColor: border, color: selected }}>TEST</span>
          </div>
          <p className="mt-1 text-[11px] leading-5" style={{ color: dark ? '#B8B1BB' : '#77717A' }}>
            جرّب شكل التطبيق كطالب أو خادم أو أمين خدمة. أي تعديل هنا تجريبي ومحلي، ومش هيغيّر أي حساب أو بيانات حقيقية.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {options.map((option) => {
            const Icon = option.icon;
            const active = activeRole === option.role;
            return (
              <button key={option.label} type="button" onClick={() => onSelect(option.role)}
                aria-pressed={active}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-black transition-all"
                style={{
                  borderColor: active ? (dark ? '#D6B878' : '#76243A') : border,
                  color: active ? selected : primary,
                  background: active ? (dark ? 'rgba(118,36,58,.34)' : '#F3E7EB') : (dark ? 'rgba(38,32,44,.72)' : '#FFFFFF'),
                  boxShadow: active ? (dark ? '0 0 0 1px rgba(214,184,120,.14)' : '0 4px 16px rgba(118,36,58,.08)') : 'none',
                }}>
                <Icon className="h-4 w-4" />
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};
