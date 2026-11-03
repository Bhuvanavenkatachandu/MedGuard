import React from 'react';
import { CheckCircle2, AlertTriangle, AlertOctagon, Clock, MinusCircle } from 'lucide-react';

export const StatusBadge = ({ status, size = 'sm', showIcon = true, className = '' }) => {
  const configs = {
    in_stock: {
      label: 'In Stock',
      icon: CheckCircle2,
      style: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
      dot: 'bg-emerald-500',
    },
    low_stock: {
      label: 'Low Stock',
      icon: AlertTriangle,
      style: 'bg-amber-50 text-amber-700 border-amber-200/80',
      dot: 'bg-amber-500',
    },
    expiring_soon: {
      label: 'Expiring Soon',
      icon: Clock,
      style: 'bg-orange-50 text-orange-700 border-orange-200/80',
      dot: 'bg-orange-500',
    },
    expired: {
      label: 'Expired',
      icon: AlertOctagon,
      style: 'bg-rose-50 text-rose-700 border-rose-200/80',
      dot: 'bg-rose-500',
    },
    out_of_stock: {
      label: 'Out of Stock',
      icon: MinusCircle,
      style: 'bg-slate-100 text-slate-600 border-slate-200',
      dot: 'bg-slate-400',
    },
    safe: {
      label: 'Safe Shelf Life',
      icon: CheckCircle2,
      style: 'bg-blue-50 text-blue-700 border-blue-200/80',
      dot: 'bg-blue-500',
    },
  };

  const current = configs[status] || configs.in_stock;
  const IconComponent = current.icon;
  const sizeClasses = size === 'xs' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold rounded-full border shadow-xs ${current.style} ${sizeClasses} ${className}`}
      role="status"
    >
      {showIcon && (
        <span className="flex items-center">
          <IconComponent className="w-3.5 h-3.5" aria-hidden="true" />
        </span>
      )}
      <span>{current.label}</span>
    </span>
  );
};
