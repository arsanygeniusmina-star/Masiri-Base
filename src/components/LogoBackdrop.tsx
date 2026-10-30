import React from 'react';

/**
 * Full-page backdrop made from the app logo (blurred so the small 256px image
 * reads as warm atmosphere rather than a pixelated picture). Used on the
 * whole app (App.tsx). Rendered fixed behind the page content.
 */
export const LogoBackdrop: React.FC<{ theme: 'light' | 'dark' }> = ({ theme }) => (
  <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
    <div
      className="absolute -inset-10 bg-cover bg-[center_38%]"
      style={{
        backgroundImage: "url('/masiri-journey-icon.jpg?v=20261010-2')",
        filter: theme === 'dark' ? 'blur(8px) brightness(1) saturate(1.2)' : 'blur(10px) brightness(1.15) saturate(1)',
        transform: 'scale(1.05)',
      }}
    />
    <div
      className="absolute inset-0"
      style={{
        background:
          theme === 'dark'
            ? 'linear-gradient(180deg, rgba(20,17,23,0) 0%, rgba(20,17,23,0.15) 60%, rgba(20,17,23,0.55) 100%)'
            : 'radial-gradient(ellipse at center, rgba(250,248,245,0.35) 0%, rgba(250,248,245,0.7) 70%, rgba(250,248,245,0.85) 100%)',
      }}
    />
  </div>
);
