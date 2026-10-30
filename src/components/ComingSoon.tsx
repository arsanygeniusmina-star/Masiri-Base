import React from 'react';

/**
 * Placeholder for pages that are not open yet: only the app background,
 * blurred, with "COMING SOON" on top. The real page is not rendered at all.
 */
export const ComingSoon: React.FC<{ theme: 'light' | 'dark' }> = ({ theme }) => {
  const dark = theme === 'dark';
  return (
    <section
      className="relative flex min-h-[calc(100vh-9rem)] items-center justify-center overflow-hidden"
      aria-label="قريبًا"
    >
      <div
        className="absolute inset-0"
        style={{
          backdropFilter: 'blur(18px) saturate(1.1)',
          WebkitBackdropFilter: 'blur(18px) saturate(1.1)',
          backgroundColor: dark ? 'rgba(20,17,23,0.25)' : 'rgba(250,248,245,0.25)',
        }}
      />
      <div className="relative z-10 space-y-3 px-6 text-center">
        <p
          dir="ltr"
          lang="en"
          className="text-4xl uppercase sm:text-6xl"
          style={{
            color: dark ? '#F3DEAB' : '#76243A',
            fontFamily: "'Cinzel', 'Times New Roman', serif",
            fontWeight: 900,
            letterSpacing: '0.12em',
            textShadow: dark ? '0 2px 18px rgba(0,0,0,.55)' : '0 2px 18px rgba(255,255,255,.8)',
          }}
        >
          Coming Soon
        </p>
        <p className="text-lg font-black" style={{ color: dark ? '#F5F1F0' : '#5D192D' }}>
          قريبًا
        </p>
      </div>
    </section>
  );
};
