import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { buildSnapshot, SNAPSHOT_SCHEMA_VERSION } from './snapshot-builder';
import { diffSnapshots } from './snapshot-differ';
import {
  DeckVersionDTO, DeckVersionType, CreateSnapshotInput, DeckSnapshot, VersionDiff,
} from './version-types';
import { CollaborationBroadcaster } from '../collaboration/collaboration-broadcaster';
import { YDocStore, elementDocId } from '../collaboration/ydoc-store';

/**
 * VersionHistoryService — Phase 35
 *
 * Owns the lifecycle of `DeckVersion` rows: capture, list, get, restore,
 * compare, delete, rename. Designed so the pipeline can call it without
 * any deck-internals knowledge — pass `deckId`, get a version back.
 */
@Injectable()
export class VersionHistoryService {
  private readonly logger = new Logger(VersionHistoryService.name);

  /** Auto-save retention — keep the most recent N AUTO_SAVE / SAFETY rows. */
  static readonly AUTOSAVE_RETENTION = 50;

  constructor(
    private prisma: PrismaService,
    private broadcaster: CollaborationBroadcaster,
    private ydocs: YDocStore,
  ) {}

  /**
   * Phase 34.2D — flush every in-memory Y.Doc for this deck so the snapshot
   * captures the most recent CRDT state. Best-effort; failure to flush one
   * doc doesn't abort the whole snapshot.
   */
  private async flushDeckYDocs(deckId: string): Promise<void> {
    const elements = await this.prisma.slideElement.findMany({
      where:  { slide: { deckId } },
      select: { id: true },
    });
    await Promise.all(elements.map((el) =>
      this.ydocs.flush(elementDocId(el.id)).catch(() => {})
    ));
  }

  // ---------------------------------------------------------------------------
  //  Auth
  // ---------------------------------------------------------------------------
  async assertDeckOwnership(deckId: string, userId: string): Promise<void> {
    const deck = await this.prisma.deck.findFirst({
      where: { id: deckId, project: { userId } },
      select: { id: true },
    });
    if (!deck) throw new ForbiddenException('No access to this deck');
  }

  // ---------------------------------------------------------------------------
  //  Create snapshot
  // ---------------------------------------------------------------------------
  /**
   * Capture the current deck state as an immutable version row. Called by:
   *   - the unified pipeline (auto-snapshot before/after generation actions)
   *   - the controller (manual snapshots from "Save Version" UI)
   *   - the safety-snapshot helper (before destructive editor ops)
   *
   * Returns the new DeckVersion row.
   */
  async createSnapshot(deckId: string, input: CreateSnapshotInput = {}): Promise<DeckVersionDTO> {
    const t0 = Date.now();
    // Phase 34.2D — flush any in-memory Y.Doc edits so the snapshot we're
    // about to take captures the freshest collaborative text state. Without
    // this, an in-flight Y update might not be persisted yet and the
    // snapshot would have stale content.
    await this.flushDeckYDocs(deckId);
    const deck = await this.prisma.deck.findUnique({
      where: { id: deckId },
      include: {
        slides: { orderBy: { order: 'asc' }, include: { elements: { orderBy: [{ order: 'asc' }, { zIndex: 'asc' }] } } },
        masterElements: true,
      },
    });
    if (!deck) throw new NotFoundException(`Deck ${deckId} not found`);

    // Pull component instances across all slides (one query).
    const slideIds = deck.slides.map((s) => s.id);
    const componentInstances = slideIds.length === 0
      ? []
      : await this.prisma.componentInstance.findMany({
          where: { slideId: { in: slideIds } },
          orderBy: { createdAt: 'asc' },
        });

    const snapshot: DeckSnapshot = buildSnapshot({
      deck,
      slides: deck.slides,
      masters: deck.masterElements,
      componentInstances,
    });

    const businessInfo = ((await this.prisma.project.findUnique({
      where: { id: deck.projectId },
      select: { businessInfo: true },
    }))?.businessInfo as any) || {};
    const familyId = businessInfo.theme || null;

    const type: DeckVersionType = input.type ?? 'MANUAL_SNAPSHOT';
    const name = input.name ?? defaultName(type);

    const row = await this.prisma.deckVersion.create({
      data: {
        deckId,
        userId: input.userId ?? null,
        name,
        description: input.description ?? null,
        type,
        snapshot: snapshot as any,
        slideCount: snapshot.slides.length,
        qualityScore: typeof snapshot.deck.qualityScore?.overall === 'number'
          ? Math.round(snapshot.deck.qualityScore.overall)
          : null,
        familyId,
        templateId: deck.templateId || null,
      },
    });

    // Retention: prune AUTO_SAVE + SAFETY beyond the limit. Manual snapshots
    // are kept forever.
    await this.pruneAutoSaves(deckId);

    this.logger.log(`Snapshot ${row.id} (${type}) created for deck ${deckId} in ${Date.now() - t0}ms (${snapshot.slides.length} slides)`);
    const dto = toDTO(row);
    // Phase 34.1B — broadcast so other collaborators get a toast: "John
    // created snapshot 'Before review request'".
    this.broadcaster.toDeck(deckId, 'version.snapshot_created', { version: dto });
    return dto;
  }

