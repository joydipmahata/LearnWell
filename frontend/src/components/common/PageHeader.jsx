import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export default function PageHeader({
  breadcrumbs,
  title,
  subtitle,
  actions,
  badge,
}) {
  return (
    <div className="space-y-2 mb-6">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1 flex-wrap">
          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            return (
              <React.Fragment key={idx}>
                {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                {crumb.to && !isLast ? (
                  <Link
                    to={crumb.to}
                    className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className={isLast ? 'text-slate-800 dark:text-slate-200 font-medium' : ''}>
                    {crumb.label}
                  </span>
                )}
              </React.Fragment>
            );
          })}
        </nav>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
              {title}
            </h1>
            {badge && <div>{badge}</div>}
          </div>
          {subtitle && (
            <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-3xl">
              {subtitle}
            </p>
          )}
        </div>

        {actions && (
          <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto flex-wrap">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
