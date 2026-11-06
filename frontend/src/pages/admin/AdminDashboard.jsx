import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../../api/client';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import { SkeletonCard, SkeletonTable } from '../../components/common/SkeletonLoader';
import AdminInterventionAnalytics from '../../components/interventions/AdminInterventionAnalytics';
import {
  Users2,
  GraduationCap,
  BellRing,
  FileSpreadsheet,
  AlertTriangle,
  History
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend
} from 'recharts';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest('/admin/stats')
      .then((res) => setStats(res))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonCard lines={2} />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonCard key={i} lines={1} />
          ))}
        </div>
        <SkeletonTable rows={4} cols={3} />
      </div>
    );
  }

  const {
    total_students,
    total_faculty,
    unassigned_students,
    bands_count,
    recent_audits,
    total_notices,
    total_exam_seats
  } = stats || {
    total_students: 0,
    total_faculty: 0,
    unassigned_students: 0,
    bands_count: { Green: 0, Amber: 0, Red: 0 },
    recent_audits: [],
    total_notices: 0,
    total_exam_seats: 0
  };

  const pieData = [
    { name: 'Low risk (Green)', value: bands_count.Green || 0, color: '#16A34A' },
    { name: 'Moderate risk (Amber)', value: bands_count.Amber || 0, color: '#D97706' },
    { name: 'High risk (Red)', value: bands_count.Red || 0, color: '#DC2626' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="What changed?"
        subtitle="Recent institutional activity, mentor pairings, and system audit logs."
        actions={
          <div className="flex items-center gap-2">
            <Link
              to="/admin/users"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-medium focus-visible:ring-2 shadow-xs"
            >
              <Users2 className="w-3.5 h-3.5" />
              <span>Manage users</span>
            </Link>
            <Link
              to="/admin/mentor-assignments"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 focus-visible:ring-1"
            >
              <span>Pairings</span>
            </Link>
          </div>
        }
      />

      {/* Unassigned Students Alert */}
      {unassigned_students > 0 && (
        <div className="p-4 rounded-md border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
            <div>
              <span className="font-semibold text-amber-900 dark:text-amber-200">
                {unassigned_students} student(s) currently awaiting a faculty mentor
              </span>
              <p className="text-amber-800 dark:text-amber-300 mt-0.5">
                Every matriculated student requires an assigned mentor for early intervention tracking.
              </p>
            </div>
          </div>
          <Link
            to="/admin/mentor-assignments"
            className="px-3 py-1.5 rounded-md bg-amber-700 hover:bg-amber-800 text-white font-medium shrink-0 text-center"
          >
            Assign mentors
          </Link>
        </div>
      )}

      {/* 4 Primary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          title="Enrolled students"
          value={total_students}
          caption="Active enrolled cohort"
          icon={GraduationCap}
        />
        <StatCard
          title="Faculty mentors"
          value={total_faculty}
          caption="Supervising departments"
          icon={Users2}
        />
        <StatCard
          title="Active notices"
          value={total_notices}
          caption="Campus communications"
          icon={BellRing}
        />
        <StatCard
          title="Exam allocations"
          value={total_exam_seats}
          caption="Desk records uploaded"
          icon={FileSpreadsheet}
        />
      </div>

      {/* Intervention Effectiveness Analytics (Phase 7) */}
      <AdminInterventionAnalytics />

      {/* What Changed Recently: Audit Trail & Risk Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Risk Distribution Chart */}
        <div className="p-4 sm:p-5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Risk band distribution
            </h2>
            <p className="text-xs text-slate-500 mb-2">Overall cohort standing</p>

            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
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
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800/80 pt-2.5">
            <strong>Takeaway:</strong> {bands_count.Green || 0} students are in good standing; {bands_count.Red || 0} require targeted outreach.
          </p>
        </div>

        {/* What Changed: Recent Audits */}
        <div className="lg:col-span-2 p-4 sm:p-5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <History className="w-4 h-4 text-slate-500" />
                <span>Recent system changes</span>
              </h2>
              <span className="text-[11px] text-slate-400 font-mono">Live audit stream</span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-72 overflow-y-auto pr-1">
              {recent_audits.length === 0 ? (
                <p className="py-6 text-center text-xs text-slate-500">No recent changes logged.</p>
              ) : (
                recent_audits.map((a) => (
                  <div key={a.id} className="py-2.5 text-xs flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0">
                        {a.action}
                      </span>
                      <span className="text-slate-700 dark:text-slate-300 truncate">{a.details}</span>
                    </div>
                    <span className="text-slate-400 font-mono text-[11px] shrink-0">
                      {new Date(a.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
            Immutable institutional audit trail
          </div>
        </div>
      </div>
    </div>
  );
}
