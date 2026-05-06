import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import PptxGenJS from 'pptxgenjs';

@Injectable()
export class PptxExportService {
  private readonly logger = new Logger(PptxExportService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Export document to PPTX format
   */
  async exportDocument(documentId: string): Promise<{ pptxBuffer: Buffer; filename: string }> {
    this.logger.log(`Exporting document ${documentId} to PPTX`);

    // Fetch document from database
    const document = await this.prisma.pdfDocument.findUnique({
      where: { id: documentId },
      include: { pages: true },
    });

    if (!document) {
      throw new Error(`Document ${documentId} not found`);
    }

    // Build PPTX presentation
    const pptxBuffer = await this.buildPptxPresentation(document);

    const filename = `${document.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pptx`;

    this.logger.log(`PPTX export complete: ${filename}`);
    return { pptxBuffer, filename };
  }

  /**
   * Build PPTX presentation from PDF document data
   */
  private async buildPptxPresentation(document: any): Promise<Buffer> {
    const pptx = new PptxGenJS();

    // Set presentation properties
    pptx.author = 'Pitchonix';
    pptx.company = 'Pitchonix';
    pptx.title = document.title;
    pptx.subject = document.outline?.detectedType || 'Document';

    // Define color scheme
    const colors = {
      primary: '#3B82F6',
      secondary: '#8B5CF6',
      accent: '#10B981',
      text: '#1F2937',
      background: '#FFFFFF',
    };

    // Title Slide
    const titleSlide = pptx.addSlide();
    titleSlide.background = { color: colors.primary };

    titleSlide.addText(document.title, {
      x: 0.5,
      y: 2.0,
      w: 9.0,
      h: 1.5,
      fontSize: 44,
      bold: true,
      color: 'FFFFFF',
      align: 'center',
      valign: 'middle',
    });

    if (document.outline?.detectedType) {
      titleSlide.addText(document.outline.detectedType, {
        x: 0.5,
        y: 3.5,
        w: 9.0,
        h: 0.5,
        fontSize: 24,
        color: 'FFFFFF',
        align: 'center',
      });
    }

    titleSlide.addText(new Date(document.createdAt).toLocaleDateString(), {
      x: 0.5,
      y: 5.0,
      w: 9.0,
      h: 0.3,
      fontSize: 14,
      color: 'FFFFFF',
      align: 'center',
    });

    // Content Slides - one slide per page
    for (let pageIndex = 0; pageIndex < document.pages.length; pageIndex++) {
      const page = document.pages[pageIndex];
      const slide = pptx.addSlide();
      slide.background = { color: 'FFFFFF' };

      // Page title
      if (page.title) {
        slide.addText(page.title, {
          x: 0.5,
          y: 0.5,
          w: 9.0,
          h: 0.75,
          fontSize: 32,
          bold: true,
          color: colors.text,
        });
      }

      // Page content
      const content = page.content?.text || '';
      const contentParts = this.parseContentForSlide(content);

      let yPosition = page.title ? 1.5 : 0.5;

      for (const part of contentParts) {
        if (part.type === 'heading') {
          slide.addText(part.text, {
            x: 0.5,
            y: yPosition,
            w: 9.0,
            h: 0.5,
            fontSize: 24,
            bold: true,
            color: colors.primary,
          });
          yPosition += 0.6;
        } else if (part.type === 'bullet') {
          slide.addText(part.text, {
            x: 0.8,
            y: yPosition,
            w: 8.5,
            h: 0.3,
            fontSize: 18,
            bullet: true,
            color: colors.text,
          });
          yPosition += 0.4;
        } else if (part.type === 'text') {
          slide.addText(part.text, {
            x: 0.5,
            y: yPosition,
            w: 9.0,
            h: 0.3,
            fontSize: 16,
            color: colors.text,
          });
          yPosition += 0.4;
        }

        // Break if we're running out of space
        if (yPosition > 6.5) break;
      }

      // Footer
      slide.addText(`${document.title} | ${new Date(document.createdAt).toLocaleDateString()}`, {
        x: 0.5,
        y: 7.0,
        w: 9.0,
        h: 0.25,
        fontSize: 10,
        color: '999999',
        align: 'center',
      });

      // Slide number
      slide.addText(`${pageIndex + 2}`, { // +2 because title slide is 1
        x: 9.0,
        y: 7.0,
        w: 0.5,
        h: 0.25,
        fontSize: 10,
        color: '999999',
        align: 'right',
      });
    }

    // Generate buffer
    const uint8Array = await pptx.write({ outputType: 'arraybuffer' });
    return Buffer.from(uint8Array as ArrayBuffer);
  }

  /**
   * Parse content into structured parts for slides
   */
  private parseContentForSlide(content: string): Array<{ type: string; text: string }> {
    const parts: Array<{ type: string; text: string }> = [];
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Detect headings
      if (trimmed.endsWith(':') || trimmed.startsWith('#')) {
        parts.push({
          type: 'heading',
          text: trimmed.replace(/^#+\s*/, '').replace(/:$/, ''),
        });
        continue;
      }

      // Detect bullets
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
        parts.push({
          type: 'bullet',
          text: trimmed.replace(/^[-*•]\s*/, ''),
        });
        continue;
      }

      // Detect numbered lists
      if (/^\d+\.\s/.test(trimmed)) {
        parts.push({
          type: 'bullet',
          text: trimmed.replace(/^\d+\.\s*/, ''),
        });
        continue;
      }

      // Regular text
      parts.push({
        type: 'text',
        text: trimmed,
      });
    }

    return parts;
  }
}
