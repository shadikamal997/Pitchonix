'use client';

import React, { useState } from 'react';
import { ShieldCheck, AlertTriangle, CheckCircle2, XCircle, Calendar, MessageSquare, RotateCw } from 'lucide-react';
import type { ReviewRequestDTO } from './useDeckReviews';

// =============================================================================
//  Phase 36.1B / 36.1G — Reviewer Banner
//
//  Sticky purple banner shown to the *assigned reviewer* while the deck is
//  in review. Carries the request metadata + the two decision actions
//  (Approve, Request Changes). Mirrors VersionPreviewBanner's visual style
//  for consistency.
//
//  Behaviour:
//    - When status is "requested" and the banner mounts, the parent should
//      auto-call onOpen() so the request flips to "in_review" + a snapshot
//      gets created. The banner itself shows a "First look" hint until the
//      reviewer interacts.
//    - When status is "in_review" → show Approve / Request Changes buttons.
//    - When status is "approved" or "changes_requested" → show a re-open
//      action (Phase 36.1G) so the reviewer can keep iterating.
// =============================================================================

interface Props {
  request:           ReviewRequestDTO;
  onOpen:            () => Promise<void>;
  onApprove:         () => Promise<void>;
  onRequestChanges:  () => Promise<void>;
  onReopen?:         () => Promise<void>;
}

export const ReviewerBanner: React.FC<Props> = ({
  request, onOpen, onApprove, onRequestChanges, onReopen,
}) => {
  const [acting, setActing] = useState(false);

  const run = async (fn: () => Promise<void>) => {
    setActing(true);
    try { await fn(); } finally { setActing(false); }
  };

  const status = request.status;

  return (
    <div className="flex-shrink-0 border-b border-purple-200 bg-gradient-to-r from-purple-50 via-purple-100 to-purple-50 px-3 py-2">
      <div className="flex items-center gap-3 max-w-full">
        <ShieldCheck className="w-4 h-4 text-purple-700 flex-shrink-0" />

        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold text-purple-900 truncate">
            {status === 'requested'
              ? 'Review requested — opening will mark you as reviewing'
              : status === 'in_review'
                ? 'Reviewer mode — editing is disabled, comments enabled'
                : status === 'approved'
                  ? 'You approved this deck'
                  : status === 'changes_requested'
                    ? 'You requested changes'
                    : 'Review'}
          </div>
          <div className="text-[10px] text-purple-700 truncate flex items-center gap-2">
            <span>From <span className="font-semibold">{request.requestedBy.name || request.requestedBy.email}</span></span>
            {request.dueDate && (
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-2.5 h-2.5" />
                Due {new Date(request.dueDate).toLocaleDateString()}
              </span>
            )}
            {request.message && (
              <span className="inline-flex items-center gap-1 italic">
                <MessageSquare className="w-2.5 h-2.5" />
                "{request.message}"
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {status === 'requested' && (
            <button
              type="button"
              onClick={() => run(onOpen)}
              disabled={acting}
              className="h-7 px-3 text-xs font-semibold bg-white text-purple-800 border border-purple-300 hover:bg-purple-50 rounded inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              {acting ? 'Starting…' : 'Start review'}
            </button>
          )}
          {status === 'in_review' && (
            <>
              <button
                type="button"
                onClick={() => run(onRequestChanges)}
                disabled={acting}
                className="h-7 px-3 text-xs font-semibold bg-white text-red-800 border border-red-300 hover:bg-red-50 rounded inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                <XCircle className="w-3 h-3" /> Request changes
              </button>
              <button
                type="button"
                onClick={() => run(onApprove)}
                disabled={acting}
                className="h-7 px-3 text-xs font-semibold bg-green-600 hover:bg-green-700 text-white rounded inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                <CheckCircle2 className="w-3 h-3" /> Approve
              </button>
            </>
          )}
          {(status === 'approved' || status === 'changes_requested') && onReopen && (
            <button
              type="button"
              onClick={() => run(onReopen)}
              disabled={acting}
              className="h-7 px-3 text-xs font-semibold bg-white text-purple-800 border border-purple-300 hover:bg-purple-50 rounded inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              <RotateCw className="w-3 h-3" /> {status === 'approved' ? 'Reopen review' : 'Look again'}
            </button>
          )}
        </div>
      </div>
      {status === 'requested' && (
        <div className="flex items-center gap-1 text-[10px] text-amber-700 mt-1">
          <AlertTriangle className="w-2.5 h-2.5" />
          A snapshot will be created when you start the review.
        </div>
      )}
    </div>
  );
};
