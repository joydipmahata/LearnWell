import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import {
  Activity,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  TrendingDown,
  TrendingUp,
  RefreshCw,
  Lightbulb,
  X,
  Clock
} from 'lucide-react';

const INTERVENTION_TYPES = [
  { id: 'counselling', label: '1-on-1 Academic Counselling' },
  { id: 'extra classes', label: 'Extra Remedial Classes' },
  { id: 'attendance warning', label: 'Formal Attendance Warning' },
  { id: 'parent contact', label: 'Parent / Guardian Contact' },
  { id: 'peer study group', label: 'Peer Study Group Referral' },
  { id: 'assignment extension', label: 'Assignment Extension' },
];

export default function InterventionTracker({ studentId, mentees = [] }) {
  const toast = useToast();
  const [interventions, setInterventions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Log Modal
  const [showLogModal, setShowLogModal] = useState(false);
  const [targetStudentId, setTargetStudentId] = useState(studentId || (mentees[0]?.student_id || ''));
  const [selectedType, setSelectedType] = useState('counselling');
  const [notes, setNotes] = useState('');
  const [followUpDays, setFollowUpDays] = useState(14);
  const [submitting, setSubmitting] = useState(false);

  const [evaluatingId, setEvaluatingId] = useState(null);

  const loadFollowUps = async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/interventions/faculty/follow-ups');
      // If studentId prop provided, filter to that student
      if (studentId) {
        setInterventions((data || []).filter(i => i.student_id === studentId));
      } else {
        setInterventions(data || []);
      }
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load interventions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFollowUps();
  }, [studentId]);

  const handleLogIntervention = async (e) => {
    e.preventDefault();
    if (!targetStudentId) {
      toast.error('Please select a student.');
      return;
    }

    setSubmitting(true);
    try {
      await apiRequest('/interventions/log', {
        method: 'POST',
        body: JSON.stringify({
          student_id: targetStudentId,
          type: selectedType,
          notes: notes.trim(),
          follow_up_days: Number(followUpDays),
        }),
      });
      toast.success('Intervention logged with baseline snapshot');
      setShowLogModal(false);
      setNotes('');
      loadFollowUps();
    } catch (err) {
      toast.error(err.message || 'Failed to log intervention');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckNow = async (id) => {
    setEvaluatingId(id);
    try {
      const res = await apiRequest(`/interventions/${id}/evaluate`, { method: 'POST' });
      toast.success(`Evaluation recorded: Outcome = ${res.outcome}`);
      loadFollowUps();
    } catch (err) {
      toast.error(err.message || 'Failed to evaluate intervention');
    } finally {
      setEvaluatingId(null);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 gap-2">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Intervention Effectiveness Tracker
          </h2>
        </div>

        <button
          type="button"
          onClick={() => {
            setTargetStudentId(studentId || (mentees[0]?.student_id || ''));
            setShowLogModal(true);
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium self-start sm:self-auto shadow-2xs"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>Log intervention</span>
        </button>
      </div>

      {/* Interventions List */}
      {loading ? (
        <div className="p-6 text-center text-xs text-slate-400 animate-pulse">
          Loading intervention follow-ups...
        </div>
      ) : error ? (
        <div className="p-3 text-xs text-rose-500">{error}</div>
      ) : interventions.length === 0 ? (
        <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
          No active interventions logged yet. Use 'Log intervention' to capture baseline academic metrics.
        </div>
      ) : (
        <div className="space-y-3">
          {interventions.map((intv) => {
            const b = intv.before_snapshot;
            const a = intv.after_snapshot;

            return (
              <div
                key={intv.id}
                className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/30 space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                      {intv.student_name} ({intv.student_id})
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 capitalize">
                      {intv.type}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Follow-up due: {intv.follow_up_due_date}
                    </span>

                    {intv.outcome ? (
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        intv.outcome === 'Improved'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : intv.outcome === 'Worsened'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}>
                        {intv.outcome}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleCheckNow(intv.id)}
                        disabled={evaluatingId === intv.id}
                        className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-medium disabled:opacity-50"
                      >
                        {evaluatingId === intv.id ? 'Checking...' : 'Check now'}
                      </button>
                    )}
                  </div>
                </div>

                {intv.notes && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 italic">
                    "{intv.notes}"
                  </p>
                )}

                {/* Before vs After Metric Snapshots */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                  <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block uppercase">Baseline Risk</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{b.risk_score} ({b.risk_band})</span>
                  </div>
                  <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block uppercase">Baseline Attendance</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{b.attendance_pct}%</span>
                  </div>
                  <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block uppercase">After-Snapshot Risk</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {a ? `${a.risk_score} (${a.risk_band})` : 'Awaiting follow-up'}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block uppercase">After Attendance</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {a ? `${a.attendance_pct}%` : 'Awaiting follow-up'}
                    </span>
                  </div>
                </div>

                {/* Alternative suggestion if outcome not improved */}
                {intv.alternative_suggestion && (
                  <div className="p-2.5 rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
                    <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">Next Step Recommendation:</span>
                      <span>{intv.alternative_suggestion}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Log Intervention */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs" role="dialog" aria-modal="true">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-600" />
                <span>Log Student Intervention</span>
              </h3>
              <button type="button" onClick={() => setShowLogModal(false)} className="p-1 rounded text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleLogIntervention} className="space-y-3">
              {!studentId && mentees.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Select Mentee
                  </label>
                  <select
                    value={targetStudentId}
                    onChange={(e) => setTargetStudentId(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    {mentees.map(m => (
                      <option key={m.student_id} value={m.student_id}>
                        {m.student_name} ({m.student_id}) - {m.effective_band} Band
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Intervention Strategy
                </label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  {INTERVENTION_TYPES.map(t => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Follow-Up Window (Days)
                </label>
                <input
                  type="number"
                  min={7}
                  max={60}
                  value={followUpDays}
                  onChange={(e) => setFollowUpDays(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Default 14 days before auto-evaluating impact.</span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Mentor Advising Notes
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Record key observations, student commitments, or remedial actions..."
                  className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowLogModal(false)}
                  className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium disabled:opacity-50"
                >
                  {submitting ? 'Logging...' : 'Capture Baseline & Log'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
