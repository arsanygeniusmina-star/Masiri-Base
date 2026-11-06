import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Sparkles, RefreshCw } from 'lucide-react';
import { readingPalette, primaryButtonStyle, secondaryButtonStyle } from '../components/readings/readingTheme';

/** Only this account sees the wheel (menu item + page). */
export const SPIN_WHEEL_OWNER = 'andrewelkessmousa@gmail.com';
export const canUseSpinWheel = (email?: string | null) => (email ?? '').trim().toLowerCase() === SPIN_WHEEL_OWNER;

/** Students with a Streak of 3+ days (6 Nov 2026). Editable on the page. */
const DEFAULT_NAMES = [
  'Karas ashraf makram',
  'Bavly Ayman',
  'Daniel Rafek',
  'Karas rafat wadea',
  'Karas_Yasser',
  'Karl mina',
  'Marco Mina',
  'Mark Emad Azmy',
  'MARK MAGDY',
  'Pavly amgad',
  'Tony ayman Mahrous',
  'يوسف. القس موسي',
];

const STORAGE_KEY = 'apostles-spin-wheel-names';
const COLORS = ['#76243A', '#C5A15A', '#3E5C76', '#5D192D', '#A9803B', '#2F4858', '#8E3B52', '#B8925A'];
const SPIN_MS = 6000;

function loadNames(): string[] {
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (Array.isArray(saved) && saved.every((name) => typeof name === 'string') && saved.length > 0) return saved;
  } catch {
    /* storage unavailable */
  }
  return DEFAULT_NAMES;
}

function saveNames(names: string[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(names));
  } catch {
    /* storage unavailable */
  }
}

/** Fair random integer in [0, max). */
function randomInt(max: number) {
  const buffer = new Uint32Array(1);
  const limit = Math.floor(0x100000000 / max) * max;
  do {
    window.crypto.getRandomValues(buffer);
  } while (buffer[0] >= limit);
  return buffer[0] % max;
}

const shorten = (name: string, count: number) => {
  const max = count > 16 ? 12 : count > 14 ? 16 : 20;
  return name.length > max ? `${name.slice(0, max - 1)}…` : name;
};

interface SpinWheelScreenProps {
  theme: 'light' | 'dark';
}