  // ---------------------------------------------------------------------------
  //  List / get
  // ---------------------------------------------------------------------------
  async listVersions(deckId: string): Promise<DeckVersionDTO[]> {
    const rows = await this.prisma.deckVersion.findMany({
      where: { deckId },
      orderBy: { createdAt: 'desc' },
      // Don't return the full snapshot blob in the list — clients call
      // getVersion() for that.
      select: {
        id: true, deckId: true, userId: true, name: true, description: true,
        type: true, slideCount: true, qualityScore: true, familyId: true,
        templateId: true, createdAt: true,
      },
    });
    return rows.map(toDTO);
  }

  async getVersion(versionId: string): Promise<{ meta: DeckVersionDTO; snapshot: DeckSnapshot }> {
    const row = await this.prisma.deckVersion.findUnique({ where: { id: versionId } });
    if (!row) throw new NotFoundException('Version not found');
    return { meta: toDTO(row), snapshot: row.snapshot as unknown as DeckSnapshot };
  }

  // ---------------------------------------------------------------------------
  //  Compare
  // ---------------------------------------------------------------------------
  async compareVersions(a: string, b: string): Promise<VersionDiff> {
    const [va, vb] = await Promise.all([this.getVersion(a), this.getVersion(b)]);
    return diffSnapshots(va.snapshot, vb.snapshot);
  }

  // ---------------------------------------------------------------------------
  //  Restore
  // ---------------------------------------------------------------------------
  /**
   * Replace the current deck state with the snapshot from `versionId`. Safety
   * snapshot is taken first ("Before restoring version <name>") so the
   * restore itself is reversible. Restore is transactional — either the
   * whole deck flips to the snapshot or nothing is touched.
   */
  async restoreVersion(versionId: string, userId?: string): Promise<{ restoredVersionId: string; safetyVersionId: string }> {
    const target = await this.prisma.deckVersion.findUnique({ where: { id: versionId } });
    if (!target) throw new NotFoundException('Version not found');
    const snapshot = target.snapshot as unknown as DeckSnapshot;
    if (!snapshot || snapshot.schemaVersion !== SNAPSHOT_SCHEMA_VERSION) {
      throw new Error(`Snapshot schema version mismatch (have ${(snapshot as any)?.schemaVersion}, expected ${SNAPSHOT_SCHEMA_VERSION})`);
    }

    // 1) Capture a safety snapshot so the restore is reversible.
    const safety = await this.createSnapshot(target.deckId, {
      type:    'SAFETY',
      name:    `Before restoring "${target.name}"`,
      userId,
    });

    // 2) Replay the snapshot onto the deck. Atomic per-deck.
    await this.prisma.$transaction(async (tx) => {
      // Deck-level fields
      await tx.deck.update({
        where: { id: target.deckId },
        data: {
          title: snapshot.deck.title,
          description: snapshot.deck.description,
          status: snapshot.deck.status,
          masterSettings: snapshot.deck.masterSettings ?? undefined,
          qualityScore: snapshot.deck.qualityScore ?? undefined,
          validationResult: snapshot.deck.validationResult ?? undefined,
          generationMetrics: snapshot.deck.generationMetrics ?? undefined,
          exportReady: !!snapshot.deck.exportReady,
        },
      });

      // Wipe and rewrite slides + elements (cascades take care of elements)
      await tx.slide.deleteMany({ where: { deckId: target.deckId } });

      // Re-insert slides in order
      const slideRowsCreated: Array<{ id: string; order: number }> = [];
      for (const s of snapshot.slides) {
        const created = await tx.slide.create({
          data: {
            deckId: target.deckId,
            type: s.type,
            order: s.order,
            title: s.title,
            subtitle: s.subtitle ?? undefined,
            content: (s.content ?? {}) as any,
            layoutKey: s.layoutKey ?? undefined,
            themeKey: s.themeKey ?? undefined,
            speakerNotes: s.speakerNotes ?? undefined,
            background: s.background ?? undefined,
            themeTokens: s.themeTokens ?? undefined,
            metadata: s.metadata ?? undefined,
            elementsVersion: 1,
          },
        });
        slideRowsCreated.push({ id: created.id, order: s.order });

        if (s.elements && s.elements.length > 0) {
          await tx.slideElement.createMany({
            data: s.elements.map((e) => ({
              slideId: created.id,
              type: e.type,
              name: e.name ?? null,
              order: e.order, x: e.x, y: e.y, width: e.width, height: e.height,
              rotation: e.rotation, zIndex: e.zIndex,
              locked: !!e.locked, visible: e.visible !== false,
              content: e.content ?? undefined,
              data: e.data ?? undefined,
              style: e.style ?? undefined,
              animations: e.animations ?? undefined,
              accessibility: e.accessibility ?? undefined,
            })),
          });
        }
      }

      // Masters
      await tx.masterElement.deleteMany({ where: { deckId: target.deckId } });
      if (snapshot.masters.length > 0) {
        await tx.masterElement.createMany({
          data: snapshot.masters.map((m) => ({
            deckId: target.deckId,
            type: m.type, name: m.name,
            x: m.x, y: m.y, width: m.width, height: m.height,
            rotation: m.rotation, zIndex: m.zIndex, sendToFront: m.sendToFront,
            visible: m.visible, excludedSlides: m.excludedSlides,
            elementData: m.elementData ?? undefined,
            style: m.style ?? undefined,
          })),
        });
      }

      // Component instances — resolve componentId × slideOrder back to slide row.
      // Drop instances whose source component has been deleted since capture.
      const slideByOrder = new Map(slideRowsCreated.map((r) => [r.order, r.id]));
      for (const ci of snapshot.componentInstances) {
        const slideId = slideByOrder.get(ci.slideOrder);
        if (!slideId) continue;
        const compExists = await tx.savedComponent.findUnique({ where: { id: ci.componentId }, select: { id: true } });
        if (!compExists) continue;
        await tx.componentInstance.create({
          data: {
            componentId: ci.componentId,
            slideId,
            anchorX: ci.anchorX, anchorY: ci.anchorY,
            scale: ci.scale, version: ci.version,
          },
        });
      }
    });

    // 3) Record the restore action as its own RESTORED snapshot so the
    //    timeline reads naturally ("restored from <name>").
    const restored = await this.createSnapshot(target.deckId, {
      type: 'RESTORED',
      name: `Restored from "${target.name}"`,
      userId,
    });

    // Phase 34.1B — every collaborator sees the live toast: "John restored
    // version 'Approved Version'".
    this.broadcaster.toDeck(target.deckId, 'version.restored', {
      restoredVersionId: restored.id,
      safetyVersionId:   safety.id,
      sourceVersionName: target.name,
    });

    return { restoredVersionId: restored.id, safetyVersionId: safety.id };
  }

