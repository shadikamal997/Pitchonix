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
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E3E1DA]">
          <h2 className="text-base font-bold text-[#111111] flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-[#4F7563]" />
            {invite ? 'Invitation sent' : 'Invite a teammate'}
          </h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-[#F1F0EC]" aria-label="Close">
            <X className="w-4 h-4 text-[#9A9A9A]" />
          </button>
        </div>

        {invite ? (
          <div className="px-5 py-4 space-y-3">
            <div className="rounded-lg bg-[#EEF5F1] border border-[#DDE8E1] p-3 text-xs text-green-800">
              Invite created for <span className="font-semibold">{invite.email}</span> as <span className="font-semibold">{invite.role}</span>.
              Share the link below so they can join:
            </div>
            <div className="flex items-center gap-1.5">
              <input
                readOnly
                value={inviteUrl}
                className="flex-1 px-2 py-1.5 text-xs font-mono bg-[#EDEBE6] border border-[#E3E1DA] rounded"
              />
              <button
                onClick={handleCopy}
                className="h-8 px-3 text-xs font-semibold bg-[#4F7563] hover:bg-[#355846] text-white rounded inline-flex items-center gap-1.5"
              >
                {copied ? <><Check className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
              </button>
            </div>
            <div className="text-[10px] text-[#9A9A9A]">
              The link expires {new Date(invite.expiresAt).toLocaleDateString()}.
            </div>
            <div className="flex items-center justify-end pt-2">
              <button onClick={onClose} className="px-3 py-1.5 text-xs font-semibold bg-[#F1F0EC] hover:bg-[#E3E1DA] rounded">Done</button>
            </div>
          </div>
        ) : (
          <div className="px-5 py-4 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-[#111111] mb-1">Email address</label>
              <div className="relative">
                <Mail className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#C9C6BD] pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="teammate@company.com"
                  autoFocus
                  className="w-full h-8 pl-7 pr-2 text-sm border border-[#C9C6BD] rounded focus:outline-none focus:ring-2 focus:ring-[#4F7563]/30"
                />
              </div>
              <div className="text-[10px] text-[#9A9A9A] mt-1">They must have a Pitchonix account.</div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#111111] mb-1">Role</label>
              <div className="space-y-1">
                {ROLE_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-start gap-2 p-2 rounded cursor-pointer transition-colors ${
                      role === opt.value ? 'bg-[#EEF5F1] ring-1 ring-[#DDE8E1]' : 'hover:bg-[#EDEBE6]'
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
                      <div className="text-xs font-semibold text-[#111111]">{opt.label}</div>
                      <div className="text-[10px] text-[#9A9A9A]">{opt.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {error && (
              <div className="text-xs text-[#7a2929] bg-[#FCF1F1] border border-[#F7E3E3] rounded p-2">{error}</div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button onClick={onClose} className="px-3 py-1.5 text-xs font-semibold text-[#111111] hover:bg-[#F1F0EC] rounded">Cancel</button>
              <button
                onClick={handleSubmit}
                disabled={!email.trim() || sending}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-[#4F7563] hover:bg-[#355846] rounded inline-flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
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
