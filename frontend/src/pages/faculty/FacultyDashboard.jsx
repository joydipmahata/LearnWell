import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../../api/client';
import RiskBadge from '../../components/RiskBadge';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import TodayClassesCard from '../../components/timetable/TodayClassesCard';
import { SkeletonCard, SkeletonTable } from '../../components/common/SkeletonLoader';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertOctagon,
  AlertTriangle,
  ShieldCheck,
  ArrowRight,
  Activity,
  Search,
  BookOpenCheck
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

export default function FacultyDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [bandFilter, setBandFilter] = useState('ALL');

  useEffect(() => {
    apiRequest('/faculty/dashboard-stats')
      .then((res) => setData(res))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonCard lines={2} />
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <SkeletonCard key={i} lines={1} />
          ))}
        </div>
        <SkeletonTable rows={5} cols={6} />
      </div>
    );
  }

  const {
    total_mentees,
    bands_count,
    trend_count,
    avg_attendance_recent,
    avg_attendance_prior,
    mentees,
    cohort_history,
    what_changed_this_week
  } = data || {
    total_mentees: 0,
    bands_count: { Green: 0, Amber: 0, Red: 0 },
    trend_count: { improving: 0, declining: 0, stable: 0 },
    avg_attendance_recent: 0,
    avg_attendance_prior: 0,
    mentees: [],
    cohort_history: [],
    what_changed_this_week: []
  };

  // Students needing attention today (Red or Amber + declining)
  const priorityStudents = (mentees || []).filter(
    (m) => m.effective_band === 'Red' || (m.effective_band === 'Amber' && m.trend_direction === 'declining')
  );

  const filteredMentees = (mentees || []).filter((m) => {
    if (bandFilter !== 'ALL' && m.effective_band.toUpperCase() !== bandFilter.toUpperCase()) return false;
    if (search) {
      const term = search.toLowerCase();
      return (
        m.student_name.toLowerCase().includes(term) ||
        m.student_id.toLowerCase().includes(term) ||
        m.roll_no.toLowerCase().includes(term)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Who needs me today?"
        subtitle={`Supervising ${total_mentees} assigned mentees • ${priorityStudents.length} students currently require proactive support.`}
        actions={
          <Link
            to="/faculty/mentorship"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-medium focus-visible:ring-2 shadow-xs"
          >
            <BookOpenCheck className="w-3.5 h-3.5" />
            <span>Mentorship desk</span>
          </Link>
        }
      />

      {/* Teaching Schedule Right Now & Today (Phase 2) */}
      <TodayClassesCard role="Faculty" />

      {/* "Who needs me today" Priority Desk */}
      {priorityStudents.length > 0 && (
        <div className="p-4 sm:p-5 rounded-md border border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-rose-950 dark:text-rose-100 flex items-center gap-2">
                <AlertOctagon className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                <span>{priorityStudents.length} students need you today</span>
              </h2>
              <p className="text-xs text-rose-800 dark:text-rose-300 mt-0.5">
                High compound risk (Red band) or declining attendance trajectory requiring outreach.
              </p>
            </div>
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800">
              Needs contact
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {priorityStudents.map((s) => (
              <div
                key={s.student_id}
                className="p-3.5 rounded-md bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/80 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h3 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {s.student_name}
                      </h3>
                      <span className="font-mono text-[11px] text-slate-400">{s.roll_no}</span>
                    </div>
                    <RiskBadge band={s.effective_band} score={s.weighted_score} size="sm" />
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-snug line-clamp-2">
                    {s.plain_language_explanation}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-500">
                    Flag ends in {s.flag?.days_remaining || 14}d
                  </span>
                  <Link
                    to={`/faculty/students/${s.student_id}`}
                    className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    <span>Open case file</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5 Metrics: Red, Amber, Green, Improving, Declining */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <StatCard
          title="High risk (Red)"
          value={bands_count.Red || 0}
          caption="Score ≥70 • Action needed"
          icon={AlertOctagon}
        />
        <StatCard
          title="Moderate risk (Amber)"
          value={bands_count.Amber || 0}
          caption="Score 40–69 • Under watch"
          icon={AlertTriangle}
        />
        <StatCard
          title="Low risk (Green)"
          value={bands_count.Green || 0}
          caption="Score <40 • Good standing"
          icon={ShieldCheck}
        />
        <StatCard
          title="Improving"
          value={trend_count.improving || 0}
          deltaType="positive"
          caption="Upward trajectory"
          icon={TrendingUp}
        />
        <StatCard
          title="Declining"
          value={trend_count.declining || 0}
          deltaType="negative"
          caption="Downward velocity"
          icon={TrendingDown}
          className="col-span-2 sm:col-span-1"
        />
      </div>

      {/* Charts & "What Changed This Week" */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Cohort Risk Progression */}
        <div className="lg:col-span-2 p-4 sm:p-5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Cohort risk progression (8-week history)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Distribution of risk bands across past weeks.
                </p>
              </div>
              <span className="text-xs font-mono text-slate-500">
                Avg attendance: {avg_attendance_prior}% → {avg_attendance_recent}%
              </span>
            </div>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cohort_history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="2 2" stroke="#94A3B8" opacity={0.25} />
                  <XAxis dataKey="week" stroke="#64748B" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748B" fontSize={11} tickLine={false} unit=" stu" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderColor: '#334155',
                      borderRadius: '6px',
                      color: '#F8FAFC',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                  <Bar dataKey="Red" fill="#DC2626" name="Red band (high)" stackId="a" />
                  <Bar dataKey="Amber" fill="#D97706" name="Amber band (mod)" stackId="a" />
                  <Bar dataKey="Green" fill="#16A34A" name="Green band (low)" stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800/80 pt-2.5">
            <strong>Takeaway:</strong> High risk (Red) concentration dropped from week 1 to current week as mentor interventions were recorded.
          </p>
        </div>

        {/* "What Changed This Week" List */}
        <div className="p-4 sm:p-5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Activity className="w-4 h-4 text-slate-500" />
                <span>What changed this week</span>
              </h2>
              <span className="text-[11px] text-slate-400 font-mono">Weekly sync</span>
            </div>

            <div className="space-y-2.5">
              {(what_changed_this_week || []).map((item, i) => (
                <div
                  key={i}
                  className="p-2.5 rounded border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-900 dark:text-slate-100">
                      {item.student_name}
                    </span>
                    <span className="font-mono text-[10px] text-slate-500">{item.band}</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                    {item.text}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
            Automated institutional sync
          </div>
        </div>
      </div>

      {/* Mentees Desk Table */}
      <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Assigned mentee roster
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select any mentee to open their individual case file, review attendance trends, or log interventions.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <label htmlFor="mentee-search-input" className="sr-only">
                Search mentees
              </label>
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                id="mentee-search-input"
                type="text"
                placeholder="Search name, roll, ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus-visible:ring-1 focus-visible:ring-indigo-500 w-44 sm:w-56"
              />
            </div>

            <label htmlFor="band-filter-select" className="sr-only">
              Filter by risk band
            </label>
            <select
              id="band-filter-select"
              value={bandFilter}
              onChange={(e) => setBandFilter(e.target.value)}
              className="py-1.5 px-2 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus-visible:ring-1 focus-visible:ring-indigo-500"
            >
              <option value="ALL">All bands</option>
              <option value="RED">Red band (high risk)</option>
              <option value="AMBER">Amber band (moderate)</option>
              <option value="GREEN">Green band (low risk)</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
              <tr>
                <th scope="col" className="py-2.5 px-3 font-semibold">Student</th>
                <th scope="col" className="py-2.5 px-3 font-semibold">Roll no</th>
                <th scope="col" className="py-2.5 px-3 text-center font-semibold">Band</th>
                <th scope="col" className="py-2.5 px-3 text-center font-semibold">Score</th>
                <th scope="col" className="py-2.5 px-3 text-center font-semibold">Trend</th>
                <th scope="col" className="py-2.5 px-3 text-center font-semibold">Attendance</th>
                <th scope="col" className="py-2.5 px-3 text-center font-semibold">Flag</th>
                <th scope="col" className="py-2.5 px-3 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {filteredMentees.map((s) => {
                const isImproving = s.trend_direction === 'improving';
                const isDeclining = s.trend_direction === 'declining';
                return (
                  <tr
                    key={s.student_id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-2.5 px-3">
                      <div className="font-medium text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <span>{s.student_name}</span>
                        {s.unread_chat > 0 && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-600 text-white font-medium">
                            {s.unread_chat} new
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">{s.student_id}</span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-xs text-slate-600 dark:text-slate-400">
                      {s.roll_no}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <RiskBadge band={s.effective_band} score={s.weighted_score} size="sm" showScore={false} />
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-medium text-slate-800 dark:text-slate-200">
                      {Math.round(s.weighted_score)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-medium ${
                          isImproving
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : isDeclining
                            ? 'text-rose-700 dark:text-rose-400'
                            : 'text-slate-400'
                        }`}
                      >
                        {isImproving ? <TrendingUp className="w-3.5 h-3.5" /> : isDeclining ? <TrendingDown className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                        <span className="capitalize">{s.trend_direction}</span>
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-xs">
                      <span
                        className={
                          s.attendance_overall >= 75
                            ? 'text-emerald-700 dark:text-emerald-400 font-medium'
                            : 'text-rose-700 dark:text-rose-400 font-medium'
                        }
                      >
                        {s.attendance_overall}%
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center text-xs">
                      <span className="text-slate-500">
                        {s.flag?.status === 'resolved_by_improvement' ? (
                          <span className="text-emerald-700 dark:text-emerald-400 font-medium">Resolved</span>
                        ) : (
                          `${s.flag?.days_remaining || 14}d left`
                        )}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <Link
                        to={`/faculty/students/${s.student_id}`}
                        className="px-2.5 py-1 rounded text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors"
                      >
                        Open file
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
