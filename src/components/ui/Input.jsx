import React from 'react';

export const Input = React.forwardRef(({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  className = '',
  id,
  type = 'text',
  ...props
}, ref) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold text-slate-700">
          {label}
        </label>
      )}

      <div className="relative flex items-center">
        {leftIcon && (
          <div className="absolute left-3.5 pointer-events-none text-slate-400 flex items-center">
            {leftIcon}
          </div>
        )}

        <input
          ref={ref}
          id={inputId}
          type={type}
          className={`w-full bg-slate-50 border rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 transition-colors focus:outline-none focus:bg-white ${
            leftIcon ? 'pl-10' : 'pl-3.5'
          } ${rightIcon ? 'pr-10' : 'pr-3.5'} py-2.5 ${
            error
              ? 'border-rose-300 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
              : 'border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary'
          } ${className}`}
          {...props}
        />

        {rightIcon && (
          <div className="absolute right-3 text-slate-400 flex items-center">
            {rightIcon}
          </div>
        )}
      </div>

      {error ? (
        <p className="text-[11px] text-rose-600 font-medium">{error}</p>
      ) : helperText ? (
        <p className="text-[11px] text-slate-500">{helperText}</p>
      ) : null}
    </div>
  );
});

Input.displayName = 'Input';
