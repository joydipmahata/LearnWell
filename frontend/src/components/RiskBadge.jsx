import React from 'react';
import { ShieldCheck, AlertTriangle, AlertOctagon } from 'lucide-react';

export default function RiskBadge({
  band,
  score,
  reason,
  size = 'md',
  showScore = true,
  inlineReason = false,
  className = '',
}) {
  const normalized = (band || 'Green').toLowerCase();

  let config = {
    label: 'Low risk',
    colorClass: 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/60 dark:border-emerald-800/60',
    icon: ShieldCheck,
  };

  if (normalized === 'amber' || normalized === 'moderate') {
    config = {
      label: 'Moderate risk',
      colorClass: 'text-amber-800 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-950/60 dark:border-amber-800/60',
      icon: AlertTriangle,
    };
  } else if (normalized === 'red' || normalized === 'high') {
    config = {
      label: 'High risk',
      colorClass: 'text-rose-800 bg-rose-50 border-rose-200 dark:text-rose-300 dark:bg-rose-950/60 dark:border-rose-800/60',
      icon: AlertOctagon,
    };
  }

  const Icon = config.icon;
  const isSm = size === 'sm';
  const isLg = size === 'lg';

  const pill = (
    <span
      className={`inline-flex items-center gap-1.5 font-medium border rounded-full shrink-0 ${
        isSm
          ? 'px-2 py-0.5 text-[11px]'
          : isLg
          ? 'px-3 py-1 text-sm'
          : 'px-2.5 py-0.5 text-xs'
      } ${config.colorClass} ${className}`}
    >
      <Icon className={isSm ? 'w-3 h-3' : isLg ? 'w-4 h-4' : 'w-3.5 h-3.5'} aria-hidden="true" />
      <span>{config.label}</span>
      {showScore && score !== undefined && score !== null && (
        <span className="opacity-75 font-normal">({Math.round(score)})</span>
      )}
    </span>
  );

  if (reason) {
    if (inlineReason) {
      return (
        <span className="inline-flex items-center gap-2 flex-wrap">
          {pill}
          <span className="text-xs text-slate-600 dark:text-slate-400">{reason}</span>
        </span>
      );
    }
    return (
      <div className="space-y-1">
        {pill}
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-snug">{reason}</p>
      </div>
    );
  }

  return pill;
}
