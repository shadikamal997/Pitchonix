import { Injectable, Logger } from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import {
  BrokenNode,
  ContentNodeInput,
  EXPECTED_LOSS_REASONS,
  MarkExportedOptions,
  MarkRenderedOptions,
  MarkReopenedOptions,
  PreservationReport,
  ReopenResultUpdate,
} from './content-ledger.types';

/**
 * Phase Ω.CONTENT.2 — Universal Content Ledger.
 *
 * Content accounting for the whole platform. Every module emits ContentNodes at
 * import time, then marks them rendered / exported / reopened as the content
 * flows through the pipeline. From this real data the platform can PROVE
 * `Imported = Rendered = Exported = Reopened` and pinpoint exactly where any
 * node was lost — instead of estimating preservation from audits.
 */
@Injectable()
export class ContentLedgerService {
  private readonly logger = new Logger(ContentLedgerService.name);

  constructor(private readonly prisma: PrismaService) {}

  private get nodes() {
    return (this.prisma as any).contentNode;
  }

  /** Stable hash of a node's content for mutation detection on reopen. */
  hash(content?: string | null): string | null {
    if (!content) return null;
    const normalized = String(content).replace(/\s+/g, ' ').trim();
    if (!normalized) return null;
    return createHash('sha256').update(normalized).digest('hex').slice(0, 16);
  }

  /**
   * PHASE 3 — recordImport. The ledger begins here, immediately after parsing,
   * before rendering. Returns the created nodes (with ids) so the caller can
   * later mark exactly which ones rendered/exported.
   */
  async recordImport(
    inputs: ContentNodeInput[],
  ): Promise<Array<{ id: string; type: string; contentHash: string | null }>> {
    if (!inputs?.length) return [];
    const now = new Date();
    const rows = inputs.map((n) => {
      const contentHash = this.hash(n.content);
      return {
        id: randomUUID(),
        module: n.module,
        sourceDocumentId: n.sourceDocumentId,
        sourceType: n.sourceType ?? null,
        sectionId: n.sectionId ?? null,
        parentId: n.parentId ?? null,
        type: n.type,
        content: n.content ? String(n.content).slice(0, 8000) : null,
        contentHash,
        metadata: n.metadata ?? undefined,
        imported: true,
        importedAt: now,
        rejected: !!n.rejected,
        lossReason: n.lossReason ?? (n.rejected ? 'rejected_at_import' : null),
        createdAt: now,
        updatedAt: now,
      };
    });
    await this.nodes.createMany({ data: rows });
    this.logger.log(`recordImport: ${rows.length} node(s) for ${inputs[0].sourceDocumentId}`);
    return rows.map((r) => ({ id: r.id, type: r.type, contentHash: r.contentHash }));
  }

  /** PHASE 3 — recordRender. Mark imported nodes as rendered to a destination. */
  async recordRender(sourceDocumentId: string, opts: MarkRenderedOptions = {}): Promise<number> {
    const now = new Date();
    if (opts.destinationByNodeId && Object.keys(opts.destinationByNodeId).length) {
      const ops = Object.entries(opts.destinationByNodeId).map(([id, destination]) =>
        this.nodes.updateMany({
          where: { id, sourceDocumentId },
          data: {
            rendered: true,
            renderedAt: now,
            renderer: opts.renderer ?? null,
            template: opts.template ?? null,
            destination,
          },
        }),
      );
      const results = await this.prisma.$transaction(ops);
      return results.reduce((sum: number, r: any) => sum + (r?.count || 0), 0);
    }
    const where: any = { sourceDocumentId, imported: true };
    if (opts.nodeIds?.length) where.id = { in: opts.nodeIds };
    const res = await this.nodes.updateMany({
      where,
      data: {
        rendered: true,
        renderedAt: now,
        renderer: opts.renderer ?? null,
        template: opts.template ?? null,
        ...(opts.destination ? { destination: opts.destination } : {}),
      },
    });
    return res.count;
  }

