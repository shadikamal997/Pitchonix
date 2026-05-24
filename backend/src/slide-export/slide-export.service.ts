// =============================================================================
//  SlideExportService — element-aware orchestration
//
//  Fetches deck + slides + elements, builds the renderer input, and emits the
//  requested format. Each export returns:
//     - file: Buffer + filename + mime
//     - manifest: { slides: [{ slideId, elementsRendered, elementsTotal }] }
//                 used by the controller to surface fidelity stats.
// =============================================================================

import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { SlideElementDTO, SlideBackground, SlideThemeTokens } from '../slides/element-types';
import type { RenderDeckInput } from './render-types';
import { createRenderPlan } from './render-planner';
import { exportDeckToPptx } from './element-pptx-exporter';
import { exportDeckToPdf, exportDeckToPngs, exportDeckToJpegs, buildImageZip, writeExportFile } from './element-image-exporter';
import { MasterElementsService } from '../master-elements/master-elements.service';
import { buildMasterElementsForSlide } from '../master-elements/master-merge';
import type { DeckMasterSettings } from '../master-elements/master-element-types';
import { ComponentsService } from '../components/components.service';
import { resolveInstancesForSlide } from '../components/component-resolve';
import type { SavedComponentDTO } from '../components/component-types';

export type ExportFormat = 'pptx' | 'pdf' | 'png' | 'jpeg';

export interface ExportResult {
  buffer:   Buffer;
  fileName: string;
  mime:     string;
  fileUrl:  string;
  manifest: ExportManifest;
}

export interface ExportManifest {
  deckId:        string;
  format:        ExportFormat;
  generatedAt:   string;
  slideCount:    number;
  elementTotal:  number;
  slides:        Array<{ slideId: string; title: string; elementsRendered: number; elementsTotal: number }>;
  warnings:      string[];
}

@Injectable()
export class SlideExportService {
  private readonly logger = new Logger(SlideExportService.name);

  constructor(
    private prisma: PrismaService,
    private masters: MasterElementsService,
    private components: ComponentsService,
  ) {}

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
  //  Public — single export entry point
  // ---------------------------------------------------------------------------

  async export(
    deckId: string,
    format: ExportFormat,
    /** Phase 36.1J — opt-in PDF comments appendix. */
    options: { includeComments?: boolean } = {},
  ): Promise<ExportResult> {
    const { renderInput, manifestSlides, deckTitle, warnings } = await this.loadDeck(deckId);
    const planned = createRenderPlan(renderInput);
    warnings.push(...planned.warnings);

    let buffer: Buffer;
    let fileName: string;
    let mime: string;

    switch (format) {
      case 'pptx': {
        buffer = await exportDeckToPptx(planned.deck);
        fileName = `${safeFileName(deckTitle || 'presentation')}-${Date.now()}.pptx`;
        mime = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
        break;
      }
      case 'pdf': {
        // Phase 36.1J — gather comments for the appendix when requested.
        const appendix = options.includeComments
          ? { comments: await this.loadCommentsAppendix(deckId, manifestSlides) }
          : undefined;
        buffer = await exportDeckToPdf(planned.deck, { appendix });
        fileName = `${safeFileName(deckTitle || 'presentation')}-${Date.now()}.pdf`;
        mime = 'application/pdf';
        break;
      }
      case 'png': {
        const pngs = await exportDeckToPngs(planned.deck);
        if (pngs.length === 1) {
          buffer = pngs[0];
          fileName = `${safeFileName(deckTitle || 'slide')}-${Date.now()}.png`;
          mime = 'image/png';
        } else {
          buffer = await buildImageZip(pngs.map((p, i) => ({ name: `slide-${String(i + 1).padStart(2, '0')}.png`, buffer: p })));
          fileName = `${safeFileName(deckTitle || 'presentation')}-png-${Date.now()}.zip`;
          mime = 'application/zip';
        }
        break;
      }
      case 'jpeg': {
        const jpegs = await exportDeckToJpegs(planned.deck);
        if (jpegs.length === 1) {
          buffer = jpegs[0];
          fileName = `${safeFileName(deckTitle || 'slide')}-${Date.now()}.jpg`;
          mime = 'image/jpeg';
        } else {
          buffer = await buildImageZip(jpegs.map((p, i) => ({ name: `slide-${String(i + 1).padStart(2, '0')}.jpg`, buffer: p })));
          fileName = `${safeFileName(deckTitle || 'presentation')}-jpeg-${Date.now()}.zip`;
          mime = 'application/zip';
        }
        break;
      }
      default:
        throw new NotFoundException(`Unsupported export format: ${format}`);
    }

    const fileUrl = writeExportFile(buffer, fileName);
    const manifest: ExportManifest = {
      deckId,
      format,
      generatedAt: new Date().toISOString(),
      slideCount:  planned.deck.slides.length,
      elementTotal: manifestSlides.reduce((a, s) => a + s.elementsTotal, 0),
      slides: manifestSlides,
      warnings,
    };

    // Record in the existing Export table for audit/history.
    try {
      await this.prisma.export.create({
        data: { deckId, format, status: 'completed', fileUrl },
      });
    } catch (err) {
      this.logger.warn(`failed to persist export record: ${(err as Error).message}`);
    }

    return { buffer, fileName, mime, fileUrl, manifest };
  }

