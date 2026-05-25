'use client';

import React, { useState } from 'react';
import { Settings2, Users, Mail, Activity, Shield, Trash2, UserPlus, X } from 'lucide-react';
import Link from 'next/link';
import { useWorkspaceDetail, useWorkspaceActivity } from './useWorkspaces';
import { useWorkspaceContext } from './WorkspaceContext';
import { InviteMemberModal } from './InviteMemberModal';
import type { WorkspaceRole } from '@/types/workspace';
import { relativeTime } from '../slide-editor/comments/relative-time';
import { useConfirm } from '@/components/ConfirmDialog';

// =============================================================================
//  Phase 39I — WorkspaceSettingsPage
//
//  Self-contained page UI. Host route (e.g. /workspaces/[id]/settings/page.tsx)
//  renders this with the workspaceId from URL params.
//
//  Tabs:
//    General     — name + description + danger zone (delete)
//    Members     — list, role change, remove, transfer ownership
//    Invitations — pending invites, revoke
//    Activity    — workspace activity feed + (admins) audit log
// =============================================================================

type Tab = 'general' | 'members' | 'invites' | 'activity';

const ROLE_LABEL: Record<WorkspaceRole, string> = {
  owner: 'Owner', admin: 'Admin', editor: 'Editor', reviewer: 'Reviewer', viewer: 'Viewer',
};

export const WorkspaceSettingsPage: React.FC<{ workspaceId: string }> = ({ workspaceId }) => {
  const detail = useWorkspaceDetail(workspaceId);
  const { can } = useWorkspaceContext();
  const confirm = useConfirm();
  const [tab, setTab] = useState<Tab>('general');
  const [inviteOpen, setInviteOpen] = useState(false);

  if (detail.loading && !detail.workspace) {
    return <div className="p-6 text-sm text-[#9A9A9A]">Loading workspace…</div>;
  }
  if (detail.error) {
    return <div className="p-6 text-sm text-[#9a3737]">{detail.error}</div>;
  }
  if (!detail.workspace) {
    return <div className="p-6 text-sm text-[#9A9A9A]">Workspace not found.</div>;
  }

  return (
    <div className="min-h-screen bg-[#EDEBE6]">
      <header className="bg-white border-b border-[#E3E1DA] px-6 h-14 flex items-center gap-3">
        <Link href="/dashboard" className="text-xs text-[#9A9A9A] hover:text-[#111111]">← Dashboard</Link>
        <div className="h-5 w-px bg-[#E3E1DA]" />
        <h1 className="text-base font-bold text-[#111111] flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-[#9A9A9A]" />
          {detail.workspace.name}
        </h1>
        <span className="text-[11px] uppercase tracking-wide text-[#C9C6BD] font-mono">Settings</span>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-6 grid grid-cols-[200px_1fr] gap-6">
        {/* Sidebar tabs */}
        <nav className="space-y-1">
          <TabButton  icon={Settings2} label="General"     active={tab === 'general'}  onClick={() => setTab('general')} />
          <TabButton  icon={Users}     label="Members"     active={tab === 'members'}  onClick={() => setTab('members')} />
          <TabButton  icon={Mail}      label="Invitations" active={tab === 'invites'}  onClick={() => setTab('invites')} />
          <TabButton  icon={Activity}  label="Activity"    active={tab === 'activity'} onClick={() => setTab('activity')} />
        </nav>

        {/* Main panel */}
        <main className="bg-white border border-[#E3E1DA] rounded-lg p-6">
          {tab === 'general'  && <GeneralTab  detail={detail} />}
          {tab === 'members'  && <MembersTab  detail={detail} onInvite={() => setInviteOpen(true)} />}
          {tab === 'invites'  && <InvitesTab  detail={detail} onInvite={() => setInviteOpen(true)} />}
          {tab === 'activity' && <ActivityTab workspaceId={workspaceId} canAudit={can('audit.view')} />}
        </main>
      </div>

      <InviteMemberModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onInvite={(email, role) => detail.invite(email, role)}
      />
    </div>
  );
};

