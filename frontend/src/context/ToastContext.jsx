import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = {
    success: (msg, dur) => addToast(msg, 'success', dur),
    error: (msg, dur) => addToast(msg, 'error', dur),
    info: (msg, dur) => addToast(msg, 'info', dur),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0"
        aria-live="polite"
        role="region"
      >
        {toasts.map(t => {
          const isSuccess = t.type === 'success';
          const isError = t.type === 'error';
          const Icon = isSuccess ? CheckCircle2 : isError ? AlertCircle : Info;

          const bgClass = isSuccess
            ? 'bg-white dark:bg-slate-900 border-emerald-200 dark:border-emerald-800 text-slate-800 dark:text-slate-100'
            : isError
            ? 'bg-white dark:bg-slate-900 border-rose-200 dark:border-rose-800 text-slate-800 dark:text-slate-100'
            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100';

          const iconColor = isSuccess
            ? 'text-emerald-600 dark:text-emerald-400'
            : isError
            ? 'text-rose-600 dark:text-rose-400'
            : 'text-indigo-600 dark:text-indigo-400';

          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-lg border shadow-sm text-sm ${bgClass}`}
            >
              <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${iconColor}`} />
              <div className="flex-1 text-xs sm:text-sm leading-snug">{t.message}</div>
              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                aria-label="Dismiss notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      success: (m) => console.log('Toast success:', m),
      error: (m) => console.error('Toast error:', m),
      info: (m) => console.log('Toast info:', m),
    };
  }
  return ctx;
}
