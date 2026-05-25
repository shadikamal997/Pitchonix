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
    ? 'bg-[#D96A6A] hover:bg-[#c44d4d] text-white shadow-[0_10px_22px_rgba(217,106,106,0.22)]'
    : tone === 'info'
      ? 'bg-[#4F7563] hover:bg-[#355846] text-white shadow-[0_10px_22px_rgba(79,117,99,0.22)]'
      : 'bg-[#D9A441] hover:bg-[#bd8b2e] text-white shadow-[0_10px_22px_rgba(217,164,65,0.22)]';

  const iconBg = tone === 'danger'
    ? 'bg-[#F7E3E3] text-[#9a3737]'
    : tone === 'info'
      ? 'bg-[#EEF5F1] text-[#4F7563]'
      : 'bg-[#FAEEDB] text-[#8c6210]';

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {pending && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/45 backdrop-blur-sm p-4"
          onClick={() => close(false)}
        >
          <div
            className="bg-white rounded-[28px] shadow-[0_30px_80px_rgba(0,0,0,0.18)] max-w-md w-full overflow-hidden border border-[#E3E1DA]/40"
            onClick={(e) => e.stopPropagation()}
            role="dialog" aria-modal="true"
          >
            <div className="p-6 pb-4">
              <div className="flex items-start gap-4">
                <div className={`flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center ${iconBg}`}>
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  {pending.title && (
                    <h2 className="text-base font-bold text-[#111111] mb-1 tracking-tight">{pending.title}</h2>
                  )}
                  <p className="text-sm text-[#6B6B6B] leading-relaxed">{pending.message}</p>
                </div>
                <button
                  onClick={() => close(false)}
                  aria-label="Close"
                  className="flex items-center justify-center w-8 h-8 rounded-full text-[#6B6B6B] hover:bg-[#F1F0EC] flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="px-6 pb-6 pt-2 flex items-center justify-end gap-2">
              <button
                onClick={() => close(false)}
                className="inline-flex items-center justify-center h-10 px-4 text-[13px] font-semibold bg-white border border-[#E3E1DA] text-[#111111] hover:bg-[#F7F6F2] rounded-2xl transition-colors"
              >
                {pending.cancelLabel || 'Cancel'}
              </button>
              <button
                onClick={() => close(true)}
                autoFocus
                className={`inline-flex items-center justify-center h-10 px-4 text-[13px] font-semibold rounded-2xl transition-colors ${confirmClasses}`}
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
