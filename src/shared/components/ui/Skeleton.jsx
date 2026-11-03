import React from 'react';

export const Skeleton = ({ className = '', rounded = 'rounded-lg' }) => {
  return (
    <div
      className={`animate-pulse bg-slate-200/80 ${rounded} ${className}`}
      aria-hidden="true"
    />
  );
};

export const CardSkeleton = () => (
  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-3">
    <div className="flex items-center justify-between">
      <Skeleton className="w-24 h-4" />
      <Skeleton className="w-8 h-8 rounded-lg" />
    </div>
    <Skeleton className="w-32 h-7" />
    <Skeleton className="w-48 h-3" />
  </div>
);

export const TableSkeleton = ({ rows = 5, cols = 6 }) => (
  <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
    <div className="p-4 border-b border-slate-100 flex items-center justify-between">
      <Skeleton className="w-36 h-5" />
      <Skeleton className="w-24 h-8 rounded-xl" />
    </div>
    <div className="p-4 space-y-3">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 py-2 border-b border-slate-50 last:border-0">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className={`h-4 flex-1 ${c === 0 ? 'max-w-[140px]' : ''}`} />
          ))}
        </div>
      ))}
    </div>
  </div>
);
