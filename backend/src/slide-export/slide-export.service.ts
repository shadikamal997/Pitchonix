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

  constructor(private prisma: PrismaService) {}

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

  async export(deckId: string, format: ExportFormat): Promise<ExportResult> {
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
        buffer = await exportDeckToPdf(planned.deck);
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

    const warnings: string[] = [];
    const manifestSlides: { slideId: string; title: string; elementsRendered: number; elementsTotal: number }[] = [];
    const total = deck.slides.length;

    const renderInput: RenderDeckInput = {
      title: deck.title,
      slides: deck.slides.map((slide, idx) => {
        const elements: SlideElementDTO[] = (slide.elements || []).map((row) => ({
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

        const rendered = elements.filter((e) => e.visible !== false).length;
        manifestSlides.push({
          slideId: slide.id,
          title: slide.title,
          elementsRendered: rendered,
          elementsTotal:    elements.length,
        });

        if (elements.length === 0) {
          warnings.push(`Slide ${idx + 1} "${slide.title}" has no elements — it will export as a blank page. Open the editor to add content.`);
        }

        return {
          index: idx,
          total,
          title: slide.title,
          background:  (slide.background  as any) as SlideBackground  | null,
          themeTokens: (slide.themeTokens as any) as SlideThemeTokens | null,
          elements,
        };
      }),
    };

    return { renderInput, manifestSlides, deckTitle: deck.title, warnings };
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
