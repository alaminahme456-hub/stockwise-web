import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'warning' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  message: string;
  description?: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, description?: string) => void;
  success: (message: string, description?: string) => void;
  warning: (message: string, description?: string) => void;
  error: (message: string, description?: string) => void;
  info: (message: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'success', description?: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    setToasts((prev) => [...prev.slice(-3), { id, message, type, description }]);

    setTimeout(() => {
      removeToast(id);
    }, 4000);
  }, [removeToast]);

  const success = useCallback((message: string, description?: string) => {
    showToast(message, 'success', description);
  }, [showToast]);

  const warning = useCallback((message: string, description?: string) => {
    showToast(message, 'warning', description);
  }, [showToast]);

  const error = useCallback((message: string, description?: string) => {
    showToast(message, 'error', description);
  }, [showToast]);

  const info = useCallback((message: string, description?: string) => {
    showToast(message, 'info', description);
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, success, warning, error, info }}>
      {children}
      {/* Toast Notification Container */}
      <div 
        role="status" 
        aria-live="polite"
        className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl shadow-xl border backdrop-blur-md transition-all duration-200 animate-in slide-in-from-top-2 ${
              t.type === 'success'
                ? 'bg-slate-900/95 border-emerald-500/40 text-white'
                : t.type === 'warning'
                ? 'bg-slate-900/95 border-amber-500/40 text-white'
                : t.type === 'error'
                ? 'bg-slate-900/95 border-rose-500/40 text-white'
                : 'bg-slate-900/95 border-blue-500/40 text-white'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {t.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
              {t.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-400" />}
              {t.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-400" />}
              {t.type === 'info' && <Info className="w-5 h-5 text-blue-400" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-white leading-tight">
                {t.message}
              </div>
              {t.description && (
                <div className="text-xs text-slate-300 mt-1 leading-normal">
                  {t.description}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => removeToast(t.id)}
              className="shrink-0 text-slate-400 hover:text-white p-1 rounded-lg transition"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
