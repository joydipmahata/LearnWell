import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../api/client';
import { BarChart3, TrendingUp, CheckCircle, Award, Users } from 'lucide-react';

export default function AdminInterventionAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiRequest('/interventions/admin/analytics')
      .then(res => setData(res))
      .catch(err => setError(err.message || 'Failed to load analytics'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 animate-pulse">
        <div className="h-4 w-48 bg-slate-200 dark:bg-slate-800 rounded mb-4" />
        <div className="h-40 bg-slate-100 dark:bg-slate-800/60 rounded" />
      </div>
    );
  }

  if (error || !data) {
    return null;
  }

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-6">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Intervention Effectiveness &amp; Recovery Analytics
          </h2>
        </div>
        <span className="text-xs text-slate-400 font-mono">
          {data.total_interventions} Total Tracked
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Success Rate by Intervention Type */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
            <span>Success Rate by Strategy</span>
          </h3>

          <div className="space-y-3">
            {data.by_type.map((t) => (
              <div key={t.type} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {t.type}
                  </span>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-[11px] text-slate-400">
                      {t.improved}/{t.total} resolved
                    </span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">
                      {t.success_rate}%
                    </span>
                  </div>
                </div>

                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden flex">
                  <div
                    className="bg-emerald-500 h-full transition-all duration-500"
                    style={{ width: `${t.success_rate}%` }}
                    title={`Improved: ${t.improved}`}
                  />
                  <div
                    className="bg-amber-400 h-full transition-all duration-500"
                    style={{ width: `${(t.no_change / (t.total || 1)) * 100}%` }}
                    title={`No change: ${t.no_change}`}
                  />
                  <div
                    className="bg-rose-400 h-full transition-all duration-500"
                    style={{ width: `${(t.worsened / (t.total || 1)) * 100}%` }}
                    title={`Worsened: ${t.worsened}`}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-4 text-[10px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Improved</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" /> No Change</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-400" /> Worsened</span>
          </div>
        </div>

        {/* Success Rate by Mentor */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-indigo-600" />
            <span>Success Rate by Faculty Mentor</span>
          </h3>

          <div className="space-y-3">
            {data.by_mentor.map((m) => (
              <div key={m.mentor_id} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <div>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {m.mentor_name}
                    </span>
                    <span className="text-[10px] text-slate-400 ml-1.5 font-mono">
                      ({m.mentor_id})
                    </span>
                  </div>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-[11px] text-slate-400">
                      {m.improved}/{m.total} recovered
                    </span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">
                      {m.success_rate}%
                    </span>
                  </div>
                </div>

                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${m.success_rate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
