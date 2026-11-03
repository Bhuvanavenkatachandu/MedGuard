import React from 'react';

export const Card = ({
  children,
  className = '',
  hoverEffect = false,
  bordered = true,
  padding = 'md',
  ...props
}) => {
  const paddingClasses = {
    none: 'p-0',
    sm: 'p-3 sm:p-4',
    md: 'p-5 sm:p-6',
    lg: 'p-6 sm:p-8',
  };

  const hoverClass = hoverEffect
    ? 'transition-all duration-200 hover:-translate-y-1 hover:shadow-card-hover hover:border-slate-300'
    : '';

  const borderClass = bordered ? 'border border-slate-200/90' : '';

  return (
    <div
      className={`bg-white rounded-2xl shadow-card ${borderClass} ${paddingClasses[padding] || paddingClasses.md} ${hoverClass} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader = ({ title, subtitle, action, className = '' }) => (
  <div className={`flex items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 ${className}`}>
    <div>
      {title && <h3 className="text-base font-bold text-slate-900 tracking-tight">{title}</h3>}
      {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
    </div>
    {action && <div className="flex-shrink-0">{action}</div>}
  </div>
);
