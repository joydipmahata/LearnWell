import React, { useEffect } from 'react';
import { AlertCircle, AlertTriangle, X } from 'lucide-react';

export default function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDestructive = false,
  confirmDisabled = false,
  onConfirm,
  onCancel,
  children,
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onCancel();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div
              className={`p-2 rounded-md shrink-0 ${
                isDestructive
                  ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'
                  : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400'
              }`}
            >
              {isDestructive ? <AlertCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            </div>
            <div>
              <h3 id="confirm-dialog-title" className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {title}
              </h3>
              {description && (
                <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {description}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {children && <div className="pt-1">{children}</div>}

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 py-2 text-xs sm:text-sm font-medium rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 focus-visible:ring-2"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={confirmDisabled}
            onClick={onConfirm}
            className={`px-3.5 py-2 text-xs sm:text-sm font-medium rounded-md text-white focus-visible:ring-2 disabled:opacity-50 disabled:cursor-not-allowed ${
              isDestructive
                ? 'bg-rose-600 hover:bg-rose-700 focus-visible:ring-rose-500'
                : 'bg-indigo-600 hover:bg-indigo-700 focus-visible:ring-indigo-500'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
