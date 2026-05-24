'use client';

import React, { useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import { X, Send, CheckCircle2, XCircle, Clock, Loader2, FileText } from 'lucide-react';
import type { ReviewRequestDTO, DeckReviewStatus } from './useDeckReviews';
import { relativeTime } from '../comments/relative-time';

// =============================================================================
//  Phase 36.1F — ReviewDashboardPanel
//
//  Slide-over drawer (mounts inside the editor's right-side area) that shows
//  the user's review queue across decks:
//
//    Assigned to me — active requests where I'm the reviewer
//    Requested by me — requests I created (for the current deck)
//    By status — In review / Approved / Changes requested
//
//  The "Assigned to me" view spans every deck the user can see (GET
//  /me/review-requests), while the other views are scoped to the current
//  deck (GET /decks/:id/review-requests).
// =============================================================================

type TabKey = 'assigned' | 'by-me' | 'in-review' | 'approved' | 'changes';

interface Props {
  deckId:        string;
  requests:      ReviewRequestDTO[];           // current-deck requests
  currentUserId?: string;
  onClose:       () => void;
  /** Open the editor at a different deck's URL (left to host). */
  onOpenDeck?:   (deckId: string) => void;
}

export const ReviewDashboardPanel: React.FC<Props> = ({
  deckId, requests, currentUserId, onClose, onOpenDeck,
}) => {
  const [tab, setTab] = useState<TabKey>('assigned');
  const [mine, setMine] = useState<(ReviewRequestDTO & { deck?: { id: string; title: string; projectId: string } })[]>([]);
  const [loadingMine, setLoadingMine] = useState(false);

  // Load my queue once on mount and whenever the deck changes (the queue
  // returns *all* assignments to me, so deck switch shouldn't be needed —
  // but refetching on focus keeps it cheap + correct).
  useEffect(() => {
    let cancelled = false;
    setLoadingMine(true);
    api.get<typeof mine>(`/me/review-requests`).then(({ data }) => {
      if (!cancelled) setMine(data || []);
    }).finally(() => { if (!cancelled) setLoadingMine(false); });
    return () => { cancelled = true; };
  }, [deckId]);

  const byMe = useMemo(() => requests.filter((r) => r.requestedById === currentUserId), [requests, currentUserId]);
  const inReview = useMemo(() => requests.filter((r) => r.status === 'in_review' || r.status === 'requested'), [requests]);
  const approved = useMemo(() => requests.filter((r) => r.status === 'approved'), [requests]);
  const changes  = useMemo(() => requests.filter((r) => r.status === 'changes_requested'), [requests]);

  const lists: Record<TabKey, { label: string; items: ReviewRequestDTO[] }> = {
    'assigned':  { label: 'Assigned to me',     items: mine },
    'by-me':     { label: 'Requested by me',    items: byMe },
    'in-review': { label: 'In review',          items: inReview },
    'approved':  { label: 'Approved',           items: approved },
    'changes':   { label: 'Changes requested',  items: changes },
  };
  const counts: Record<TabKey, number> = {
    'assigned':  mine.length,
    'by-me':     byMe.length,
    'in-review': inReview.length,
    'approved':  approved.length,
    'changes':   changes.length,
  };

  const current = lists[tab];

  return (
    <aside className="w-[420px] flex-shrink-0 border-l border-slate-200 bg-white flex flex-col h-full overflow-hidden">
      <header className="h-11 flex items-center px-3 gap-2 border-b border-slate-200 flex-shrink-0">
        <Send className="w-4 h-4 text-purple-600" />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold text-slate-900">Reviews</div>
          <div className="text-[10px] text-slate-500">Queue across all decks you can see</div>
        </div>
        <button onClick={onClose} className="p-1 rounded text-slate-500 hover:bg-slate-100" aria-label="Close">
          <X className="w-4 h-4" />
        </button>
      </header>

      {/* Tabs */}
      <div className="px-2 py-1.5 border-b border-slate-100 flex items-center gap-1 overflow-x-auto">
        {(Object.keys(lists) as TabKey[]).map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-2 py-1 text-[11px] font-semibold rounded flex items-center gap-1.5 flex-shrink-0 transition-colors ${
              tab === k
                ? 'bg-purple-100 text-purple-800'
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
            }`}
          >
            {lists[k].label}
            <span className={`inline-flex items-center justify-center min-w-[18px] h-[16px] px-1 rounded-full text-[9px] font-bold ${
              tab === k ? 'bg-purple-600 text-white' : 'bg-slate-200 text-slate-600'
            }`}>
              {counts[k]}
            </span>
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {tab === 'assigned' && loadingMine ? (
          <div className="text-xs text-slate-400 flex items-center gap-2 py-3">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…
          </div>
        ) : current.items.length === 0 ? (
          <div className="text-center pt-8">
            <FileText className="w-7 h-7 text-slate-300 mx-auto mb-2" />
            <p className="text-xs text-slate-500">Nothing here.</p>
          </div>
        ) : (
          current.items.map((r) => {
            const deckRef = (r as any).deck as { id: string; title: string } | undefined;
            return (
              <article
                key={r.id}
                className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm"
              >
                <div className="flex items-start gap-2">
                  <StatusIcon status={r.status as DeckReviewStatus | 'requested' | 'withdrawn'} />
                  <div className="flex-1 min-w-0">
                    {deckRef && (
                      <button
                        type="button"
                        onClick={() => onOpenDeck?.(deckRef.id)}
                        className="text-xs font-bold text-slate-900 hover:text-purple-700 truncate text-left"
                      >
                        {deckRef.title}
                      </button>
                    )}
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      <span className="font-semibold">{r.requestedBy.name || r.requestedBy.email}</span>
                      <span className="text-slate-400"> → </span>
                      <span>{r.reviewer.name || r.reviewer.email}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-2">
                      <span>{relativeTime(r.createdAt)}</span>
                      {r.dueDate && (
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          Due {new Date(r.dueDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    {r.message && (
                      <div className="text-[11px] text-slate-700 mt-1.5 italic bg-slate-50 border border-slate-100 rounded p-1.5">
                        "{r.message}"
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>
    </aside>
  );
};

const STATUS_TONE = {
  requested:          { Icon: Send,         cls: 'text-amber-600' },
  in_review:          { Icon: Send,         cls: 'text-amber-600' },
  approved:           { Icon: CheckCircle2, cls: 'text-green-600' },
  changes_requested:  { Icon: XCircle,      cls: 'text-red-600' },
  withdrawn:          { Icon: X,            cls: 'text-slate-500' },
} as const;

const StatusIcon: React.FC<{ status: string }> = ({ status }) => {
  const v = (STATUS_TONE as any)[status] || STATUS_TONE.requested;
  const Icon = v.Icon;
  return <Icon className={`w-4 h-4 flex-shrink-0 ${v.cls}`} />;
};
