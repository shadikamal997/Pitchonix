'use client';

import React, { createContext, useCallback, useContext, useState, ReactNode } from 'react';
import { AlertTriangle, X } from 'lucide-react';

// =============================================================================
//  Phase Ω.3.1 — global confirmation dialog (replaces window.confirm).
//
//  Usage anywhere in the app:
//
//      const confirm = useConfirm();
//      if (await confirm({ title: 'Delete?', message: '…', confirmLabel: 'Delete' })) {
//        // user clicked Confirm
//      }
//
//  Provider must be mounted high enough (root layout). The dialog uses
//  the platform's standard tones (red for destructive, blue for neutral).
// =============================================================================

export type ConfirmTone = 'danger' | 'warning' | 'info';

export interface ConfirmOptions {
  title?:        string;
  message:       string;
  confirmLabel?: string;     // default "Confirm"
  cancelLabel?:  string;     // default "Cancel"
  tone?:         ConfirmTone; // default "warning"
}

interface ConfirmContextValue {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | undefined>(undefined);

export function useConfirm(): (opts: ConfirmOptions) => Promise<boolean> {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    // Graceful fallback so any code path that runs before the provider mounts
    // still works (returns synchronous native confirm).
    return async (o: ConfirmOptions) => window.confirm(o.message);
  }
  return ctx.confirm;
}

interface PendingState extends ConfirmOptions {
  resolve: (v: boolean) => void;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingState | null>(null);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      setPending({ ...opts, resolve });
    });
  }, []);

  const close = (result: boolean) => {
    if (pending) pending.resolve(result);
    setPending(null);
  };

  const tone: ConfirmTone = pending?.tone || 'warning';
  const confirmClasses = tone === 'danger'
    ? 'bg-red-600 hover:bg-red-700 text-white'
    : tone === 'info'
      ? 'bg-blue-600 hover:bg-blue-700 text-white'
      : 'bg-amber-600 hover:bg-amber-700 text-white';

  const iconBg = tone === 'danger' ? 'bg-red-100 text-red-700'
    : tone === 'info' ? 'bg-blue-100 text-blue-700'
    : 'bg-amber-100 text-amber-700';

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {pending && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50" onClick={() => close(false)}>
          <div
            className="bg-white rounded-xl shadow-2xl max-w-md w-[92vw] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            role="dialog" aria-modal="true"
          >
            <div className="px-5 py-4 flex items-start gap-3">
              <div className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${iconBg}`}>
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                {pending.title && (
                  <h2 className="text-sm font-bold text-slate-900 mb-1">{pending.title}</h2>
                )}
                <p className="text-sm text-slate-700 leading-relaxed">{pending.message}</p>
              </div>
              <button onClick={() => close(false)} className="text-slate-400 hover:text-slate-700 flex-shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                onClick={() => close(false)}
                className="h-8 px-3 text-xs font-semibold border border-slate-300 hover:bg-white text-slate-700 rounded"
              >
                {pending.cancelLabel || 'Cancel'}
              </button>
              <button
                onClick={() => close(true)}
                autoFocus
                className={`h-8 px-3 text-xs font-semibold rounded ${confirmClasses}`}
              >
                {pending.confirmLabel || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
