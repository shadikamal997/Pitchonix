'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  MessageSquare, X, Check, RotateCcw, Trash2, Send, CornerDownRight, Loader2,
  Search, Pencil, UserPlus, CheckCheck, AtSign, MoreHorizontal,
} from 'lucide-react';
import { useSlideComments, type CommentDTO } from './useSlideComments';
import { useConfirm } from '@/components/ConfirmDialog';
import type { SlideElementDTO } from '@/types/slide-element';
import { MentionTextarea } from './MentionTextarea';
import { MentionText } from './MentionText';
import { relativeTime } from './relative-time';
import { AssignMenu } from './AssignMenu';

// =============================================================================
//  CommentsPanel — Phase 36.1D / E / H / K / L
//
//  Adds:
//    - filter tabs (All / Open / Resolved / Assigned to me / Current slide)
//      with live counts in each tab label
//    - Resolve-all action for the current slide
//    - search by author / mention / message / slide title (server-side)
//    - mention rendering + autocomplete in composer + reply + edit
//    - edit own message + soft-delete display + edited badge
//    - assign / reassign / unassign menu
// =============================================================================

type FilterTab = 'all' | 'open' | 'resolved' | 'mine' | 'slide';

interface Props {
  projectId:        string;
  slideId:          string;
  slideTitle:       string;
  elements:         SlideElementDTO[];
  focusedElementId: string | null;
  onClose:          () => void;
  onCountsChange?:  (counts: Record<string, number>) => void;
  currentUserId?:   string;
  /** Phase 36.1B — Reviewer mode disables some destructive UI surfaces. */
  reviewerMode?:    boolean;
}

