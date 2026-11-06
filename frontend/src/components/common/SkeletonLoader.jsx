import React from 'react';

export function SkeletonBlock({ className = '' }) {
  return (
    <div
      className={`bg-slate-200 dark:bg-slate-800 rounded animate-pulse ${className}`}
      aria-hidden="true"
    />
  );
}

export function SkeletonCard({ lines = 3, className = '' }) {
  return (
    <div
      className={`p-5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3 ${className}`}
      aria-busy="true"
      aria-live="polite"
    >
      <SkeletonBlock className="h-4 w-1/3" />
      <SkeletonBlock className="h-7 w-1/2" />
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBlock key={i} className="h-3 w-full" />
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4, className = '' }) {
  return (
    <div
      className={`w-full rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3 ${className}`}
      aria-busy="true"
      aria-live="polite"
    >
      <div className="flex gap-4 pb-2 border-b border-slate-100 dark:border-slate-800">
        {Array.from({ length: cols }).map((_, i) => (
          <SkeletonBlock key={i} className="h-4 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 py-1.5">
          {Array.from({ length: cols }).map((_, c) => (
            <SkeletonBlock key={c} className="h-3.5 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}
