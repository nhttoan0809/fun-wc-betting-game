/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto remove after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Toast Container */}
      <div className="pointer-events-none fixed top-5 right-5 z-50 flex w-full max-w-sm flex-col gap-3 px-4 sm:px-0">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`animate-slide-in pointer-events-auto flex items-start justify-between gap-3 rounded-xl border p-4 shadow-lg transition-all duration-300 dark:backdrop-blur-md ${
              toast.type === 'success'
                ? 'border-emerald-250 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/90 dark:text-emerald-200'
                : toast.type === 'error'
                  ? 'border-rose-250 dark:bg-rose-955/90 bg-rose-50 text-rose-800 dark:border-rose-800 dark:text-rose-200'
                  : 'border-blue-250 dark:bg-blue-955/90 bg-blue-50 text-blue-800 dark:border-blue-800 dark:text-blue-200'
            }`}
          >
            <div className="flex items-start gap-2.5">
              <span className="mt-0.5 shrink-0">
                {toast.type === 'success' && (
                  <CheckCircle2 size={16} className="text-brand-neon-green" />
                )}
                {toast.type === 'error' && (
                  <AlertTriangle size={16} className="text-brand-neon-rose" />
                )}
                {toast.type === 'info' && <Info size={16} className="text-brand-neon-blue" />}
              </span>
              <span className="text-xs leading-relaxed font-semibold">{toast.message}</span>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="shrink-0 cursor-pointer text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
};
