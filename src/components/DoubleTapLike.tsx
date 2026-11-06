import React, { useEffect, useRef, useState } from 'react';
import { Heart } from 'lucide-react';

/**
 * Wraps a photo: tapping it twice quickly likes it (like Instagram) and shows a
 * big heart. A single tap does nothing. Never unlikes.
 */
export const DoubleTapLike: React.FC<{
  onLike: () => void;
  className?: string;
  children: React.ReactNode;
}> = ({ onLike, className = '', children }) => {
  const lastTap = useRef(0);
  const [burst, setBurst] = useState(0); // changes on every like → replays the heart
  const [phase, setPhase] = useState<'hidden' | 'in' | 'out'>('hidden');

  useEffect(() => {
    if (!burst) return;
    setPhase('in');
    const out = window.setTimeout(() => setPhase('out'), 450);
    const hide = window.setTimeout(() => setPhase('hidden'), 900);
    return () => {
      window.clearTimeout(out);
      window.clearTimeout(hide);
    };
  }, [burst]);

  const handleTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 320) {
      lastTap.current = 0;
      setBurst((count) => count + 1);
      if (navigator.vibrate) {
        try {
          navigator.vibrate(15);
        } catch {
          /* not supported */
        }
      }
      onLike();
    } else {
      lastTap.current = now;
    }
  };

  return (
    <div className={`relative select-none ${className}`} onClick={handleTap} style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}>
      {children}
      {phase !== 'hidden' && (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
          <Heart
            className="h-1/3 w-1/3 drop-shadow-lg"
            style={{
              color: '#FFFFFF',
              fill: '#E0245E',
              transform: phase === 'in' ? 'scale(1)' : 'scale(1.15)',
              opacity: phase === 'in' ? 0.95 : 0,
              transition: 'transform 0.35s cubic-bezier(0.2, 1.6, 0.4, 1), opacity 0.4s ease',
            }}
          />
        </span>
      )}
    </div>
  );
};
