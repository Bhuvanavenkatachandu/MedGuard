import React from 'react';
import { Button } from './Button';

export const EmptyState = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  className = '',
}) => {
  return (
    <div className={`bg-white rounded-2xl border border-slate-200/90 p-8 sm:p-12 text-center max-w-lg mx-auto shadow-card ${className}`}>
      {Icon && (
        <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4 shadow-xs">
          <Icon className="w-7 h-7" aria-hidden="true" />
        </div>
      )}

      <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-1">
        {title}
      </h3>

      {description && (
        <p className="text-xs sm:text-sm text-slate-500 leading-relaxed mb-6 max-w-sm mx-auto">
          {description}
        </p>
      )}

      {(actionLabel || secondaryActionLabel) && (
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          {secondaryActionLabel && (
            <Button variant="outline" size="sm" onClick={onSecondaryAction}>
              {secondaryActionLabel}
            </Button>
          )}
          {actionLabel && (
            <Button variant="primary" size="sm" onClick={onAction}>
              {actionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