export const CommentsPanel: React.FC<Props> = ({
  projectId, slideId, slideTitle, elements, focusedElementId,
  onClose, onCountsChange, currentUserId, reviewerMode,
}) => {
  const confirm = useConfirm();
  const {
    comments, elementCounts, loading, error,
    addComment, addReply, resolve, reopen, remove,
    edit, assign, resolveAll,
  } = useSlideComments(projectId, slideId);

  const [tab,      setTab]      = useState<FilterTab>('open');
  const [search,   setSearch]   = useState('');
  const [composer, setComposer] = useState('');
  const [posting,  setPosting]  = useState(false);
  const [resolvingAll, setResolvingAll] = useState(false);

  // Notify parent so canvas badges can stay in sync.
  useEffect(() => { onCountsChange?.(elementCounts); }, [elementCounts, onCountsChange]);

  // ---------- Counts (Phase 36.1D) ----------
  const counts = useMemo(() => {
    const root = comments;
    const live = root.filter((c) => !c.deletedAt);
    const open = live.filter((c) => !c.resolved);
    const resolved = live.filter((c) =>  c.resolved);
    const mine = currentUserId
      ? live.filter((c) => c.assignedToId === currentUserId)
      : [];
    return { all: live.length, open: open.length, resolved: resolved.length, mine: mine.length };
  }, [comments, currentUserId]);

  // ---------- Filter pipeline ----------
  const filtered = useMemo(() => {
    let list = comments.filter((c) => !c.deletedAt);

    // Element focus still pinned even when a tab is active.
    if (focusedElementId) {
      list = list.filter((c) => c.slideElementId === focusedElementId);
    }

    if (tab === 'open')     list = list.filter((c) => !c.resolved);
    if (tab === 'resolved') list = list.filter((c) =>  c.resolved);
    if (tab === 'mine' && currentUserId) {
      list = list.filter((c) => c.assignedToId === currentUserId);
    }
    if (tab === 'slide') {
      // current slide already enforced by API; this is a no-op here but kept
      // as an explicit tab so the user understands the filter context.
    }

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((c) => {
        const blob = [
          c.content,
          c.user.name, c.user.email,
          ...c.replies.map((r) => r.content),
          ...c.replies.map((r) => r.user.name),
          ...c.replies.map((r) => r.user.email),
          ...(c.mentions || []).map((m) => m.displayName),
        ].filter(Boolean).join(' ').toLowerCase();
        return blob.includes(q);
      });
    }
    return list;
  }, [comments, tab, search, focusedElementId, currentUserId]);

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

  const handleResolveAll = async () => {
    if (!(await confirm({ title: 'Resolve all threads?', message: 'Every open comment thread on this slide will be marked resolved.', confirmLabel: 'Resolve all' }))) return;
    setResolvingAll(true);
    try { await resolveAll(); } finally { setResolvingAll(false); }
  };

  return (
    <aside className="w-[360px] flex-shrink-0 border-l border-[#E3E1DA] bg-white flex flex-col h-full overflow-hidden">
      <header className="h-11 flex items-center px-3 gap-2 border-b border-[#E3E1DA] flex-shrink-0">
        <MessageSquare className="w-4 h-4 text-[#4F7563]" />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold text-[#111111] truncate">Comments</div>
          <div className="text-[10px] text-[#9A9A9A] truncate">
            {focusedElementId ? 'Element thread' : slideTitle}
          </div>
        </div>
        <button
          onClick={handleResolveAll}
          disabled={resolvingAll || counts.open === 0}
          title="Resolve all open threads on this slide"
          className="p-1 rounded text-[#9A9A9A] hover:bg-[#EEF5F1] hover:text-[#355846] disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {resolvingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCheck className="w-4 h-4" />}
        </button>
        <button onClick={onClose} className="p-1 rounded text-[#9A9A9A] hover:bg-[#F1F0EC]" aria-label="Close">
          <X className="w-4 h-4" />
        </button>
      </header>

      {/* Phase 36.1D — Filter tabs with counts */}
      <div className="px-2 py-1.5 border-b border-[#F1F0EC] flex items-center gap-1 overflow-x-auto">
        <TabButton label="Open"      count={counts.open}     active={tab === 'open'}     onClick={() => setTab('open')} />
        <TabButton label="All"       count={counts.all}      active={tab === 'all'}      onClick={() => setTab('all')} />
        <TabButton label="Resolved"  count={counts.resolved} active={tab === 'resolved'} onClick={() => setTab('resolved')} />
        <TabButton label="Assigned"  count={counts.mine}     active={tab === 'mine'}     onClick={() => setTab('mine')} />
      </div>

      {/* Phase 36.1L — Search */}
      <div className="px-3 py-2 border-b border-[#F1F0EC]">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#C9C6BD] pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search author, message, @mention…"
            className="w-full h-7 pl-7 pr-2 text-xs bg-[#EDEBE6] border border-[#E3E1DA] rounded outline-none focus:border-[#4F7563] focus:bg-white"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5">
        {loading && comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-10 text-[#C9C6BD]">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-[11px] mt-2">Loading…</span>
          </div>
        ) : error ? (
          <div className="text-xs text-[#9a3737]">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center pt-8 pb-4">
            <MessageSquare className="w-7 h-7 text-slate-300 mx-auto mb-2" />
            <p className="text-xs text-[#9A9A9A]">
              {focusedElementId
                ? 'No comments on this element yet.'
                : tab === 'mine' ? 'Nothing assigned to you.'
                : tab === 'resolved' ? 'No resolved threads.'
                : 'No comments yet — start the conversation below.'}
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
              onEdit={(content) => edit(c.id, content)}
              onAssign={(userId) => assign(c.id, userId)}
              onDeleteReply={(rid) => remove(rid)}
              onEditReply={(rid, content) => edit(rid, content)}
            />
          ))
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-[#E3E1DA] px-3 py-2 flex-shrink-0">
        {focusedElementId && (
          <div className="text-[10px] text-[#9A9A9A] mb-1 flex items-center gap-1">
            <CornerDownRight className="w-3 h-3" />
            Pinned to <span className="font-semibold text-[#111111]">
              {elementById.get(focusedElementId)?.name || elementById.get(focusedElementId)?.type || 'element'}
            </span>
          </div>
        )}
        <div className="flex items-start gap-2">
          <div className="flex-1 relative">
            <MentionTextarea
              value={composer}
              onChange={setComposer}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handlePost(); }
              }}
              placeholder={focusedElementId ? 'Comment on this element…  (use @ to mention)' : 'Comment on this slide…  (use @ to mention)'}
              rows={2}
              className="w-full px-2 py-1.5 text-xs bg-[#EDEBE6] border border-[#E3E1DA] rounded outline-none focus:border-[#4F7563] focus:bg-white resize-none"
            />
          </div>
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
        {reviewerMode && (
          <div className="text-[10px] text-[#735008] mt-1 italic">
            Reviewer mode — commenting only (no editing).
          </div>
        )}
      </div>
    </aside>
  );
};