  /** PHASE 3 — recordExport. Mark rendered nodes as exported. */
  async recordExport(sourceDocumentId: string, opts: MarkExportedOptions = {}): Promise<number> {
    const now = new Date();
    const where: any = { sourceDocumentId, rendered: true };
    if (opts.nodeIds?.length) where.id = { in: opts.nodeIds };
    const res = await this.nodes.updateMany({
      where,
      data: {
        exported: true,
        exportedAt: now,
        ...(opts.renderer ? { renderer: opts.renderer } : {}),
        ...(opts.destination ? { destination: opts.destination } : {}),
      },
    });
    return res.count;
  }

  /**
   * PHASE 3 / PHASE 5 — recordReopen. Compare what the reopened document still
   * contains against the exported snapshot. Nodes still present are marked
   * reopened; present-but-changed are flagged mutated; missing get a loss reason.
   */
  async recordReopen(
    sourceDocumentId: string,
    opts: MarkReopenedOptions,
  ): Promise<{ reopened: number; mutated: number; lost: number }> {
    const now = new Date();
    const exported = await this.nodes.findMany({ where: { sourceDocumentId, exported: true } });
    const byId = new Map<string, string | null>();
    const presentHashes = new Set<string>();
    for (const p of opts.present || []) {
      if (p.id) byId.set(p.id, p.hash ?? null);
      if (p.hash) presentHashes.add(p.hash);
    }

    let reopened = 0;
    let mutated = 0;
    let lost = 0;
    const ops: any[] = [];
    for (const node of exported as any[]) {
      const matchedById = byId.has(node.id);
      const hashGiven = matchedById ? byId.get(node.id) : undefined;
      const matchedByHash = node.contentHash && presentHashes.has(node.contentHash);

      if (matchedById && hashGiven && node.contentHash && hashGiven !== node.contentHash) {
        mutated++;
        ops.push(
          this.nodes.update({
            where: { id: node.id },
            data: {
              reopened: true,
              reopenedAt: now,
              mutated: true,
              lossReason: 'mutated_on_reopen',
            },
          }),
        );
      } else if (matchedById || matchedByHash) {
        reopened++;
        ops.push(
          this.nodes.update({
            where: { id: node.id },
            data: { reopened: true, reopenedAt: now, mutated: false, lossReason: null },
          }),
        );
      } else {
        lost++;
        ops.push(
          this.nodes.update({
            where: { id: node.id },
            data: { reopened: false, lossReason: 'absent_on_reopen' },
          }),
        );
      }
    }
    if (ops.length) await this.prisma.$transaction(ops);
    this.logger.log(
      `recordReopen ${sourceDocumentId}: reopened=${reopened} mutated=${mutated} lost=${lost}`,
    );
    return { reopened, mutated, lost };
  }

  /** Raw nodes for a document — used by operation-aware modules (e.g. Excel). */
  async getNodes(sourceDocumentId: string): Promise<any[]> {
    return (await this.nodes.findMany({ where: { sourceDocumentId } })) as any[];
  }

  /**
   * Apply per-node reopen reconciliation results computed by a module that does
   * its own (operation-aware) comparison of the reopened artifact to the ledger.
   */
  async applyReopenResults(
    updates: ReopenResultUpdate[],
  ): Promise<{ reopened: number; mutated: number; lost: number }> {
    const now = new Date();
    let reopened = 0;
    let mutated = 0;
    let lost = 0;
    const ops = updates.map((u) => {
      if (u.reopened) reopened++;
      else lost++;
      if (u.mutated) mutated++;
      return this.nodes.update({
        where: { id: u.id },
        data: {
          reopened: u.reopened,
          reopenedAt: u.reopened ? now : null,
          mutated: !!u.mutated,
          lossReason: u.lossReason ?? null,
        },
      });
    });
    if (ops.length) await this.prisma.$transaction(ops);
    this.logger.log(`applyReopenResults: reopened=${reopened} mutated=${mutated} lost=${lost}`);
    return { reopened, mutated, lost };
  }

