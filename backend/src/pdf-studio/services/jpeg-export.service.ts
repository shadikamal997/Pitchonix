import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BrowserPoolService } from './browser-pool.service';
import { PreviewService } from './preview.service';
import * as archiver from 'archiver';

export interface JpegExportOptions {
  quality?: number; // 1-100
  pages?: 'all' | number[];
}

@Injectable()
export class JpegExportService {
  private readonly logger = new Logger(JpegExportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly browserPool: BrowserPoolService,
    private readonly previewService: PreviewService,
  ) {}

  /**
   * Export PDF document as JPEG images (one per page)
   * Returns ZIP archive for multi-page documents, single JPEG for single page
   */
  async exportDocument(
    documentId: string,
    options: JpegExportOptions = {},
  ): Promise<{ jpegBuffers: Buffer[]; filename: string; isZip: boolean }> {
    this.logger.log(`Exporting document ${documentId} as JPEG(s)`);

    const document = await this.prisma.pdfDocument.findUnique({
      where: { id: documentId },
      include: { pages: { orderBy: { order: 'asc' } } },
    });

    if (!document) {
      throw new Error('Document not found');
    }

    // Validate and set quality (1-100)
    const quality = Math.min(100, Math.max(1, options.quality || 85));

    // Generate full document HTML preview
    const fullHtml = await this.previewService.generatePreview(
      documentId,
      false, // Don't use cache
      undefined, // colorScheme
      undefined, // templateType
      (document as any).proTemplateId,
    );

    // Render full preview to JPEG
    this.logger.log(`Rendering document as JPEG (quality: ${quality})`);
    const jpegBuffer = await this.browserPool.executeWithBrowser(async (browser) => {
      const page = await browser.newPage();

      try {
        // Set viewport for A4 dimensions with 2x scale
        await page.setViewport({
          width: 794, // A4 width
          height: 1123, // A4 height
          deviceScaleFactor: 2,
        });

        // Load HTML content
        await page.setContent(fullHtml, { waitUntil: 'load' });

        // Take screenshot
        const screenshot = await page.screenshot({
          type: 'jpeg',
          quality,
          fullPage: true,
        });

        return Buffer.from(screenshot);
      } finally {
        await page.close();
      }
    });

    const filename = `${document.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_export`;

    return {
      jpegBuffers: [jpegBuffer],
      filename,
      isZip: false, // Single image for now
    };
  }

  /**
   * Create ZIP archive from multiple JPEG buffers
   */
  createZipArchive(jpegBuffers: Buffer[], filename: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const archive = archiver('zip', { zlib: { level: 9 } });
      const chunks: Buffer[] = [];

      archive.on('data', (chunk) => chunks.push(chunk));
      archive.on('end', () => resolve(Buffer.concat(chunks)));
      archive.on('error', reject);

      // Add each JPEG to the archive
      jpegBuffers.forEach((buffer, index) => {
        const pageFilename = `${filename}_page_${String(index + 1).padStart(3, '0')}.jpg`;
        archive.append(buffer, { name: pageFilename });
      });

      archive.finalize();
    });
  }
}
