import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// =============================================================================
//  Phase 39M — WorkspaceAuditService
//
//  Append-only audit trail of *administrative* actions: member invites /
//  removals, role changes, ownership transfers, workspace setting updates.
//  Distinct from WorkspaceActivity (which logs content-level events).
//
//  Required for enterprise readiness — most compliance frameworks need a
//  who-did-what-when log for permission changes.
// =============================================================================

export type AuditAction =
  | 'member.invited'
  | 'member.invite_revoked'
  | 'member.invite_accepted'
  | 'member.removed'
  | 'member.role_changed'
  | 'ownership.transferred'
  | 'workspace.created'
  | 'workspace.renamed'
  | 'workspace.deleted';

@Injectable()
export class WorkspaceAuditService {
  private readonly logger = new Logger(WorkspaceAuditService.name);

  constructor(private prisma: PrismaService) {}

  async log(input: {
    workspaceId: string;
    actorId:     string;
    action:      AuditAction;
    targetType?: string;
    targetId?:   string;
    before?:     any;
    after?:      any;
  }): Promise<void> {
    try {
      await this.prisma.workspaceAuditLog.create({
        data: {
          workspaceId: input.workspaceId,
          actorId:     input.actorId,
          action:      input.action,
          targetType:  input.targetType,
          targetId:    input.targetId,
          before:      input.before ?? undefined,
          after:       input.after  ?? undefined,
        },
      });
    } catch (e: any) {
      this.logger.warn(`[audit] ${input.action} for workspace ${input.workspaceId} failed: ${e?.message}`);
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
