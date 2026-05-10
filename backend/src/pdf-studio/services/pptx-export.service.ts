import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import PptxGenJS from 'pptxgenjs';

// Map our colorScheme keys to hex colours (no leading #)
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

    const pptxBuffer = await this.buildPptxPresentation(document);
    const filename = `${document.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pptx`;
    this.logger.log(`PPTX export complete: ${filename}`);
    return { pptxBuffer, filename };
  }

  private async buildPptxPresentation(document: any): Promise<Buffer> {
    const pptx = new PptxGenJS();
    pptx.author = 'Pitchonix';
    pptx.company = 'Pitchonix';
    pptx.title = document.title;
    pptx.subject = document.outline?.detectedType || 'Document';
    pptx.layout = 'LAYOUT_WIDE'; // 13.33 × 7.5 inches

    // Pick colour palette from document metadata or default to blue
    const schemeName = (document.metadata?.colorScheme as string) || 'blue';
    const palette = SCHEME_COLORS[schemeName] || SCHEME_COLORS.blue;

    // ── Title slide ──────────────────────────────────────────────────────────
    const titleSlide = pptx.addSlide();
    titleSlide.background = { color: palette.primary };

    // Decorative accent bar
    titleSlide.addShape('rect', {
      x: 0, y: 5.8, w: 13.33, h: 0.08,
      fill: { color: palette.accent },
      line: { color: palette.accent },
    });

    titleSlide.addText(document.title, {
      x: 1, y: 1.8, w: 11.33, h: 2,
      fontSize: 44, bold: true, color: 'FFFFFF',
      align: 'center', valign: 'middle', wrap: true,
    });

    if (document.outline?.detectedType) {
      titleSlide.addText(document.outline.detectedType.toUpperCase(), {
        x: 1, y: 3.9, w: 11.33, h: 0.5,
        fontSize: 16, color: palette.accent, align: 'center',
        bold: false, charSpacing: 3,
      });
    }

    titleSlide.addText(
      new Date(document.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      { x: 1, y: 4.9, w: 11.33, h: 0.3, fontSize: 13, color: 'FFFFFF', align: 'center', transparency: 30 },
    );

    // ── Content slides ───────────────────────────────────────────────────────
    const contentPages = (document.pages as any[]).filter(p => p.pageType !== 'toc');
    let slideNumber = 2;

    for (const page of contentPages) {
      if (page.pageType === 'cover') {
        // Already handled by title slide — skip duplicate cover page
        continue;
      }

      const slide = pptx.addSlide();
      slide.background = { color: 'FFFFFF' };

      // Top colour bar
      slide.addShape('rect', {
        x: 0, y: 0, w: 13.33, h: 0.12,
        fill: { color: palette.primary },
        line: { color: palette.primary },
      });

      // Side accent strip
      slide.addShape('rect', {
        x: 0, y: 0.12, w: 0.07, h: 7.38,
        fill: { color: palette.accent },
        line: { color: palette.accent },
      });

      // Page title
      const titleText = page.title || '';
      if (titleText) {
        slide.addText(titleText, {
          x: 0.3, y: 0.22, w: 12.7, h: 0.8,
          fontSize: 28, bold: true, color: palette.primary,
          valign: 'middle',
        });
      }

      // Divider line under title
      slide.addShape('line', {
        x: 0.3, y: 1.1, w: 12.7, h: 0,
        line: { color: palette.accent, width: 1.5 },
      });

      // Parse content
      const rawText = page.content?.text || '';
      const parts = this.parseContentForSlide(rawText);
      let yPos = 1.25;
      const maxY = 6.6;

      for (const part of parts) {
        if (yPos > maxY) break;

        if (part.type === 'h2') {
          slide.addText(part.text, {
            x: 0.3, y: yPos, w: 12.7, h: 0.45,
            fontSize: 20, bold: true, color: palette.secondary, valign: 'middle',
          });
          yPos += 0.55;
        } else if (part.type === 'h3') {
          slide.addText(part.text, {
            x: 0.3, y: yPos, w: 12.7, h: 0.35,
            fontSize: 16, bold: true, color: palette.primary, valign: 'middle',
          });
          yPos += 0.45;
        } else if (part.type === 'bullet') {
          slide.addText([{ text: part.text, options: { bullet: { type: 'bullet', code: '25CF' } } }], {
            x: 0.55, y: yPos, w: 12.5, h: 0.35,
            fontSize: 15, color: '1F2937', valign: 'top',
          });
          yPos += 0.4;
        } else if (part.type === 'text' && part.text.trim()) {
          slide.addText(part.text, {
            x: 0.3, y: yPos, w: 12.7, h: 0.35,
            fontSize: 14, color: '374151', valign: 'top', wrap: true,
          });
          yPos += 0.4;
        }
      }

      // Footer
      slide.addText(`${document.title}`, {
        x: 0.3, y: 7.1, w: 10, h: 0.25,
        fontSize: 9, color: '9CA3AF',
      });
      slide.addText(`${slideNumber}`, {
        x: 12.5, y: 7.1, w: 0.6, h: 0.25,
        fontSize: 9, color: palette.primary, bold: true, align: 'right',
      });
      slideNumber++;
    }

    const uint8Array = await pptx.write({ outputType: 'arraybuffer' });
    return Buffer.from(uint8Array as ArrayBuffer);
  }

  /**
   * Parse markdown into typed slide parts: h2, h3, bullet, text
   */
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
        // Strip markdown bold/italic for plain text slides
        parts.push({ type: 'text', text: line.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1') });
      }
    }

    return parts;
  }
}
