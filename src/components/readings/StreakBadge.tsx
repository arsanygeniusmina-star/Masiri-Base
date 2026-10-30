import React from 'react';

interface StreakBadgeProps {
  value: number;
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  className?: string;
  /** true once today's chapter is read (colourful 🔥); false shows a dark grey 🔥. */
  active?: boolean;
}

const SIZES = { sm: 'text-xs gap-0.5', md: 'text-sm gap-1', lg: 'text-2xl gap-1.5' } as const;

/** Streak shown everywhere as an English number followed by 🔥 (e.g. "500 🔥"). */
export const StreakBadge: React.FC<StreakBadgeProps> = ({ value, size = 'md', color, className = '', active = true }) => (
  <span
    dir="ltr"
    className={`inline-flex items-center font-black tabular-nums leading-none ${SIZES[size]} ${className}`}
    style={color ? { color } : undefined}
    aria-label={`سلسلة القراءة: ${value}${active ? '' : ' — لم تُقرأ اليوم بعد'}`}
    title={`سلسلة القراءة: ${value}${active ? '' : ' — لم تُقرأ اليوم بعد'}`}
  >
    <span>{Math.max(0, Math.floor(value)).toLocaleString('en-US')}</span>
    <span
      aria-hidden="true"
      style={{
        filter: active ? 'none' : 'grayscale(1) brightness(0.45) contrast(1.1)',
        transition: 'filter 0.6s ease',
      }}
    >
      🔥
    </span>
  </span>
);