  // ---------------------------------------------------------------------------
  //  Internal — turn a deck row into the renderer input
  // ---------------------------------------------------------------------------

  private async loadDeck(deckId: string): Promise<{
    renderInput:    RenderDeckInput;
    manifestSlides: Array<{ slideId: string; title: string; elementsRendered: number; elementsTotal: number }>;
    deckTitle:      string;
    warnings:       string[];
  }> {
    const deck = await this.prisma.deck.findUnique({
      where: { id: deckId },
      include: {
        slides: {
          orderBy: { order: 'asc' },
          include: { elements: { orderBy: [{ order: 'asc' }, { zIndex: 'asc' }] } },
        },
      },
    });
    if (!deck) throw new NotFoundException('Deck not found');

    // Phase 32.75 — fetch deck-wide master elements + settings so we can
    // merge them into each slide before rendering.
    const [masters, masterSettings] = await Promise.all([
      this.masters.listForDeck(deckId),
      this.masters.getSettings(deckId),
    ]);

    // Phase 32.75 Tier 2 — load every component instance referenced by any
    // slide in the deck, batched into a single query. Then load each unique
    // component once so we can resolve instances synchronously per slide.
    const slideIds = deck.slides.map((s) => s.id);
    const instancesPerSlide = new Map<string, Awaited<ReturnType<typeof this.components.listInstancesForSlide>>>();
    await Promise.all(slideIds.map(async (sid) => {
      instancesPerSlide.set(sid, await this.components.listInstancesForSlide(sid));
    }));
    const componentIds = Array.from(new Set(
      Array.from(instancesPerSlide.values()).flat().map((i) => i.componentId),
    ));
    const componentMap = new Map<string, SavedComponentDTO>();
    await Promise.all(componentIds.map(async (cid) => {
      try { componentMap.set(cid, await this.components.getById(cid)); } catch { /* component deleted */ }
    }));

    const warnings: string[] = [];
    const manifestSlides: { slideId: string; title: string; elementsRendered: number; elementsTotal: number }[] = [];
    const total = deck.slides.length;

    const renderInput: RenderDeckInput = {
      title: deck.title,
      slides: deck.slides.map((slide, idx) => {
        const slideElements: SlideElementDTO[] = (slide.elements || []).map((row) => ({
          id: row.id,
          slideId: row.slideId,
          type: row.type as any,
          name: row.name,
          order: row.order,
          x: row.x, y: row.y, width: row.width, height: row.height,
          rotation: row.rotation, zIndex: row.zIndex,
          locked: row.locked, visible: row.visible,
          content: (row.content as any) ?? null,
          data:    (row.data    as any) ?? null,
          style:   (row.style   as any) ?? null,
          animations:    (row.animations    as any) ?? null,
          accessibility: (row.accessibility as any) ?? null,
          createdAt: row.createdAt.toISOString(),
          updatedAt: row.updatedAt.toISOString(),
        }));

        const masterElements = buildMasterElementsForSlide(masters, {
          slideId:    slide.id,
          slideIndex: idx,
          slideTotal: total,
        }, masterSettings as DeckMasterSettings);

        // Resolve linked component instances → SlideElement rows.
        const instances = instancesPerSlide.get(slide.id) || [];
        const instanceElements = resolveInstancesForSlide(instances, { components: componentMap });

        const elements = [...masterElements, ...slideElements, ...instanceElements];

        const rendered = elements.filter((e) => e.visible !== false).length;
        manifestSlides.push({
          slideId: slide.id,
          title: slide.title,
          elementsRendered: rendered,
          elementsTotal:    elements.length,
        });

        if (slideElements.length === 0 && masterElements.length === 0) {
          warnings.push(`Slide ${idx + 1} "${slide.title}" has no elements — it will export as a blank page. Open the editor to add content.`);
        }

        return {
          index: idx,
          total,
          title: slide.title,
          background:  (slide.background  as any) as SlideBackground  | null,
          themeTokens: (slide.themeTokens as any) as SlideThemeTokens | null,
          elements,
          // Phase 38E — fidelity passthroughs.
          speakerNotes: (slide as any).speakerNotes ?? null,
          transition:   ((slide as any).transition  ?? null) as any,
          sectionId:    (slide as any).sectionId    ?? null,
          sectionName:  null, // resolved by exporter if needed
        };
      }),
    };

    return { renderInput, manifestSlides, deckTitle: deck.title, warnings };
  }

