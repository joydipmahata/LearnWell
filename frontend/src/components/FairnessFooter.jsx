import React from 'react';
import { Scale, Info } from 'lucide-react';

export default function FairnessFooter() {
  return (
    <footer className="mt-12 pt-6 pb-8 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
      <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-2.5 max-w-3xl">
          <Scale className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" aria-hidden="true" />
          <p className="leading-relaxed">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Fairness note:</span> LearnWell provides transparent decision-support for mentors.
            Risk bands (Low risk &lt;40, Moderate risk 40–69, High risk &ge;70) evaluate academic indicators (attendance level and 30-day velocity, assessment scores and trends, coursework submissions) and{' '}
            <strong className="font-semibold text-slate-700 dark:text-slate-300">never incorporate demographic or personal attributes</strong>.
            Flags carry an automatic 14-day expiry and dissolve upon documented academic improvement.
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 text-slate-400 dark:text-slate-500 font-mono text-[11px]">
          <Info className="w-3.5 h-3.5" aria-hidden="true" />
          <span>PS-06 ShikshaSetu Edition</span>
        </div>
      </div>
    </footer>
  );
}