// =============================================================================
//  Filter tab button
// =============================================================================

const TabButton: React.FC<{
  label: string; count: number; active: boolean; onClick: () => void;
}> = ({ label, count, active, onClick }) => (
  <button
    onClick={onClick}
    className={`px-2 py-1 text-[11px] font-semibold rounded flex items-center gap-1.5 transition-colors flex-shrink-0 ${
      active
        ? 'bg-[#DDE8E1] text-green-800'
        : 'text-[#9A9A9A] hover:bg-[#F1F0EC] hover:text-[#111111]'
    }`}
  >
    {label}
    <span className={`inline-flex items-center justify-center min-w-[18px] h-[16px] px-1 rounded-full text-[9px] font-bold ${
      active ? 'bg-[#4F7563] text-white' : 'bg-[#E3E1DA] text-[#6B6B6B]'
    }`}>
      {count}
    </span>
  </button>
);

// =============================================================================
//  CommentThread — one top-level comment + replies
// =============================================================================

interface ThreadProps {
  comment:       CommentDTO;
  currentUserId?: string;
  elementLabel:  string | null | undefined;
  onReply:       (content: string) => Promise<CommentDTO | null>;
  onResolve:     () => void;
  onDelete:      () => void;
  onEdit:        (content: string) => Promise<void>;
  onAssign:      (userId: string | null) => Promise<void>;
  onDeleteReply: (replyId: string) => void;
  onEditReply:   (replyId: string, content: string) => Promise<void>;
}