  // ---------------------------------------------------------------------------
  //  Phase 36.1J — Comments appendix
  //
  //  Pulls every comment thread (root + replies) for the deck, including
  //  resolved ones, and flattens into a list ordered by slide index then
  //  createdAt. The renderer emits one card per entry with a status pill
  //  (Open / Resolved / Assigned to X) so the appendix reflects reviewer
  //  state at export time.
  // ---------------------------------------------------------------------------
  private async loadCommentsAppendix(
    deckId: string,
    manifestSlides: Array<{ slideId: string; title: string; elementsRendered: number; elementsTotal: number }>,
  ): Promise<Array<{ slideIndex: number; slideTitle: string; author: string; createdAt: string; body: string; resolved: boolean; status?: string }>> {
    const slideIndexById = new Map(manifestSlides.map((s, i) => [s.slideId, { idx: i + 1, title: s.title }]));
    const slideIds = manifestSlides.map((s) => s.slideId);
    if (slideIds.length === 0) return [];

    const rows = await this.prisma.comment.findMany({
      where: { slideId: { in: slideIds }, deletedAt: null },
      include: {
        user:       { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
      },
      orderBy: [{ slideId: 'asc' }, { createdAt: 'asc' }],
    });

    return rows.map((r) => {
      const ref = r.slideId ? slideIndexById.get(r.slideId) : null;
      const statusLabel = r.resolved
        ? 'Resolved'
        : r.assignedTo
          ? `Assigned to ${r.assignedTo.name || r.assignedTo.email}`
          : 'Open';
      return {
        slideIndex: ref?.idx ?? 0,
        slideTitle: ref?.title ?? '—',
        author:     r.user?.name || r.user?.email || 'Unknown',
        createdAt:  r.createdAt.toISOString(),
        body:       r.parentId ? `↳ Reply: ${r.content}` : r.content,
        resolved:   r.resolved,
        status:     statusLabel,
      };
    });
  }
}

// =============================================================================
//  Helpers
// =============================================================================

function safeFileName(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'presentation';
}
