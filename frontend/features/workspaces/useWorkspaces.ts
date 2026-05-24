'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';
import type {
  WorkspaceMembershipDTO, WorkspaceMemberDTO, WorkspaceInviteDTO,
  WorkspaceActivityDTO, WorkspaceAuditLogDTO,
  ResolvedPermissionsDTO, WorkspaceRole,
} from '@/types/workspace';

// =============================================================================
//  Phase 39 — useWorkspaces hooks (CRUD wrappers around backend endpoints)
//
//  Three hooks:
//    useMyWorkspaces      — list workspaces the current user belongs to
//    useWorkspaceDetail   — single workspace + permissions + members + invites
//    useWorkspaceActivity — activity feed + audit log for a workspace
// =============================================================================

// ----------------------------------------------------------------------------
//  My workspaces
// ----------------------------------------------------------------------------

export function useMyWorkspaces() {
  const [items,   setItems]   = useState<WorkspaceMembershipDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<WorkspaceMembershipDTO[]>('/workspaces');
      setItems(data || []);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to load workspaces');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const create = useCallback(async (input: { name: string; description?: string }) => {
    const { data } = await api.post<WorkspaceMembershipDTO['workspace']>('/workspaces', input);
    await refresh();
    return data;
  }, [refresh]);

  return { items, loading, error, refresh, create };
}

// ----------------------------------------------------------------------------
//  Single-workspace detail (members, invites, permissions)
// ----------------------------------------------------------------------------

export interface UseWorkspaceDetailResult {
  workspace:   WorkspaceMembershipDTO['workspace'] | null;
  permissions: ResolvedPermissionsDTO | null;
  members:     WorkspaceMemberDTO[];
  invites:     WorkspaceInviteDTO[];
  loading:     boolean;
  error:       string | null;
  refresh:     () => Promise<void>;
  // Mutations
  rename:           (patch: { name?: string; description?: string }) => Promise<void>;
  remove:           () => Promise<void>;
  invite:           (email: string, role: WorkspaceRole) => Promise<WorkspaceInviteDTO | null>;
  revokeInvite:     (inviteId: string) => Promise<void>;
  changeRole:       (memberId: string, role: WorkspaceRole) => Promise<void>;
  removeMember:     (memberId: string) => Promise<void>;
  transferOwnership: (toUserId: string) => Promise<void>;
}

export function useWorkspaceDetail(workspaceId: string | null | undefined): UseWorkspaceDetailResult {
  const [workspace,   setWorkspace]   = useState<WorkspaceMembershipDTO['workspace'] | null>(null);
  const [permissions, setPermissions] = useState<ResolvedPermissionsDTO | null>(null);
  const [members,     setMembers]     = useState<WorkspaceMemberDTO[]>([]);
  const [invites,     setInvites]     = useState<WorkspaceInviteDTO[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!workspaceId) { setWorkspace(null); setPermissions(null); setMembers([]); setInvites([]); return; }
    setLoading(true);
    setError(null);
    try {
      const [ws, perms, mem] = await Promise.all([
        api.get(`/workspaces/${workspaceId}`),
        api.get<ResolvedPermissionsDTO>(`/workspaces/${workspaceId}/permissions`),
        api.get<WorkspaceMemberDTO[]>(`/workspaces/${workspaceId}/members`),
      ]);
      setWorkspace(ws.data);
      setPermissions(perms.data);
      setMembers(mem.data || []);
      // Invites only visible to admins+; tolerate 403 silently.
      try {
        const inv = await api.get<WorkspaceInviteDTO[]>(`/workspaces/${workspaceId}/invites`);
        setInvites(inv.data || []);
      } catch { setInvites([]); }
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to load workspace');
    } finally { setLoading(false); }
  }, [workspaceId]);

  useEffect(() => { refresh(); }, [refresh]);

  const rename = useCallback(async (patch: { name?: string; description?: string }) => {
    if (!workspaceId) return;
    await api.patch(`/workspaces/${workspaceId}`, patch);
    await refresh();
  }, [workspaceId, refresh]);

  const remove = useCallback(async () => {
    if (!workspaceId) return;
    await api.delete(`/workspaces/${workspaceId}`);
  }, [workspaceId]);

  const invite = useCallback(async (email: string, role: WorkspaceRole) => {
    if (!workspaceId) return null;
    const { data } = await api.post<WorkspaceInviteDTO>(`/workspaces/${workspaceId}/invites`, { email, role });
    await refresh();
    return data;
  }, [workspaceId, refresh]);

  const revokeInvite = useCallback(async (inviteId: string) => {
    if (!workspaceId) return;
    await api.delete(`/workspaces/${workspaceId}/invites/${inviteId}`);
    await refresh();
  }, [workspaceId, refresh]);

  const changeRole = useCallback(async (memberId: string, role: WorkspaceRole) => {
    if (!workspaceId) return;
    await api.patch(`/workspaces/${workspaceId}/members/${memberId}`, { role });
    await refresh();
  }, [workspaceId, refresh]);

  const removeMember = useCallback(async (memberId: string) => {
    if (!workspaceId) return;
    await api.delete(`/workspaces/${workspaceId}/members/${memberId}`);
    await refresh();
  }, [workspaceId, refresh]);

  const transferOwnership = useCallback(async (toUserId: string) => {
    if (!workspaceId) return;
    await api.post(`/workspaces/${workspaceId}/transfer-ownership`, { toUserId });
    await refresh();
  }, [workspaceId, refresh]);

  return {
    workspace, permissions, members, invites, loading, error, refresh,
    rename, remove, invite, revokeInvite, changeRole, removeMember, transferOwnership,
  };
}

// ----------------------------------------------------------------------------
//  Activity + audit
// ----------------------------------------------------------------------------

export function useWorkspaceActivity(workspaceId: string | null | undefined, includeAudit = false) {
  const [activity, setActivity] = useState<WorkspaceActivityDTO[]>([]);
  const [audit,    setAudit]    = useState<WorkspaceAuditLogDTO[]>([]);
  const [loading,  setLoading]  = useState(false);

  const refresh = useCallback(async () => {
    if (!workspaceId) { setActivity([]); setAudit([]); return; }
    setLoading(true);
    try {
      const [act] = await Promise.all([
        api.get<WorkspaceActivityDTO[]>(`/workspaces/${workspaceId}/activity`),
      ]);
      setActivity(act.data || []);
      if (includeAudit) {
        try {
          const aud = await api.get<WorkspaceAuditLogDTO[]>(`/workspaces/${workspaceId}/audit-log`);
          setAudit(aud.data || []);
        } catch { setAudit([]); }
      }
    } finally { setLoading(false); }
  }, [workspaceId, includeAudit]);

  useEffect(() => { refresh(); }, [refresh]);

  return { activity, audit, loading, refresh };
}

// ----------------------------------------------------------------------------
//  Accept invite (token-based)
// ----------------------------------------------------------------------------

export async function acceptWorkspaceInvite(token: string): Promise<{ workspaceId: string; role: WorkspaceRole }> {
  const { data } = await api.post<{ workspaceId: string; role: WorkspaceRole }>('/workspace-invites/accept', { token });
  return data;
}
