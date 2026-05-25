'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, Info, X, AlertTriangle } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, type: ToastType, duration?: number) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType, duration = 5000) => {
    const id = Math.random().toString(36).substr(2, 9);
    const toast: Toast = { id, type, message, duration };
    
    setToasts((prev) => [...prev, toast]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const success = useCallback((message: string, duration?: number) => {
    showToast(message, 'success', duration);
  }, [showToast]);

  const error = useCallback((message: string, duration?: number) => {
    showToast(message, 'error', duration);
  }, [showToast]);

  const info = useCallback((message: string, duration?: number) => {
    showToast(message, 'info', duration);
  }, [showToast]);

  const warning = useCallback((message: string, duration?: number) => {
    showToast(message, 'warning', duration);
  }, [showToast]);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast, success, error, info, warning }}>
      {children}
      <div className="pointer-events-none fixed inset-0 z-50 flex flex-col items-end justify-end gap-4 p-6">
        <AnimatePresence>
          {toasts.map((toast) => (
            <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    info: Info,
    warning: AlertTriangle,
  };

  const colors = {
    success: 'bg-white border-[#DDE8E1] text-[#263F34]',
    error:   'bg-white border-[#F7E3E3] text-[#9a3737]',
    info:    'bg-white border-[#E3E1DA] text-[#111111]',
    warning: 'bg-white border-[#FAEEDB] text-[#8c6210]',
  };

  const iconBg = {
    success: 'bg-[#EEF5F1] text-[#4F7563]',
    error:   'bg-[#F7E3E3] text-[#9a3737]',
    info:    'bg-[#F7F6F2] text-[#111111]',
    warning: 'bg-[#FAEEDB] text-[#8c6210]',
  };

  const Icon = icons[toast.type];

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
      className={`pointer-events-auto flex w-96 items-start gap-3 rounded-2xl border p-4 shadow-[0_20px_50px_rgba(38,63,52,0.10)] ${colors[toast.type]}`}
    >
      <div className={`flex items-center justify-center w-9 h-9 rounded-full flex-shrink-0 ${iconBg[toast.type]}`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="flex-1 text-sm font-medium leading-snug pt-2">{toast.message}</p>
      <button
        onClick={onClose}
        aria-label="Dismiss"
        className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[#9A9A9A] hover:bg-[#F1F0EC] hover:text-[#111111] transition-colors"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </motion.div>
  );
}
