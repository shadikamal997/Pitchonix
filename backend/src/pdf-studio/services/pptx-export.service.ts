import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as PptxGenJSModule from 'pptxgenjs';
const PptxGenJS = (PptxGenJSModule as any).default ?? PptxGenJSModule;
import { buildSafePdfStudioDocument } from './safe-document-model';

// Fallback palette used when document has no brand kit and no colorScheme metadata
const SCHEME_COLORS: Record<string, { primary: string; secondary: string; accent: string }> = {
  blue:    { primary: '2563EB', secondary: '1D4ED8', accent: '60A5FA' },
  navy:    { primary: '1E40AF', secondary: '1E3A8A', accent: '3B82F6' },
  gray:    { primary: '4B5563', secondary: '374151', accent: '6B7280' },
  purple:  { primary: '7C3AED', secondary: '6D28D9', accent: 'A78BFA' },
  green:   { primary: '059669', secondary: '047857', accent: '34D399' },
  red:     { primary: 'DC2626', secondary: 'B91C1C', accent: 'F87171' },
  teal:    { primary: '0D9488', secondary: '0F766E', accent: '2DD4BF' },
  indigo:  { primary: '4F46E5', secondary: '4338CA', accent: '818CF8' },
  emerald: { primary: '10B981', secondary: '059669', accent: '6EE7B7' },
  amber:   { primary: 'D97706', secondary: 'B45309', accent: 'FBBF24' },
  orange:  { primary: 'EA580C', secondary: 'C2410C', accent: 'FB923C' },
  rose:    { primary: 'F43F5E', secondary: 'E11D48', accent: 'FB7185' },
  slate:   { primary: '475569', secondary: '334155', accent: '94A3B8' },
  dark:    { primary: '1F2937', secondary: '111827', accent: '6B7280' },
};

// Arabic/Hebrew Unicode block ranges used to detect RTL content
const RTL_BLOCK_RE = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿֐-׿]/;

function hasRtlContent(text: string): boolean {
  return RTL_BLOCK_RE.test(text ?? '');
}

