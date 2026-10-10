import React from 'react';

interface JourneyTransitionProps {
  theme: 'light' | 'dark';
}

/** Compact, accessible confirmation after a successful sign-in or sign-up. */
export const JourneyTransition: React.FC<JourneyTransitionProps> = ({ theme }) => (
  <div
    className={`auth-success-transition ${theme === 'dark' ? 'auth-success-transition--dark' : 'auth-success-transition--light'}`}
    role="status"
    aria-live="polite"
    aria-label="تم تسجيل الدخول بنجاح، مرحباً بك في مسيري"
  >
    <div className="auth-success-transition__backdrop" aria-hidden="true" />
    <div className="auth-success-transition__scene">
      <img
        className="auth-success-transition__image"
        src="/masiri-journey-icon.jpg?v=20261010-2"
        alt="شعار مسيري: الشخص والطريق المؤدي إلى الصليب"
        draggable={false}
      />
      <div className="auth-success-transition__checkmark" aria-hidden="true">
        <svg viewBox="0 0 48 48" fill="none">
          <path className="auth-success-transition__check-path" d="M13 24.5 20.5 32 35 16" />
        </svg>
      </div>
    </div>
    <div className="auth-success-transition__caption">
      <span className="auth-success-transition__caption-title">تم بنجاح</span>
      <span className="auth-success-transition__caption-subtitle">أهلاً بك في مَسِيري</span>
    </div>
  </div>
);
