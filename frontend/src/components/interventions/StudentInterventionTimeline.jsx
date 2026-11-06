import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../api/client';
import { Activity, Clock, CheckCircle2, TrendingUp, Sparkles } from 'lucide-react';

export default function StudentInterventionTimeline() {
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest('/interventions/student/timeline')
      .then(res => setTimeline(res || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || timeline.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
      <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
        <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
          Academic Mentorship &amp; Progress Timeline
        </h2>
      </div>

      <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-indigo-100 dark:before:bg-indigo-950">
        {timeline.map((item) => (
          <div key={item.id} className="relative group">
            {/* Dot */}
            <span className="absolute -left-6 top-1.5 w-2.5 h-2.5 rounded-full bg-indigo-600 ring-4 ring-white dark:ring-slate-900" />

            <div className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {item.title}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {item.date}
                </span>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {item.details}
              </p>

              <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400">
                <span>Mentor: {item.mentor_name}</span>
                <span className={`font-semibold ${
                  item.outcome === 'Improved' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'
                }`}>
                  {item.outcome}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
