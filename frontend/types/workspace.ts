// =============================================================================
//  Phase 39 — Workspace types (frontend mirror of backend models)
// =============================================================================

export const WORKSPACE_ROLES = ['owner', 'admin', 'editor', 'reviewer', 'viewer'] as const;
export type WorkspaceRole = typeof WORKSPACE_ROLES[number];

export type WorkspaceAction =
  | 'workspace.view' | 'workspace.edit' | 'workspace.delete'
  | 'member.view' | 'member.invite' | 'member.remove' | 'member.role_change'
  | 'ownership.transfer'
  | 'activity.view' | 'audit.view'
  | 'deck.view' | 'deck.create' | 'deck.edit' | 'deck.delete'
  | 'deck.share' | 'deck.transfer' | 'deck.export'
  | 'comment.view' | 'comment.create' | 'comment.resolve' | 'comment.assign'
  | 'review.request' | 'review.act'
  // Phase 39.1C
  | 'elements.view' | 'elements.edit'
  | 'masters.edit' | 'components.edit'
  | 'exports.generate'
  | 'versionHistory.restore' | 'versionHistory.delete';

export interface OrganizationDTO {
  id:        string;
  slug:      string;
  name:      string;
  ownerId:   string;
  logoUrl:   string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceDTO {
  id:             string;
  organizationId: string;
  name:           string;
  description:    string | null;
  createdAt:      string;
  updatedAt:      string;
  organization?:  OrganizationDTO;
  _count?:        { members: number; projects: number; invites?: number };
}

export interface WorkspaceMembershipDTO {
  role:         WorkspaceRole;
  workspace:    WorkspaceDTO;
  memberCount:  number;
  projectCount: number;
}

export interface WorkspaceMemberDTO {
  id:          string;
  workspaceId: string;
  userId:      string;
  role:        WorkspaceRole;
  joinedAt:    string;
  invitedById: string | null;
  user:        { id: string; name: string | null; email: string };
  invitedBy?:  { id: string; name: string | null; email: string } | null;
}

export interface WorkspaceInviteDTO {
  id:          string;
  workspaceId: string;
  email:       string;
  role:        WorkspaceRole;
  token:       string;
  expiresAt:   string;
  acceptedAt:  string | null;
  revokedAt:   string | null;
  createdAt:   string;
  createdBy:   { id: string; name: string | null; email: string };
}

export interface WorkspaceActivityDTO {
  id:          string;
  workspaceId: string;
  actorId:     string | null;
  type:        string;
  entity:      { kind: string; id: string; name?: string } | null;
  metadata:    Record<string, any> | null;
  createdAt:   string;
  actor:       { id: string; name: string | null; email: string } | null;
}

export interface WorkspaceAuditLogDTO {
  id:          string;
  workspaceId: string;
  actorId:     string;
  action:      string;
  targetType:  string | null;
  targetId:    string | null;
  before:      any | null;
  after:       any | null;
  createdAt:   string;
  actor:       { id: string; name: string | null; email: string };
}

export interface ResolvedPermissionsDTO {
  role: WorkspaceRole;
  can:  Record<WorkspaceAction, boolean>;
}
