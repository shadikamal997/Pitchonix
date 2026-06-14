import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// =============================================================================
//  Phase 39M / Ω.4A — WorkspaceAuditService
//
//  Append-only audit trail covering:
//    - Administrative actions: member invites/removals, role changes, ownership
//    - Content lifecycle: project/deck/document create/delete, exports, shares
//
//  Distinct from WorkspaceActivity (user-facing feed). This log is the
//  compliance record — append-only, no mutations, admin-only read access.
// =============================================================================

export type AuditAction =
  // Member / role management
  | 'member.invited'
  | 'member.invite_revoked'
  | 'member.invite_accepted'
  | 'member.removed'
  | 'member.role_changed'
  | 'ownership.transferred'
  // Workspace lifecycle
  | 'workspace.created'
  | 'workspace.renamed'
  | 'workspace.deleted'
  // Project lifecycle (Phase Ω.4A)
  | 'project.created'
  | 'project.deleted'
  | 'project.archived'
  // Deck lifecycle (Phase Ω.4A)
  | 'deck.created'
  | 'deck.deleted'
  | 'deck.shared'
  // Document lifecycle (Phase Ω.4A / 4B)
  | 'document.created'
  | 'document.deleted'
  | 'document.restored'
  // Export events (Phase Ω.4A / 4B)
  | 'export.completed'
  | 'export.created'
  // Share events (Phase Ω.4B)
  | 'share.created'
  | 'share.revoked'
  // Governance events (Phase Ω.4B)
  | 'user.suspended'
  | 'user.banned'
  | 'user.reactivated'
  | 'workspace.locked'
  | 'workspace.archived';

@Injectable()
export class WorkspaceAuditService {
  private readonly logger = new Logger(WorkspaceAuditService.name);

  constructor(private prisma: PrismaService) {}

  async log(input: {
    workspaceId: string;
    actorId: string;
    action: AuditAction;
    targetType?: string;
    targetId?: string;
    before?: any;
    after?: any;
  }): Promise<void> {
    try {
      await this.prisma.workspaceAuditLog.create({
        data: {
          workspaceId: input.workspaceId,
          actorId: input.actorId,
          action: input.action,
          targetType: input.targetType,
          targetId: input.targetId,
          before: input.before ?? undefined,
          after: input.after ?? undefined,
        },
      });
    } catch (e: any) {
      this.logger.warn(
        `[audit] ${input.action} for workspace ${input.workspaceId} failed: ${e?.message}`,
      );
    }
  }

  async list(workspaceId: string, opts: { take?: number; action?: AuditAction } = {}) {
    const take = Math.max(1, Math.min(200, opts.take || 50));
    return this.prisma.workspaceAuditLog.findMany({
      where: { workspaceId, ...(opts.action ? { action: opts.action } : {}) },
      include: { actor: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take,
    });
  }
}
