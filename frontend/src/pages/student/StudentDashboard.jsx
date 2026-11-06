import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../../api/client';
import RiskBadge from '../../components/RiskBadge';
import PageHeader from '../../components/common/PageHeader';
import { SkeletonCard, SkeletonBlock } from '../../components/common/SkeletonLoader';
import {
  CalendarCheck2,
  Ticket,
  Users2,
  Clock,
  ArrowRight,
  BookOpen,
  MessageSquare,
  Phone,
  Mail,
  Shield,
  Edit3
} from 'lucide-react';
import EditContactModal from '../../components/EditContactModal';
import TodayClassesCard from '../../components/timetable/TodayClassesCard';
import WhatIfRecoveryPlanner from '../../components/planner/WhatIfRecoveryPlanner';
import StudentInterventionTimeline from '../../components/interventions/StudentInterventionTimeline';

export default function StudentDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showContactModal, setShowContactModal] = useState(false);

  useEffect(() => {
    apiRequest('/student/dashboard')
      .then((res) => setData(res))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <SkeletonBlock className="h-7 w-48" />
          <SkeletonBlock className="h-4 w-72" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SkeletonCard lines={2} />
          <SkeletonCard lines={2} />
          <SkeletonCard lines={2} />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-4 rounded-md border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 text-sm">
        Failed to load dashboard: {error || 'Record unavailable'}
      </div>
    );
  }

  const { student, mentor, risk, attendance, next_exam, recent_notices } = data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="How am I doing?"
        subtitle={`Academic standing for ${student.name} • Roll: ${student.roll_no} • ${student.branch} Sem ${student.semester} (Sec ${student.section})`}
        actions={
          mentor && (
            <Link
              to="/student/mentor"
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-medium focus-visible:ring-2 shadow-xs"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Message mentor</span>
            </Link>
          )
        }
      />

      {/* Mentor Info Pill if assigned */}
      {mentor && (
        <div className="flex items-center justify-between p-3 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <Users2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>
              Assigned mentor: <strong className="font-semibold text-slate-900 dark:text-slate-100">{mentor.name}</strong> ({mentor.email})
            </span>
          </div>
          <Link to="/student/mentor" className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium">
            View feedback notes
          </Link>
        </div>
      )}

      {/* Today's Classes Card (Phase 2) */}
      <TodayClassesCard role="Student" />

      {/* 3 Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Risk Band & Reason */}
        <div className="p-5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Academic standing
              </span>
              <RiskBadge band={risk.effective_band} score={risk.weighted_score} size="sm" />
            </div>
            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              {risk.plain_language_explanation}
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>Flag ends in {risk.flag?.days_remaining || 14} days</span>
            </span>
            <Link
              to="/student/mentor"
              className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              <span>Action plan</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Card 2: Attendance */}
        <div className="p-5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Overall attendance
              </span>
              <div className="p-1 rounded bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                <CalendarCheck2 className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
                {attendance.overall_percentage}%
              </span>
              <span className="text-xs text-slate-500">
                ({attendance.total_attended} of {attendance.total_held} classes)
              </span>
            </div>

            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mt-3 overflow-hidden">
              <div
                className={`h-1.5 rounded-full ${
                  attendance.overall_percentage >= 75 ? 'bg-emerald-600' : 'bg-rose-600'
                }`}
                style={{ width: `${Math.min(100, attendance.overall_percentage)}%` }}
              />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span
              className={`font-medium ${
                attendance.overall_percentage >= 75
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-rose-700 dark:text-rose-400'
              }`}
            >
              {attendance.overall_percentage >= 75 ? 'Eligible for finals' : 'Below 75% threshold'}
            </span>
            <Link
              to="/student/attendance"
              className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              <span>Calculator</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Card 3: Next Exam */}
        <div className="p-5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Next exam
              </span>
              <div className="p-1 rounded bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                <Ticket className="w-3.5 h-3.5" />
              </div>
            </div>

            {next_exam ? (
              <div className="space-y-1">
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {next_exam.subject}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400">
                  {next_exam.exam_date} • {next_exam.exam_time}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Room {next_exam.room_no} • Seat {next_exam.seat_no}
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 mt-1">No upcoming exams scheduled.</p>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500">Hall ticket ready</span>
            <Link
              to="/student/exam-seating"
              className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              <span>View ticket</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* What-If Recovery Planner (Phase 6) */}
      <WhatIfRecoveryPlanner studentId={student.id} />

      {/* Contact Details Card */}
      <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Phone className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Contact Information</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Verified phone numbers and email used for academic alerts, exam updates, and mentorship communications.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowContactModal(true)}
            className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors shadow-2xs"
          >
            <Edit3 className="w-3.5 h-3.5 text-slate-500" />
            <span>Update contacts</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          {/* Student Phone */}
          <div className="p-3.5 rounded-md bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
              Student Mobile
            </span>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="font-mono text-sm font-semibold text-slate-800 dark:text-slate-200">
                {student.student_phone || 'Not recorded'}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-1">SMS & automated updates</span>
          </div>

          {/* Student Email */}
          <div className="p-3.5 rounded-md bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
              Institutional Email
            </span>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate" title={student.email}>
                {student.email || 'Not recorded'}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-1">Official notices & portal access</span>
          </div>

          {/* Parent/Guardian Phone */}
          <div className="p-3.5 rounded-md bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Parent / Guardian
              </span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                Confidential
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="font-mono text-sm font-semibold text-slate-800 dark:text-slate-200">
                {student.parent_phone || 'Not recorded'}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-1">
              Private • Only visible to you & designated mentor
            </span>
          </div>
        </div>
      </div>

      {/* Edit Contacts Modal */}
      <EditContactModal
        isOpen={showContactModal}
        onClose={() => setShowContactModal(false)}
        student={student}
        isAdmin={false}
        onSuccess={(updated) => {
          setData(prev => ({
            ...prev,
            student: {
              ...prev.student,
              student_phone: updated.student_phone,
              email: updated.student_email
            }
          }));
        }}
      />

      {/* Intervention Progress Timeline (Phase 7) */}
      <StudentInterventionTimeline />

      {/* Campus Notices */}
      <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-slate-500" />
            <span>Campus notices</span>
          </h2>
          <Link
            to="/notices"
            className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            All notices
          </Link>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {(recent_notices || []).map((notice) => (
            <div key={notice.id} className="py-2.5 first:pt-0 last:pb-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                {notice.pinned && (
                  <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    Pinned
                  </span>
                )}
                <span className="text-[11px] px-2 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  {notice.category}
                </span>
                <span className="text-xs text-slate-400">
                  {new Date(notice.created_at).toLocaleDateString()}
                </span>
              </div>
              <h3 className="text-xs sm:text-sm font-medium text-slate-900 dark:text-slate-100">
                {notice.title}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-snug">
                {notice.content}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
