import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, AlertCircle, RefreshCw } from 'lucide-react';

export default function CameraQrScanner({ isOpen, onClose, onScan }) {
  const [cameraError, setCameraError] = useState('');
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef(null);
  const readerId = 'html5-qr-reader-container';

  useEffect(() => {
    if (!isOpen) {
      if (scannerRef.current) {
        scannerRef.current
          .stop()
          .then(() => scannerRef.current.clear())
          .catch(() => {});
        scannerRef.current = null;
      }
      setScanning(false);
      setCameraError('');
      return;
    }

    setScanning(true);
    setCameraError('');

    const html5QrCode = new Html5Qrcode(readerId);
    scannerRef.current = html5QrCode;

    const config = {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0,
    };

    html5QrCode
      .start(
        { facingMode: 'environment' },
        config,
        (decodedText) => {
          // Success callback
          html5QrCode
            .stop()
            .then(() => html5QrCode.clear())
            .catch(() => {});
          scannerRef.current = null;
          setScanning(false);
          onScan(decodedText);
        },
        () => {
          // Failure callback on each non-detected frame; safe to ignore
        }
      )
      .catch((err) => {
        setScanning(false);
        setCameraError(
          typeof err === 'string'
            ? err
            : 'Unable to access device camera. Please verify camera permissions in your browser or enter the code manually.'
        );
      });

    return () => {
      if (scannerRef.current) {
        scannerRef.current
          .stop()
          .then(() => scannerRef.current.clear())
          .catch(() => {});
        scannerRef.current = null;
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-sm rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-xl">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Scan Classroom QR
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md"
            aria-label="Close scanner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-500">
          Point your camera at the live rotating QR on the classroom projector screen.
        </p>

        {/* Video stream container */}
        <div className="relative overflow-hidden rounded-md bg-black min-h-[260px] flex items-center justify-center">
          <div id={readerId} className="w-full" />

          {scanning && !cameraError && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
              <div className="w-48 h-48 border-2 border-indigo-500/80 rounded-lg relative animate-pulse">
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-indigo-400" />
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-indigo-400" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-indigo-400" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-indigo-400" />
              </div>
              <span className="text-[11px] text-white/80 bg-black/50 px-2 py-0.5 rounded mt-3">
                Align QR within box
              </span>
            </div>
          )}

          {cameraError && (
            <div className="p-4 text-center space-y-2 text-rose-200">
              <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
              <p className="text-xs leading-relaxed">{cameraError}</p>
            </div>
          )}
        </div>

        <div className="pt-1 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