const TabButton: React.FC<{
  icon: React.ComponentType<any>; label: string; active: boolean; onClick: () => void;
}> = ({ icon: Icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded transition-colors ${
      active ? 'bg-[#EEF5F1] text-[#263F34]' : 'text-[#6B6B6B] hover:bg-[#F1F0EC] hover:text-[#111111]'
    }`}
  >
    <Icon className="w-3.5 h-3.5" /> {label}
  </button>
);

// =============================================================================
//  General tab
// =============================================================================

const GeneralTab: React.FC<{ detail: ReturnType<typeof useWorkspaceDetail> }> = ({ detail }) => {
  const ws = detail.workspace!;
  const { can } = useWorkspaceContext();
  const confirm = useConfirm();
  const [name, setName] = useState(ws.name);
  const [description, setDescription] = useState(ws.description || '');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  React.useEffect(() => { setName(ws.name); setDescription(ws.description || ''); }, [ws.id, ws.name, ws.description]);

  const dirty = name !== ws.name || description !== (ws.description || '');
  const editable = can('workspace.edit');

  const save = async () => {
    setBusy(true);
    try {
      await detail.rename({ name: name.trim() || ws.name, description });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } finally { setBusy(false); }
  };

  const handleDelete = async () => {
    if (!(await confirm({ title: 'Delete workspace?', message: 'Projects in this workspace will be detached but not deleted.', confirmLabel: 'Delete workspace', tone: 'danger' }))) return;
    await detail.remove();
    window.location.href = '/dashboard';
  };

  return (
    <div className="space-y-5 max-w-lg">
      <div>
        <h2 className="text-sm font-bold text-[#111111] mb-3">General</h2>
        <label className="block text-xs font-semibold text-[#111111] mb-1">Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={!editable}
          className="w-full h-8 px-2 text-sm border border-[#C9C6BD] rounded focus:outline-none focus:ring-2 focus:ring-[#4F7563]/30 disabled:bg-[#EDEBE6] disabled:text-[#9A9A9A]"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-[#111111] mb-1">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={!editable}
          rows={3}
          className="w-full px-2 py-1.5 text-sm border border-[#C9C6BD] rounded resize-none focus:outline-none focus:ring-2 focus:ring-[#4F7563]/30 disabled:bg-[#EDEBE6]"
        />
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={save}
          disabled={!editable || !dirty || busy}
          className="px-3 py-1.5 text-xs font-semibold bg-[#4F7563] hover:bg-[#355846] text-white rounded disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {busy ? 'Saving…' : 'Save changes'}
        </button>
        {saved && <span className="text-xs text-[#355846]">Saved</span>}
      </div>

      {can('workspace.delete') && (
        <div className="border-t border-[#E3E1DA] pt-5">
          <h3 className="text-xs font-bold text-[#7a2929] uppercase tracking-wide mb-2">Danger zone</h3>
          <button
            onClick={handleDelete}
            className="px-3 py-1.5 text-xs font-semibold text-[#7a2929] border border-[#F1D2D2] hover:bg-[#FCF1F1] rounded inline-flex items-center gap-1.5"
          >
            <Trash2 className="w-3 h-3" /> Delete workspace
          </button>
        </div>
      )}
    </div>
  );
};

// =============================================================================
//  Members tab
// =============================================================================

const MembersTab: React.FC<{
  detail:   ReturnType<typeof useWorkspaceDetail>;
  onInvite: () => void;
}> = ({ detail, onInvite }) => {
  const { can } = useWorkspaceContext();
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-[#111111]">Members ({detail.members.length})</h2>
        {can('member.invite') && (
          <button
            onClick={onInvite}
            className="px-3 py-1.5 text-xs font-semibold bg-[#4F7563] hover:bg-[#355846] text-white rounded inline-flex items-center gap-1.5"
          >
            <UserPlus className="w-3 h-3" /> Invite
          </button>
        )}
      </div>

      <div className="border border-[#E3E1DA] rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#EDEBE6] border-b border-[#E3E1DA]">
            <tr>
              <th className="text-left text-[10px] font-bold uppercase tracking-wide text-[#9A9A9A] px-3 py-2">Member</th>
              <th className="text-left text-[10px] font-bold uppercase tracking-wide text-[#9A9A9A] px-3 py-2">Joined</th>
              <th className="text-left text-[10px] font-bold uppercase tracking-wide text-[#9A9A9A] px-3 py-2">Role</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {detail.members.map((m) => (
              <MemberRow key={m.id} member={m} detail={detail} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const MemberRow: React.FC<{
  member: NonNullable<ReturnType<typeof useWorkspaceDetail>['members']>[number];
  detail: ReturnType<typeof useWorkspaceDetail>;
}> = ({ member, detail }) => {
  const { can } = useWorkspaceContext();
  const confirm = useConfirm();
  const isOwner = member.role === 'owner';
  const canChange = can('member.role_change') && !isOwner;
  const canRemove = can('member.remove') && !isOwner;
  const canTransfer = can('ownership.transfer') && !isOwner;

  return (
    <tr className="hover:bg-[#EDEBE6]">
      <td className="px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-[#4F7563] text-white text-xs font-bold flex items-center justify-center">
            {(member.user.name || member.user.email).charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-[#111111] truncate">{member.user.name || member.user.email}</div>
            {member.user.name && <div className="text-[10px] text-[#9A9A9A] truncate">{member.user.email}</div>}
          </div>
        </div>
      </td>
      <td className="px-3 py-2 text-[11px] text-[#9A9A9A]">{relativeTime(member.joinedAt)}</td>
      <td className="px-3 py-2">
        {canChange ? (
          <select
            value={member.role}
            onChange={(e) => detail.changeRole(member.id, e.target.value as WorkspaceRole)}
            className="text-xs border border-[#C9C6BD] rounded px-1.5 py-0.5"
          >
            {(['admin', 'editor', 'reviewer', 'viewer'] as const).map((r) => (
              <option key={r} value={r}>{ROLE_LABEL[r]}</option>
            ))}
          </select>
        ) : (
          <span className="text-xs font-semibold text-[#111111]">{ROLE_LABEL[member.role]}</span>
        )}
      </td>
      <td className="px-3 py-2 text-right">
        <div className="inline-flex items-center gap-1">
          {canTransfer && (
            <button
              onClick={async () => {
                if (await confirm({ title: 'Transfer ownership?', message: `${member.user.name || member.user.email} will become the workspace owner. You will be demoted to admin.`, confirmLabel: 'Transfer', tone: 'warning' })) {
                  await detail.transferOwnership(member.user.id);
                }
              }}
              className="px-2 py-0.5 text-[10px] font-semibold text-[#355846] hover:bg-[#EEF5F1] rounded"
            >
              Transfer
            </button>
          )}
          {canRemove && (
            <button
              onClick={async () => {
                if (await confirm({ title: 'Remove member?', message: `${member.user.name || member.user.email} will lose access to this workspace.`, confirmLabel: 'Remove', tone: 'danger' })) {
                  await detail.removeMember(member.id);
                }
              }}
              className="p-1 rounded text-[#9a3737] hover:bg-[#FCF1F1]"
              title="Remove"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
};

// =============================================================================
//  Invitations tab
// =============================================================================

const InvitesTab: React.FC<{
  detail:   ReturnType<typeof useWorkspaceDetail>;
  onInvite: () => void;
}> = ({ detail, onInvite }) => {
  const { can } = useWorkspaceContext();
  if (!can('member.invite')) {
    return <div className="text-sm text-[#9A9A9A]">You don't have permission to view invitations.</div>;
  }
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-[#111111]">Pending invitations ({detail.invites.length})</h2>
        <button
          onClick={onInvite}
          className="px-3 py-1.5 text-xs font-semibold bg-[#4F7563] hover:bg-[#355846] text-white rounded inline-flex items-center gap-1.5"
        >
          <UserPlus className="w-3 h-3" /> Invite
        </button>
      </div>
      {detail.invites.length === 0 ? (
        <div className="text-sm text-[#9A9A9A] italic">No pending invitations.</div>
      ) : (
        <div className="border border-[#E3E1DA] rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#EDEBE6] border-b border-[#E3E1DA]">
              <tr>
                <th className="text-left text-[10px] font-bold uppercase tracking-wide text-[#9A9A9A] px-3 py-2">Email</th>
                <th className="text-left text-[10px] font-bold uppercase tracking-wide text-[#9A9A9A] px-3 py-2">Role</th>
                <th className="text-left text-[10px] font-bold uppercase tracking-wide text-[#9A9A9A] px-3 py-2">Sent</th>
                <th className="text-left text-[10px] font-bold uppercase tracking-wide text-[#9A9A9A] px-3 py-2">Expires</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {detail.invites.map((inv) => (
                <tr key={inv.id} className="hover:bg-[#EDEBE6]">
                  <td className="px-3 py-2 text-xs font-semibold text-[#111111]">{inv.email}</td>
                  <td className="px-3 py-2 text-xs">{ROLE_LABEL[inv.role]}</td>
                  <td className="px-3 py-2 text-[11px] text-[#9A9A9A]">{relativeTime(inv.createdAt)}</td>
                  <td className="px-3 py-2 text-[11px] text-[#9A9A9A]">{new Date(inv.expiresAt).toLocaleDateString()}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => detail.revokeInvite(inv.id)}
                      className="text-[10px] font-semibold text-[#7a2929] hover:bg-[#FCF1F1] px-2 py-0.5 rounded"
                    >
                      Revoke
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// =============================================================================
//  Activity tab — feed + audit log
// =============================================================================

const ActivityTab: React.FC<{ workspaceId: string; canAudit: boolean }> = ({ workspaceId, canAudit }) => {
  const { activity, audit, loading } = useWorkspaceActivity(workspaceId, canAudit);
  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-sm font-bold text-[#111111] mb-3 flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-[#9A9A9A]" /> Activity feed
        </h2>
        {loading ? (
          <div className="text-xs text-[#C9C6BD]">Loading…</div>
        ) : activity.length === 0 ? (
          <div className="text-xs text-[#9A9A9A] italic">No activity yet.</div>
        ) : (
          <ul className="space-y-1.5">
            {activity.slice(0, 50).map((a) => (
              <li key={a.id} className="text-xs flex items-baseline gap-2">
                <span className="text-[10px] text-[#C9C6BD] font-mono">{relativeTime(a.createdAt)}</span>
                <span className="font-semibold text-[#111111]">{a.actor?.name || a.actor?.email || 'system'}</span>
                <span className="text-[#9A9A9A]">{a.type.replace(/_/g, ' ')}</span>
                {a.entity?.name && <span className="text-[#111111] italic">— {a.entity.name}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>

      {canAudit && (
        <section>
          <h2 className="text-sm font-bold text-[#111111] mb-3 flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-[#8c6210]" /> Audit log
          </h2>
          {audit.length === 0 ? (
            <div className="text-xs text-[#9A9A9A] italic">No admin actions logged.</div>
          ) : (
            <ul className="space-y-1.5">
              {audit.slice(0, 50).map((a) => (
                <li key={a.id} className="text-xs flex items-baseline gap-2">
                  <span className="text-[10px] text-[#C9C6BD] font-mono">{relativeTime(a.createdAt)}</span>
                  <span className="font-semibold text-[#111111]">{a.actor?.name || a.actor?.email || 'system'}</span>
                  <span className="text-[#735008]">{a.action.replace(/_/g, ' ')}</span>
                  {a.targetType && <span className="text-[10px] text-[#C9C6BD]">{a.targetType}:{a.targetId?.slice(0, 8)}</span>}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
};
