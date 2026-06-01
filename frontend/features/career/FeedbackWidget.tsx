'use client';

/**
 * Phase Ω.4 — FeedbackWidget
 *
 * A floating "Report an issue" button anchored to the bottom-right of any
 * career page. Opens a small dialog with:
 *   - Type selector: Bug / Wrong ATS score / Bad recommendation / Other
 *   - Message textarea
 *   - Optional context (auto-filled from props)
 *   - Submit → POST /career/feedback
 *
 * Usage:
 *   <FeedbackWidget context={{ page: 'ats', documentId: doc.id }} />
 */

import React, { useState } from 'react';
import { MessageSquarePlus, X, Send, CheckCircle2, Loader2 } from 'lucide-react';
import api from '@/lib/api';

// ---------------------------------------------------------------------------
//  Types
// ---------------------------------------------------------------------------

type FeedbackType = 'bug' | 'ats_score' | 'recommendation' | 'other';

const FEEDBACK_TYPES: { value: FeedbackType; label: string; emoji: string }[] = [
  { value: 'bug',            label: 'Bug / broken feature', emoji: '🐛' },
  { value: 'ats_score',      label: 'Wrong ATS score',      emoji: '📊' },
  { value: 'recommendation', label: 'Bad recommendation',   emoji: '💡' },
  { value: 'other',          label: 'Other feedback',       emoji: '💬' },
];

export interface FeedbackWidgetProps {
  context?: Record<string, any>;
}

// ---------------------------------------------------------------------------
//  Component
// ---------------------------------------------------------------------------

export function FeedbackWidget({ context }: FeedbackWidgetProps) {
  const [open,    setOpen]    = useState(false);
  const [type,    setType]    = useState<FeedbackType>('bug');
  const [message, setMessage] = useState('');
  const [state,   setState]   = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error,   setError]   = useState('');

  function reset() {
    setType('bug');
    setMessage('');
    setState('idle');
    setError('');
  }

  function close() {
    setOpen(false);
    setTimeout(reset, 300); // wait for close animation
  }

  async function submit() {
    if (!message.trim()) { setError('Please enter a message.'); return; }
    setState('loading');
    setError('');
    try {
      await api.post('/career/feedback', { type, message: message.trim(), context });
      setState('success');
      setTimeout(close, 1800);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Submission failed — please try again.');
      setState('error');
    }
  }

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Report an issue"
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-[#3D6B4F] px-4 py-2.5 text-sm font-medium text-white shadow-lg hover:bg-[#2e5440] transition-colors focus:outline-none focus:ring-2 focus:ring-[#3D6B4F] focus:ring-offset-2"
        style={{ display: open ? 'none' : undefined }}
      >
        <MessageSquarePlus size={16} />
        <span className="hidden sm:inline">Feedback</span>
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px] flex items-end sm:items-center justify-center sm:justify-end p-4 sm:p-6"
          onClick={(e) => { if (e.target === e.currentTarget) close(); }}
        >
          {/* Dialog panel */}
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl ring-1 ring-black/10 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <MessageSquarePlus size={18} className="text-[#3D6B4F]" />
                <span className="font-semibold text-gray-800 text-sm">Share feedback</span>
              </div>
              <button
                onClick={close}
                className="text-gray-400 hover:text-gray-600 rounded-lg p-1 hover:bg-gray-100 transition-colors"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-4 space-y-4">
              {state === 'success' ? (
                <div className="flex flex-col items-center gap-2 py-6 text-center">
                  <CheckCircle2 size={32} className="text-emerald-500" />
                  <p className="text-sm font-medium text-gray-800">Thank you for your feedback!</p>
                  <p className="text-xs text-gray-500">It helps us improve Pitchonix.</p>
                </div>
              ) : (
                <>
                  {/* Type selector */}
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1.5 block">Type</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {FEEDBACK_TYPES.map((t) => (
                        <button
                          key={t.value}
                          onClick={() => setType(t.value)}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all text-left ${
                            type === t.value
                              ? 'bg-[#EBF2EE] border-[#3D6B4F] text-[#3D6B4F]'
                              : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <span>{t.emoji}</span>
                          <span className="leading-tight">{t.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Message */}
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1.5 block">
                      Message <span className="text-red-400">*</span>
                    </label>
                    <textarea
                      value={message}
                      onChange={(e) => { setMessage(e.target.value); if (error) setError(''); }}
                      placeholder="Describe the issue or feedback..."
                      rows={4}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-[#3D6B4F] focus:border-transparent transition-all"
                    />
                    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            {state !== 'success' && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50">
                <p className="text-xs text-gray-400">Pitchonix Public Beta</p>
                <button
                  onClick={submit}
                  disabled={state === 'loading'}
                  className="flex items-center gap-2 rounded-lg bg-[#3D6B4F] px-4 py-2 text-xs font-medium text-white hover:bg-[#2e5440] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  {state === 'loading' ? (
                    <><Loader2 size={12} className="animate-spin" /> Sending…</>
                  ) : (
                    <><Send size={12} /> Send</>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default FeedbackWidget;
