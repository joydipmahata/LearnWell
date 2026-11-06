import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import PageHeader from '../../components/common/PageHeader';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import EmptyState from '../../components/common/EmptyState';
import { SkeletonCard, SkeletonTable } from '../../components/common/SkeletonLoader';
import {
  Users2,
  AlertTriangle,
  UserMinus,
  CheckCircle2,
  Download
} from 'lucide-react';

export default function AdminMentorAssignments() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMentorForAssign, setSelectedMentorForAssign] = useState({});
  const [unassignTarget, setUnassignTarget] = useState(null); // studentId
  const toast = useToast();

  const loadOverview = () => {
    setLoading(true);
    apiRequest('/admin/mentors-overview')
      .then((res) => setData(res))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadOverview();
  }, []);

  const handleAssign = async (studentId) => {
    const mentorId = selectedMentorForAssign[studentId] || data?.mentors?.[0]?.id;
    if (!mentorId) return;

    try {
      await apiRequest('/admin/assign-mentor', {
        method: 'POST',
        body: JSON.stringify({ student_id: studentId, mentor_id: mentorId }),
      });
      toast.success('Mentor paired successfully');
      loadOverview();
    } catch (err) {
      toast.error(err.message || 'Failed to assign mentor');
    }
  };

  const confirmUnassign = async () => {
    if (!unassignTarget) return;
    try {
      await apiRequest('/admin/unassign-mentor', {
        method: 'POST',
        body: JSON.stringify({ student_id: unassignTarget }),
      });
      toast.success('Mentee unassigned');
      setUnassignTarget(null);
      loadOverview();
    } catch (err) {
      toast.error(err.message || 'Failed to unassign');
    }
  };

  const exportAssignmentsCSV = () => {
    const headers = ['Status', 'Student ID', 'Student Name', 'Roll No', 'Branch', 'Semester', 'Section', 'Mentor ID', 'Mentor Name', 'Department'];
    const rows = [];

    (data?.mentors || []).forEach((m) => {
      (m.mentees || []).forEach((s) => {
        rows.push([
          '"Assigned"',
          `"${s.id}"`,
          `"${s.name}"`,
          `"${s.roll_no}"`,
          `"${s.branch}"`,
          s.semester,
          `"${s.section}"`,
          `"${m.id}"`,
          `"${m.name}"`,
          `"${m.department}"`,
        ]);
      });
    });

    (data?.unassigned_students || []).forEach((s) => {
      rows.push([
        '"Unassigned"',
        `"${s.id}"`,
        `"${s.name}"`,
        `"${s.roll_no}"`,
        `"${s.branch}"`,
        s.semester,
        `"${s.section}"`,
        '""',
        '"Awaiting Mentor Pairing"',
        '""',
      ]);
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'mentor_assignments.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <SkeletonCard lines={2} />
        <SkeletonTable rows={4} cols={5} />
      </div>
    );
  }

  const { mentors, unassigned_students } = data || { mentors: [], unassigned_students: [] };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mentor assignments"
        subtitle="Manage mentor-mentee pairings, unassigned student rosters, and faculty caseload balance."
        actions={
          <button
            type="button"
            onClick={exportAssignmentsCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 focus-visible:ring-1"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        }
      />

      {/* Unassigned Students Table */}
      <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              Unassigned students ({unassigned_students.length})
            </span>
          </div>
          <span className="text-slate-500">Awaiting faculty mentor</span>
        </div>

        {unassigned_students.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500 flex flex-col items-center gap-1.5">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            <span>All matriculated students are currently paired with a mentor.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                <tr>
                  <th scope="col" className="py-2.5 px-3 font-semibold">Student</th>
                  <th scope="col" className="py-2.5 px-3 font-semibold">Roll no</th>
                  <th scope="col" className="py-2.5 px-3 font-semibold">Branch &amp; sem</th>
                  <th scope="col" className="py-2.5 px-3 text-right font-semibold">Assign faculty mentor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {unassigned_students.map((s) => (
                  <tr
                    key={s.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-2.5 px-3">
                      <div className="font-medium text-slate-900 dark:text-slate-100">{s.name}</div>
                      <span className="font-mono text-[11px] text-slate-400">{s.id}</span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-xs text-slate-500">{s.roll_no}</td>
                    <td className="py-2.5 px-3 text-xs text-slate-600 dark:text-slate-400">
                      {s.branch} Sem {s.semester} (Sec {s.section})
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        <label htmlFor={`assign-select-${s.id}`} className="sr-only">
                          Select mentor for {s.name}
                        </label>
                        <select
                          id={`assign-select-${s.id}`}
                          value={selectedMentorForAssign[s.id] || mentors[0]?.id}
                          onChange={(e) =>
                            setSelectedMentorForAssign({ ...selectedMentorForAssign, [s.id]: e.target.value })
                          }
                          className="py-1 px-2 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        >
                          {mentors.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name} ({m.mentee_count} mentees)
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => handleAssign(s.id)}
                          className="px-2.5 py-1 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium"
                        >
                          Assign
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Active Mentors Caseloads */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Faculty caseloads &amp; mentee allocations
        </h2>

        <div className="space-y-3">
          {mentors.map((m) => (
            <div
              key={m.id}
              className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden"
            >
              <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900 dark:text-slate-100 text-xs sm:text-sm">
                      {m.name}
                    </span>
                    <span className="font-mono text-[11px] text-slate-400">({m.id})</span>
                  </div>
                  <span className="text-xs text-slate-500">{m.department} • {m.email}</span>
                </div>

                <div className="px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 self-start sm:self-auto">
                  {m.mentee_count} mentees assigned
                </div>
              </div>

              {m.mentees && m.mentees.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 text-slate-500 font-medium">
                      <tr>
                        <th scope="col" className="py-2 px-3">Student</th>
                        <th scope="col" className="py-2 px-3">Roll no</th>
                        <th scope="col" className="py-2 px-3">Class</th>
                        <th scope="col" className="py-2 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                      {m.mentees.map((st) => (
                        <tr
                          key={st.id}
                          className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="py-2 px-3 font-medium text-slate-900 dark:text-slate-100">
                            {st.name} <span className="font-mono text-slate-400 text-[10px]">({st.id})</span>
                          </td>
                          <td className="py-2 px-3 font-mono text-slate-500">{st.roll_no}</td>
                          <td className="py-2 px-3 text-slate-500">{st.branch} Sem {st.semester} ({st.section})</td>
                          <td className="py-2 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => setUnassignTarget(st.id)}
                              className="text-rose-600 hover:text-rose-800 text-xs font-medium inline-flex items-center gap-1"
                            >
                              <UserMinus className="w-3.5 h-3.5" />
                              <span>Unassign</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="p-4 text-xs text-slate-400">No mentees currently allocated to this faculty member.</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ConfirmDialog: Unassign */}
      <ConfirmDialog
        isOpen={!!unassignTarget}
        title="Unassign mentee"
        description="Are you sure you want to remove this student from their mentor's caseload? The student will be returned to the unassigned pool."
        confirmLabel="Unassign"
        isDestructive={true}
        onConfirm={confirmUnassign}
        onCancel={() => setUnassignTarget(null)}
      />
    </div>
  );
}
