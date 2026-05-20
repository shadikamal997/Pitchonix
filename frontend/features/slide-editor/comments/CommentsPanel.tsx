'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MessageSquare, X, Check, RotateCcw, Trash2, Send, CornerDownRight, Loader2, Search, Filter } from 'lucide-react';
import { useSlideComments, type CommentDTO } from './useSlideComments';
import type { SlideElementDTO } from '@/types/slide-element';

// =============================================================================
//  CommentsPanel — right-side drawer for slide-anchored comments
// =============================================================================

interface Props {
  projectId:        string;
  slideId:          string;
  slideTitle:       string;
  elements:         SlideElementDTO[];
  /** When set, only show comments on this element; new posts will also attach. */
  focusedElementId: string | null;
  onClose:          () => void;
  /** Called when the panel exposes new element counts so the canvas can refresh badges. */
  onCountsChange?:  (counts: Record<string, number>) => void;
  currentUserId?:   string;
}

export const CommentsPanel: React.FC<Props> = ({
  projectId, slideId, slideTitle, elements, focusedElementId, onClose, onCountsChange, currentUserId,
}) => {
  const { comments, elementCounts, loading, error, addComment, addReply, resolve, reopen, remove } = useSlideComments(projectId, slideId);
  const [showResolved, setShowResolved] = useState(false);
  const [search, setSearch] = useState('');
  const [composer, setComposer] = useState('');
  const [posting, setPosting] = useState(false);

  // Notify parent so canvas badges can stay in sync.
  useEffect(() => {
    onCountsChange?.(elementCounts);
  }, [elementCounts, onCountsChange]);

  const filtered = useMemo(() => {
    let list = comments;
    if (focusedElementId) {
      list = list.filter((c) => c.slideElementId === focusedElementId);
    }
    if (!showResolved) list = list.filter((c) => !c.resolved);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((c) =>
        c.content.toLowerCase().includes(q) ||
        (c.user.name || c.user.email).toLowerCase().includes(q) ||
        c.replies.some((r) => r.content.toLowerCase().includes(q))
      );
    }
    return list;
  }, [comments, showResolved, search, focusedElementId]);

  const elementById = useMemo(() => {
    const m = new Map<string, SlideElementDTO>();
    elements.forEach((e) => m.set(e.id, e));
    return m;
  }, [elements]);

  const handlePost = async () => {
    const content = composer.trim();
    if (!content) return;
    setPosting(true);
    try {
      const created = await addComment({ content, slideElementId: focusedElementId || undefined });
      if (created) setComposer('');
    } finally {
      setPosting(false);
    }
  };

  return (
    <aside className="w-[340px] flex-shrink-0 border-l border-slate-200 bg-white flex flex-col h-full overflow-hidden">
      <header className="h-11 flex items-center px-3 gap-2 border-b border-slate-200 flex-shrink-0">
        <MessageSquare className="w-4 h-4 text-green-600" />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold text-slate-900 truncate">Comments</div>
          <div className="text-[10px] text-slate-500 truncate">{focusedElementId ? 'Element thread' : slideTitle}</div>
        </div>
        <button onClick={onClose} className="p-1 rounded text-slate-500 hover:bg-slate-100" aria-label="Close comments">
          <X className="w-4 h-4" />
        </button>
      </header>

      {/* Controls */}
      <div className="px-3 py-2 border-b border-slate-100 flex items-center gap-1.5">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search comments…"
            className="w-full h-7 pl-7 pr-2 text-xs bg-slate-50 border border-slate-200 rounded outline-none focus:border-green-500 focus:bg-white"
          />
        </div>
        <button
          type="button"
          onClick={() => setShowResolved((v) => !v)}
          title={showResolved ? 'Hide resolved' : 'Show resolved'}
          className={`h-7 px-2 text-[10px] font-semibold rounded flex items-center gap-1 transition-colors ${
            showResolved ? 'bg-green-50 text-green-700 ring-1 ring-green-200' : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          <Filter className="w-3 h-3" />
          {showResolved ? 'All' : 'Open'}
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5">
        {loading && comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-10 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-[11px] mt-2">Loading…</span>
          </div>
        ) : error ? (
          <div className="text-xs text-red-600">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center pt-8 pb-4">
            <MessageSquare className="w-7 h-7 text-slate-300 mx-auto mb-2" />
            <p className="text-xs text-slate-500">
              {focusedElementId ? 'No comments on this element yet.' : 'No comments yet — start the conversation below.'}
            </p>
          </div>
        ) : (
          filtered.map((c) => (
            <CommentThread
              key={c.id}
              comment={c}
              currentUserId={currentUserId}
              elementLabel={c.slideElementId ? elementById.get(c.slideElementId)?.name || elementById.get(c.slideElementId)?.type : null}
              onReply={(content) => addReply(c.id, content)}
              onResolve={() => (c.resolved ? reopen(c.id) : resolve(c.id))}
              onDelete={() => remove(c.id)}
              onDeleteReply={(rid) => remove(rid)}
            />
          ))
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-slate-200 px-3 py-2 flex-shrink-0">
        {focusedElementId && (
          <div className="text-[10px] text-slate-500 mb-1 flex items-center gap-1">
            <CornerDownRight className="w-3 h-3" />
            Pinned to <span className="font-semibold text-slate-700">{elementById.get(focusedElementId)?.name || elementById.get(focusedElementId)?.type || 'element'}</span>
          </div>
        )}
        <div className="flex items-start gap-2">
          <textarea
            value={composer}
            onChange={(e) => setComposer(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handlePost(); }
            }}
            placeholder={focusedElementId ? 'Comment on this element…' : 'Comment on this slide…'}
            rows={2}
            className="flex-1 px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded outline-none focus:border-green-500 focus:bg-white resize-none"
          />
          <button
            type="button"
            onClick={handlePost}
            disabled={!composer.trim() || posting}
            title="Post (⌘↩)"
            className="self-stretch px-3 py-1.5 text-xs font-semibold bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded flex items-center gap-1 shadow-md shadow-green-500/30"
          >
            {posting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </aside>
  );
};

// =============================================================================
//  CommentThread — one top-level comment + replies + composer
// =============================================================================

const CommentThread: React.FC<{
  comment:       CommentDTO;
  currentUserId?: string;
  elementLabel:  string | null | undefined;
  onReply:       (content: string) => Promise<CommentDTO | null>;
  onResolve:     () => void;
  onDelete:      () => void;
  onDeleteReply: (replyId: string) => void;
}> = ({ comment, currentUserId, elementLabel, onReply, onResolve, onDelete, onDeleteReply }) => {
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [posting, setPosting] = useState(false);

  const isOwn = currentUserId && comment.userId === currentUserId;

  const handleReply = async () => {
    const content = replyText.trim();
    if (!content) return;
    setPosting(true);
    try {
      const r = await onReply(content);
      if (r) { setReplyText(''); setReplyOpen(false); }
    } finally {
      setPosting(false);
    }
  };

  return (
    <article className={`rounded-lg border p-2.5 ${comment.resolved ? 'bg-slate-50 border-slate-200 opacity-80' : 'bg-white border-slate-200 shadow-sm'}`}>
      <header className="flex items-start gap-2 mb-1.5">
        <Avatar name={comment.user.name || comment.user.email} />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-slate-900 truncate">{comment.user.name || comment.user.email}</div>
          <div className="text-[10px] text-slate-500">{relativeTime(comment.createdAt)}</div>
        </div>
        <button
          type="button"
          onClick={onResolve}
          title={comment.resolved ? 'Reopen' : 'Resolve'}
          className={`p-1 rounded transition-colors ${comment.resolved ? 'text-slate-500 hover:bg-slate-100' : 'text-green-700 hover:bg-green-50'}`}
        >
          {comment.resolved ? <RotateCcw className="w-3 h-3" /> : <Check className="w-3 h-3" />}
        </button>
        {isOwn && (
          <button
            type="button"
            onClick={onDelete}
            title="Delete"
            className="p-1 rounded text-red-600 hover:bg-red-50"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </header>

      {elementLabel && (
        <div className="text-[10px] text-slate-500 mb-1.5 flex items-center gap-1">
          <CornerDownRight className="w-2.5 h-2.5" />
          on <span className="font-semibold text-slate-700">{elementLabel}</span>
        </div>
      )}

      <div className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">{comment.content}</div>

      {comment.resolved && (
        <div className="text-[10px] text-green-700 mt-1.5 italic">Resolved</div>
      )}

      {/* Replies */}
      {comment.replies.length > 0 && (
        <div className="mt-2 ml-3 pl-2 border-l border-slate-200 space-y-1.5">
          {comment.replies.map((r) => (
            <div key={r.id} className="text-xs">
              <div className="flex items-start gap-1.5">
                <Avatar name={r.user.name || r.user.email} small />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-slate-800 text-[11px]">{r.user.name || r.user.email}</span>
                    <span className="text-[10px] text-slate-400">{relativeTime(r.createdAt)}</span>
                    {currentUserId === r.userId && (
                      <button onClick={() => onDeleteReply(r.id)} title="Delete reply" className="ml-auto p-0.5 rounded text-red-600 hover:bg-red-50">
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </div>
                  <div className="text-slate-700 whitespace-pre-wrap mt-0.5">{r.content}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reply composer */}
      {!comment.resolved && (
        <div className="mt-2">
          {replyOpen ? (
            <div className="flex items-start gap-1.5">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleReply(); }
                  if (e.key === 'Escape') { setReplyOpen(false); setReplyText(''); }
                }}
                rows={2}
                placeholder="Write a reply…"
                className="flex-1 px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded outline-none focus:border-green-500 focus:bg-white resize-none"
              />
              <button
                onClick={handleReply}
                disabled={!replyText.trim() || posting}
                className="self-stretch px-2 text-xs font-semibold bg-green-600 text-white rounded disabled:opacity-50"
              >
                {posting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Reply'}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setReplyOpen(true)}
              className="text-[11px] font-semibold text-slate-500 hover:text-green-700"
            >
              Reply
            </button>
          )}
        </div>
      )}
    </article>
  );
};

// =============================================================================
//  Helpers
// =============================================================================

const PALETTE = ['#16a34a', '#0ea5e9', '#a855f7', '#f59e0b', '#ef4444', '#0d9488'];

const Avatar: React.FC<{ name: string; small?: boolean }> = ({ name, small }) => {
  const initial = (name || '?').slice(0, 1).toUpperCase();
  const hash = Array.from(name).reduce((a, c) => a + c.charCodeAt(0), 0);
  const color = PALETTE[hash % PALETTE.length];
  const size = small ? 18 : 24;
  return (
    <div
      style={{ width: size, height: size, background: color }}
      className="rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
    >
      <span style={{ fontSize: small ? 9 : 11 }}>{initial}</span>
    </div>
  );
};

function relativeTime(iso: string): string {
  const now = Date.now();
  const t = new Date(iso).getTime();
  const diff = Math.max(0, now - t);
  const min = Math.floor(diff / 60000);
  if (min < 1)  return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24)  return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7)  return `${day}d ago`;
  return new Date(iso).toLocaleDateString();
}
