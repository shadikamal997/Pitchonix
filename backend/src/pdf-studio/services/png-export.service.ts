import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BrowserPoolService } from './browser-pool.service';
import { PreviewService } from './preview.service';

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
      document.proTemplateId || null,
    );

    // Render each preview page to its own PNG.
    this.logger.log(`Rendering document pages as PNG`);
    const pngBuffers = await this.browserPool.executeWithBrowser(async (browser) => {
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

        const pageElements = await page.$$('.a4-page');
        const targets = pageElements.length ? pageElements : [await page.$('body')].filter(Boolean);
        const selectedIndexes = this.selectedPageIndexes(targets.length, options.pages || 'all');
        const buffers: Buffer[] = [];

        for (const index of selectedIndexes) {
          const handle = targets[index];
          if (!handle) continue;
          const screenshot = await handle.screenshot({
            type: 'png',
            omitBackground: options.transparent || false,
          });
          buffers.push(Buffer.from(screenshot));
        }

        return buffers;
      } finally {
        await page.close();
      }
    });

    const filename = `${document.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_export`;

    return {
      pngBuffers,
      filename,
      isZip: pngBuffers.length > 1,
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

  private selectedPageIndexes(total: number, pages: 'all' | number[]): number[] {
    if (pages === 'all') return Array.from({ length: total }, (_, index) => index);
    const seen = new Set<number>();
    return pages
      .map((pageNumber) => Math.trunc(Number(pageNumber)) - 1)
      .filter((index) => index >= 0 && index < total && !seen.has(index) && (seen.add(index), true));
  }

  /**
   * Create ZIP archive from multiple PNG buffers
   */
  async createZipArchive(pngBuffers: Buffer[], filename: string): Promise<Buffer> {
    const archiver = await getArchiverFactory();
    return new Promise((resolve, reject) => {
      const archive = archiver('zip', { zlib: { level: 9 } });
      const chunks: Buffer[] = [];

      archive.on('data', (chunk) => chunks.push(chunk));
      archive.on('end', () => resolve(Buffer.concat(chunks)));
      archive.on('error', reject);

      pngBuffers.forEach((buffer, index) => {
        const pageFilename = `page-${String(index + 1).padStart(3, '0')}.png`;
        archive.append(buffer, { name: pageFilename });
      });

      archive.finalize();
    });
  }
}

async function getArchiverFactory(): Promise<any> {
  const nativeImport = new Function('specifier', 'return import(specifier)') as (
    specifier: string,
  ) => Promise<any>;
  const mod: any = await nativeImport('archiver');
  return mod.default || mod;
}