/** Strip leading # from a hex color string so PptxGenJS always gets bare hex. */
function bareHex(hex: string | null | undefined, fallback: string): string {
  if (!hex) return fallback;
  return hex.replace(/^#/, '');
}

interface Palette {
  primary: string;
  secondary: string;
  accent: string;
  fontFamily: string | null;
  logo: string | null;
  isRtl: boolean;
}

@Injectable()
export class PptxExportService {
  private readonly logger = new Logger(PptxExportService.name);

  constructor(private prisma: PrismaService) {}

  async exportDocument(documentId: string): Promise<{ pptxBuffer: Buffer; filename: string }> {
    this.logger.log(`Exporting document ${documentId} to PPTX`);

    const document = await this.prisma.pdfDocument.findUnique({
      where: { id: documentId },
      include: { pages: { orderBy: { order: 'asc' } } },
    });

    if (!document) throw new Error(`Document ${documentId} not found`);

    const palette = await this.resolvePalette(document);
    const pptxBuffer = await this.buildPptxPresentation(document, palette);
    const filename = `${document.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pptx`;
    this.logger.log(`PPTX export complete: ${filename}`);
    return { pptxBuffer, filename };
  }

  /**
   * Resolve colour palette + typography from brand kit (preferred) or
   * colorScheme metadata fallback.
   */
  private async resolvePalette(document: any): Promise<Palette> {
    // Try brand kit by user / workspace
    let brandKit: any = null;

    if (document.userId) {
      brandKit = await this.prisma.brandKit.findFirst({
        where: { userId: document.userId, isDefault: true },
        orderBy: { createdAt: 'desc' },
      });
      if (!brandKit) {
        brandKit = await this.prisma.brandKit.findFirst({
          where: { userId: document.userId },
          orderBy: { createdAt: 'desc' },
        });
      }
    }

    if (brandKit) {
      const tokens: any = brandKit.tokens ?? {};
      const colors = tokens.colors ?? {};
      const typography: any = tokens.typography ?? {};

      const primary   = bareHex(colors.primary   ?? brandKit.primaryColor,   '2563EB');
      const secondary = bareHex(colors.secondary  ?? brandKit.secondaryColor, '1D4ED8');
      const accent    = bareHex(colors.accent,  '60A5FA');
      const fontFamily = typography.body?.family ?? brandKit.fontFamily ?? null;
      const logo = brandKit.logo ?? null;
      const isRtl = hasRtlContent(document.title ?? '');

      return { primary, secondary, accent, fontFamily, logo, isRtl };
    }

    // Fallback: colorScheme metadata
    const schemeName = (document.metadata?.colorScheme as string) || 'blue';
    const scheme = SCHEME_COLORS[schemeName] ?? SCHEME_COLORS.blue;
    const isRtl = hasRtlContent(document.title ?? '');

    return { ...scheme, fontFamily: null, logo: null, isRtl };
  }

  private async buildPptxPresentation(document: any, palette: Palette): Promise<Buffer> {
    const pptx = new PptxGenJS();
    pptx.author  = 'Pitchonix';
    pptx.company = 'Pitchonix';
    const safeDocument = buildSafePdfStudioDocument(document);
    pptx.title   = safeDocument.title;
    pptx.subject = document.outline?.detectedType || 'Document';
    pptx.layout  = 'LAYOUT_WIDE'; // 13.33 × 7.5 inches

    const isRtl = palette.isRtl || hasRtlContent(safeDocument.title);

    // ── Title slide ──────────────────────────────────────────────────────────
    const titleSlide = pptx.addSlide();
    titleSlide.background = { color: palette.primary };

    titleSlide.addShape('rect', {
      x: 0, y: 5.8, w: 13.33, h: 0.08,
      fill: { color: palette.accent },
      line: { color: palette.accent },
    });

    // Logo (if brand kit provides one)
    if (palette.logo) {
      try {
        titleSlide.addImage({ path: palette.logo, x: 0.4, y: 0.3, w: 1.2, h: 0.5 });
      } catch {
        // Logo URL inaccessible at export time — skip gracefully
      }
    }

    titleSlide.addText(safeDocument.title, {
      x: 1, y: 1.8, w: 11.33, h: 2,
      fontSize: 44, bold: true, color: 'FFFFFF',
      align: isRtl ? 'right' : 'center',
      valign: 'middle', wrap: true,
      rtlMode: isRtl,
      ...(palette.fontFamily ? { fontFace: palette.fontFamily } : {}),
    });

    if (document.outline?.detectedType) {
      titleSlide.addText(document.outline.detectedType.toUpperCase(), {
        x: 1, y: 3.9, w: 11.33, h: 0.5,
        fontSize: 16, color: palette.accent,
        align: isRtl ? 'right' : 'center',
        bold: false, charSpacing: 3,
        rtlMode: isRtl,
      });
    }

    titleSlide.addText(
      new Date(document.createdAt).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
      }),
      {
        x: 1, y: 4.9, w: 11.33, h: 0.3,
        fontSize: 13, color: 'FFFFFF',
        align: isRtl ? 'right' : 'center',
        transparency: 30,
        rtlMode: isRtl,
      },
    );

    // ── Content slides ───────────────────────────────────────────────────────
    const contentPages = safeDocument.pages.filter((p) => p.pageType !== 'toc');
    let slideNumber = 2;

    for (const page of contentPages) {
      if (page.pageType === 'cover') continue;

      const titleText = page.displayTitle || '';
      const pageIsRtl = isRtl || hasRtlContent(titleText) || hasRtlContent(page.normalizedText ?? '');
      const parts = this.parseContentForSlide(page.normalizedText);
      let slide = this.addContentSlide(pptx, palette, titleText, false, pageIsRtl);
      let continuationIndex = 0;
      let yPos = 1.25;
      const maxY = 6.6;

      for (const part of parts) {
        const requiredHeight = this.partHeight(part);
        if (yPos + requiredHeight > maxY) {
          this.addFooter(slide, safeDocument.title, slideNumber++, palette, pageIsRtl);
          continuationIndex++;
          slide = this.addContentSlide(pptx, palette, titleText, continuationIndex > 0, pageIsRtl);
          yPos = 1.25;
        }

        const partIsRtl = pageIsRtl || hasRtlContent(part.text);
        const xPos     = partIsRtl ? 0.3  : 0.3;
        const contentW = 12.7;
        const align    = partIsRtl ? 'right' : 'left';
        const bulletX  = partIsRtl ? 0.3   : 0.55;
        const bulletW  = partIsRtl ? 12.5  : 12.5;

        if (part.type === 'h2') {
          slide.addText(part.text, {
            x: xPos, y: yPos, w: contentW, h: 0.45,
            fontSize: 20, bold: true, color: palette.secondary,
            valign: 'middle', align, rtlMode: partIsRtl,
            ...(palette.fontFamily ? { fontFace: palette.fontFamily } : {}),
          });
          yPos += 0.55;
        } else if (part.type === 'h3') {
          slide.addText(part.text, {
            x: xPos, y: yPos, w: contentW, h: 0.35,
            fontSize: 16, bold: true, color: palette.primary,
            valign: 'middle', align, rtlMode: partIsRtl,
            ...(palette.fontFamily ? { fontFace: palette.fontFamily } : {}),
          });
          yPos += 0.45;
        } else if (part.type === 'bullet') {
          slide.addText(
            [{ text: part.text, options: { bullet: { type: 'bullet', code: '25CF' } } }],
            {
              x: bulletX, y: yPos, w: bulletW, h: requiredHeight,
              fontSize: 15, color: '1F2937',
              valign: 'top', align, rtlMode: partIsRtl,
              ...(palette.fontFamily ? { fontFace: palette.fontFamily } : {}),
            },
          );
          yPos += requiredHeight;
        } else if (part.type === 'text' && part.text.trim()) {
          slide.addText(part.text, {
            x: xPos, y: yPos, w: contentW, h: requiredHeight,
            fontSize: 14, color: '374151',
            valign: 'top', wrap: true, align, rtlMode: partIsRtl,
            ...(palette.fontFamily ? { fontFace: palette.fontFamily } : {}),
          });
          yPos += requiredHeight;
        }
      }

      this.addFooter(slide, safeDocument.title, slideNumber++, palette, pageIsRtl);
    }

    const uint8Array = await pptx.write({ outputType: 'arraybuffer' });
    return Buffer.from(uint8Array as ArrayBuffer);
  }

  private parseContentForSlide(content: string): Array<{ type: string; text: string }> {
    const parts: Array<{ type: string; text: string }> = [];

    for (const rawLine of content.split('\n')) {
      const line = rawLine.trim();
      if (!line) continue;

      if (/^##\s/.test(line)) {
        parts.push({ type: 'h2', text: line.replace(/^##\s+/, '') });
      } else if (/^###\s/.test(line)) {
        parts.push({ type: 'h3', text: line.replace(/^###\s+/, '') });
      } else if (/^#\s/.test(line)) {
        parts.push({ type: 'h2', text: line.replace(/^#\s+/, '') });
      } else if (/^[-*•]\s/.test(line)) {
        parts.push({ type: 'bullet', text: line.replace(/^[-*•]\s+/, '').replace(/\*\*(.*?)\*\*/g, '$1') });
      } else if (/^\d+\.\s/.test(line)) {
        parts.push({ type: 'bullet', text: line.replace(/^\d+\.\s+/, '').replace(/\*\*(.*?)\*\*/g, '$1') });
      } else {
        parts.push({ type: 'text', text: line.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1') });
      }
    }

    return parts;
  }

  private addContentSlide(
    pptx: any,
    palette: Palette,
    titleText: string,
    continuation: boolean,
    isRtl: boolean,
  ) {
    const slide = pptx.addSlide();
    slide.background = { color: 'FFFFFF' };
    slide.addShape('rect', {
      x: 0, y: 0, w: 13.33, h: 0.12,
      fill: { color: palette.primary }, line: { color: palette.primary },
    });
    slide.addShape('rect', {
      x: isRtl ? 13.26 : 0, y: 0.12, w: 0.07, h: 7.38,
      fill: { color: palette.accent }, line: { color: palette.accent },
    });

    if (titleText) {
      slide.addText(continuation ? `${this.stripContinuation(titleText)} (continued)` : titleText, {
        x: 0.3, y: 0.22, w: 12.7, h: 0.8,
        fontSize: 28, bold: true, color: palette.primary,
        valign: 'middle', align: isRtl ? 'right' : 'left',
        rtlMode: isRtl,
        ...(palette.fontFamily ? { fontFace: palette.fontFamily } : {}),
      });
    }

    slide.addShape('line', {
      x: 0.3, y: 1.1, w: 12.7, h: 0,
      line: { color: palette.accent, width: 1.5 },
    });

    return slide;
  }

  private addFooter(
    slide: any,
    documentTitle: string,
    slideNumber: number,
    palette: Palette,
    isRtl: boolean,
  ) {
    slide.addText(documentTitle, {
      x: isRtl ? 2.83 : 0.3, y: 7.1, w: 10, h: 0.25,
      fontSize: 9, color: '9CA3AF',
      align: isRtl ? 'right' : 'left',
    });
    slide.addText(`${slideNumber}`, {
      x: isRtl ? 0.3 : 12.5, y: 7.1, w: 0.6, h: 0.25,
      fontSize: 9, color: palette.primary, bold: true,
      align: isRtl ? 'left' : 'right',
    });
  }

  private partHeight(part: { type: string; text: string }): number {
    if (part.type === 'h2') return 0.55;
    if (part.type === 'h3') return 0.45;
    if (part.type === 'bullet') return Math.max(0.4, Math.ceil((part.text || '').length / 95) * 0.35);
    const lines = Math.max(1, Math.ceil((part.text || '').length / 105));
    return Math.max(0.4, lines * 0.4);
  }

  private stripContinuation(title: string): string {
    return String(title || '').replace(/\s*\(continued\)\s*$/i, '').trim();
  }
}
