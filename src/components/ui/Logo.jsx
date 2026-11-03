import React from 'react';

export const Logo = ({ size = 'md', variant = 'light', showTagline = false, className = '' }) => {
  const iconSizes = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-11 h-11 text-base',
    xl: 'w-14 h-14 text-xl',
  };

  const textSizes = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-xl',
    xl: 'text-2xl',
  };

  const isDark = variant === 'dark';

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* Medical Cross + AI Neural Pattern Icon */}
      <div className={`relative flex items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-ai text-white font-bold shadow-md shadow-primary/20 ${iconSizes[size] || iconSizes.md}`}>
        {/* Medical Cross SVG */}
        <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 4v16m-8-8h16" />
        </svg>

        {/* AI Neural Nodes Overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-ai-light rounded-full ring-2 ring-primary/40 animate-pulse" />
          <span className="absolute bottom-1 left-1 w-1 h-1 bg-white rounded-full opacity-80" />
        </div>
      </div>

      <div className="flex flex-col">
        <div className="flex items-center gap-1.5">
          <span className={`font-extrabold tracking-tight ${textSizes[size] || textSizes.md} ${isDark ? 'text-white' : 'text-slate-900'}`}>
            MEDGUARD
          </span>
          <span className="text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded-md bg-gradient-to-r from-primary to-ai text-white uppercase shadow-xs">
            AI
          </span>
        </div>
        {showTagline && (
          <span className={`text-[10px] font-medium leading-none mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Smarter medicine inventory management
          </span>
        )}
      </div>
    </div>
  );
};
