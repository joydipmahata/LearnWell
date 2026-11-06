import React from 'react';
import { Inbox } from 'lucide-react';

export default function EmptyState({
  icon: Icon = Inbox,
  title = 'No records found',
  description = 'There is nothing to display here yet.',
  actionLabel,
  onAction,
  actionTo,
  className = '',
}) {
  return (
    <div
      className={`py-12 px-4 rounded-md border border-dashed border-slate-300 dark:border-slate-800 bg-white/50 dark:bg-slate-900/40 text-center flex flex-col items-center justify-center ${className}`}
    >
      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center mb-3">
        <Icon className="w-5 h-5" />
      </div>
      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
        {title}
      </h3>
      <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm">
        {description}
      </p>
      {actionLabel && (
        <div className="mt-4">
          {actionTo ? (
            <a
              href={actionTo}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs sm:text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {actionLabel}
            </a>
          ) : (
            <button
              type="button"
              onClick={onAction}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs sm:text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {actionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
