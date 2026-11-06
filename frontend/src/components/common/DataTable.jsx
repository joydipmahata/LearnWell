import React from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

export default function DataTable({
  columns,
  data,
  keyField = 'id',
  sortColumn,
  sortDirection,
  onSort,
  emptyMessage = 'No records found.',
  className = '',
}) {
  return (
    <div className={`w-full overflow-hidden rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs sm:text-sm border-collapse">
          <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-medium">
            <tr>
              {columns.map((col, idx) => {
                const isSortable = !!col.sortKey && !!onSort;
                const isSorted = sortColumn === col.sortKey;

                return (
                  <th
                    key={col.key || idx}
                    scope="col"
                    className={`py-2.5 px-3 sm:px-4 font-semibold text-xs text-slate-700 dark:text-slate-300 ${
                      col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                    } ${col.width || ''}`}
                  >
                    {isSortable ? (
                      <button
                        type="button"
                        onClick={() => onSort(col.sortKey)}
                        className="inline-flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-slate-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 rounded px-1 py-0.5 -mx-1"
                        aria-label={`Sort by ${col.label}`}
                      >
                        <span>{col.label}</span>
                        {isSorted ? (
                          sortDirection === 'asc' ? (
                            <ArrowUp className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3.5 h-3.5 opacity-40 hover:opacity-100" />
                        )}
                      </button>
                    ) : (
                      <span>{col.label}</span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {data && data.length > 0 ? (
              data.map((row, rIdx) => (
                <tr
                  key={row[keyField] ?? rIdx}
                  className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                >
                  {columns.map((col, cIdx) => (
                    <td
                      key={col.key || cIdx}
                      className={`py-2.5 px-3 sm:px-4 text-slate-700 dark:text-slate-300 ${
                        col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                      }`}
                    >
                      {col.render ? col.render(row, rIdx) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={columns.length}
                  className="py-8 text-center text-xs sm:text-sm text-slate-500 dark:text-slate-400"
                >
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
