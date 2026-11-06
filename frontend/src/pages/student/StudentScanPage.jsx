import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { apiRequest } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import {
  CheckCircle2,
  XCircle,
  MapPin,
  Clock,
  RotateCw,
  ArrowRight,
  AlertTriangle,
  Compass
} from 'lucide-react';

export default function StudentScanPage() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('s');
  const token = searchParams.get('t');
  const { user } = useAuth();
  const navigate = useNavigate();

  const [status, setStatus] = useState('locating'); // 'locating' | 'submitting' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const [successData, setSuccessData] = useState(null);
  const [markedTime, setMarkedTime] = useState('');
  const [devBypassActive, setDevBypassActive] = useState(false);

  // Check config on load
  useEffect(() => {
    apiRequest('/attendance/config')
      .then((cfg) => {
        if (cfg.dev_skip_geofence) {
          setDevBypassActive(true);
        }
      })
      .catch(() => {});
  }, []);

  const getDeviceId = () => {
    let id = localStorage.getItem('learnwell_device_id');
    if (!id) {
      id = 'DEV-' + Math.random().toString(36).substring(2, 10).toUpperCase();
      localStorage.setItem('learnwell_device_id', id);
    }
    return id;
  };

  const verifyAndSubmit = () => {
    if (!sessionId || !token) {
      setStatus('error');
      setErrorMessage('Invalid QR link: Missing session ID or verification token.');
      return;
    }

    setStatus('locating');
    setErrorMessage('');

    if (!navigator.geolocation) {
      setStatus('error');
      setErrorMessage('Geolocation is not supported by your browser. Please use a modern mobile browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setLocationDetails({ latitude, longitude, accuracy });
        setStatus('submitting');

        try {
          const res = await apiRequest('/attendance/scan', {
            method: 'POST',
            body: JSON.stringify({
              session_id: sessionId,
              token: token,
              lat: latitude,
              lng: longitude,
              accuracy: accuracy,
              device_id: getDeviceId()
            }),
          });

          setSuccessData(res);
          setMarkedTime(new Date().toLocaleTimeString());
          setStatus('success');
        } catch (err) {
          setStatus('error');
          setErrorMessage(err.message || 'Failed to verify attendance');
        }
      },
      (geoErr) => {
        // If dev skip geofence is enabled, allow submitting without coordinates
        if (devBypassActive) {
          setStatus('submitting');
          apiRequest('/attendance/scan', {
            method: 'POST',
            body: JSON.stringify({
              session_id: sessionId,
              token: token,
              lat: 0.0,
              lng: 0.0,
              accuracy: 50.0,
              device_id: getDeviceId()
            }),
          })
            .then((res) => {
              setSuccessData(res);
              setMarkedTime(new Date().toLocaleTimeString());
              setStatus('success');
            })
            .catch((err) => {
              setStatus('error');
              setErrorMessage(err.message || 'Failed to verify attendance');
            });
          return;
        }

        setStatus('error');
        if (geoErr.code === geoErr.PERMISSION_DENIED) {
          setErrorMessage('Location permission denied. Please allow location access in your browser to verify classroom presence.');
        } else if (geoErr.code === geoErr.TIMEOUT) {
          setErrorMessage('Location request timed out. Please ensure GPS is enabled and try again.');
        } else {
          setErrorMessage('Unable to determine location. Please move near a window or check GPS settings.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  useEffect(() => {
    if (user && sessionId && token) {
      verifyAndSubmit();
    }
  }, [sessionId, token, user]);

  return (
    <div className="max-w-md mx-auto py-8 px-4 sm:px-6">
      {/* Dev Bypass Badge */}
      {devBypassActive && (
        <div className="mb-4 p-2.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>Geo-fence disabled (dev)</span>
          </div>
          <span className="text-[10px] bg-amber-200 dark:bg-amber-900/60 px-1.5 py-0.5 rounded font-mono">
            TEST MODE
          </span>
        </div>
      )}

      {/* 1. Locating State */}
      {status === 'locating' && (
        <div className="p-6 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center animate-pulse">
            <MapPin className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Acquiring GPS Location...
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Verifying your physical presence within the 150 m classroom geofence.
            </p>
          </div>
          <div className="flex justify-center items-center gap-2 text-xs text-slate-400 pt-2">
            <Compass className="w-4 h-4 animate-spin text-indigo-500" />
            <span>High-accuracy satellite lock in progress</span>
          </div>
        </div>
      )}

      {/* 2. Submitting State */}
      {status === 'submitting' && (
        <div className="p-6 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center">
            <RotateCw className="w-8 h-8 animate-spin" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Validating QR Token...
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Confirming server HMAC-SHA256 rotation token and student course enrollment.
            </p>
          </div>
        </div>
      )}

      {/* 3. Success State */}
      {status === 'success' && (
        <div className="p-6 rounded-lg border border-emerald-200 dark:border-emerald-800/80 bg-white dark:bg-slate-900 text-center space-y-5 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block mb-1">
              Attendance Verified
            </span>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {successData?.message || 'Attendance Marked!'}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Your in-person check-in has been logged successfully for{' '}
              <strong className="text-slate-700 dark:text-slate-300">
                {successData?.subject_code || 'the class'}
              </strong>
              .
            </p>
          </div>

          <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs text-left space-y-2">
            <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Marked at:</span>
              </span>
              <span className="font-mono text-slate-800 dark:text-slate-200 font-medium">
                {markedTime || 'Just now'}
              </span>
            </div>

            <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>Distance to anchor:</span>
              </span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                {successData?.distance_meters !== undefined ? `${Math.round(successData.distance_meters)} m` : 'Within range'}
              </span>
            </div>

            <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
              <span>Method:</span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                Rotating QR + Geofence
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/student/attendance')}
            className="w-full inline-flex justify-center items-center gap-2 py-2 px-4 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            <span>View Attendance Record</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 4. Error State */}
      {status === 'error' && (
        <div className="p-6 rounded-lg border border-rose-200 dark:border-rose-900/60 bg-white dark:bg-slate-900 text-center space-y-5 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center">
            <XCircle className="w-10 h-10" />
          </div>

          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400 block mb-1">
              Check-In Unsuccessful
            </span>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {errorMessage}
            </h2>
          </div>

          {/* Specific Advice according to reason */}
          <div className="p-3 rounded-md bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40 text-xs text-rose-700 dark:text-rose-300 text-left space-y-1.5">
            {errorMessage.toLowerCase().includes('expired') && (
              <p>
                The QR code rotates every 7 seconds on the projector screen. Please point your camera at the live display and rescan immediately.
              </p>
            )}
            {errorMessage.toLowerCase().includes('outside classroom') && (
              <p>
                Your GPS coordinates place you outside the 150-meter classroom boundary. You must be physically inside the lecture room to register attendance.
              </p>
            )}
            {errorMessage.toLowerCase().includes('permission') && (
              <p>
                Mobile browsers require location permission to verify geo-fencing. Please tap the lock icon in your address bar and set Location to &quot;Allow&quot;.
              </p>
            )}
            {errorMessage.toLowerCase().includes('accurate enough') && (
              <p>
                Your phone&apos;s GPS accuracy is too coarse (&gt;100 m). Please step away from concrete columns or near a window to acquire satellite lock.
              </p>
            )}
            {errorMessage.toLowerCase().includes('already marked') && (
              <p>
                Your attendance has already been recorded for this session. One scan is allowed per student.
              </p>
            )}
            {errorMessage.toLowerCase().includes('closed') && (
              <p>
                The instructor has concluded this attendance session. Please speak to your teacher for manual verification.
              </p>
            )}
            {errorMessage.toLowerCase().includes('not enrolled') && (
              <p>
                You are not registered in this class or section. Please check your assigned timetable section.
              </p>
            )}
          </div>

          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={verifyAndSubmit}
              className="w-full inline-flex justify-center items-center gap-1.5 py-2 px-4 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-colors"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Retry Verification</span>
            </button>

            <Link
              to="/student/attendance"
              className="w-full inline-block py-2 px-4 rounded-md border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium transition-colors"
            >
              Back to Attendance Dashboard
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
