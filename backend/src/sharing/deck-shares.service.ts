import {
  Injectable, NotFoundException, ForbiddenException, BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// =============================================================================
//  Phase 39.1D — DeckSharesService
//
//  Resolves the effective access a user has to a project (deck), combining:
//
//    1. Project.sharingMode (private | workspace | shared)
//    2. WorkspaceMember role (if member of the project's workspace)
//    3. DeckShare grants (explicit per-user overrides)
//
//  Permission ladder (highest wins when both workspace + share apply):
//
//      view  <  comment  <  review  <  edit
// =============================================================================

export type SharingMode = 'private' | 'workspace' | 'shared';
export type DeckPermission = 'view' | 'comment' | 'review' | 'edit';
const PERM_RANK: Record<DeckPermission, number> = {
  view: 1, comment: 2, review: 3, edit: 4,
};

const SHARE_INCLUDE = {
  member:    { select: { id: true, name: true, email: true } },
  createdBy: { select: { id: true, name: true, email: true } },
};

@Injectable()
export class DeckSharesService {
  constructor(private prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  //  Resolution — used by guards + the editor surface
  // ---------------------------------------------------------------------------

  /**
   * Compute the effective DeckPermission for `userId` on `projectId`, taking
   * sharingMode + workspace role + explicit grants into account.
   *
   * Returns null if the user has no access at all.
   */
  async resolvePermission(projectId: string, userId: string): Promise<DeckPermission | null> {
    const project = await this.prisma.project.findUnique({
      where:  { id: projectId },
      select: { userId: true, workspaceId: true, sharingMode: true },
    });
    if (!project) return null;

    // Owner is always edit.
    if (project.userId === userId) return 'edit';

    // PRIVATE mode → only owner has access (already returned above).
    if (project.sharingMode === 'private') return null;

    // Resolve workspace role contribution (workspace or shared mode).
    let workspacePerm: DeckPermission | null = null;
    if (project.workspaceId) {
      const member = await this.prisma.workspaceMember.findUnique({
        where:  { workspaceId_userId: { workspaceId: project.workspaceId, userId } },
        select: { role: true },
      });
      if (member) {
        workspacePerm = workspaceRoleToDeckPermission(member.role);
      }
    }

    // SHARED mode also considers explicit DeckShare grants.
    let sharePerm: DeckPermission | null = null;
    if (project.sharingMode === 'shared') {
      const share = await this.prisma.deckShare.findUnique({
        where:  { projectId_memberId: { projectId, memberId: userId } },
        select: { permission: true },
      });
      if (share && isValidPerm(share.permission)) sharePerm = share.permission as DeckPermission;
    }

    return higher(workspacePerm, sharePerm);
  }

  // ---------------------------------------------------------------------------
  //  CRUD — explicit per-user grants
  // ---------------------------------------------------------------------------

  async list(projectId: string, callerId: string) {
    await this.assertCallerCanShare(projectId, callerId);
    return this.prisma.deckShare.findMany({
      where:   { projectId },
      include: SHARE_INCLUDE,
      orderBy: { createdAt: 'asc' },
    });
  }

  async upsert(projectId: string, callerId: string, input: { memberId: string; permission: DeckPermission }) {
    await this.assertCallerCanShare(projectId, callerId);
    if (!isValidPerm(input.permission)) throw new BadRequestException('Invalid permission');
    if (input.memberId === callerId) throw new BadRequestException('Cannot grant a share to yourself');

    const target = await this.prisma.user.findUnique({
      where:  { id: input.memberId },
      select: { id: true },
    });
    if (!target) throw new BadRequestException('Target user not found');

    return this.prisma.deckShare.upsert({
      where:  { projectId_memberId: { projectId, memberId: input.memberId } },
      create: { projectId, memberId: input.memberId, permission: input.permission, createdById: callerId },
      update: { permission: input.permission },
      include: SHARE_INCLUDE,
    });
  }

  async revoke(projectId: string, callerId: string, shareId: string) {
    await this.assertCallerCanShare(projectId, callerId);
    const share = await this.prisma.deckShare.findUnique({ where: { id: shareId } });
    if (!share || share.projectId !== projectId) throw new NotFoundException('Share not found');
    await this.prisma.deckShare.delete({ where: { id: shareId } });
    return { ok: true };
  }

  async setMode(projectId: string, callerId: string, mode: SharingMode) {
    await this.assertCallerCanShare(projectId, callerId);
    if (!['private', 'workspace', 'shared'].includes(mode)) {
      throw new BadRequestException('Invalid sharing mode');
    }
    return this.prisma.project.update({
      where: { id: projectId },
      data:  { sharingMode: mode },
      select: { id: true, sharingMode: true },
    });
  }

  // ---------------------------------------------------------------------------
  //  Helpers
  // ---------------------------------------------------------------------------

  /**
   * Caller must be the project owner OR a workspace admin/owner. Anyone
   * with deck.share permission qualifies; we resolve via the role matrix.
   */
  private async assertCallerCanShare(projectId: string, callerId: string) {
    const project = await this.prisma.project.findUnique({
      where:  { id: projectId },
      select: { userId: true, workspaceId: true },
    });
    if (!project) throw new NotFoundException('Project not found');
    if (project.userId === callerId) return;
    if (!project.workspaceId) throw new ForbiddenException('No access to share this deck');
    const member = await this.prisma.workspaceMember.findUnique({
      where:  { workspaceId_userId: { workspaceId: project.workspaceId, userId: callerId } },
      select: { role: true },
    });
    if (!member || !['owner', 'admin', 'editor'].includes(member.role)) {
      throw new ForbiddenException('You don\'t have permission to share this deck');
    }
  }
}

// ---------------------------------------------------------------------------
//  Helpers
// ---------------------------------------------------------------------------

function workspaceRoleToDeckPermission(role: string): DeckPermission | null {
  switch (role) {
    case 'owner':    return 'edit';
    case 'admin':    return 'edit';
    case 'editor':   return 'edit';
    case 'reviewer': return 'review';
    case 'viewer':   return 'view';
    default:         return null;
  }
}

function higher(a: DeckPermission | null, b: DeckPermission | null): DeckPermission | null {
  if (!a) return b;
  if (!b) return a;
  return PERM_RANK[a] >= PERM_RANK[b] ? a : b;
}

function isValidPerm(p: string): p is DeckPermission {
  return p === 'view' || p === 'comment' || p === 'review' || p === 'edit';
}
