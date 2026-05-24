'use client';

import React, { useEffect, useState } from 'react';
import { X, Send, CheckCircle2, AlertTriangle } from 'lucide-react';
import type {
  CreateReviewRequestInput, DeckReviewStatusDTO, ReviewRequestDTO,
} from './useDeckReviews';

// =============================================================================
//  Phase 36H — Request Review modal
//
//  Sends a review request by entering the reviewer's email (matches the
//  existing project-sharing invite UX). Optional message + due date.
//
//  If the deck already has an active request (status = requested | in_review)
//  the modal switches to an "Active request" view that surfaces:
//    - who it's assigned to
//    - current status
//    - a Withdraw button (requester only — gated by parent)
//
//  Submit happens through the `onSubmit` callback so the parent owns the
//  hook + can refresh other surfaces (status badge, panel).
// =============================================================================

interface Props {
  open:            boolean;
  status:          DeckReviewStatusDTO | null;
  onClose:         () => void;
  onSubmit:        (input: CreateReviewRequestInput) => Promise<ReviewRequestDTO | null>;
  onWithdraw?:     (id: string) => Promise<void>;
}

export const RequestReviewModal: React.FC<Props> = ({
  open, status, onClose, onSubmit, onWithdraw,
}) => {
  const [email,   setEmail]   = useState('');
  const [message, setMessage] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [posting, setPosting] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  // Reset transient state every time the modal opens.
  useEffect(() => {
    if (open) { setEmail(''); setMessage(''); setDueDate(''); setError(null); setPosting(false); }
  }, [open]);

  if (!open) return null;

  const activeRequest = status?.activeRequest ?? null;

  const handleSubmit = async () => {
    const e = email.trim();
    if (!e) { setError('Reviewer email is required'); return; }
    setPosting(true);
    setError(null);
    try {
      const created = await onSubmit({
        reviewerEmail: e,
        message:       message.trim() || undefined,
        dueDate:       dueDate || null,
      });
      if (created) onClose();
      else         setError('Failed to create review request — check the reviewer email.');
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to request review');
    } finally {
      setPosting(false);
    }
  };

  const handleWithdraw = async () => {
    if (!activeRequest || !onWithdraw) return;
    setPosting(true);
    try { await onWithdraw(activeRequest.id); onClose(); }
    finally { setPosting(false); }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Send className="w-4 h-4 text-green-600" /> Request Review
          </h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-100" aria-label="Close">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {activeRequest ? (
          // -------- Active-request view -----------------------------------
          <div className="px-5 py-4 space-y-3">
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-amber-900">
                This deck already has an active review request.
              </div>
            </div>
            <div className="text-sm text-slate-700">
              Assigned to <span className="font-semibold">{activeRequest.reviewer.name || activeRequest.reviewer.email}</span>
            </div>
            <div className="text-xs text-slate-500">
              Status: <span className="font-mono uppercase">{activeRequest.status}</span>
              {activeRequest.dueDate && (
                <> · Due {new Date(activeRequest.dueDate).toLocaleDateString()}</>
              )}
            </div>
            {activeRequest.message && (
              <div className="text-sm bg-slate-50 border border-slate-200 rounded p-2 text-slate-700">
                "{activeRequest.message}"
              </div>
            )}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={onClose}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded"
              >
                Close
              </button>
              {onWithdraw && (
                <button
                  onClick={handleWithdraw}
                  disabled={posting}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded disabled:opacity-50"
                >
                  {posting ? 'Withdrawing…' : 'Withdraw request'}
                </button>
              )}
            </div>
          </div>
        ) : (
          // -------- New-request form --------------------------------------
          <div className="px-5 py-4 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reviewer email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="reviewer@example.com"
                autoFocus
                className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-green-300"
              />
              <div className="text-[11px] text-slate-500 mt-1">
                Reviewer must have a Pitchonix account.
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Message (optional)
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What would you like them to focus on?"
                rows={3}
                className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded resize-none focus:outline-none focus:ring-2 focus:ring-green-300"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Due date (optional)
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="px-2.5 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-green-300"
              />
            </div>

            {error && (
              <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2">
                {error}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={onClose}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!email.trim() || posting}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 rounded inline-flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {posting ? (
                  <>Sending…</>
                ) : (
                  <><CheckCircle2 className="w-3.5 h-3.5" /> Send request</>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