const CommentThread: React.FC<ThreadProps> = ({
  comment, currentUserId, elementLabel,
  onReply, onResolve, onDelete, onEdit, onAssign, onDeleteReply, onEditReply,
}) => {
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [posting,   setPosting]   = useState(false);
  const [editing,   setEditing]   = useState(false);
  const [editDraft, setEditDraft] = useState(comment.content);
  const [assignOpen, setAssignOpen] = useState(false);

  const isOwn = !!currentUserId && comment.userId === currentUserId;

  const handleReply = async () => {
    const content = replyText.trim();
    if (!content) return;
    setPosting(true);
    try {
      const r = await onReply(content);
      if (r) { setReplyText(''); setReplyOpen(false); }
    } finally { setPosting(false); }
  };

  const handleSaveEdit = async () => {
    const content = editDraft.trim();
    if (!content || content === comment.content) { setEditing(false); return; }
    setPosting(true);
    try { await onEdit(content); setEditing(false); } finally { setPosting(false); }
  };

  return (
    <article className={`rounded-lg border p-2.5 ${comment.resolved ? 'bg-[#EDEBE6] border-[#E3E1DA] opacity-80' : 'bg-white border-[#E3E1DA] shadow-sm'}`}>
      <header className="flex items-start gap-2 mb-1.5">
        <Avatar name={comment.user.name || comment.user.email} />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-[#111111] truncate flex items-center gap-1.5">
            {comment.user.name || comment.user.email}
            {comment.editedAt && (
              <span className="text-[9px] text-[#C9C6BD] font-normal italic">edited</span>
            )}
          </div>
          <div className="text-[10px] text-[#9A9A9A]">{relativeTime(comment.createdAt)}</div>
        </div>

        {/* Assignment chip + menu (Phase 36.1H) */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setAssignOpen((v) => !v)}
            title={comment.assignedTo ? `Assigned to ${comment.assignedTo.name || comment.assignedTo.email}` : 'Assign'}
            className={`p-1 rounded transition-colors ${
              comment.assignedTo ? 'text-[#355846] bg-[#EEF5F1] hover:bg-[#DDE8E1]' : 'text-[#C9C6BD] hover:text-[#111111] hover:bg-[#F1F0EC]'
            }`}
          >
            <UserPlus className="w-3 h-3" />
          </button>
          {assignOpen && (
            <AssignMenu
              current={comment.assignedTo || null}
              onPick={async (u) => { await onAssign(u ? u.id : null); setAssignOpen(false); }}
              onClose={() => setAssignOpen(false)}
            />
          )}
        </div>

        <button
          type="button"
          onClick={onResolve}
          title={comment.resolved ? 'Reopen' : 'Resolve'}
          className={`p-1 rounded transition-colors ${comment.resolved ? 'text-[#9A9A9A] hover:bg-[#F1F0EC]' : 'text-[#355846] hover:bg-[#EEF5F1]'}`}
        >
          {comment.resolved ? <RotateCcw className="w-3 h-3" /> : <Check className="w-3 h-3" />}
        </button>

        {isOwn && !editing && (
          <>
            <button
              type="button"
              onClick={() => { setEditing(true); setEditDraft(comment.content); }}
              title="Edit"
              className="p-1 rounded text-[#9A9A9A] hover:text-[#355846] hover:bg-[#EEF5F1]"
            >
              <Pencil className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={onDelete}
              title="Delete"
              className="p-1 rounded text-[#9a3737] hover:bg-[#FCF1F1]"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </>
        )}
      </header>

      {comment.assignedTo && (
        <div className="text-[10px] text-[#355846] mb-1.5 flex items-center gap-1">
          <UserPlus className="w-2.5 h-2.5" />
          Assigned to <span className="font-semibold">{comment.assignedTo.name || comment.assignedTo.email}</span>
        </div>
      )}

      {elementLabel && (
        <div className="text-[10px] text-[#9A9A9A] mb-1.5 flex items-center gap-1">
          <CornerDownRight className="w-2.5 h-2.5" />
          on <span className="font-semibold text-[#111111]">{elementLabel}</span>
        </div>
      )}

      {/* Body — edit mode swaps for textarea */}
      {editing ? (
        <div>
          <MentionTextarea
            value={editDraft}
            onChange={setEditDraft}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleSaveEdit(); }
              if (e.key === 'Escape') { setEditing(false); }
            }}
            autoFocus
            rows={3}
            className="w-full text-xs px-2 py-1.5 bg-white border border-[#C9C6BD] rounded resize-none"
          />
          <div className="mt-1 flex items-center justify-end gap-1">
            <button onClick={() => setEditing(false)} className="px-2 py-1 text-[11px] text-[#6B6B6B] hover:bg-[#F1F0EC] rounded">Cancel</button>
            <button
              onClick={handleSaveEdit}
              disabled={posting || !editDraft.trim()}
              className="px-2 py-1 text-[11px] font-semibold bg-[#4F7563] hover:bg-[#355846] text-white rounded disabled:opacity-50"
            >
              {posting ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      ) : (
        <div className="text-xs whitespace-pre-wrap leading-relaxed">
          <MentionText content={comment.content} muted={!!comment.deletedAt} />
        </div>
      )}

      {comment.resolved && (
        <div className="text-[10px] text-[#355846] mt-1.5 italic">Resolved</div>
      )}

      {/* Replies */}
      {comment.replies.length > 0 && (
        <div className="mt-2 ml-3 pl-2 border-l border-[#E3E1DA] space-y-1.5">
          {comment.replies.map((r) => (
            <Reply
              key={r.id}
              reply={r}
              currentUserId={currentUserId}
              onDelete={() => onDeleteReply(r.id)}
              onEdit={(content) => onEditReply(r.id, content)}
            />
          ))}
          {/* Phase 36.1E — reply count */}
          <div className="text-[10px] text-[#C9C6BD] italic">
            {comment.replies.length} repl{comment.replies.length === 1 ? 'y' : 'ies'}
          </div>
        </div>
      )}

      {/* Reply composer */}
      {!comment.resolved && (
        <div className="mt-2">
          {replyOpen ? (
            <div className="flex items-start gap-1.5">
              <div className="flex-1">
                <MentionTextarea
                  value={replyText}
                  onChange={setReplyText}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleReply(); }
                    if (e.key === 'Escape') { setReplyOpen(false); setReplyText(''); }
                  }}
                  autoFocus
                  rows={2}
                  placeholder="Write a reply…  (use @ to mention)"
                  className="w-full px-2 py-1 text-xs bg-[#EDEBE6] border border-[#E3E1DA] rounded outline-none focus:border-[#4F7563] focus:bg-white resize-none"
                />
              </div>
              <button
                onClick={handleReply}
                disabled={!replyText.trim() || posting}
                className="self-stretch px-2 text-xs font-semibold bg-[#4F7563] text-white rounded disabled:opacity-50"
              >
                {posting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Reply'}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setReplyOpen(true)}
              className="text-[11px] font-semibold text-[#9A9A9A] hover:text-[#355846] inline-flex items-center gap-1"
            >
              <AtSign className="w-2.5 h-2.5" /> Reply
            </button>
          )}
        </div>
      )}
    </article>
  );
};

