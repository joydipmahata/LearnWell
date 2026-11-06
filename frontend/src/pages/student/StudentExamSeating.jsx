import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../api/client';
import PageHeader from '../../components/common/PageHeader';
import { SkeletonCard, SkeletonTable } from '../../components/common/SkeletonLoader';
import {
  Printer,
  Calendar,
  Clock,
  MapPin,
  Building2
} from 'lucide-react';

export default function StudentExamSeating() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest('/student/exam-seating')
      .then((res) => setData(res))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonCard lines={2} />
        <SkeletonTable rows={3} cols={4} />
      </div>
    );
  }

  const { student, seating_records } = data || { student: {}, seating_records: [] };

  return (
    <div className="space-y-6">
      {/* Top Header - Hidden on Print */}
      <div className="print:hidden">
        <PageHeader
          title="Exam seating and hall ticket"
          subtitle="Examination hall allocations, desk numbers, and printable candidate admission ticket."
          actions={
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-medium focus-visible:ring-2 shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print hall ticket</span>
            </button>
          }
        />
      </div>

      {/* Overview Cards - Hidden on Print */}
      <div className="print:hidden space-y-3">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Scheduled examinations
        </h2>

        {seating_records.length === 0 ? (
          <div className="p-6 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center text-xs text-slate-500">
            No examination seating allocations released yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {seating_records.map((rec, i) => (
              <div
                key={i}
                className="p-4 sm:p-5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                    {rec.exam_name}
                  </span>
                  <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    Seat: {rec.seat_no}
                  </span>
                </div>

                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {rec.subject}
                </h3>

                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{rec.exam_date}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{rec.exam_time}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-medium text-slate-800 dark:text-slate-200">Hall: {rec.room_no}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{rec.block}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Printable Hall Ticket Document */}
      <div className="p-6 sm:p-8 rounded-md bg-white text-slate-900 border border-slate-300 shadow-xs max-w-3xl mx-auto print:border-none print:shadow-none print:p-0">
        {/* Ticket Header */}
        <div className="text-center pb-4 border-b border-slate-900">
          <div className="text-[11px] font-semibold text-slate-600">
            LearnWell Institute of Technology &amp; Sciences
          </div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 mt-0.5">
            Examination Hall Ticket (Admit Card)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            End-Term / Continuous Internal Assessments Academic Year 2025–2026
          </p>
        </div>

        {/* Candidate Info Grid */}
        <div className="py-4 border-b border-slate-200 grid grid-cols-3 sm:grid-cols-4 gap-4 text-xs">
          <div className="col-span-2 sm:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-y-2.5">
            <div>
              <span className="text-slate-500 text-[10px] block">Candidate name</span>
              <span className="font-semibold text-slate-900 text-sm">{student.name}</span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">Student ID</span>
              <span className="font-mono text-slate-900">{student.id}</span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">Roll number</span>
              <span className="font-mono text-slate-900 font-semibold">{student.roll_no}</span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">Branch &amp; semester</span>
              <span className="text-slate-900">{student.branch} • Semester {student.semester}</span>
            </div>
          </div>

          <div className="col-span-1 flex flex-col items-center justify-center border border-dashed border-slate-300 rounded p-2 bg-slate-50 text-center">
            <span className="text-[10px] text-slate-400">Affix photo</span>
          </div>
        </div>

        {/* Timetable Table */}
        <div className="py-4 overflow-x-auto">
          <h3 className="text-xs font-semibold text-slate-800 mb-2">
            Course schedule &amp; seating details
          </h3>

          <table className="w-full text-left text-xs border border-slate-200 border-collapse">
            <thead className="bg-slate-50 text-slate-700 font-semibold text-[11px] border-b border-slate-200">
              <tr>
                <th scope="col" className="p-2 border-r border-slate-200">Date &amp; time</th>
                <th scope="col" className="p-2 border-r border-slate-200">Course / subject</th>
                <th scope="col" className="p-2 border-r border-slate-200 text-center">Hall</th>
                <th scope="col" className="p-2 border-r border-slate-200 text-center">Seat</th>
                <th scope="col" className="p-2 text-center">Signature</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {seating_records.map((r, i) => (
                <tr key={i}>
                  <td className="p-2 border-r border-slate-200 font-mono text-[11px]">
                    {r.exam_date}
                    <div className="text-slate-500">{r.exam_time}</div>
                  </td>
                  <td className="p-2 border-r border-slate-200 font-medium">{r.subject}</td>
                  <td className="p-2 border-r border-slate-200 text-center font-semibold">{r.room_no}</td>
                  <td className="p-2 border-r border-slate-200 text-center font-mono font-semibold">{r.seat_no}</td>
                  <td className="p-2 text-center text-slate-400 font-mono text-[11px]">___________</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Instructions & Signature */}
        <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 text-xs">
          <div className="space-y-0.5 text-[11px] text-slate-500 max-w-sm">
            <p className="font-semibold text-slate-700">Instructions:</p>
            <p>1. Present this hall ticket along with your college identity card.</p>
            <p>2. Electronic gadgets and unauthorized materials are strictly prohibited.</p>
          </div>

          <div className="flex gap-6 text-center text-[11px] self-end sm:self-auto">
            <div>
              <div className="h-8 border-b border-slate-400 mb-1 w-24"></div>
              <span className="text-slate-600">Candidate signature</span>
            </div>
            <div>
              <div className="h-8 border-b border-slate-400 mb-1 w-24"></div>
              <span className="text-slate-600">Controller of exams</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
