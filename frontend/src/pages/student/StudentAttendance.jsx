import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import PageHeader from '../../components/common/PageHeader';
import { SkeletonTable } from '../../components/common/SkeletonLoader';
import CameraQrScanner from '../../components/attendance/CameraQrScanner';
import {
  Calculator,
  QrCode,
  CheckCircle2,
  AlertCircle,
  Camera
} from 'lucide-react';

export default function StudentAttendance() {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [qrToken, setQrToken] = useState('');
  const [submittingQr, setSubmittingQr] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const toast = useToast();

  // What-If Calculator State
  const [selectedSubject, setSelectedSubject] = useState('ALL');
  const [additionalHeld, setAdditionalHeld] = useState(10);
  const [additionalAttended, setAdditionalAttended] = useState(10);
  const [whatIfResult, setWhatIfResult] = useState(null);

  const loadAttendance = () => {
    setLoading(true);
    apiRequest('/student/attendance')
      .then((res) => setSubjects(res || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAttendance();
  }, []);

  // Recalculate what-if
  useEffect(() => {
    if (subjects.length === 0) return;

    if (selectedSubject === 'ALL') {
      const totHeld = subjects.reduce((sum, s) => sum + s.held, 0);
      const totAtt = subjects.reduce((sum, s) => sum + s.attended, 0);
      const newHeld = totHeld + additionalHeld;
      const newAtt = totAtt + Math.min(additionalHeld, additionalAttended);
      const currentPct = totHeld > 0 ? (totAtt / totHeld) * 100 : 0;
      const projPct = newHeld > 0 ? (newAtt / newHeld) * 100 : 0;
      setWhatIfResult({
        name: 'Overall attendance',
        current: currentPct.toFixed(1),
        projected: projPct.toFixed(1),
        delta: (projPct - currentPct).toFixed(1),
        isSafe: projPct >= 75.0,
      });
    } else {
      const sub = subjects.find((s) => s.subject_code === selectedSubject);
      if (sub) {
        const newHeld = sub.held + additionalHeld;
        const newAtt = sub.attended + Math.min(additionalHeld, additionalAttended);
        const projPct = newHeld > 0 ? (newAtt / newHeld) * 100 : 0;
        setWhatIfResult({
          name: sub.subject_name,
          current: sub.percentage.toFixed(1),
          projected: projPct.toFixed(1),
          delta: (projPct - sub.percentage).toFixed(1),
          isSafe: projPct >= 75.0,
        });
      }
    }
  }, [selectedSubject, additionalHeld, additionalAttended, subjects]);

  const handleDecodedQr = (decodedText) => {
    setScannerOpen(false);
    try {
      let s = null;
      let t = null;
      if (decodedText.includes('?')) {
        const qs = decodedText.split('?')[1];
        const params = new URLSearchParams(qs);
        s = params.get('s');
        t = params.get('t');
      } else if (decodedText.startsWith('{') && decodedText.endsWith('}')) {
        const obj = JSON.parse(decodedText);
        s = obj.s || obj.session_id;
        t = obj.t || obj.token;
      }

      if (s && t) {
        navigate(`/student/scan?s=${encodeURIComponent(s)}&t=${encodeURIComponent(t)}`);
      } else {
        toast.error('Scanned QR does not contain a valid session link. Please point at the classroom projector screen.');
      }
    } catch (_err) {
      toast.error('Unable to parse scanned QR code.');
    }
  };

  const handleQrSubmit = async (e) => {
    e.preventDefault();
    if (!qrToken.trim()) return;

    // Check if user pasted a full URL
    if (qrToken.includes('?s=') && qrToken.includes('&t=')) {
      handleDecodedQr(qrToken.trim());
      return;
    }

    setSubmittingQr(true);
    try {
      const res = await apiRequest('/attendance/qr/mark', {
        method: 'POST',
        body: JSON.stringify({ token: qrToken.trim() }),
      });
      toast.success(res.message || 'Attendance marked successfully');
      setQrToken('');
      loadAttendance();
    } catch (err) {
      toast.error(err.message || 'Failed to register attendance');
    } finally {
      setSubmittingQr(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Course attendance"
        subtitle="Track classes attended, test future scenarios, and register lecture tokens."
      />

      {/* QR Check-In Desk */}
      <div className="p-4 sm:p-5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shrink-0">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Register lecture check-in
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Scan the 7-second rotating QR on the classroom projector screen or enter code.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setScannerOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-medium shadow-sm transition-colors"
            >
              <Camera className="w-4 h-4" />
              <span>Scan QR with camera</span>
            </button>

            <form onSubmit={handleQrSubmit} className="flex items-center gap-1.5">
              <label htmlFor="qr-token-input" className="sr-only">
                Attendance token or URL
              </label>
              <input
                id="qr-token-input"
                type="text"
                value={qrToken}
                onChange={(e) => setQrToken(e.target.value)}
                placeholder="Paste token or link..."
                className="px-2.5 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono placeholder-slate-400 focus-visible:ring-1 focus-visible:ring-indigo-500 w-36 sm:w-44"
              />
              <button
                type="submit"
                disabled={submittingQr || !qrToken.trim()}
                className="px-2.5 py-1.5 text-xs font-medium rounded-md border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-50"
              >
                {submittingQr ? '...' : 'Verify'}
              </button>
            </form>
          </div>
        </div>
      </div>

      <CameraQrScanner
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleDecodedQr}
      />

      {/* Registered Course Table */}
      <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
          Course breakdown (current semester)
        </h2>

        {loading ? (
          <SkeletonTable rows={4} cols={6} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                <tr>
                  <th scope="col" className="py-2.5 px-3 font-semibold">Subject</th>
                  <th scope="col" className="py-2.5 px-3 text-center font-semibold">Held</th>
                  <th scope="col" className="py-2.5 px-3 text-center font-semibold">Attended</th>
                  <th scope="col" className="py-2.5 px-3 text-center font-semibold">Remaining</th>
                  <th scope="col" className="py-2.5 px-3 text-center font-semibold">Attendance</th>
                  <th scope="col" className="py-2.5 px-3 text-center font-semibold">Classes for 75%</th>
                  <th scope="col" className="py-2.5 px-3 text-right font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {subjects.map((s) => {
                  const isSafe = s.percentage >= 75.0;
                  return (
                    <tr
                      key={s.subject_code}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-slate-900 dark:text-slate-100">{s.subject_name}</div>
                        <span className="font-mono text-[11px] text-slate-400">{s.subject_code}</span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-slate-600 dark:text-slate-300">
                        {s.held}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-medium text-slate-800 dark:text-slate-200">
                        {s.attended}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-slate-500">
                        {s.remaining}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`font-semibold font-mono ${
                            isSafe ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
                          }`}
                        >
                          {s.percentage}%
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {s.classes_needed_for_75 > 0 ? (
                          <span className="text-xs px-2 py-0.5 rounded border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 font-medium">
                            +{s.classes_needed_for_75} needed
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500">None needed</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
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
        )}
      </div>

      {/* Attendance Scenario Simulator */}
      <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 rounded bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400">
            <Calculator className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Attendance scenario simulator
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Simulate upcoming lecture attendance to project whether you will cross the 75% examination threshold.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {/* Controls */}
          <div className="space-y-4 md:col-span-2">
            <div>
              <label
                htmlFor="target-scope"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Subject
              </label>
              <select
                id="target-scope"
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full text-xs sm:text-sm py-1.5 px-2.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus-visible:ring-1 focus-visible:ring-indigo-500"
              >
                <option value="ALL">All subjects (aggregate)</option>
                {subjects.map((s) => (
                  <option key={s.subject_code} value={s.subject_code}>
                    {s.subject_name} ({s.subject_code})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="upcoming-classes"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  Upcoming classes held: <span className="font-semibold text-slate-900 dark:text-slate-100">{additionalHeld}</span>
                </label>
                <input
                  id="upcoming-classes"
                  type="range"
                  min="1"
                  max="30"
                  value={additionalHeld}
                  onChange={(e) => {
                    const held = Number(e.target.value);
                    setAdditionalHeld(held);
                    if (additionalAttended > held) setAdditionalAttended(held);
                  }}
                  className="w-full accent-indigo-600"
                />
              </div>

              <div>
                <label
                  htmlFor="upcoming-attended"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  Classes you plan to attend: <span className="font-semibold text-slate-900 dark:text-slate-100">{additionalAttended}</span>
                </label>
                <input
                  id="upcoming-attended"
                  type="range"
                  min="0"
                  max={additionalHeld}
                  value={additionalAttended}
                  onChange={(e) => setAdditionalAttended(Number(e.target.value))}
                  className="w-full accent-indigo-600"
                />
              </div>
            </div>
          </div>

          {/* Projection Card */}
          {whatIfResult && (
            <div className="p-4 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex flex-col justify-between">
              <div>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Projected outcome
                </span>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-slate-100">
                    {whatIfResult.projected}%
                  </span>
                  <span
                    className={`text-xs font-medium ${
                      Number(whatIfResult.delta) >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
                    }`}
                  >
                    {Number(whatIfResult.delta) >= 0 ? `+${whatIfResult.delta}%` : `${whatIfResult.delta}%`}
                  </span>
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  Current standing: {whatIfResult.current}%
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700/80 text-xs">
                {whatIfResult.isSafe ? (
                  <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-medium">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Meets 75% examination eligibility bar</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-400 font-medium">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>Remains below 75% eligibility threshold</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
