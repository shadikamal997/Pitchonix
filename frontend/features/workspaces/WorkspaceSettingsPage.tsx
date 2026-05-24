'use client';

import React, { useState } from 'react';
import { Settings2, Users, Mail, Activity, Shield, Trash2, UserPlus, X } from 'lucide-react';
import Link from 'next/link';
import { useWorkspaceDetail, useWorkspaceActivity } from './useWorkspaces';
import { useWorkspaceContext } from './WorkspaceContext';
import { InviteMemberModal } from './InviteMemberModal';
import type { WorkspaceRole } from '@/types/workspace';
import { relativeTime } from '../slide-editor/comments/relative-time';

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
  const [tab, setTab] = useState<Tab>('general');
  const [inviteOpen, setInviteOpen] = useState(false);

  if (detail.loading && !detail.workspace) {
    return <div className="p-6 text-sm text-slate-500">Loading workspace…</div>;
  }
  if (detail.error) {
    return <div className="p-6 text-sm text-red-600">{detail.error}</div>;
  }
  if (!detail.workspace) {
    return <div className="p-6 text-sm text-slate-500">Workspace not found.</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 h-14 flex items-center gap-3">
        <Link href="/dashboard" className="text-xs text-slate-500 hover:text-slate-900">← Dashboard</Link>
        <div className="h-5 w-px bg-slate-200" />
        <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-slate-500" />
          {detail.workspace.name}
        </h1>
        <span className="text-[11px] uppercase tracking-wide text-slate-400 font-mono">Settings</span>
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
        <main className="bg-white border border-slate-200 rounded-lg p-6">
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
      active ? 'bg-blue-50 text-blue-800' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
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
    if (!window.confirm('Delete this workspace? Projects in it will be detached but not deleted.')) return;
    await detail.remove();
    window.location.href = '/dashboard';
  };

  return (
    <div className="space-y-5 max-w-lg">
      <div>
        <h2 className="text-sm font-bold text-slate-900 mb-3">General</h2>
        <label className="block text-xs font-semibold text-slate-700 mb-1">Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={!editable}
          className="w-full h-8 px-2 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:bg-slate-50 disabled:text-slate-500"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={!editable}
          rows={3}
          className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:bg-slate-50"
        />
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={save}
          disabled={!editable || !dirty || busy}
          className="px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {busy ? 'Saving…' : 'Save changes'}
        </button>
        {saved && <span className="text-xs text-green-700">Saved</span>}
      </div>

      {can('workspace.delete') && (
        <div className="border-t border-slate-200 pt-5">
          <h3 className="text-xs font-bold text-red-700 uppercase tracking-wide mb-2">Danger zone</h3>
          <button
            onClick={handleDelete}
            className="px-3 py-1.5 text-xs font-semibold text-red-700 border border-red-300 hover:bg-red-50 rounded inline-flex items-center gap-1.5"
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
        <h2 className="text-sm font-bold text-slate-900">Members ({detail.members.length})</h2>
        {can('member.invite') && (
          <button
            onClick={onInvite}
            className="px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded inline-flex items-center gap-1.5"
          >
            <UserPlus className="w-3 h-3" /> Invite
          </button>
        )}
      </div>

      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left text-[10px] font-bold uppercase tracking-wide text-slate-500 px-3 py-2">Member</th>
              <th className="text-left text-[10px] font-bold uppercase tracking-wide text-slate-500 px-3 py-2">Joined</th>
              <th className="text-left text-[10px] font-bold uppercase tracking-wide text-slate-500 px-3 py-2">Role</th>
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
  const isOwner = member.role === 'owner';
  const canChange = can('member.role_change') && !isOwner;
  const canRemove = can('member.remove') && !isOwner;
  const canTransfer = can('ownership.transfer') && !isOwner;

  return (
    <tr className="hover:bg-slate-50">
      <td className="px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-blue-500 text-white text-xs font-bold flex items-center justify-center">
            {(member.user.name || member.user.email).charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-slate-900 truncate">{member.user.name || member.user.email}</div>
            {member.user.name && <div className="text-[10px] text-slate-500 truncate">{member.user.email}</div>}
          </div>
        </div>
      </td>
      <td className="px-3 py-2 text-[11px] text-slate-500">{relativeTime(member.joinedAt)}</td>
      <td className="px-3 py-2">
        {canChange ? (
          <select
            value={member.role}
            onChange={(e) => detail.changeRole(member.id, e.target.value as WorkspaceRole)}
            className="text-xs border border-slate-300 rounded px-1.5 py-0.5"
          >
            {(['admin', 'editor', 'reviewer', 'viewer'] as const).map((r) => (
              <option key={r} value={r}>{ROLE_LABEL[r]}</option>
            ))}
          </select>
        ) : (
          <span className="text-xs font-semibold text-slate-700">{ROLE_LABEL[member.role]}</span>
        )}
      </td>
      <td className="px-3 py-2 text-right">
        <div className="inline-flex items-center gap-1">
          {canTransfer && (
            <button
              onClick={async () => {
                if (window.confirm(`Transfer ownership to ${member.user.name || member.user.email}? You will be demoted to admin.`)) {
                  await detail.transferOwnership(member.user.id);
                }
              }}
              className="px-2 py-0.5 text-[10px] font-semibold text-purple-700 hover:bg-purple-50 rounded"
            >
              Transfer
            </button>
          )}
          {canRemove && (
            <button
              onClick={async () => {
                if (window.confirm(`Remove ${member.user.name || member.user.email} from this workspace?`)) {
                  await detail.removeMember(member.id);
                }
              }}
              className="p-1 rounded text-red-600 hover:bg-red-50"
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
    return <div className="text-sm text-slate-500">You don't have permission to view invitations.</div>;
  }
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-900">Pending invitations ({detail.invites.length})</h2>
        <button
          onClick={onInvite}
          className="px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded inline-flex items-center gap-1.5"
        >
          <UserPlus className="w-3 h-3" /> Invite
        </button>
      </div>
      {detail.invites.length === 0 ? (
        <div className="text-sm text-slate-500 italic">No pending invitations.</div>
      ) : (
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left text-[10px] font-bold uppercase tracking-wide text-slate-500 px-3 py-2">Email</th>
                <th className="text-left text-[10px] font-bold uppercase tracking-wide text-slate-500 px-3 py-2">Role</th>
                <th className="text-left text-[10px] font-bold uppercase tracking-wide text-slate-500 px-3 py-2">Sent</th>
                <th className="text-left text-[10px] font-bold uppercase tracking-wide text-slate-500 px-3 py-2">Expires</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {detail.invites.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2 text-xs font-semibold text-slate-900">{inv.email}</td>
                  <td className="px-3 py-2 text-xs">{ROLE_LABEL[inv.role]}</td>
                  <td className="px-3 py-2 text-[11px] text-slate-500">{relativeTime(inv.createdAt)}</td>
                  <td className="px-3 py-2 text-[11px] text-slate-500">{new Date(inv.expiresAt).toLocaleDateString()}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => detail.revokeInvite(inv.id)}
                      className="text-[10px] font-semibold text-red-700 hover:bg-red-50 px-2 py-0.5 rounded"
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
        <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-slate-500" /> Activity feed
        </h2>
        {loading ? (
          <div className="text-xs text-slate-400">Loading…</div>
        ) : activity.length === 0 ? (
          <div className="text-xs text-slate-500 italic">No activity yet.</div>
        ) : (
          <ul className="space-y-1.5">
            {activity.slice(0, 50).map((a) => (
              <li key={a.id} className="text-xs flex items-baseline gap-2">
                <span className="text-[10px] text-slate-400 font-mono">{relativeTime(a.createdAt)}</span>
                <span className="font-semibold text-slate-800">{a.actor?.name || a.actor?.email || 'system'}</span>
                <span className="text-slate-500">{a.type.replace(/_/g, ' ')}</span>
                {a.entity?.name && <span className="text-slate-700 italic">— {a.entity.name}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>

      {canAudit && (
        <section>
          <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-amber-600" /> Audit log
          </h2>
          {audit.length === 0 ? (
            <div className="text-xs text-slate-500 italic">No admin actions logged.</div>
          ) : (
            <ul className="space-y-1.5">
              {audit.slice(0, 50).map((a) => (
                <li key={a.id} className="text-xs flex items-baseline gap-2">
                  <span className="text-[10px] text-slate-400 font-mono">{relativeTime(a.createdAt)}</span>
                  <span className="font-semibold text-slate-800">{a.actor?.name || a.actor?.email || 'system'}</span>
                  <span className="text-amber-700">{a.action.replace(/_/g, ' ')}</span>
                  {a.targetType && <span className="text-[10px] text-slate-400">{a.targetType}:{a.targetId?.slice(0, 8)}</span>}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
};
