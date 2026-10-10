import React from 'react';

interface JourneyTransitionProps {
  theme: 'light' | 'dark';
}

export const JourneyTransition: React.FC<JourneyTransitionProps> = ({ theme }) => (
  <div
    className={`journey-transition ${theme === 'dark' ? 'journey-transition--dark' : 'journey-transition--light'}`}
    role="status"
    aria-live="polite"
    aria-label="جاري بدء رحلتك في مسيري"
  >
    <img
      className="journey-transition__scene"
      src="/masiri-journey-icon.jpg?v=20261010-2"
      alt=""
      draggable={false}
    />

    <div className="journey-transition__vignette" aria-hidden="true" />
    <div className="journey-transition__cross-glow" aria-hidden="true" />
    <div className="journey-transition__light" aria-hidden="true" />

    <div className="journey-transition__walker" aria-hidden="true">
      <span className="journey-walker__head" />
      <span className="journey-walker__neck" />
      <span className="journey-walker__body" />
      <span className="journey-walker__backpack" />
      <span className="journey-walker__arm journey-walker__arm--left" />
      <span className="journey-walker__arm journey-walker__arm--right" />
      <span className="journey-walker__leg journey-walker__leg--left" />
      <span className="journey-walker__leg journey-walker__leg--right" />
      <span className="journey-walker__foot journey-walker__foot--left" />
      <span className="journey-walker__foot journey-walker__foot--right" />
    </div>

    <div className="journey-transition__caption">
      <span className="journey-transition__caption-title">مَسِيري</span>
      <span className="journey-transition__caption-subtitle">تابع رحلتك نحو النور</span>
    </div>

    <div className="journey-transition__flare" aria-hidden="true" />
  </div>
);
