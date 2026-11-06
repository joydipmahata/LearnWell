import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiRequest } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import RiskBadge from '../../components/RiskBadge';
import PageHeader from '../../components/common/PageHeader';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { SkeletonCard, SkeletonTable } from '../../components/common/SkeletonLoader';
import WhatIfRecoveryPlanner from '../../components/planner/WhatIfRecoveryPlanner';
import InterventionTracker from '../../components/interventions/InterventionTracker';
import {
  GraduationCap,
  MessageSquare,
  Send,
  Scale,
  PlusCircle,
  FileText,
  TrendingUp,
  Printer,
  Phone,
  Mail,
  Shield,
  Copy,
  Check
} from 'lucide-react';

export default function StudentDetailPage() {
  const { studentId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const toast = useToast();

  // Active tab: 'overview' | 'interventions' | 'chat' | 'notes' | 'timeline' | 'audit'
  const [activeTab, setActiveTab] = useState('overview');

  // Modals & form state
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideBand, setOverrideBand] = useState('Green');
  const [overrideReason, setOverrideReason] = useState('');
  const [submittingOverride, setSubmittingOverride] = useState(false);

  const [newNote, setNewNote] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);

  const [newFeedback, setNewFeedback] = useState('');
  const [feedbackSubject, setFeedbackSubject] = useState('CS401');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  const [newTimelineTitle, setNewTimelineTitle] = useState('');
  const [newTimelineDetails, setNewTimelineDetails] = useState('');
  const [submittingTimeline, setSubmittingTimeline] = useState(false);

  const [newInterventionType, setNewInterventionType] = useState('attendance counselling');
  const [newInterventionNotes, setNewInterventionNotes] = useState('');
  const [submittingIntervention, setSubmittingIntervention] = useState(false);

  const [chatMessage, setChatMessage] = useState('');
  const [sendingChat, setSendingChat] = useState(false);
  const [copiedField, setCopiedField] = useState(null);

  const copyToClipboard = (text, fieldName) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    toast.success(`${fieldName} copied to clipboard`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Reject modal state
  const [rejectingIntvId, setRejectingIntvId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const loadData = () => {
    apiRequest(`/faculty/students/${studentId}`)
      .then((res) => setData(res))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [studentId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonCard lines={2} />
        <SkeletonTable rows={4} cols={5} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <Link
          to="/faculty/mentorship"
          className="text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
        >
          ← Back to mentorship desk
        </Link>
        <div className="p-4 rounded-md border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 text-sm">
          {error || 'Student record could not be loaded.'}
        </div>
      </div>
    );
  }

  const {
    student,
    risk,
    attendance,
    exams,
    interventions,
    notes,
    feedbacks = [],
    timeline,
    audits,
    chat
  } = data;

  // Handlers
  const handleOverrideSubmit = async () => {
    if (!overrideReason.trim() || overrideReason.trim().length < 8) return;
    setSubmittingOverride(true);
    try {
      await apiRequest(`/faculty/students/${studentId}/override-band`, {
        method: 'POST',
        body: JSON.stringify({
          overridden_band: overrideBand,
          mandatory_reason: overrideReason.trim(),
        }),
      });
      setShowOverrideModal(false);
      setOverrideReason('');
      toast.success('Risk band override recorded in audit trail');
      loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to override band');
    } finally {
      setSubmittingOverride(false);
    }
  };

  const handleCreateIntervention = async (e) => {
    e.preventDefault();
    setSubmittingIntervention(true);
    try {
      await apiRequest(`/faculty/students/${studentId}/interventions`, {
        method: 'POST',
        body: JSON.stringify({
          type: newInterventionType,
          notes: newInterventionNotes.trim(),
        }),
      });
      setNewInterventionNotes('');
      toast.success('Intervention initiated');
      loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to initiate intervention');
    } finally {
      setSubmittingIntervention(false);
    }
  };

  const handleUpdateInterventionStatus = async (intvId, status, reject_reason = null) => {
    try {
      await apiRequest(`/faculty/interventions/${intvId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status,
          reject_reason,
        }),
      });
      setRejectingIntvId(null);
      setRejectReason('');
      toast.success(`Intervention updated to ${status}`);
      loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to update status');
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    setSubmittingNote(true);
    try {
      await apiRequest(`/faculty/students/${studentId}/notes`, {
        method: 'POST',
        body: JSON.stringify({ note: newNote.trim() }),
      });
      setNewNote('');
      toast.success('Internal case note saved');
      loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to save note');
    } finally {
      setSubmittingNote(false);
    }
  };

  const handleAddFeedback = async (e) => {
    e.preventDefault();
    if (!newFeedback.trim()) return;
    setSubmittingFeedback(true);
    try {
      await apiRequest(`/faculty/students/${studentId}/feedback`, {
        method: 'POST',
        body: JSON.stringify({
          feedback: newFeedback.trim(),
          semester: student.semester,
          subject_code: feedbackSubject,
        }),
      });
      setNewFeedback('');
      toast.success('Academic feedback posted for student');
      loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to post feedback');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const handleAddTimeline = async (e) => {
    e.preventDefault();
    if (!newTimelineTitle.trim() || !newTimelineDetails.trim()) return;
    setSubmittingTimeline(true);
    try {
      await apiRequest(`/faculty/students/${studentId}/timeline`, {
        method: 'POST',
        body: JSON.stringify({
          title: newTimelineTitle.trim(),
          details: newTimelineDetails.trim(),
        }),
      });
      setNewTimelineTitle('');
      setNewTimelineDetails('');
      toast.success('Academic milestone recorded');
      loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to add milestone');
    } finally {
      setSubmittingTimeline(false);
    }
  };

  const handleSendChat = async (e) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;
    setSendingChat(true);
    try {
      await apiRequest(`/faculty/students/${studentId}/chat`, {
        method: 'POST',
        body: JSON.stringify({ text: chatMessage.trim() }),
      });
      setChatMessage('');
      toast.success('Message sent to student');
      loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to send message');
    } finally {
      setSendingChat(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: 'Mentorship desk', to: '/faculty/mentorship' },
          { label: `${student.name} (${student.id})` },
        ]}
        title={student.name}
        subtitle={`Roll no: ${student.roll_no} • ${student.branch} Sem ${student.semester} (Sec ${student.section}) • ${student.email}`}
        badge={<RiskBadge band={risk.effective_band} score={risk.weighted_score} size="sm" />}
        actions={
          <div className="flex items-center gap-2 print:hidden">
            <button
              type="button"
              onClick={() => setShowOverrideModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 focus-visible:ring-1"
            >
              <Scale className="w-3.5 h-3.5 text-slate-500" />
              <span>Override band</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 focus-visible:ring-1"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>Print report</span>
            </button>
          </div>
        }
      />

      {/* Risk Band Explanation Desk */}
      <div className="p-4 sm:p-5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              Risk score: {Math.round(risk.weighted_score)} / 100
            </span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-500">
              Status: {risk.flag?.status} ({risk.flag?.days_remaining || 14} days remaining)
            </span>
          </div>
          {risk.is_overridden && (
            <span className="text-indigo-700 dark:text-indigo-300 font-medium bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
              Manually overridden by mentor
            </span>
          )}
        </div>

        <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          {risk.plain_language_explanation}
        </p>

        {/* Contributing Factors */}
        {risk.top_factors && risk.top_factors.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1">
            {risk.top_factors.map((f, i) => (
              <div
                key={i}
                className="p-2.5 rounded border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-xs"
              >
                <div className="flex items-center justify-between font-medium mb-0.5">
                  <span className="text-slate-800 dark:text-slate-200">{f.name}</span>
                  <span className="font-mono text-slate-600 dark:text-slate-400">+{f.contribution} pts</span>
                </div>
                <p className="text-[11px] text-slate-500">{f.detail}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mentee Contact Information Card (Phase 1) */}
      <div className="p-4 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800 gap-1 mb-3">
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100">
              Mentee Contact Information
            </h2>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Read-only visibility for designated mentor advising & parent contact
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Student Mobile */}
          <div className="p-3 rounded-md bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Student Mobile
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {student.student_phone || 'Not available'}
                </span>
              </div>
            </div>
            {student.student_phone && (
              <button
                type="button"
                onClick={() => copyToClipboard(student.student_phone, 'Student Phone')}
                className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs"
                title="Copy student phone"
              >
                {copiedField === 'Student Phone' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            )}
          </div>

          {/* Student Email */}
          <div className="p-3 rounded-md bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="min-w-0 pr-2">
              <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Student Email
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate block">
                  {student.email || 'Not available'}
                </span>
              </div>
            </div>
            {student.email && (
              <button
                type="button"
                onClick={() => copyToClipboard(student.email, 'Student Email')}
                className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs shrink-0"
                title="Copy student email"
              >
                {copiedField === 'Student Email' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            )}
          </div>

          {/* Parent/Guardian Phone */}
          <div className="p-3 rounded-md bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Parent / Guardian
                </span>
                <span className="px-1 py-0.1 rounded text-[9px] font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  Confidential
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {student.parent_phone || 'Not available'}
                </span>
              </div>
            </div>
            {student.parent_phone && (
              <button
                type="button"
                onClick={() => copyToClipboard(student.parent_phone, 'Parent Phone')}
                className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs"
                title="Copy parent phone"
              >
                {copiedField === 'Parent Phone' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-2 sm:space-x-4 overflow-x-auto text-xs sm:text-sm font-medium">
        {[
          { id: 'overview', label: 'Attendance & results' },
          { id: 'recovery', label: 'Recovery Planner' },
          { id: 'interventions', label: `Interventions (${interventions.length})` },
          { id: 'chat', label: 'Private messages' },
          { id: 'notes', label: `Mentor notes (${notes.length})` },
          { id: 'timeline', label: `Timeline (${timeline.length})` },
          { id: 'audit', label: 'Audit trail' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            className={`pb-2.5 px-2 shrink-0 border-b-2 transition-colors ${
              activeTab === t.id
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB: RECOVERY PLANNER */}
      {activeTab === 'recovery' && (
        <div className="space-y-4">
          <WhatIfRecoveryPlanner studentId={studentId} />
        </div>
      )}

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* Subject Attendance Table */}
          <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            <div className="p-3 border-b border-slate-100 dark:border-slate-800 text-xs font-semibold text-slate-900 dark:text-slate-100">
              Subject attendance &amp; 75% threshold recovery requirement
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm border-collapse">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                  <tr>
                    <th scope="col" className="py-2 px-3 font-semibold">Subject</th>
                    <th scope="col" className="py-2 px-3 text-center font-semibold">Held</th>
                    <th scope="col" className="py-2 px-3 text-center font-semibold">Attended</th>
                    <th scope="col" className="py-2 px-3 text-center font-semibold">Remaining</th>
                    <th scope="col" className="py-2 px-3 text-center font-semibold">Percentage</th>
                    <th scope="col" className="py-2 px-3 text-center font-semibold">Classes for 75%</th>
                    <th scope="col" className="py-2 px-3 text-right font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {attendance.map((s) => {
                    const isSafe = s.percentage >= 75.0;
                    return (
                      <tr
                        key={s.subject_code}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-2 px-3">
                          <div className="font-medium text-slate-900 dark:text-slate-100">{s.subject_name}</div>
                          <span className="font-mono text-[11px] text-slate-400">{s.subject_code}</span>
                        </td>
                        <td className="py-2 px-3 text-center font-mono text-xs text-slate-600 dark:text-slate-300">{s.held}</td>
                        <td className="py-2 px-3 text-center font-mono text-xs font-medium text-slate-800 dark:text-slate-200">{s.attended}</td>
                        <td className="py-2 px-3 text-center font-mono text-xs text-slate-400">{s.remaining}</td>
                        <td className="py-2 px-3 text-center font-mono text-xs font-medium">
                          <span className={isSafe ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}>
                            {s.percentage}%
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center text-xs">
                          {s.classes_needed_for_75 > 0 ? (
                            <span className="text-xs px-2 py-0.5 rounded border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 font-medium">
                              +{s.classes_needed_for_75} needed
                            </span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right text-xs">
                          <span
                            className={`px-2 py-0.5 rounded-full border text-[11px] font-medium ${
                              s.status === 'Safe'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
                                : s.status === 'Critical'
                                ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800'
                                : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800'
                            }`}
                          >
                            {s.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Assessment Scores & Feedback form */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
              <div className="p-3 border-b border-slate-100 dark:border-slate-800 text-xs font-semibold text-slate-900 dark:text-slate-100">
                Continuous assessment &amp; exam scores
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm border-collapse">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                    <tr>
                      <th scope="col" className="py-2 px-3 font-semibold">Evaluation</th>
                      <th scope="col" className="py-2 px-3 font-semibold">Subject</th>
                      <th scope="col" className="py-2 px-3 text-center font-semibold">Score</th>
                      <th scope="col" className="py-2 px-3 text-right font-semibold">Percentage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {exams.slice(0, 8).map((ex, i) => (
                      <tr key={i} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                        <td className="py-2 px-3 font-medium text-slate-900 dark:text-slate-100 text-xs">{ex.exam_name}</td>
                        <td className="py-2 px-3 text-slate-600 dark:text-slate-400 text-xs">{ex.subject_name}</td>
                        <td className="py-2 px-3 text-center font-mono text-xs font-medium text-slate-800 dark:text-slate-200">{ex.score} / {ex.max_marks}</td>
                        <td className="py-2 px-3 text-right font-mono text-xs font-medium">
                          <span className={ex.score_pct >= 65 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}>
                            {ex.score_pct}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Provide Academic Feedback Form */}
            <div className="p-4 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100 mb-0.5 flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Send results feedback</span>
                </h3>
                <p className="text-[11px] text-slate-500 mb-3">Visible on student's portal</p>

                <form onSubmit={handleAddFeedback} className="space-y-2.5">
                  <div>
                    <label htmlFor="feedback-subject" className="block text-[11px] text-slate-500 mb-1">
                      Subject
                    </label>
                    <select
                      id="feedback-subject"
                      value={feedbackSubject}
                      onChange={(e) => setFeedbackSubject(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                    >
                      {attendance.map((a) => (
                        <option key={a.subject_code} value={a.subject_code}>
                          {a.subject_name} ({a.subject_code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="feedback-note" className="block text-[11px] text-slate-500 mb-1">
                      Feedback note
                    </label>
                    <textarea
                      id="feedback-note"
                      rows={3}
                      value={newFeedback}
                      onChange={(e) => setNewFeedback(e.target.value)}
                      placeholder="e.g. Targeted review needed on graph traversal algorithms..."
                      className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus-visible:ring-1 focus-visible:ring-indigo-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submittingFeedback || !newFeedback.trim()}
                    className="w-full py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition-colors disabled:opacity-50"
                  >
                    {submittingFeedback ? 'Posting...' : 'Post feedback'}
                  </button>
                </form>

                {feedbacks.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                    <span className="text-[11px] font-medium text-slate-500 block">
                      Previously posted feedback ({feedbacks.length})
                    </span>
                    <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                      {feedbacks.map((f, i) => (
                        <div key={f.id || i} className="p-2.5 rounded bg-slate-50 dark:bg-slate-800/40 text-[11px] space-y-1">
                          <div className="flex justify-between items-center text-slate-400">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              {f.subject_code || 'General'} {f.semester ? `(Sem ${f.semester})` : ''}
                            </span>
                            <span className="font-mono text-[10px]">{new Date(f.created_at).toLocaleDateString()}</span>
                          </div>
                          <p className="text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                            {f.feedback || f.feedback_text}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: INTERVENTIONS */}
      {activeTab === 'interventions' && (
        <div className="space-y-6">
          {/* Phase 7: Before/After Intervention Effectiveness Tracker */}
          <InterventionTracker studentId={studentId} />

          {/* New Intervention Form */}
          <div className="p-4 sm:p-5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <PlusCircle className="w-4 h-4 text-indigo-600" />
                <span>Initiate structured intervention</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Select an intervention type and assign specific deliverables to track recovery.
              </p>
            </div>

            <form onSubmit={handleCreateIntervention} className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label htmlFor="intervention-type" className="block text-xs text-slate-500 mb-1">
                  Type
                </label>
                <select
                  id="intervention-type"
                  value={newInterventionType}
                  onChange={(e) => setNewInterventionType(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium"
                >
                  <option value="attendance counselling">Attendance counselling</option>
                  <option value="remedial/peer tutoring">Remedial / peer tutoring</option>
                  <option value="study-plan check-in">Study-plan check-in</option>
                  <option value="wellbeing referral">Wellbeing referral</option>
                </select>
              </div>

              <div>
                <label htmlFor="intervention-notes" className="block text-xs text-slate-500 mb-1">
                  Action notes
                </label>
                <input
                  id="intervention-notes"
                  type="text"
                  value={newInterventionNotes}
                  onChange={(e) => setNewInterventionNotes(e.target.value)}
                  placeholder="e.g. Weekly attendance verification with mentor..."
                  className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus-visible:ring-1 focus-visible:ring-indigo-500"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={submittingIntervention}
                  className="w-full py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition-colors"
                >
                  {submittingIntervention ? 'Initiating...' : 'Initiate intervention'}
                </button>
              </div>
            </form>
          </div>

          {/* Interventions List */}
          <div className="space-y-2.5">
            {interventions.length === 0 ? (
              <div className="p-6 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center text-xs text-slate-500">
                No interventions recorded yet for this mentee.
              </div>
            ) : (
              interventions.map((intv) => (
                <div
                  key={intv.id}
                  className="p-3.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900 dark:text-slate-100 capitalize">
                        {intv.type}
                      </span>
                      <span
                        className={`text-[11px] font-medium px-2 py-0.2 rounded-full border capitalize ${
                          intv.status === 'done'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
                            : intv.status === 'in progress'
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800'
                            : intv.status === 'rejected'
                            ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800'
                            : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800'
                        }`}
                      >
                        {intv.status}
                      </span>
                    </div>

                    <p className="text-slate-600 dark:text-slate-400">
                      {intv.notes || 'No specific notes.'}
                    </p>

                    {intv.reject_reason && (
                      <p className="text-rose-700 dark:text-rose-400 font-medium">
                        Rejection reason: {intv.reject_reason}
                      </p>
                    )}

                    <span className="text-[11px] text-slate-400 block font-mono">
                      Logged: {new Date(intv.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleUpdateInterventionStatus(intv.id, 'accepted')}
                      className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 text-[11px] font-medium"
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateInterventionStatus(intv.id, 'in progress')}
                      className="px-2 py-1 rounded border border-indigo-200 dark:border-indigo-800 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[11px] font-medium"
                    >
                      In progress
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateInterventionStatus(intv.id, 'done')}
                      className="px-2 py-1 rounded border border-emerald-200 dark:border-emerald-800 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[11px] font-medium"
                    >
                      Mark done
                    </button>
                    <button
                      type="button"
                      onClick={() => setRejectingIntvId(intv.id)}
                      className="px-2 py-1 rounded border border-rose-200 dark:border-rose-800 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-[11px] font-medium"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: CHAT */}
      {activeTab === 'chat' && (
        <div className="p-4 sm:p-5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col h-[480px]">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800 mb-3">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-slate-500" />
              <span>Direct messages with {student.name}</span>
            </h2>
            <span className="text-xs text-slate-400">Private</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
            {chat.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-xs text-slate-400">
                <MessageSquare className="w-6 h-6 text-slate-300 dark:text-slate-700 mb-1" />
                <span>No messages yet. Send a check-in note to connect.</span>
              </div>
            ) : (
              chat.map((m) => {
                const isMentor = m.sender_id !== student.id;
                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${isMentor ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-md px-3 py-2 text-xs leading-relaxed ${
                        isMentor
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{m.text}</p>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-0.5 px-1 font-mono">
                      {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          <form onSubmit={handleSendChat} className="pt-3 border-t border-slate-100 dark:border-slate-800 flex gap-2">
            <label htmlFor="detail-chat-input" className="sr-only">
              Direct message
            </label>
            <input
              id="detail-chat-input"
              type="text"
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              placeholder={`Message ${student.name.split(' ')[0]} directly...`}
              className="flex-1 px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus-visible:ring-1 focus-visible:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={sendingChat || !chatMessage.trim()}
              className="px-3.5 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-medium focus-visible:ring-2 disabled:opacity-50 flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </form>
        </div>
      )}

      {/* TAB 4: MENTOR NOTES */}
      {activeTab === 'notes' && (
        <div className="space-y-4">
          <div className="p-4 sm:p-5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-slate-500" />
                <span>Internal mentoring notes</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Confidential case notes for your records and session observations.
              </p>
            </div>

            <form onSubmit={handleAddNote} className="space-y-2.5">
              <label htmlFor="case-internal-note" className="sr-only">
                Case note
              </label>
              <textarea
                id="case-internal-note"
                rows={3}
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Document meeting observations, commitments, or extenuating circumstances..."
                className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus-visible:ring-1 focus-visible:ring-indigo-500"
              />
              <button
                type="submit"
                disabled={submittingNote || !newNote.trim()}
                className="px-3.5 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition-colors disabled:opacity-50"
              >
                {submittingNote ? 'Saving...' : 'Save note'}
              </button>
            </form>
          </div>

          <div className="space-y-2.5">
            {notes.map((n) => (
              <div
                key={n.id}
                className="p-3.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs space-y-1"
              >
                <span className="text-[11px] text-slate-400 font-mono block">
                  Recorded: {new Date(n.created_at).toLocaleDateString()}
                </span>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{n.note}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: TIMELINE */}
      {activeTab === 'timeline' && (
        <div className="space-y-4">
          <div className="p-4 sm:p-5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-teal-600" />
                <span>Record demonstrated improvement</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Record verified milestones and recovery turnarounds into the student case record.
              </p>
            </div>

            <form onSubmit={handleAddTimeline} className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label htmlFor="milestone-title" className="block text-xs text-slate-500 mb-1">
                  Milestone title
                </label>
                <input
                  id="milestone-title"
                  type="text"
                  value={newTimelineTitle}
                  onChange={(e) => setNewTimelineTitle(e.target.value)}
                  placeholder="e.g. Attended 100% lectures this week"
                  className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus-visible:ring-1 focus-visible:ring-indigo-500"
                />
              </div>
              <div className="md:col-span-2">
                <label htmlFor="milestone-details" className="block text-xs text-slate-500 mb-1">
                  Details
                </label>
                <div className="flex gap-2">
                  <input
                    id="milestone-details"
                    type="text"
                    value={newTimelineDetails}
                    onChange={(e) => setNewTimelineDetails(e.target.value)}
                    placeholder="e.g. Completed all lab checkpoints and submitted programming assignment."
                    className="flex-1 px-2.5 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus-visible:ring-1 focus-visible:ring-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={submittingTimeline}
                    className="px-3.5 py-1.5 rounded-md bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium transition-colors"
                  >
                    {submittingTimeline ? 'Saving...' : 'Add'}
                  </button>
                </div>
              </div>
            </form>
          </div>

          <div className="space-y-2.5">
            {timeline.map((t) => (
              <div
                key={t.id}
                className="p-3.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs flex items-center justify-between"
              >
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100">{t.title}</h3>
                  <p className="text-slate-600 dark:text-slate-400 mt-0.5">{t.details}</p>
                </div>
                <span className="font-mono text-xs text-slate-400 shrink-0 ml-4">{t.date}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: AUDIT TRAIL */}
      {activeTab === 'audit' && (
        <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="p-3 border-b border-slate-100 dark:border-slate-800 text-xs font-semibold text-slate-900 dark:text-slate-100">
            Case file audit trail
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {audits.map((a) => (
              <div key={a.id} className="p-3 text-xs flex items-start justify-between gap-4">
                <div>
                  <span className="font-mono font-medium text-slate-900 dark:text-slate-100">
                    {a.action}
                  </span>
                  <p className="text-slate-500 mt-0.5">{a.details}</p>
                </div>
                <div className="text-right text-slate-400 shrink-0 font-mono text-[11px]">
                  <span>{new Date(a.timestamp).toLocaleString()}</span>
                  <span className="block text-slate-500">by {a.performed_by}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ConfirmDialog: Band Override */}
      <ConfirmDialog
        isOpen={showOverrideModal}
        title="Override risk band"
        description="Mentor overrides are recorded in the institutional audit log. Please state the pedagogical justification (minimum 8 characters)."
        confirmLabel={submittingOverride ? 'Saving...' : 'Confirm override'}
        confirmDisabled={submittingOverride || overrideReason.trim().length < 8}
        onConfirm={handleOverrideSubmit}
        onCancel={() => setShowOverrideModal(false)}
      >
        <div className="space-y-3 pt-2">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Target risk band
            </label>
            <div className="grid grid-cols-3 gap-2">
              {['Green', 'Amber', 'Red'].map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setOverrideBand(b)}
                  className={`py-1.5 rounded-md text-xs font-medium border transition-colors ${
                    overrideBand === b
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label
              htmlFor="override-reason-input"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Justification reason
            </label>
            <textarea
              id="override-reason-input"
              required
              rows={3}
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              placeholder="e.g. Student submitted documented medical leave for absences; caught up in office hours."
              className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus-visible:ring-1 focus-visible:ring-indigo-500"
            />
          </div>
        </div>
      </ConfirmDialog>

      {/* ConfirmDialog: Reject Intervention */}
      <ConfirmDialog
        isOpen={!!rejectingIntvId}
        title="Reject proposed intervention"
        description="Please provide the clinical or pedagogical reason for rejecting this proposed intervention."
        confirmLabel="Confirm rejection"
        isDestructive={true}
        onConfirm={() => handleUpdateInterventionStatus(rejectingIntvId, 'rejected', rejectReason)}
        onCancel={() => {
          setRejectingIntvId(null);
          setRejectReason('');
        }}
      >
        <div className="pt-2">
          <label htmlFor="reject-reason-input" className="sr-only">
            Rejection reason
          </label>
          <textarea
            id="reject-reason-input"
            rows={3}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="e.g. Duplicate action plan; student is already attending peer tutoring sessions."
            className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus-visible:ring-1 focus-visible:ring-rose-500"
          />
        </div>
      </ConfirmDialog>
    </div>
  );
}
