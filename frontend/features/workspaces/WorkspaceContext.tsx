'use client';

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import api from '@/lib/api';
import type { WorkspaceMembershipDTO, ResolvedPermissionsDTO, WorkspaceAction, WorkspaceRole } from '@/types/workspace';

// =============================================================================
//  Phase 39 — Workspace context
//
//  Tracks the user's workspaces + the *currently active* one. Selected
//  workspace persists in localStorage so reloading the page keeps the user
//  in the same workspace. Provides a `can(action)` helper backed by the
//  permission matrix fetched from /workspaces/:id/permissions.
// =============================================================================

const STORAGE_KEY = 'pitchonix.currentWorkspaceId';

interface WorkspaceContextValue {
  workspaces:        WorkspaceMembershipDTO[];
  currentWorkspaceId: string | null;
  currentMembership:  WorkspaceMembershipDTO | null;
  permissions:        ResolvedPermissionsDTO | null;
  loading:            boolean;
  error:              string | null;

  setCurrentWorkspaceId: (id: string | null) => void;
  refresh:               () => Promise<void>;
  can:                   (action: WorkspaceAction) => boolean;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [workspaces, setWorkspaces]   = useState<WorkspaceMembershipDTO[]>([]);
  const [currentId,  setCurrentId]    = useState<string | null>(null);
  const [permissions, setPermissions] = useState<ResolvedPermissionsDTO | null>(null);
  const [loading,    setLoading]      = useState(false);
  const [error,      setError]        = useState<string | null>(null);

  // Restore selection from localStorage on mount.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) setCurrentId(saved);
    } catch { /* SSR / privacy mode */ }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<WorkspaceMembershipDTO[]>('/workspaces');
      setWorkspaces(data || []);
      // Auto-select: stored choice if still valid, else the first one.
      const stored = window.localStorage.getItem(STORAGE_KEY);
      const validIds = new Set((data || []).map((m) => m.workspace.id));
      if (stored && validIds.has(stored)) {
        setCurrentId(stored);
      } else if ((data || []).length > 0) {
        setCurrentId(data![0].workspace.id);
      } else {
        setCurrentId(null);
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to load workspaces');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Persist + fetch permissions whenever the selected workspace changes.
  useEffect(() => {
    if (!currentId) { setPermissions(null); return; }
    try { window.localStorage.setItem(STORAGE_KEY, currentId); } catch { /* ignore */ }
    let cancelled = false;
    api.get<ResolvedPermissionsDTO>(`/workspaces/${currentId}/permissions`).then(({ data }) => {
      if (!cancelled) setPermissions(data);
    }).catch(() => { if (!cancelled) setPermissions(null); });
    return () => { cancelled = true; };
  }, [currentId]);

  const currentMembership = useMemo(
    () => workspaces.find((m) => m.workspace.id === currentId) || null,
    [workspaces, currentId],
  );

  const can = useCallback((action: WorkspaceAction): boolean => {
    return permissions?.can?.[action] === true;
  }, [permissions]);

  const value: WorkspaceContextValue = {
    workspaces,
    currentWorkspaceId: currentId,
    currentMembership,
    permissions,
    loading,
    error,
    setCurrentWorkspaceId: setCurrentId,
    refresh,
    can,
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
};

export function useWorkspaceContext(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspaceContext must be used within a WorkspaceProvider');
  return ctx;
}

/** Convenience hook — returns just the currently active membership. */
export function useCurrentWorkspace(): {
  workspaceId: string | null;
  role:        WorkspaceRole | null;
  name:        string | null;
} {
  const { currentMembership } = useWorkspaceContext();
  return {
    workspaceId: currentMembership?.workspace.id ?? null,
    role:        (currentMembership?.role as WorkspaceRole | undefined) ?? null,
    name:        currentMembership?.workspace.name ?? null,
  };
}

/** Convenience hook — returns just the `can(action)` helper. */
export function useCan(): (action: WorkspaceAction) => boolean {
  return useWorkspaceContext().can;
}
