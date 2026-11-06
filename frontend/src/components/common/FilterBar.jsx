import React, { useState } from 'react';
import { Search, X, SlidersHorizontal, ChevronDown, ChevronUp } from 'lucide-react';

export default function FilterBar({
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Search...',
  filters = [], // array of { id, label, value, options: [{ label, value }], onChange }
  activeChips = [], // array of { id, label, onRemove }
  onClearAll,
  extraActions,
  className = '',
}) {
  const [mobileExpanded, setMobileExpanded] = useState(false);

  const hasActiveFilters = activeChips.length > 0 || (searchValue && searchValue.trim().length > 0);

  return (
    <div className={`sticky top-16 z-20 bg-white/95 dark:bg-slate-900/95 border-y border-slate-200 dark:border-slate-800 py-3 mb-6 transition-colors ${className}`}>
      {/* Top row: search + mobile toggle + actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 flex-1 max-w-lg">
          {onSearchChange && (
            <div className="relative flex-1">
              <label htmlFor="filterbar-search" className="sr-only">
                {searchPlaceholder}
              </label>
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
              <input
                id="filterbar-search"
                type="text"
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-9 pr-8 py-1.5 text-xs sm:text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus-visible:ring-1 focus-visible:ring-indigo-500"
              />
              {searchValue && (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {filters.length > 0 && (
            <button
              type="button"
              onClick={() => setMobileExpanded(!mobileExpanded)}
              className="sm:hidden inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              aria-expanded={mobileExpanded}
              aria-label="Toggle filter options"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filters</span>
              {activeChips.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center font-bold">
                  {activeChips.length}
                </span>
              )}
              {mobileExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          )}
        </div>

        {extraActions && (
          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            {extraActions}
          </div>
        )}
      </div>

      {/* Filter selects row: visible on desktop, toggleable on mobile */}
      {filters.length > 0 && (
        <div
          className={`mt-2.5 flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 ${
            mobileExpanded ? 'flex' : 'hidden sm:flex'
          }`}
        >
          {filters.map((f) => (
            <div key={f.id} className="flex items-center gap-1.5 min-w-[130px] flex-1 sm:flex-initial">
              {f.label && (
                <label htmlFor={`filter-${f.id}`} className="text-xs text-slate-500 dark:text-slate-400 shrink-0">
                  {f.label}:
                </label>
              )}
              <select
                id={`filter-${f.id}`}
                value={f.value}
                onChange={(e) => f.onChange(e.target.value)}
                className="w-full text-xs py-1 px-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus-visible:ring-1 focus-visible:ring-indigo-500"
              >
                {f.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}

      {/* Active filter chips & clear all button */}
      {hasActiveFilters && (
        <div className="mt-2.5 flex items-center gap-1.5 flex-wrap pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
          <span className="text-slate-500 dark:text-slate-400">Active:</span>

          {searchValue && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs">
              <span>"{searchValue}"</span>
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="hover:text-slate-900 dark:hover:text-slate-100"
                aria-label="Remove search query"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {activeChips.map((chip) => (
            <span
              key={chip.id}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 text-xs"
            >
              <span>{chip.label}</span>
              {chip.onRemove && (
                <button
                  type="button"
                  onClick={chip.onRemove}
                  className="hover:text-indigo-900 dark:hover:text-indigo-100"
                  aria-label={`Remove filter ${chip.label}`}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          ))}

          {onClearAll && (
            <button
              type="button"
              onClick={onClearAll}
              className="ml-auto text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium py-0.5"
            >
              Clear all
            </button>
          )}
        </div>
      )}
    </div>
  );
}