  // ---------------------------------------------------------------------------
  //  Delete / rename
  // ---------------------------------------------------------------------------
  async deleteVersion(versionId: string): Promise<void> {
    // Capture deckId BEFORE delete so we can broadcast afterwards.
    const v = await this.prisma.deckVersion.findUnique({
      where: { id: versionId }, select: { deckId: true },
    });
    await this.prisma.deckVersion.delete({ where: { id: versionId } });
    if (v) this.broadcaster.toDeck(v.deckId, 'version.deleted', { versionId });
  }

  async renameVersion(versionId: string, patch: { name?: string; description?: string }): Promise<DeckVersionDTO> {
    const row = await this.prisma.deckVersion.update({
      where: { id: versionId },
      data: { name: patch.name ?? undefined, description: patch.description ?? undefined },
    });
    const dto = toDTO(row);
    this.broadcaster.toDeck(row.deckId, 'version.renamed', { version: dto });
    return dto;
  }

  // ---------------------------------------------------------------------------
  //  Retention (35J)
  // ---------------------------------------------------------------------------
  /** Prune AUTO_SAVE + SAFETY beyond the retention limit. Manual snapshots
   *  and RESTORED entries are preserved. */
  async pruneAutoSaves(deckId: string): Promise<number> {
    const prunable = await this.prisma.deckVersion.findMany({
      where: { deckId, type: { in: ['AUTO_SAVE', 'SAFETY'] } },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });
    if (prunable.length <= VersionHistoryService.AUTOSAVE_RETENTION) return 0;
    const toDelete = prunable.slice(VersionHistoryService.AUTOSAVE_RETENTION).map((r) => r.id);
    await this.prisma.deckVersion.deleteMany({ where: { id: { in: toDelete } } });
    return toDelete.length;
  }
}

// =============================================================================
//  Helpers
// =============================================================================
function toDTO(row: any): DeckVersionDTO {
  return {
    id: row.id, deckId: row.deckId, userId: row.userId,
    name: row.name, description: row.description,
    type: row.type as DeckVersionType,
    slideCount: row.slideCount,
    qualityScore: row.qualityScore,
    familyId: row.familyId, templateId: row.templateId,
    createdAt: row.createdAt.toISOString(),
  };
}

function defaultName(type: DeckVersionType): string {
  const ts = new Date().toLocaleString();
  switch (type) {
    case 'AUTO_SAVE':       return `Auto-save · ${ts}`;
    case 'MANUAL_SNAPSHOT': return `Snapshot · ${ts}`;
    case 'GENERATED':       return `Generated · ${ts}`;
    case 'REGENERATED':     return `Regenerated · ${ts}`;
    case 'RESTORED':        return `Restored · ${ts}`;
    case 'FAMILY_CHANGED':  return `Family change · ${ts}`;
    case 'TEMPLATE_CHANGED':return `Template change · ${ts}`;
    case 'EXPORTED':        return `Exported · ${ts}`;
    case 'SAFETY':          return `Safety snapshot · ${ts}`;
    default:                return `Snapshot · ${ts}`;
  }
}
