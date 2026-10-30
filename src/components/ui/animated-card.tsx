import React, { memo } from 'react';
import { motion } from 'framer-motion';

export interface AnimatedCardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  whileHover?: Record<string, number | string>;
  whileTap?: Record<string, number | string>;
  initial?: boolean;
  variant?: 'elevated' | 'soft' | 'glass';
}

/**
 * Reusable animated card with hover/tap feedback.
 * Memoized so list items don't re-render when unrelated state changes.
 */
export const AnimatedCard = memo(function AnimatedCard({
  children,
  className = '',
  style,
  whileHover,
  whileTap,
  initial = true,
  variant = 'glass',
}: AnimatedCardProps) {
  const baseStyles: React.CSSProperties = {
    borderRadius: '1.5rem',
    overflow: 'hidden',
    ...style,
  };

  const variantClasses: Record<string, string> = {
    elevated:
      'shadow-lg border border-white/10 dark:border-white/5',
    soft:
      'shadow-md border border-white/20 dark:border-white/10',
    glass:
      'shadow-xl border border-white/20 dark:border-white/5 backdrop-blur-md',
  };

  return (
    <motion.div
      initial={initial ? { opacity: 0, y: 12 } : undefined}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3 }}
      whileHover={whileHover ?? { y: -2 }}
      whileTap={whileTap ?? { scale: 0.98 }}
      className={`rounded-3xl ${variantClasses[variant]} ${className}`}
      style={baseStyles}
    >
      {children}
    </motion.div>
  );
});

AnimatedCard.displayName = 'AnimatedCard';

/**
 * Simple animated section wrapper for page entrances.
 */
export const PageSection = memo(function PageSection({
  children,
  className = '',
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
});

PageSection.displayName = 'PageSection';

/**
 * Confetti/celebration banner with bounce animation.
 */
export const CelebrationBanner = memo(function CelebrationBanner({
  message,
  icon,
  theme,
  color,
}: {
  message: string;
  icon: React.ReactNode;
  theme: 'light' | 'dark';
  color: string;
}) {
  const bg = theme === 'dark' ? 'rgba(32, 53, 42, 0.85)' : '#E9F4EC';
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.3 }}
      className="flex items-center gap-3 rounded-2xl p-4 text-sm font-black shadow-lg"
      style={{ backgroundColor: bg, color }}
      role="status"
    >
      {icon}
      <span>{message}</span>
    </motion.div>
  );
});

CelebrationBanner.displayName = 'CelebrationBanner';

/**
 * No-paste textarea: blocks paste so users must type manually.
 * Useful for verse/reflection inputs where you want authentic input.
 */
export const NoPasteTextarea = memo(function NoPasteTextarea({
  className = '',
  style,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      onPaste={(e) => e.preventDefault()}
      className={className}
      style={style}
    />
  );
});

NoPasteTextarea.displayName = 'NoPasteTextarea';

/**
 * Animated stat badge (streak, points, etc.).
 */
export const AnimatedStat = memo(function AnimatedStat({
  label,
  value,
  icon: Icon,
  theme,
  color,
}: {
  label: string;
  value: number | string;
  icon?: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  theme: 'light' | 'dark';
  color: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.97 }}
      className="flex flex-col items-center gap-1.5 p-3 rounded-2xl border min-w-[90px]"
      style={{
        backgroundColor: theme === 'dark' ? 'rgba(42, 39, 48, 0.5)' : 'rgba(248, 247, 244, 0.7)',
        borderColor: theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
        color,
      }}
    >
      {Icon && <Icon className="w-5 h-5" />}
      <div className="text-lg font-black font-mono">{value}</div>
      <span className="text-[11px] text-[#77717A] dark:text-[#B8B1BB]">{label}</span>
    </motion.div>
  );
});

AnimatedStat.displayName = 'AnimatedStat';
