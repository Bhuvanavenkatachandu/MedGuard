import React from 'react';
import { Loader2 } from 'lucide-react';

export const Button = React.forwardRef(({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  className = '',
  type = 'button',
  onClick,
  ...props
}, ref) => {
  const baseClasses = "inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 cursor-pointer";

  const sizeClasses = {
    xs: 'text-xs px-2.5 py-1.5 gap-1.5',
    sm: 'text-xs px-3.5 py-2 gap-1.5',
    md: 'text-sm px-4 py-2.5 gap-2',
    lg: 'text-base px-6 py-3 gap-2.5',
  };

  const variantClasses = {
    primary: 'bg-primary hover:bg-primary-dark text-white shadow-sm shadow-primary/25 hover:shadow-md hover:shadow-primary/30 focus-visible:ring-primary',
    secondary: 'bg-slate-900 hover:bg-slate-800 text-white shadow-sm focus-visible:ring-slate-900',
    outline: 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-300 shadow-xs focus-visible:ring-slate-400',
    ai: 'bg-gradient-to-r from-primary to-ai hover:from-primary-dark hover:to-ai-teal text-white shadow-sm shadow-primary/20 hover:shadow-glow-primary focus-visible:ring-ai',
    success: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/25 focus-visible:ring-emerald-600',
    danger: 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm shadow-rose-600/25 focus-visible:ring-rose-600',
    dangerOutline: 'bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 hover:border-rose-300 focus-visible:ring-rose-400',
    ghost: 'bg-transparent hover:bg-slate-100 text-slate-600 hover:text-slate-900 focus-visible:ring-slate-300',
  };

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || isLoading}
      onClick={onClick}
      className={`${baseClasses} ${sizeClasses[size] || sizeClasses.md} ${variantClasses[variant] || variantClasses.primary} ${className}`}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-current" />
      ) : (
        leftIcon && <span className="flex items-center flex-shrink-0">{leftIcon}</span>
      )}
      <span>{children}</span>
      {!isLoading && rightIcon && <span className="flex items-center flex-shrink-0">{rightIcon}</span>}
    </button>
  );
});

Button.displayName = 'Button';
