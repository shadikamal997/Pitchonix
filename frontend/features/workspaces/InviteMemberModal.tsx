'use client';

import React, { useState } from 'react';
import { X, Mail, UserPlus, Copy, Check } from 'lucide-react';
import type { WorkspaceRole, WorkspaceInviteDTO } from '@/types/workspace';

// =============================================================================
//  Phase 39 — InviteMemberModal
//
//  Two stages:
//    1. Form    — pick email + role, click Send
//    2. Success — show the accept-invite link (copyable) since we don't have
//                 outbound email plumbing yet
// =============================================================================

interface Props {
  open:     boolean;
  onClose:  () => void;
  onInvite: (email: string, role: WorkspaceRole) => Promise<WorkspaceInviteDTO | null>;
}

const ROLE_OPTIONS: Array<{ value: WorkspaceRole; label: string; description: string }> = [
  { value: 'admin',    label: 'Admin',    description: 'Manage members, invites, and content' },
  { value: 'editor',   label: 'Editor',   description: 'Create and edit decks; comment + request review' },
  { value: 'reviewer', label: 'Reviewer', description: 'Comment + approve/reject reviews; cannot edit' },
  { value: 'viewer',   label: 'Viewer',   description: 'Read-only access' },
];

export const InviteMemberModal: React.FC<Props> = ({ open, onClose, onInvite }) => {
  const [email, setEmail] = useState('');
  const [role,  setRole]  = useState<WorkspaceRole>('editor');
  const [sending, setSending] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [invite,  setInvite]  = useState<WorkspaceInviteDTO | null>(null);
  const [copied,  setCopied]  = useState(false);

  React.useEffect(() => {
    if (open) { setEmail(''); setRole('editor'); setError(null); setInvite(null); setCopied(false); }
  }, [open]);

  if (!open) return null;

  const inviteUrl = invite
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/workspaces/accept?token=${invite.token}`
    : '';

  const handleSubmit = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) { setError('Email is required'); return; }
    setSending(true);
    setError(null);
    try {
      const created = await onInvite(trimmed, role);
      if (created) setInvite(created);
      else setError('Failed to create invitation.');
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to invite');
    } finally { setSending(false); }
  };

  const handleCopy = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard unavailable */ }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-blue-600" />
            {invite ? 'Invitation sent' : 'Invite a teammate'}
          </h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-100" aria-label="Close">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {invite ? (
          <div className="px-5 py-4 space-y-3">
            <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-xs text-green-800">
              Invite created for <span className="font-semibold">{invite.email}</span> as <span className="font-semibold">{invite.role}</span>.
              Share the link below so they can join:
            </div>
            <div className="flex items-center gap-1.5">
              <input
                readOnly
                value={inviteUrl}
                className="flex-1 px-2 py-1.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded"
              />
              <button
                onClick={handleCopy}
                className="h-8 px-3 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded inline-flex items-center gap-1.5"
              >
                {copied ? <><Check className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
              </button>
            </div>
            <div className="text-[10px] text-slate-500">
              The link expires {new Date(invite.expiresAt).toLocaleDateString()}.
            </div>
            <div className="flex items-center justify-end pt-2">
              <button onClick={onClose} className="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 rounded">Done</button>
            </div>
          </div>
        ) : (
          <div className="px-5 py-4 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email address</label>
              <div className="relative">
                <Mail className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="teammate@company.com"
                  autoFocus
                  className="w-full h-8 pl-7 pr-2 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
              <div className="text-[10px] text-slate-500 mt-1">They must have a Pitchonix account.</div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Role</label>
              <div className="space-y-1">
                {ROLE_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-start gap-2 p-2 rounded cursor-pointer transition-colors ${
                      role === opt.value ? 'bg-blue-50 ring-1 ring-blue-200' : 'hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={opt.value}
                      checked={role === opt.value}
                      onChange={() => setRole(opt.value)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-slate-900">{opt.label}</div>
                      <div className="text-[10px] text-slate-500">{opt.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {error && (
              <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2">{error}</div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button onClick={onClose} className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded">Cancel</button>
              <button
                onClick={handleSubmit}
                disabled={!email.trim() || sending}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded inline-flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {sending ? 'Sending…' : <><UserPlus className="w-3.5 h-3.5" /> Send invite</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
