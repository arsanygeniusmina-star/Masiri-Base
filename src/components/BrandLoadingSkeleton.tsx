import React from 'react';

interface BrandSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  theme?: 'light' | 'dark';
}

export const BrandSpinner: React.FC<BrandSpinnerProps> = ({
  size = 'md',
  className = '',
  theme = 'light',
}) => {
  const sizeMap = {
    sm: 'w-4 h-4 border-2',
    md: 'w-5 h-5 border-[2.5px]',
    lg: 'w-7 h-7 border-3',
  };

  return (
    <div
      className={`brand-spinner shrink-0 ${sizeMap[size]} ${className}`}
      style={{
        borderTopColor: theme === 'dark' ? '#F3DEAB' : '#FFFFFF',
        borderRightColor: theme === 'dark' ? '#C5A15A' : '#F3DEAB',
        borderBottomColor: 'transparent',
        borderLeftColor: theme === 'dark' ? '#76243A' : 'rgba(255, 255, 255, 0.4)',
      }}
      role="status"
      aria-label="جاري التحميل"
    />
  );
};

interface FormLoadingOverlayProps {
  theme: 'light' | 'dark';
  message?: string;
}

export const FormLoadingOverlay: React.FC<FormLoadingOverlayProps> = ({
  theme,
  message = 'جاري التحقق من البيانات وقاعدة البيانات...',
}) => {
  return (
    <div className="absolute inset-0 z-30 rounded-3xl flex flex-col items-center justify-center p-6 backdrop-blur-md bg-white/70 dark:bg-[#1C1822]/80 transition-all animate-in fade-in duration-200">
      <div
        className="relative w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg border mb-4"
        style={{
          borderColor: theme === 'dark' ? 'rgba(214, 184, 120, 0.4)' : 'rgba(118, 36, 58, 0.25)',
          background:
            theme === 'dark'
              ? 'linear-gradient(135deg, rgba(118, 36, 58, 0.4) 0%, rgba(35, 28, 38, 0.9) 100%)'
              : 'linear-gradient(135deg, rgba(243, 231, 235, 0.9) 0%, rgba(255, 255, 255, 0.95) 100%)',
        }}
      >
        {/* Outer pulsating ring */}
        <div
          className="absolute inset-0 rounded-2xl animate-ping opacity-25"
          style={{ backgroundColor: theme === 'dark' ? '#D6B878' : '#76243A' }}
        />
        {/* Dual-color Burgundy & Gold Spinner */}
        <BrandSpinner size="lg" theme={theme} />
      </div>

      <div className="text-center space-y-1.5 max-w-xs">
        <p
          className="text-sm font-bold tracking-tight"
          style={{ color: theme === 'dark' ? '#F5F1F0' : '#272329' }}
        >
          {message}
        </p>
        <p
          className="text-xs"
          style={{ color: theme === 'dark' ? '#D6B878' : '#76243A' }}
        >
          نظام THE APOSTLES للخدمة الكنسية
        </p>
      </div>

      {/* Subtle Skeleton Placeholder bars representing validated records */}
      <div className="w-full max-w-[240px] space-y-2 mt-5">
        <div className="h-2 w-full rounded-full brand-skeleton" />
        <div className="h-2 w-3/4 rounded-full brand-skeleton mx-auto" />
      </div>
    </div>
  );
};
