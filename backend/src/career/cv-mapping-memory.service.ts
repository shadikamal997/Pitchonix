import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { normaliseLatin } from './cv-import-pro';

// =============================================================================
//  Phase 42.8D + 42.8E — Persistent section-mapping memory.
//
//  Stores per-user "Career Highlights → experience" mappings. Two things:
//
//    1. Auto-apply (42.8D): when a user explicitly maps an unknown heading,
//       it's saved here and applied automatically on every future import.
//    2. Learning (42.8E): if the same source heading gets mapped to the same
//       target by the same user repeatedly, the count goes up — useful for
//       analytics + can be used to surface "we noticed you usually do X".
//
//  Workspace-scoped via userId only; no cross-tenant leakage.
// =============================================================================

@Injectable()
export class CvMappingMemoryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Save (or increment) the mapping. `sourceHeading` is normalised here.
   *
   * Phase 42.9C — concurrent-safe. Prisma's `upsert` is atomic at the DB
   * level (uses the `userId + sourceHeading` UNIQUE index), so two parallel
   * imports of the same heading by the same user will not produce duplicate
   * rows — the second one increments the existing count instead. The
   * Postgres-level `{ count: { increment: 1 } }` is itself atomic.
   */
  async upsert(userId: string, sourceHeadingRaw: string, targetSection: string): Promise<void> {
    const sourceHeading = normaliseLatin(sourceHeadingRaw);
    if (!sourceHeading) return;
    await this.prisma.cvSectionMappingMemory.upsert({
      where:  { userId_sourceHeading: { userId, sourceHeading } },
      create: { userId, sourceHeading, targetSection, count: 1, autoApply: true },
      update: { targetSection, count: { increment: 1 }, autoApply: true },
    });
  }

  /**
   * Bulk upsert — Phase 42.9C parallel execution inside a single
   * interactive transaction so we get all-or-nothing semantics. Up to ~50
   * concurrent imports per user can flow through without raising the
   * connection-pool pressure of N independent transactions.
   */
  async upsertMany(userId: string, mappings: Record<string, string>): Promise<void> {
    const entries = Object.entries(mappings || {});
    if (entries.length === 0) return;
    // Each upsert is independently atomic; running them in parallel inside
    // a transaction lets prisma batch them on the same connection.
    await this.prisma.$transaction(
      entries.map(([rawHeading, target]) => {
        const sourceHeading = normaliseLatin(rawHeading);
        return this.prisma.cvSectionMappingMemory.upsert({
          where:  { userId_sourceHeading: { userId, sourceHeading } },
          create: { userId, sourceHeading, targetSection: target, count: 1, autoApply: true },
          update: { targetSection: target, count: { increment: 1 }, autoApply: true },
        });
      })
    );
  }

  /** Returns the auto-apply map { normalisedHeading → targetSection } for this user. */
  async forUser(userId: string): Promise<Record<string, string>> {
    const rows = await this.prisma.cvSectionMappingMemory.findMany({ where: { userId, autoApply: true } });
    const out: Record<string, string> = {};
    for (const r of rows) out[r.sourceHeading] = r.targetSection;
    return out;
  }

  list(userId: string) {
    return this.prisma.cvSectionMappingMemory.findMany({
      where:   { userId },
      orderBy: { count: 'desc' },
    });
  }

  async update(userId: string, id: string, patch: { targetSection?: string; autoApply?: boolean }) {
    const row = await this.prisma.cvSectionMappingMemory.findUnique({ where: { id } });
    if (!row || row.userId !== userId) return null;
    return this.prisma.cvSectionMappingMemory.update({ where: { id }, data: patch });
  }

  async remove(userId: string, id: string) {
    const row = await this.prisma.cvSectionMappingMemory.findUnique({ where: { id } });
    if (!row || row.userId !== userId) return false;
    await this.prisma.cvSectionMappingMemory.delete({ where: { id } });
    return true;
  }

  async removeAll(userId: string) {
    const res = await this.prisma.cvSectionMappingMemory.deleteMany({ where: { userId } });
    return { deleted: res.count };
  }
}
