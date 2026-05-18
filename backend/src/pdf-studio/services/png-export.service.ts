import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BrowserPoolService } from './browser-pool.service';
import { PreviewService } from './preview.service';
import * as archiver from 'archiver';
import { Readable } from 'stream';

export interface PngExportOptions {
  resolution?: 'low' | 'medium' | 'high';
  pages?: 'all' | number[];
  transparent?: boolean;
}

@Injectable()
export class PngExportService {
  private readonly logger = new Logger(PngExportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly browserPool: BrowserPoolService,
    private readonly previewService: PreviewService,
  ) {}

  /**
   * Export PDF document as PNG images (one per page)
   * Returns ZIP archive for multi-page documents, single PNG for single page
   */
  async exportDocument(
    documentId: string,
    options: PngExportOptions = {},
  ): Promise<{ pngBuffers: Buffer[]; filename: string; isZip: boolean }> {
    this.logger.log(`Exporting document ${documentId} as PNG(s)`);

    const document = await this.prisma.pdfDocument.findUnique({
      where: { id: documentId },
      include: { pages: { orderBy: { order: 'asc' } } },
    });

    if (!document) {
      throw new Error('Document not found');
    }

    // Determine resolution (deviceScaleFactor)
    const deviceScaleFactor = this.getDeviceScaleFactor(options.resolution || 'medium');

    // Generate full document HTML preview
    const fullHtml = await this.previewService.generatePreview(
      documentId,
      false, // Don't use cache
      undefined, // colorScheme
      undefined, // templateType
      (document as any).proTemplateId || null, // TODO: fix after schema migration
    );

    // Render full preview to PNG
    this.logger.log(`Rendering document as PNG`);
    const pngBuffer = await this.browserPool.executeWithBrowser(async (browser) => {
      const page = await browser.newPage();

      try {
        // Set viewport for A4 dimensions
        await page.setViewport({
          width: 794, // A4 width
          height: 1123, // A4 height
          deviceScaleFactor,
        });

        // Load HTML content
        await page.setContent(fullHtml, { waitUntil: 'load' });

        // Take screenshot
        const screenshot = await page.screenshot({
          type: 'png',
          fullPage: true,
          omitBackground: options.transparent || false,
        });

        return Buffer.from(screenshot);
      } finally {
        await page.close();
      }
    });

    const filename = `${document.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_export`;

    return {
      pngBuffers: [pngBuffer],
      filename,
      isZip: false, // Single image for now
    };
  }

  /**
   * Get deviceScaleFactor based on resolution setting
   */
  private getDeviceScaleFactor(resolution: 'low' | 'medium' | 'high'): number {
    switch (resolution) {
      case 'low':
        return 1; // 96 DPI
      case 'medium':
        return 2; // 192 DPI (default)
      case 'high':
        return 3; // 288 DPI (print quality)
      default:
        return 2;
    }
  }

  /**
   * Create ZIP archive from multiple PNG buffers
   */
  createZipArchive(pngBuffers: Buffer[], filename: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const archive = archiver('zip', { zlib: { level: 9 } });
      const chunks: Buffer[] = [];

      archive.on('data', (chunk) => chunks.push(chunk));
      archive.on('end', () => resolve(Buffer.concat(chunks)));
      archive.on('error', reject);

      // Add each PNG to the archive
      pngBuffers.forEach((buffer, index) => {
        const pageFilename = `${filename}_page_${String(index + 1).padStart(3, '0')}.png`;
        archive.append(buffer, { name: pageFilename });
      });

      archive.finalize();
    });
  }
}
