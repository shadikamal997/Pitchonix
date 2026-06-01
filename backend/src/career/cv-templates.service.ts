import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CV_TEMPLATE_LIBRARY } from './cv-templates';
import { CvDoctype } from './cv-types';

// =============================================================================
//  Phase 42F — CvTemplatesService.
//
//  Owns the curated template library and the per-workspace custom templates.
//  On boot we seed the public library if the table is empty.
// =============================================================================

@Injectable()
export class CvTemplatesService implements OnModuleInit {
  private readonly logger = new Logger(CvTemplatesService.name);

  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    try {
      await this.seedIfEmpty();
      // Phase 42.2 — refresh layouts so existing rows pick up new visual
      // knobs (customCss, atsSafe, etc.) without an explicit migration.
      await this.refreshLayouts();
    } catch (e: any) {
      this.logger.warn(`Template seed/refresh skipped: ${e?.message}`);
    }
  }

  /** Seed the 50+ public templates if no public template exists yet. */
  async seedIfEmpty(): Promise<{ seeded: number; existing: number }> {
    const existing = await this.prisma.cvTemplate.count({ where: { isPublic: true } });
    if (existing > 0) return { seeded: 0, existing };
    let seeded = 0;
    for (const t of CV_TEMPLATE_LIBRARY) {
      await this.prisma.cvTemplate.create({
        data: {
          doctype:  t.doctype,
          name:     t.name,
          category: t.category,
          layout:   t.layout as any,
          isPublic: true,
        },
      });
      seeded++;
    }
    this.logger.log(`Seeded ${seeded} CV templates.`);
    return { seeded, existing };
  }

  /** Phase 42.17 — upsert + prune public templates to match the current library. */
  async refreshLayouts(): Promise<{ updated: number; created: number; deleted: number }> {
    let updated = 0;
    let created = 0;

    // Upsert every entry in the library.
    for (const t of CV_TEMPLATE_LIBRARY) {
      const found = await this.prisma.cvTemplate.findFirst({ where: { name: t.name, isPublic: true } });
      if (!found) {
        await this.prisma.cvTemplate.create({
          data: { doctype: t.doctype, name: t.name, category: t.category, layout: t.layout as any, isPublic: true },
        });
        created++;
      } else {
        await this.prisma.cvTemplate.update({
          where: { id: found.id },
          data:  { layout: t.layout as any, doctype: t.doctype, category: t.category },
        });
        updated++;
      }
    }

    // Remove public templates whose names are no longer in the library
    // so stale rows don't pollute the template picker.
    const currentNames = new Set(CV_TEMPLATE_LIBRARY.map((t) => t.name));
    const stale = await this.prisma.cvTemplate.findMany({
      where: { isPublic: true },
      select: { id: true, name: true },
    });
    const toDelete = stale.filter((r) => !currentNames.has(r.name));
    let deleted = 0;
    for (const row of toDelete) {
      await this.prisma.cvTemplate.delete({ where: { id: row.id } });
      deleted++;
    }
    if (deleted > 0) this.logger.log(`Pruned ${deleted} obsolete public templates.`);

    this.logger.log(`Refreshed ${updated} CV templates (created ${created} new).`);
    this.invalidateListCache();
    return { updated, created, deleted };
  }

  // Phase Ω.4 — in-memory cache for public template list (templates are
  // essentially static after boot; 10-minute TTL avoids stale reads after
  // an admin refresh while keeping DB round-trips near zero).
  private readonly _listCache = new Map<string, { ts: number; data: any[] }>();
  private readonly LIST_TTL_MS = 10 * 60_000;

  async list(opts: { doctype?: CvDoctype; category?: string; workspaceId?: string | null } = {}) {
    const cacheKey = `${opts.doctype ?? '*'}|${opts.category ?? '*'}|${opts.workspaceId ?? 'public'}`;
    const cached = this._listCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < this.LIST_TTL_MS) return cached.data;

    const where: any = { OR: [{ isPublic: true }] };
    if (opts.workspaceId) where.OR.push({ workspaceId: opts.workspaceId });
    if (opts.doctype)  where.doctype  = opts.doctype;
    if (opts.category) where.category = opts.category;
    const data = await this.prisma.cvTemplate.findMany({
      where, orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
    this._listCache.set(cacheKey, { ts: Date.now(), data });
    return data;
  }

  /** Invalidate the list cache (call after seed/refresh). */
  invalidateListCache() { this._listCache.clear(); }

  findOne(id: string) {
    return this.prisma.cvTemplate.findUnique({ where: { id } });
  }

  countByDoctype() {
    return this.prisma.cvTemplate.groupBy({
      by: ['doctype'],
      where: { isPublic: true },
      _count: { _all: true },
    });
  }
}
