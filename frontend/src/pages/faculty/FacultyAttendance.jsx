import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { apiRequest } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import PageHeader from '../../components/common/PageHeader';
import {
  QrCode,
  RotateCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ShieldAlert,
  Play,
  Square,
  Maximize2,
  Minimize2,
  Save
} from 'lucide-react';

const COURSES = [
  { code: 'CS401', name: 'Design & Analysis of Algorithms' },
  { code: 'CS402', name: 'Operating Systems' },
  { code: 'CS403', name: 'Database Management Systems' },
  { code: 'CS404', name: 'Computer Networks' },
  { code: 'CS405', name: 'Automata Theory' },
  { code: 'CS406', name: 'Full Stack Web Lab' },
];

export default function FacultyAttendance() {
  const toast = useToast();
  const [subjectCode, setSubjectCode] = useState('CS401');
  const [section, setSection] = useState('A');
  const [starting, setStarting] = useState(false);
  const [locationError, setLocationError] = useState('');

  // Active Session State
  const [activeSession, setActiveSession] = useState(null);
  const [qrData, setQrData] = useState(null);
  const [secondsRemaining, setSecondsRemaining] = useState(7);
  const [fullscreenMode, setFullscreenMode] = useState(false);
  const [suspiciousAttempts, setSuspiciousAttempts] = useState([]);
  const [devBypassActive, setDevBypassActive] = useState(false);
  const [savingSession, setSavingSession] = useState(false);

  // Manual roll call roster
  const [roster, setRoster] = useState([]);
  const [rosterSearch, setRosterSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Mentees fallback list for offline manual overrides
  const [mentees, setMentees] = useState([]);

  const loadSessionDetails = async (sessionId) => {
    try {
      const data = await apiRequest(`/attendance/sessions/${sessionId}`);
      setActiveSession(data.session);
      setRoster(data.roster || []);
      setSuspiciousAttempts(data.suspicious_attempts || []);
      if (data.dev_skip_geofence !== undefined) {
        setDevBypassActive(data.dev_skip_geofence);
      }
    } catch (_err) {
      // Session fetch failed
    }
  };

  const toggleDevBypass = async () => {
    try {
      const res = await apiRequest('/attendance/config/dev-toggle', { method: 'POST' });
      setDevBypassActive(res.dev_skip_geofence);
      toast.info(res.message);
    } catch (err) {
      toast.error('Failed to toggle dev bypass: ' + err.message);
    }
  };

  // Fetch initial config and mentees
  useEffect(() => {
    apiRequest('/attendance/config')
      .then((cfg) => {
        if (cfg.dev_skip_geofence) {
          setDevBypassActive(true);
        }
      })
      .catch(() => {});

    apiRequest('/faculty/mentees')
      .then((res) => setMentees(res || []))
      .catch(() => {});

    // Check if there is an active session in progress
    apiRequest('/attendance/sessions')
      .then((sessions) => {
        const active = (sessions || []).find((s) => s.status === 'active');
        if (active) {
          loadSessionDetails(active.id);
        }
      })
      .catch(() => {});
  }, []);

  // 1. Teacher starts QR attendance -> Requests Geolocation
  const handleStartQrSession = () => {
    setLocationError('');
    setStarting(true);

    if (!navigator.geolocation) {
      setStarting(false);
      setLocationError('Geolocation is not supported by your browser. Please enable location permissions.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        try {
          const session = await apiRequest('/attendance/sessions', {
            method: 'POST',
            body: JSON.stringify({
              subject_code: subjectCode,
              section: section,
              lat: latitude,
              lng: longitude,
              accuracy: accuracy,
              duration_minutes: 45
            })
          });

          setActiveSession(session);
          setRoster(Object.values(session.roster || {}));
          toast.success(`QR attendance session active at anchor (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);
          setLocationError('');
        } catch (err) {
          toast.error(err.message || 'Failed to initialize session');
        } finally {
          setStarting(false);
        }
      },
      (geoErr) => {
        setStarting(false);
        if (devBypassActive) {
          // Allow dev fallback coordinates if bypass is explicitly on
          toast.info('Using mock campus anchor coordinates in Dev Mode');
          apiRequest('/attendance/sessions', {
            method: 'POST',
            body: JSON.stringify({
              subject_code: subjectCode,
              section: section,
              lat: 28.5450,
              lng: 77.1926,
              accuracy: 10.0,
              duration_minutes: 45
            })
          })
            .then((session) => {
              setActiveSession(session);
              setRoster(Object.values(session.roster || {}));
            })
            .catch((err) => toast.error(err.message));
          return;
        }

        if (geoErr.code === geoErr.PERMISSION_DENIED) {
          setLocationError(
            'Location access was denied. LearnWell requires the instructor location to anchor the 150 m geo-fence. Please allow location in your browser and click "Start QR attendance" again.'
          );
        } else {
          setLocationError(
            'Unable to acquire browser location. Please check your system location service and retry.'
          );
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  // 2. Poll QR token every second when session is active
  useEffect(() => {
    if (!activeSession || activeSession.status !== 'active') return;

    let isMounted = true;

    const fetchToken = async () => {
      try {
        const data = await apiRequest(`/attendance/sessions/${activeSession.id}/qr`);
        if (!isMounted) return;
        setQrData(data);
        setSecondsRemaining(data.seconds_remaining);
        setSuspiciousAttempts(data.suspicious_attempts || []);

        // Update roster with latest scanned status
        if (data.recent_scanned && data.recent_scanned.length > 0) {
          setRoster((prev) => {
            const updated = [...prev];
            data.recent_scanned.forEach((scanned) => {
              const idx = updated.findIndex((r) => r.student_id === scanned.student_id);
              if (idx !== -1) {
                updated[idx] = { ...updated[idx], ...scanned };
              }
            });
            return updated;
          });
        }
      } catch (_err) {
        // Polling retry
      }
    };

    fetchToken();
    const interval = setInterval(fetchToken, 1000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [activeSession?.id, activeSession?.status]);

  // 3. End Session
  const handleEndSession = async () => {
    if (!activeSession) return;
    try {
      const res = await apiRequest(`/attendance/sessions/${activeSession.id}/end`, {
        method: 'POST'
      });
      setActiveSession((prev) => ({ ...prev, status: 'closed' }));
      setRoster(res.roster || []);
      toast.success('Session closed. Unscanned students are marked absent.');
    } catch (err) {
      toast.error('Failed to end session: ' + err.message);
    }
  };

  // 4. Manual override for a student in session
  const handleToggleStudentStatus = async (studentId, newStatus) => {
    if (!activeSession) return;
    try {
      await apiRequest(`/attendance/sessions/${activeSession.id}/override`, {
        method: 'POST',
        body: JSON.stringify({
          student_id: studentId,
          status: newStatus,
          reason: 'Teacher manual adjustment'
        })
      });

      setRoster((prev) =>
        prev.map((r) => (r.student_id === studentId ? { ...r, status: newStatus } : r))
      );
      toast.success(`Updated status to ${newStatus}`);
    } catch (err) {
      toast.error('Failed to update status: ' + err.message);
    }
  };

  // 5. Finalize / Save Attendance
  const handleSaveAttendance = async () => {
    if (!activeSession) return;
    setSavingSession(true);
    try {
      await apiRequest(`/attendance/sessions/${activeSession.id}/finalize`, {
        method: 'POST'
      });
      setActiveSession((prev) => ({ ...prev, is_finalized: true, status: 'finalized' }));
      toast.success('Attendance saved to student records and risk profile updated!');
    } catch (err) {
      toast.error(err.message || 'Failed to save attendance');
    } finally {
      setSavingSession(false);
    }
  };

  // Direct manual mark for mentees (standalone)
  const handleManualMarkMentee = async (studentId, statusVal) => {
    try {
      await apiRequest('/attendance/manual', {
        method: 'POST',
        body: JSON.stringify({
          student_id: studentId,
          subject_code: subjectCode,
          status: statusVal
        })
      });
      toast.success(`Recorded ${statusVal} for student`);
    } catch (err) {
      toast.error(err.message || 'Failed to record attendance');
    }
  };

  // Filter roster
  const filteredRoster = roster.filter((r) => {
    const matchesSearch =
      r.student_name?.toLowerCase().includes(rosterSearch.toLowerCase()) ||
      r.roll_no?.toLowerCase().includes(rosterSearch.toLowerCase()) ||
      r.student_id?.toLowerCase().includes(rosterSearch.toLowerCase());

    const matchesStatus =
      statusFilter === 'ALL' || r.status?.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const presentCount = roster.filter((r) => r.status === 'present' || r.status === 'late').length;
  const totalCount = roster.length;
  const progressPct = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

  // Circular timer calculation (7 seconds rotation)
  const circumference = 2 * Math.PI * 18;
  const strokeDashoffset = circumference - (secondsRemaining / 7) * circumference;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Class attendance"
        subtitle="Live rotating QR check-in with 150m geo-fencing, anti-proxy verification, and manual roll-call override."
      />

      {/* Dev Bypass Notification Banner */}
      {devBypassActive && (
        <div className="p-3 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="font-semibold">Geo-fence disabled (dev)</span>
            <span className="text-slate-500 dark:text-slate-400">
              — Students can scan from any location or device for testing.
            </span>
          </div>
          <button
            type="button"
            onClick={toggleDevBypass}
            className="px-2.5 py-1 rounded bg-amber-200 dark:bg-amber-900/60 hover:bg-amber-300 text-amber-900 dark:text-amber-100 font-medium text-[11px] transition-colors"
          >
            Disable Dev Mode
          </button>
        </div>
      )}

      {/* Location Permission Block Warning */}
      {locationError && (
        <div className="p-4 rounded-md bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs space-y-2">
          <div className="flex items-center gap-2 font-semibold">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>Classroom Anchor Required</span>
          </div>
          <p className="leading-relaxed">{locationError}</p>
          <div className="pt-1 flex items-center gap-3">
            <button
              type="button"
              onClick={handleStartQrSession}
              className="px-3 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white font-medium"
            >
              Retry Location Access
            </button>
            <button
              type="button"
              onClick={toggleDevBypass}
              className="px-3 py-1 rounded border border-rose-300 dark:border-rose-800 bg-white dark:bg-slate-900 text-rose-700 dark:text-rose-300 hover:bg-rose-50 font-medium"
            >
              Or Enable Dev Bypass
            </button>
          </div>
        </div>
      )}

      {/* Control Bar: Class / Section Selection & Actions */}
      <div className="p-4 sm:p-5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <QrCode className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Session Setup & Controls</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select class and section to broadcast the 7-second rotating QR code.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div>
              <label htmlFor="course-select-qr" className="sr-only">Course</label>
              <select
                id="course-select-qr"
                disabled={activeSession && activeSession.status === 'active'}
                value={subjectCode}
                onChange={(e) => setSubjectCode(e.target.value)}
                className="py-1.5 px-2.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus-visible:ring-1 focus-visible:ring-indigo-500"
              >
                {COURSES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} — {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="section-select-qr" className="sr-only">Section</label>
              <select
                id="section-select-qr"
                disabled={activeSession && activeSession.status === 'active'}
                value={section}
                onChange={(e) => setSection(e.target.value)}
                className="py-1.5 px-2.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus-visible:ring-1 focus-visible:ring-indigo-500"
              >
                <option value="A">Section A</option>
                <option value="B">Section B</option>
                <option value="ALL">All Sections</option>
              </select>
            </div>

            {!activeSession || activeSession.status === 'closed' || activeSession.status === 'finalized' ? (
              <button
                type="button"
                onClick={handleStartQrSession}
                disabled={starting}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
              >
                {starting ? (
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-current" />
                )}
                <span>Start QR attendance</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleEndSession}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-sm transition-colors"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>End session</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFullscreenMode(true)}
                  className="p-1.5 rounded-md border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium"
                  title="Projector mode"
                  aria-label="Projector mode"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ACTIVE SESSION DISPLAY (Projector-Friendly QR & Live Status) */}
      {activeSession && activeSession.status === 'active' && qrData && (
        <div className="p-6 rounded-lg border-2 border-indigo-200 dark:border-indigo-900/80 bg-white dark:bg-slate-900 space-y-6 shadow-sm">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6 pb-6 border-b border-slate-100 dark:border-slate-800">
            {/* Projector-Friendly High-Contrast QR Code */}
            <div className="flex flex-col items-center gap-3">
              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-md">
                <QRCodeSVG
                  value={qrData.qr_url}
                  size={240}
                  level="M"
                  includeMargin={true}
                  className="rounded"
                />
              </div>

              {/* Countdown Timer with Visual Ring */}
              <div className="flex items-center gap-3">
                <div className="relative w-10 h-10 flex items-center justify-center">
                  <svg className="w-10 h-10 -rotate-90">
                    <circle
                      cx="20"
                      cy="20"
                      r="18"
                      stroke="currentColor"
                      strokeWidth="3"
                      fill="transparent"
                      className="text-slate-100 dark:text-slate-800"
                    />
                    <circle
                      cx="20"
                      cy="20"
                      r="18"
                      stroke="currentColor"
                      strokeWidth="3"
                      fill="transparent"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      className={`transition-all duration-500 ${
                        secondsRemaining <= 2
                          ? 'text-rose-500'
                          : secondsRemaining <= 4
                          ? 'text-amber-500'
                          : 'text-indigo-600 dark:text-indigo-400'
                      }`}
                    />
                  </svg>
                  <span className="absolute font-mono font-bold text-xs text-slate-800 dark:text-slate-200">
                    {secondsRemaining}s
                  </span>
                </div>
                <div className="text-left">
                  <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 block">
                    Rotating Token
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    Refreshes every 7s • Grace window: 1 slot
                  </span>
                </div>
              </div>
            </div>

            {/* Live Progress & Statistics */}
            <div className="flex-1 w-full space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 font-medium block">Live Attendance</span>
                  <div className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">
                    {presentCount}{' '}
                    <span className="text-slate-400 text-xl font-normal">of {totalCount} students marked</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs text-slate-500 block">Geofence Radius</span>
                  <span className="font-mono text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                    150 m from anchor
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>

              {/* Live list of recent scans */}
              <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-2">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Recently Verified Scans</span>
                  <span className="text-[11px] text-slate-400 font-normal">
                    Real-time stream
                  </span>
                </span>

                {qrData.recent_scanned && qrData.recent_scanned.length > 0 ? (
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pt-1">
                    {qrData.recent_scanned.map((s) => (
                      <div
                        key={s.student_id}
                        className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs shadow-2xs"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          {s.student_name}
                        </span>
                        <span className="font-mono text-[10px] text-slate-400">
                          {s.distance_meters !== null ? `(${Math.round(s.distance_meters)}m)` : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic py-2">
                    Waiting for students to scan the live QR code...
                  </p>
                )}
              </div>

              {/* Suspicious Attempts Section */}
              {suspiciousAttempts.length > 0 && (
                <div className="p-3 rounded-md bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 space-y-2">
                  <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-400 text-xs font-semibold">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>Suspicious / Rejected Attempts ({suspiciousAttempts.length})</span>
                  </div>
                  <div className="space-y-1 max-h-24 overflow-y-auto text-[11px]">
                    {suspiciousAttempts.slice(-5).map((a, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-rose-800 dark:text-rose-300 py-0.5 border-b border-rose-100 dark:border-rose-900/40 last:border-none"
                      >
                        <span className="font-medium">
                          {a.student_name} ({a.student_id}):
                        </span>
                        <span>{a.reason}</span>
                        <span className="font-mono text-slate-400">
                          {new Date(a.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SESSION CLOSED VIEW & MANUAL SAVE */}
      {activeSession && activeSession.status === 'closed' && (
        <div className="p-4 sm:p-5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 mb-1">
                Session Ended
              </span>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Attendance Review ({presentCount} Present • {totalCount - presentCount} Absent)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                All scans are now closed. Review the roster, adjust any manual overrides, and click &quot;Save attendance&quot; to apply to student records.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSaveAttendance}
                disabled={savingSession || activeSession.is_finalized}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{activeSession.is_finalized ? 'Attendance Saved' : 'Save attendance'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULLSCREEN PROJECTOR MODAL */}
      {fullscreenMode && activeSession && qrData && (
        <div className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col justify-between p-6 sm:p-12">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <span className="text-xs uppercase tracking-widest text-indigo-400 font-semibold block">
                Live Classroom Attendance
              </span>
              <h1 className="text-2xl font-bold">
                {activeSession.subject_code} — {activeSession.subject_name} (Sec {activeSession.section})
              </h1>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-md border border-slate-800">
                <Clock className="w-4 h-4 text-indigo-400" />
                <span className="font-mono text-sm font-semibold">{secondsRemaining}s</span>
              </div>

              <button
                type="button"
                onClick={() => setFullscreenMode(false)}
                className="p-2 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300"
                aria-label="Exit projector mode"
              >
                <Minimize2 className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="my-auto flex flex-col items-center justify-center gap-6">
            <div className="p-6 bg-white rounded-2xl shadow-2xl">
              <QRCodeSVG
                value={qrData.qr_url}
                size={360}
                level="M"
                includeMargin={true}
                className="rounded"
              />
            </div>

            <div className="text-center space-y-1">
              <div className="text-3xl font-extrabold text-indigo-300">
                {presentCount} of {totalCount} students marked
              </div>
              <p className="text-sm text-slate-400">
                Point your phone camera or use the in-app &quot;Scan QR&quot; button • Geo-fence: 150 m
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-between items-center text-xs text-slate-400">
            <span>LearnWell Anti-Proxy System</span>
            <span>Anchor: {activeSession.lat.toFixed(4)}, {activeSession.lng.toFixed(4)}</span>
          </div>
        </div>
      )}

      {/* ROSTER & MANUAL ROLL-CALL TABLE */}
      <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden space-y-3 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {activeSession ? `Class Roster (${activeSession.subject_code} - Sec ${activeSession.section})` : `Assigned Mentees Manual Roll Call (${subjectCode})`}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Verify student check-in status or manually mark Present / Absent.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={rosterSearch}
              onChange={(e) => setRosterSearch(e.target.value)}
              placeholder="Search student or roll..."
              className="px-2.5 py-1 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400"
            />

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="py-1 px-2 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
            >
              <option value="ALL">All Status</option>
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="unmarked">Unmarked</option>
            </select>
          </div>
        </div>

        {/* If Active Session Roster */}
        {activeSession ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                <tr>
                  <th scope="col" className="py-2.5 px-3 font-semibold">Student</th>
                  <th scope="col" className="py-2.5 px-3 font-semibold">Roll No</th>
                  <th scope="col" className="py-2.5 px-3 text-center font-semibold">Method</th>
                  <th scope="col" className="py-2.5 px-3 text-center font-semibold">Distance</th>
                  <th scope="col" className="py-2.5 px-3 text-center font-semibold">Status</th>
                  <th scope="col" className="py-2.5 px-3 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredRoster.map((s) => (
                  <tr
                    key={s.student_id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-slate-100">
                      {s.student_name}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-xs text-slate-500">
                      {s.roll_no}
                    </td>
                    <td className="py-2.5 px-3 text-center text-xs">
                      {s.mark_mode ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase">
                          {s.mark_mode}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-xs text-slate-600 dark:text-slate-300">
                      {s.distance_meters !== null && s.distance_meters !== undefined ? `${Math.round(s.distance_meters)} m` : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${
                          s.status === 'present'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
                            : s.status === 'absent'
                            ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800'
                            : 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleToggleStudentStatus(s.student_id, 'present')}
                          className={`px-2 py-0.5 rounded border text-xs font-medium transition-colors ${
                            s.status === 'present'
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50'
                          }`}
                        >
                          Present
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleStudentStatus(s.student_id, 'absent')}
                          className={`px-2 py-0.5 rounded border text-xs font-medium transition-colors ${
                            s.status === 'absent'
                              ? 'bg-rose-600 text-white border-rose-600'
                              : 'border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/50'
                          }`}
                        >
                          Absent
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* Fallback mentees list */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                <tr>
                  <th scope="col" className="py-2.5 px-3 font-semibold">Student</th>
                  <th scope="col" className="py-2.5 px-3 font-semibold">Roll No</th>
                  <th scope="col" className="py-2.5 px-3 text-center font-semibold">Overall Att.</th>
                  <th scope="col" className="py-2.5 px-3 text-right font-semibold">Manual Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {mentees.map((s) => (
                  <tr
                    key={s.student_id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-slate-100">
                      {s.student_name}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-xs text-slate-500">
                      {s.roll_no}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-xs font-medium text-slate-700 dark:text-slate-300">
                      {s.metrics?.attendance_overall}%
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleManualMarkMentee(s.student_id, 'present')}
                          className="px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-medium"
                        >
                          Present
                        </button>
                        <button
                          type="button"
                          onClick={() => handleManualMarkMentee(s.student_id, 'absent')}
                          className="px-2 py-0.5 rounded border border-rose-200 dark:border-rose-800 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-xs font-medium"
                        >
                          Absent
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
    </div>
  );
}
