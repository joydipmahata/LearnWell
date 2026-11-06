import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import { SkeletonTable } from '../../components/common/SkeletonLoader';
import {
  FileSpreadsheet,
  Upload,
  Download,
  Ticket
} from 'lucide-react';

export default function AdminExamSeating() {
  const [seating, setSeating] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const toast = useToast();

  const loadSeating = () => {
    setLoading(true);
    apiRequest('/admin/exam-seating')
      .then((res) => setSeating(res || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadSeating();
  }, []);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    try {
      const res = await apiRequest('/admin/exam-seating/upload', {
        method: 'POST',
        body: formData,
      });
      toast.success(`Uploaded ${res.records_added} records successfully. Total: ${res.total_records}`);
      loadSeating();
    } catch (err) {
      toast.error(err.message || 'CSV upload failed');
    } finally {
      setUploading(false);
    }
  };

  const downloadSampleCSV = () => {
    const sample = `student_id,student_name,roll_no,exam_name,subject,exam_date,exam_time,room_no,seat_no,block\nLW-STU-0001,Aarav Mehta,23BCSE001,Spring Mid-Term 2026,Design & Analysis of Algorithms,2026-03-25,10:00 AM - 01:00 PM,LH-101,R1-C1,Academic Complex Block B\nLW-STU-0002,Priya Nair,23BCSE002,Spring Mid-Term 2026,Design & Analysis of Algorithms,2026-03-25,10:00 AM - 01:00 PM,LH-101,R1-C2,Academic Complex Block B`;
    const encodedUri = encodeURI('data:text/csv;charset=utf-8,' + sample);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'sample_exam_seating.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Exam seating management"
        subtitle="Upload institutional CSV rosters for student desk allocations and hall ticket generation."
        actions={
          <button
            type="button"
            onClick={downloadSampleCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 focus-visible:ring-1"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Sample CSV</span>
          </button>
        }
      />

      {/* CSV Upload Desk */}
      <div className="p-6 rounded-md border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-center">
        <div className="max-w-md mx-auto space-y-2.5">
          <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 mx-auto">
            <Upload className="w-5 h-5" />
          </div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Upload examination seating roster
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            CSV must include columns: <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300">student_id, student_name, roll_no, exam_name, subject, exam_date, exam_time, room_no, seat_no, block</span>
          </p>

          <div className="pt-2">
            <label className="inline-block cursor-pointer">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                disabled={uploading}
                className="sr-only"
              />
              <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium focus-visible:ring-2">
                {uploading ? 'Processing CSV...' : 'Select CSV file'}
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Active Records Table */}
      <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
          <span className="font-medium text-slate-800 dark:text-slate-200">
            Current active seating records ({seating.length})
          </span>
          <span className="text-slate-500">Published to student portals</span>
        </div>

        {loading ? (
          <SkeletonTable rows={5} cols={6} />
        ) : seating.length === 0 ? (
          <EmptyState
            icon={Ticket}
            title="No seating records currently uploaded"
            description="Use the upload area above with a valid CSV to publish desk allocations."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                <tr>
                  <th scope="col" className="py-2 px-3 font-semibold">Student ID</th>
                  <th scope="col" className="py-2 px-3 font-semibold">Student</th>
                  <th scope="col" className="py-2 px-3 font-semibold">Roll no</th>
                  <th scope="col" className="py-2 px-3 font-semibold">Course / exam</th>
                  <th scope="col" className="py-2 px-3 text-center font-semibold">Hall</th>
                  <th scope="col" className="py-2 px-3 text-center font-semibold">Seat</th>
                  <th scope="col" className="py-2 px-3 text-right font-semibold">Date &amp; time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {seating.map((r, i) => (
                  <tr
                    key={i}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-2.5 px-3 font-mono text-xs text-slate-600 dark:text-slate-400">{r.student_id}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-slate-100">{r.student_name}</td>
                    <td className="py-2.5 px-3 font-mono text-xs text-slate-500">{r.roll_no}</td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">{r.subject}</td>
                    <td className="py-2.5 px-3 text-center font-semibold text-indigo-600 dark:text-indigo-400">{r.room_no}</td>
                    <td className="py-2.5 px-3 text-center font-mono font-medium text-slate-800 dark:text-slate-200">{r.seat_no}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-xs text-slate-500">
                      {r.exam_date} ({r.exam_time})
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
