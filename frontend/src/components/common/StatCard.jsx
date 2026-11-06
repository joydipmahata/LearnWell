import React from 'react';

export default function StatCard({
  title,
  value,
  delta,
  deltaType = 'neutral', // 'positive' | 'negative' | 'neutral'
  caption,
  icon: Icon,
  className = '',
}) {
  const deltaColor =
    deltaType === 'positive'
      ? 'text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800'
      : deltaType === 'negative'
      ? 'text-rose-700 bg-rose-50 dark:text-rose-300 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800'
      : 'text-slate-700 bg-slate-100 dark:text-slate-300 dark:bg-slate-800 border-slate-200 dark:border-slate-700';

  return (
    <div
      className={`p-4 sm:p-5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col justify-between ${className}`}
    >
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {title}
          </span>
          {Icon && (
            <div className="p-1.5 rounded text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800">
              <Icon className="w-4 h-4" />
            </div>
          )}
        </div>

        <div className="flex items-baseline gap-2.5">
          <span className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
            {value}
          </span>
          {delta && (
            <span
              className={`text-xs px-1.5 py-0.5 rounded border font-medium ${deltaColor}`}
            >
              {delta}
            </span>
          )}
        </div>
      </div>

      {caption && (
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400 leading-snug border-t border-slate-100 dark:border-slate-800/80 pt-2.5">
          {caption}
        </p>
      )}
    </div>
  );
}