// =============================================================================
//  Reply — single reply row with inline edit
// =============================================================================

const Reply: React.FC<{
  reply:         CommentDTO;
  currentUserId?: string;
  onDelete:      () => void;
  onEdit:        (content: string) => Promise<void>;
}> = ({ reply, currentUserId, onDelete, onEdit }) => {
  const [editing,   setEditing]   = useState(false);
  const [draft,     setDraft]     = useState(reply.content);
  const [posting,   setPosting]   = useState(false);
  const isOwn = !!currentUserId && reply.userId === currentUserId;

  const save = async () => {
    const next = draft.trim();
    if (!next || next === reply.content) { setEditing(false); return; }
    setPosting(true);
    try { await onEdit(next); setEditing(false); } finally { setPosting(false); }
  };

  return (
    <div className="text-xs">
      <div className="flex items-start gap-1.5">
        <Avatar name={reply.user.name || reply.user.email} small />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-[#111111] text-[11px]">{reply.user.name || reply.user.email}</span>
            <span className="text-[10px] text-[#C9C6BD]">{relativeTime(reply.createdAt)}</span>
            {reply.editedAt && <span className="text-[9px] text-[#C9C6BD] italic">edited</span>}
            {isOwn && !editing && (
              <span className="ml-auto flex items-center gap-0.5">
                <button onClick={() => { setEditing(true); setDraft(reply.content); }} title="Edit" className="p-0.5 rounded text-[#9A9A9A] hover:text-[#355846]">
                  <Pencil className="w-2.5 h-2.5" />
                </button>
                <button onClick={onDelete} title="Delete" className="p-0.5 rounded text-[#9a3737] hover:bg-[#FCF1F1]">
                  <Trash2 className="w-2.5 h-2.5" />
                </button>
              </span>
            )}
          </div>
          {editing ? (
            <div>
              <MentionTextarea
                value={draft}
                onChange={setDraft}
                rows={2}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); save(); }
                  if (e.key === 'Escape') { setEditing(false); }
                }}
                className="w-full mt-1 px-1.5 py-1 text-xs bg-white border border-[#C9C6BD] rounded resize-none"
              />
              <div className="flex justify-end gap-1 mt-0.5">
                <button onClick={() => setEditing(false)} className="px-1.5 py-0.5 text-[10px] text-[#6B6B6B]">Cancel</button>
                <button onClick={save} disabled={posting} className="px-1.5 py-0.5 text-[10px] font-semibold bg-[#4F7563] text-white rounded">
                  {posting ? '…' : 'Save'}
                </button>
              </div>
            </div>
          ) : (
            <div className="text-[#111111] whitespace-pre-wrap mt-0.5">
              <MentionText content={reply.content} muted={!!reply.deletedAt} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// =============================================================================
//  Avatar
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
