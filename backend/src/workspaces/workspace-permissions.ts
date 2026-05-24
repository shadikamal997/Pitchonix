/**
 * Phase 39E — Workspace permission matrix
 *
 * Pure module. Declares the 5 roles and every action a workspace member
 * might attempt. The matrix is the single source of truth for both backend
 * guards (@RequireRole / WorkspaceRoleGuard) and frontend conditional UI
 * (a mirror file under frontend/types/workspace-permissions.ts).
 */

export const WORKSPACE_ROLES = ['owner', 'admin', 'editor', 'reviewer', 'viewer'] as const;
export type WorkspaceRole = typeof WORKSPACE_ROLES[number];

export type WorkspaceAction =
  // Workspace administration
  | 'workspace.view'
  | 'workspace.edit'
  | 'workspace.delete'
  // Member management
  | 'member.view'
  | 'member.invite'
  | 'member.remove'
  | 'member.role_change'
  | 'ownership.transfer'
  // Audit / activity surfaces
  | 'activity.view'
  | 'audit.view'
  // Project / deck content
  | 'deck.view'
  | 'deck.create'
  | 'deck.edit'
  | 'deck.delete'
  | 'deck.share'
  | 'deck.transfer'
  | 'deck.export'
  // Comments
  | 'comment.view'
  | 'comment.create'
  | 'comment.resolve'
  | 'comment.assign'
  // Reviews
  | 'review.request'
  | 'review.act'
  // Phase 39.1C — granular content actions used by the remaining route retrofits.
  | 'elements.view'
  | 'elements.edit'
  | 'masters.edit'
  | 'components.edit'
  | 'exports.generate'
  | 'versionHistory.restore'
  | 'versionHistory.delete';

export const ROLE_RANK: Record<WorkspaceRole, number> = {
  owner:    5,
  admin:    4,
  editor:   3,
  reviewer: 2,
  viewer:   1,
};

const T = true;
const F = false;

const MATRIX: Record<WorkspaceRole, Record<WorkspaceAction, boolean>> = {
  owner: {
    'workspace.view': T, 'workspace.edit': T, 'workspace.delete': T,
    'member.view': T, 'member.invite': T, 'member.remove': T, 'member.role_change': T,
    'ownership.transfer': T,
    'activity.view': T, 'audit.view': T,
    'deck.view': T, 'deck.create': T, 'deck.edit': T, 'deck.delete': T,
    'deck.share': T, 'deck.transfer': T, 'deck.export': T,
    'comment.view': T, 'comment.create': T, 'comment.resolve': T, 'comment.assign': T,
    'review.request': T, 'review.act': T,
    'elements.view': T, 'elements.edit': T,
    'masters.edit': T, 'components.edit': T,
    'exports.generate': T,
    'versionHistory.restore': T, 'versionHistory.delete': T,
  },
  admin: {
    'workspace.view': T, 'workspace.edit': T, 'workspace.delete': F,
    'member.view': T, 'member.invite': T, 'member.remove': T, 'member.role_change': T,
    'ownership.transfer': F,
    'activity.view': T, 'audit.view': T,
    'deck.view': T, 'deck.create': T, 'deck.edit': T, 'deck.delete': T,
    'deck.share': T, 'deck.transfer': T, 'deck.export': T,
    'comment.view': T, 'comment.create': T, 'comment.resolve': T, 'comment.assign': T,
    'review.request': T, 'review.act': T,
    'elements.view': T, 'elements.edit': T,
    'masters.edit': T, 'components.edit': T,
    'exports.generate': T,
    'versionHistory.restore': T, 'versionHistory.delete': T,
  },
  editor: {
    'workspace.view': T, 'workspace.edit': F, 'workspace.delete': F,
    'member.view': T, 'member.invite': F, 'member.remove': F, 'member.role_change': F,
    'ownership.transfer': F,
    'activity.view': T, 'audit.view': F,
    'deck.view': T, 'deck.create': T, 'deck.edit': T, 'deck.delete': T,
    'deck.share': T, 'deck.transfer': F, 'deck.export': T,
    'comment.view': T, 'comment.create': T, 'comment.resolve': T, 'comment.assign': T,
    'review.request': T, 'review.act': F,
    'elements.view': T, 'elements.edit': T,
    'masters.edit': T, 'components.edit': T,
    'exports.generate': T,
    'versionHistory.restore': T, 'versionHistory.delete': F,
  },
  reviewer: {
    'workspace.view': T, 'workspace.edit': F, 'workspace.delete': F,
    'member.view': T, 'member.invite': F, 'member.remove': F, 'member.role_change': F,
    'ownership.transfer': F,
    'activity.view': T, 'audit.view': F,
    'deck.view': T, 'deck.create': F, 'deck.edit': F, 'deck.delete': F,
    'deck.share': F, 'deck.transfer': F, 'deck.export': T,
    'comment.view': T, 'comment.create': T, 'comment.resolve': T, 'comment.assign': F,
    'review.request': F, 'review.act': T,
    'elements.view': T, 'elements.edit': F,
    'masters.edit': F, 'components.edit': F,
    'exports.generate': T,
    'versionHistory.restore': F, 'versionHistory.delete': F,
  },
  viewer: {
    'workspace.view': T, 'workspace.edit': F, 'workspace.delete': F,
    'member.view': T, 'member.invite': F, 'member.remove': F, 'member.role_change': F,
    'ownership.transfer': F,
    'activity.view': T, 'audit.view': F,
    'deck.view': T, 'deck.create': F, 'deck.edit': F, 'deck.delete': F,
    'deck.share': F, 'deck.transfer': F, 'deck.export': T,
    'comment.view': T, 'comment.create': F, 'comment.resolve': F, 'comment.assign': F,
    'review.request': F, 'review.act': F,
    'elements.view': T, 'elements.edit': F,
    'masters.edit': F, 'components.edit': F,
    'exports.generate': F,
    'versionHistory.restore': F, 'versionHistory.delete': F,
  },
};

export function canRole(role: WorkspaceRole, action: WorkspaceAction): boolean {
  return MATRIX[role]?.[action] ?? false;
}

export function isHigherRole(a: WorkspaceRole, b: WorkspaceRole): boolean {
  return ROLE_RANK[a] > ROLE_RANK[b];
}

export function isAtLeastRole(a: WorkspaceRole, b: WorkspaceRole): boolean {
  return ROLE_RANK[a] >= ROLE_RANK[b];
}

export function permissionsFor(role: WorkspaceRole): Record<WorkspaceAction, boolean> {
  return { ...MATRIX[role] };
}
