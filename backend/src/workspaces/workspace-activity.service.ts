import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// =============================================================================
//  Phase 39L — WorkspaceActivityService
//
//  Append-only log of "things that happened in this workspace" — surfaces
//  in the Activity Feed panel and primes the future notification system.
//
//  Emission is best-effort: failure to log is warned-and-swallowed so
//  callers (deck create, comment add, etc.) never break because of it.
// =============================================================================

export type WorkspaceActivityType =
  | 'deck.created'
  | 'deck.updated'
  | 'deck.deleted'
  | 'deck.shared'
  | 'comment.added'
  | 'comment.resolved'
  | 'review.requested'
  | 'review.started'
  | 'review.approved'
  | 'review.changes_requested'
  | 'review.withdrawn'
  | 'version.restored'
  | 'member.joined'
  | 'member.removed';

export interface ActivityEntity {
  kind: 'deck' | 'project' | 'comment' | 'review' | 'member' | 'version';
  id:   string;
  name?: string;
}

@Injectable()
export class WorkspaceActivityService {
  private readonly logger = new Logger(WorkspaceActivityService.name);

  constructor(private prisma: PrismaService) {}

  async log(
    workspaceId: string,
    actorId: string | null,
    type: WorkspaceActivityType,
    entity?: ActivityEntity,
    metadata?: Record<string, any>,
  ): Promise<void> {
    try {
      await this.prisma.workspaceActivity.create({
        data: {
          workspaceId,
          actorId:  actorId || null,
          type,
          entity:   entity ? (entity as any) : undefined,
          metadata: metadata ? (metadata as any) : undefined,
        },
      });
    } catch (e: any) {
      this.logger.warn(`[activity] ${type} for workspace ${workspaceId} failed: ${e?.message}`);
    }
  }

  async list(workspaceId: string, opts: { take?: number; type?: WorkspaceActivityType } = {}) {
    const take = Math.max(1, Math.min(200, opts.take || 50));
    return this.prisma.workspaceActivity.findMany({
      where: { workspaceId, ...(opts.type ? { type: opts.type } : {}) },
      include: { actor: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take,
    });
  }
}