export const SpinWheelScreen: React.FC<SpinWheelScreenProps> = ({ theme }) => {
  const p = readingPalette(theme);
  const [names, setNames] = useState<string[]>(loadNames);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [removeWinner, setRemoveWinner] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const timer = useRef<number | null>(null);

  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
  }, []);

  const count = names.length;
  const segment = count > 0 ? 360 / count : 0;

  const segments = useMemo(() => {
    const radius = 160;
    return names.map((name, index) => {
      const start = index * segment;
      const end = start + segment;
      const toPoint = (deg: number) => {
        const rad = ((deg - 90) * Math.PI) / 180;
        return [radius + radius * Math.cos(rad), radius + radius * Math.sin(rad)];
      };
      const [x1, y1] = toPoint(start);
      const [x2, y2] = toPoint(end);
      const large = segment > 180 ? 1 : 0;
      const path = count === 1
        ? `M ${radius} 0 A ${radius} ${radius} 0 1 1 ${radius - 0.01} 0 Z`
        : `M ${radius} ${radius} L ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2} Z`;
      const middle = start + segment / 2;
      // Two neighbours never share a colour (also when the last meets the first).
      let color = COLORS[index % COLORS.length];
      if (index === count - 1 && count > 1 && color === COLORS[0]) color = COLORS[2];
      return { name, path, middle, color };
    });
  }, [names, segment, count]);

  const spin = () => {
    if (spinning || count < 2) return;
    setWinner(null);
    const winnerIndex = randomInt(count);
    // Land somewhere inside the winner's slice (not on its edge).
    const inside = segment * (0.15 + (randomInt(1000) / 1000) * 0.7);
    const target = winnerIndex * segment + inside; // angle of the pointer on the wheel
    const current = ((rotation % 360) + 360) % 360;
    const needed = (360 - target - current + 720) % 360;
    const turns = 6 + randomInt(3);
    setRotation(rotation + turns * 360 + needed);
    setSpinning(true);
    timer.current = window.setTimeout(() => {
      const picked = names[winnerIndex];
      setWinner(picked);
      setSpinning(false);
      if (removeWinner) {
        const remaining = names.filter((_, index) => index !== winnerIndex);
        // Wait so the winner is seen on the wheel before it disappears.
        timer.current = window.setTimeout(() => {
          setNames(remaining);
          saveNames(remaining);
          setRotation(0);
        }, 2500);
      }
    }, SPIN_MS + 100);
  };

  const startEditing = () => {
    setDraft(names.join('\n'));
    setEditing(true);
  };

  const saveEditing = () => {
    const next = draft.split('\n').map((line) => line.trim()).filter(Boolean);
    setNames(next);
    saveNames(next);
    setEditing(false);
    setWinner(null);
    setRotation(0);
  };

  const resetNames = () => {
    setNames(DEFAULT_NAMES);
    saveNames(DEFAULT_NAMES);
    setDraft(DEFAULT_NAMES.join('\n'));
    setWinner(null);
    setRotation(0);
  };

  const fontSize = count > 16 ? 9 : count > 10 ? 11 : 13;

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-6 sm:px-6 lg:px-8" dir="rtl">
      <div className="liquid-glass-card relative flex items-center gap-3 overflow-hidden rounded-3xl p-6">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: p.soft, color: p.accentText, border: `1px solid ${p.softBorder}` }}>
          <Sparkles className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-2xl font-black sm:text-3xl" style={{ color: p.text }}>عجلة الحظ</h1>
          <p className="text-sm" style={{ color: p.muted }}>{count} اسم على العجلة</p>
        </div>
      </div>

      <div className="liquid-glass-card flex flex-col items-center gap-5 rounded-3xl p-5 sm:p-7">
        <div className="relative w-full max-w-[380px]">
          {/* Pointer */}
          <div
            className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1"
            style={{ width: 0, height: 0, borderLeft: '16px solid transparent', borderRight: '16px solid transparent', borderTop: `30px solid ${p.accent}`, filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.35))' }}
            aria-hidden="true"
          />
          <svg
            viewBox="-6 -6 332 332"
            className="w-full"
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: spinning ? `transform ${SPIN_MS}ms cubic-bezier(0.12, 0.6, 0.08, 1)` : 'none',
            }}
            role="img"
            aria-label="عجلة الأسماء"
          >
            <circle cx="160" cy="160" r="164" fill={p.accent} />
            {segments.map((s, index) => (
              <g key={`${s.name}-${index}`}>
                <path d={s.path} fill={s.color} stroke="#FFFFFF" strokeOpacity={0.5} strokeWidth={1} />
                <text
                  x="160"
                  y="160"
                  transform={`rotate(${s.middle - 90} 160 160) translate(${count === 1 ? 0 : 92} 0)`}
                  fill="#FFFFFF"
                  fontSize={fontSize}
                  fontWeight={800}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  style={{ direction: 'ltr', unicodeBidi: 'plaintext' }}
                >
                  {shorten(s.name, count)}
                </text>
              </g>
            ))}
            <circle cx="160" cy="160" r="22" fill={p.surface} stroke={p.accent} strokeWidth={4} />
          </svg>
        </div>

        <button
          type="button"
          onClick={spin}
          disabled={spinning || count < 2}
          className="min-h-12 w-full max-w-xs rounded-2xl px-6 text-lg font-black disabled:opacity-60"
          style={primaryButtonStyle(p)}
        >
          {spinning ? 'بتلف…' : 'لف العجلة'}
        </button>

        <div className="min-h-[72px] text-center" aria-live="polite">
          {winner && (
            <div className="rounded-2xl px-5 py-3" style={{ backgroundColor: p.goldSoft, border: `1px solid ${p.softBorder}` }}>
              <p className="text-xs font-bold" style={{ color: p.muted }}>الفائز 🎉</p>
              <p className="text-2xl font-black" style={{ color: p.accentText }}>{winner}</p>
            </div>
          )}
          {count < 2 && <p className="text-sm" style={{ color: p.muted }}>محتاج اسمين على الأقل.</p>}
        </div>

        <label className="flex items-center gap-2 text-sm font-semibold" style={{ color: p.text }}>
          <input type="checkbox" checked={removeWinner} onChange={(event: React.ChangeEvent<HTMLInputElement>) => setRemoveWinner(event.target.checked)} disabled={spinning} />
          شيل الفائز من العجلة بعد ما يكسب
        </label>
      </div>

      <div className="liquid-glass-card space-y-3 rounded-3xl p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-black" style={{ color: p.text }}>الأسماء</h2>
          <div className="flex gap-2">
            <button type="button" onClick={resetNames} disabled={spinning} className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-bold disabled:opacity-50" style={secondaryButtonStyle(p)}>
              <RefreshCw className="h-4 w-4" />
              الأسماء الأصلية
            </button>
            {!editing && (
              <button type="button" onClick={startEditing} disabled={spinning} className="rounded-xl px-3 py-2 text-sm font-bold disabled:opacity-50" style={secondaryButtonStyle(p)}>
                تعديل
              </button>
            )}
          </div>
        </div>
        {editing ? (
          <>
            <textarea
              value={draft}
              onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => setDraft(event.target.value)}
              rows={Math.min(16, Math.max(6, draft.split('\n').length + 1))}
              className="liquid-glass-input w-full rounded-2xl px-3 py-3 text-sm leading-7 outline-none"
              placeholder="اسم في كل سطر"
              dir="auto"
            />
            <div className="flex gap-2">
              <button type="button" onClick={saveEditing} className="rounded-xl px-4 py-2 text-sm font-black" style={primaryButtonStyle(p)}>حفظ</button>
              <button type="button" onClick={() => setEditing(false)} className="rounded-xl px-4 py-2 text-sm font-bold" style={secondaryButtonStyle(p)}>إلغاء</button>
            </div>
          </>
        ) : (
          <ol className="grid gap-1 text-sm sm:grid-cols-2" style={{ color: p.text }}>
            {names.map((name, index) => (
              <li key={`${name}-${index}`} className="truncate" dir="auto">{index + 1}. {name}</li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
};