  /** PHASE 4 — Scorecard. */
  async calculatePreservation(sourceDocumentId: string): Promise<PreservationReport> {
    const all = (await this.nodes.findMany({ where: { sourceDocumentId } })) as any[];
    const imported = all.filter((n) => n.imported).length;
    const rendered = all.filter((n) => n.rendered).length;
    const exported = all.filter((n) => n.exported).length;
    const reopened = all.filter((n) => n.reopened).length;
    const missing = all.filter((n) => n.imported && !n.rendered).length;
    const rejectedNodes = all.filter((n) => n.rejected).length;
    const mutatedNodes = all.filter((n) => n.mutated).length;
    const expectedMutations = all.filter((n) => EXPECTED_LOSS_REASONS.has(n.lossReason)).length;
    const unexpectedMutations = all.filter(
      (n) => n.mutated && !EXPECTED_LOSS_REASONS.has(n.lossReason),
    ).length;
    const overflowNodes = all.filter(
      (n) =>
        (n.destination || '').includes('overflow') || (n.destination || '').includes('appendix'),
    ).length;
    const reopenObserved = all.some((n) => n.reopenedAt || n.lossReason === 'absent_on_reopen');

    const pct = (num: number, den: number) => (den > 0 ? Math.round((num / den) * 1000) / 10 : 100);

    const byType: PreservationReport['byType'] = {};
    for (const n of all) {
      const t = (byType[n.type] ||= { imported: 0, rendered: 0, exported: 0, reopened: 0 });
      if (n.imported) t.imported++;
      if (n.rendered) t.rendered++;
      if (n.exported) t.exported++;
      if (n.reopened) t.reopened++;
    }

    return {
      sourceDocumentId,
      modules: Array.from(new Set(all.map((n) => n.module))),
      imported,
      rendered,
      exported,
      reopened,
      missing,
      retention: pct(exported, imported),
      renderRetention: pct(rendered, imported),
      exportRetention: pct(exported, rendered),
      reopenRetention: pct(reopened, exported),
      brokenNodes: await this.calculateLoss(sourceDocumentId, all),
      overflowNodes,
      rejectedNodes,
      mutatedNodes,
      expectedMutations,
      unexpectedMutations,
      reopenObserved,
      byType,
    };
  }

  /**
   * PHASE 5 — Loss detection. Returns the exact node, source, destination and
   * failure point for every node that did not survive its lifecycle.
   */
  async calculateLoss(sourceDocumentId: string, preloaded?: any[]): Promise<BrokenNode[]> {
    const all =
      preloaded ?? ((await this.nodes.findMany({ where: { sourceDocumentId } })) as any[]);
    const reopenObserved = all.some((n) => n.reopenedAt || n.lossReason === 'absent_on_reopen');
    const broken: BrokenNode[] = [];

    for (const n of all) {
      const base = {
        id: n.id,
        module: n.module,
        type: n.type,
        source: n.sectionId || n.sourceType || n.module,
        destination: n.destination ?? null,
        contentPreview: n.content ? String(n.content).slice(0, 120) : null,
      };
      if (n.rejected) {
        broken.push({
          ...base,
          failurePoint: 'import',
          reason: n.lossReason || 'rejected_at_import',
        });
        continue;
      }
      if (n.imported && !n.rendered) {
        // Honor a module-supplied reason (e.g. Convert sets heading_lost / table_lost
        // when a node never made it into the converted output).
        broken.push({
          ...base,
          failurePoint: 'render',
          reason: n.lossReason || 'imported_but_not_rendered',
        });
        continue;
      }
      if (n.rendered && !n.exported) {
        broken.push({ ...base, failurePoint: 'export', reason: 'rendered_but_not_exported' });
        continue;
      }
      // Intentional, operation-driven changes/removals are not loss.
      if (EXPECTED_LOSS_REASONS.has(n.lossReason)) {
        continue;
      }
      if (reopenObserved && n.exported && !n.reopened) {
        broken.push({
          ...base,
          failurePoint: 'reopen',
          reason: n.lossReason || 'exported_but_not_reopened',
        });
        continue;
      }
      if (n.mutated) {
        broken.push({
          ...base,
          failurePoint: 'mutation',
          reason: n.lossReason || 'mutated_on_reopen',
        });
        continue;
      }
    }
    return broken;
  }

  /** Remove all ledger nodes for a document (e.g. before a full re-import). */
  async resetDocument(sourceDocumentId: string): Promise<number> {
    const res = await this.nodes.deleteMany({ where: { sourceDocumentId } });
    return res.count;
  }
}
