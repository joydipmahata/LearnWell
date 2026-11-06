import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../api/client';
import PageHeader from '../../components/common/PageHeader';
import { SkeletonCard, SkeletonTable } from '../../components/common/SkeletonLoader';
import {
  TrendingUp,
  BookOpen,
  MessageSquare,
  History
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

const formatDate = (val) => {
  if (!val) return '—';
  const d = typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)
    ? new Date(`${val}T00:00:00`)
    : new Date(val);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
};

export default function StudentResults() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSemester, setSelectedSemester] = useState(null);

  const fetchResults = (sem = null) => {
    setLoading(true);
    const endpoint = sem ? `/student/results-feedback?semester=${sem}` : '/student/results-feedback';
    apiRequest(endpoint)
      .then((res) => {
        setData(res);
        if (selectedSemester === null && res.current_semester) {
          setSelectedSemester(res.selected_semester || res.current_semester);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchResults(selectedSemester);
  }, [selectedSemester]);

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <SkeletonCard lines={2} />
        <SkeletonTable rows={4} cols={5} />
      </div>
    );
  }

  const {
    current_semester = 4,
    available_semesters = [1, 2, 3, 4],
    exams = [],
    semester_summary = null,
    all_semester_summaries = [],
    feedbacks = [],
    all_feedbacks = [],
    timeline = []
  } = data || {};

  const activeSem = selectedSemester || current_semester;

  const chartData = (all_semester_summaries || []).map((s) => ({
    name: `Sem ${s.semester}`,
    SGPA: s.sgpa,
    CGPA: s.cgpa,
  }));

  // Takeaway calculation
  let takeaway = 'Performance records across semesters.';
  if (all_semester_summaries && all_semester_summaries.length >= 2) {
    const latest = all_semester_summaries[all_semester_summaries.length - 1];
    const prev = all_semester_summaries[all_semester_summaries.length - 2];
    const diff = (latest.sgpa - prev.sgpa).toFixed(2);
    if (diff > 0) {
      takeaway = `SGPA improved by +${diff} points between Semester ${prev.semester} and Semester ${latest.semester}.`;
    } else if (diff < 0) {
      takeaway = `SGPA shifted by ${diff} points from Semester ${prev.semester} (${prev.sgpa}) to Semester ${latest.semester} (${latest.sgpa}).`;
    } else {
      takeaway = `Academic SGPA remained steady at ${latest.sgpa} across recent terms.`;
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Grades and academic feedback"
        subtitle="Review semester grade trajectories, subject marks, and mentor notes."
        actions={
          <div className="flex items-center gap-1 p-1 rounded-md bg-slate-100 dark:bg-slate-800 text-xs">
            <span className="text-slate-500 dark:text-slate-400 px-1.5 font-medium">Semester:</span>
            {available_semesters.map((sem) => (
              <button
                key={sem}
                type="button"
                onClick={() => setSelectedSemester(sem)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  activeSem === sem
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Sem {sem}
              </button>
            ))}
          </div>
        }
      />

      {/* Trajectory & Selected Semester Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Trajectory Chart */}
        <div className="lg:col-span-2 p-4 sm:p-5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Grade trajectory (SGPA &amp; CGPA)</span>
              </h2>
              <span className="text-xs text-slate-500 font-mono">Scale: 0.0 to 10.0</span>
            </div>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="2 2" stroke="#94A3B8" opacity={0.25} />
                  <XAxis dataKey="name" stroke="#64748B" fontSize={11} tickLine={false} />
                  <YAxis domain={[4, 10]} stroke="#64748B" fontSize={11} tickLine={false} unit=" pts" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderColor: '#334155',
                      borderRadius: '6px',
                      color: '#F8FAFC',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Line
                    type="monotone"
                    dataKey="SGPA"
                    stroke="#4F46E5"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#4F46E5' }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="CGPA"
                    stroke="#0D9488"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={{ r: 3, fill: '#0D9488' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800/80 pt-2.5">
            <strong>Takeaway:</strong> {takeaway}
          </p>
        </div>

        {/* Selected Semester Standing */}
        <div className="p-4 sm:p-5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Semester {activeSem} summary
              </span>
              <span
                className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${
                  semester_summary?.backlogs === 0
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                    : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                }`}
              >
                {semester_summary?.status || 'Active'}
              </span>
            </div>

            <div className="space-y-3 pt-1">
              <div className="flex items-baseline justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <span className="text-xs text-slate-500">Semester SGPA</span>
                <span className="text-xl font-semibold font-mono text-slate-900 dark:text-slate-100">
                  {semester_summary?.sgpa ?? '—'}
                </span>
              </div>
              <div className="flex items-baseline justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <span className="text-xs text-slate-500">Cumulative CGPA</span>
                <span className="text-base font-semibold font-mono text-slate-700 dark:text-slate-300">
                  {semester_summary?.cgpa ?? '—'}
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-slate-500">Active backlogs</span>
                <span
                  className={`text-sm font-semibold font-mono ${
                    semester_summary?.backlogs > 0 ? 'text-rose-600' : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {semester_summary?.backlogs ?? 0}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
            {activeSem === current_semester ? 'Ongoing term (continuous evaluations)' : 'Completed term'}
          </div>
        </div>
      </div>

      {/* Assessment Scores Table */}
      <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-slate-500" />
            <span>Semester {activeSem} course evaluations</span>
          </h2>
          <span className="text-xs text-slate-500 font-mono">{exams.length} records</span>
        </div>

        {exams.length === 0 ? (
          <p className="py-6 text-center text-xs text-slate-500">
            No assessment checkpoints recorded for Semester {activeSem}.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                <tr>
                  <th scope="col" className="py-2 px-3 font-semibold">Subject</th>
                  <th scope="col" className="py-2 px-3 font-semibold">Assessment</th>
                  <th scope="col" className="py-2 px-3 text-center font-semibold">Score</th>
                  <th scope="col" className="py-2 px-3 text-center font-semibold">Percentage</th>
                  <th scope="col" className="py-2 px-3 text-right font-semibold">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {exams.map((ex, idx) => {
                  const rawScore = ex.score !== undefined && ex.score !== null ? ex.score : ex.marks_obtained;
                  const rawMax = ex.max_marks !== undefined && ex.max_marks !== null ? ex.max_marks : ex.max_score;

                  const hasScore = rawScore !== undefined && rawScore !== null && rawScore !== '' && Number.isFinite(Number(rawScore));
                  const scoreNum = hasScore ? Number(rawScore) : null;

                  const hasMax = rawMax !== undefined && rawMax !== null && rawMax !== '' && Number.isFinite(Number(rawMax)) && Number(rawMax) > 0;
                  const maxNum = hasMax ? Number(rawMax) : null;

                  const hasPct = hasScore && hasMax;
                  const pct = hasPct ? (scoreNum / maxNum) * 100 : null;

                  const displayScore = hasScore
                    ? (hasMax ? `${scoreNum} / ${maxNum}` : `${scoreNum}`)
                    : '—';

                  const displayDate = formatDate(ex.date || ex.exam_date || ex.assessed_on);
                  const subjectTitle = ex.subject_name || ex.subject || '—';

                  return (
                    <tr
                      key={idx}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-2 px-3">
                        <div className="font-medium text-slate-900 dark:text-slate-100">{subjectTitle}</div>
                        <span className="font-mono text-[11px] text-slate-400">{ex.subject_code}</span>
                      </td>
                      <td className="py-2 px-3 text-slate-600 dark:text-slate-300">{ex.exam_name}</td>
                      <td className="py-2 px-3 text-center font-mono font-medium text-slate-800 dark:text-slate-200">
                        {displayScore}
                      </td>
                      <td className="py-2 px-3 text-center">
                        {hasPct ? (
                          <span
                            className={`font-mono font-medium ${
                              pct >= 60 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
                            }`}
                          >
                            {pct.toFixed(0)}%
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono text-xs">—</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-500 font-mono text-[11px]">
                        {displayDate}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Mentor Feedback & Timeline */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Feedbacks */}
        <div className="p-4 sm:p-5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
            <MessageSquare className="w-4 h-4 text-slate-500" />
            <span>Mentor feedback notes</span>
          </h2>

          {feedbacks.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-500">
              No feedback notes recorded for Semester {activeSem} yet.
              {all_feedbacks.length > 0 && ` (${all_feedbacks.length} notes in other semesters)`}
            </p>
          ) : (
            <div className="space-y-3">
              {feedbacks.map((f, i) => (
                <div key={f.id || i} className="p-3 rounded border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-xs space-y-1.5">
                  <div className="flex items-center justify-between text-slate-500">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-700 dark:text-slate-300">{f.subject_code || 'General'}</span>
                      {f.semester && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
                          Sem {f.semester}
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-[11px]">{new Date(f.created_at).toLocaleDateString()}</span>
                  </div>
                  {f.mentor_name && (
                    <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
                      From: {f.mentor_name}
                    </div>
                  )}
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{f.feedback || f.feedback_text}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Academic Milestones */}
        <div className="p-4 sm:p-5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
            <History className="w-4 h-4 text-slate-500" />
            <span>Academic activity history</span>
          </h2>

          {timeline.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-500">No milestone events logged.</p>
          ) : (
            <div className="space-y-3">
              {timeline.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2.5 text-xs">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400 mt-1.5 shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-900 dark:text-slate-100">{item.title}</span>
                      <span className="text-[11px] text-slate-400 font-mono">{new Date(item.created_at).toLocaleDateString()}</span>
                    </div>
                    {item.details && <p className="text-slate-500 dark:text-slate-400 mt-0.5">{item.details}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
