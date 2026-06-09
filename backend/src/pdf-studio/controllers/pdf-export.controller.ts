import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  Res,
  HttpException,
  HttpStatus,
  Logger,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { GetUser } from '../../auth/get-user.decorator';
import { Public } from '../../auth/public.decorator';
import { SkipThrottle } from '@nestjs/throttler';
import { PdfExportService, PdfExportOptions } from '../services/pdf-export.service';
import { DocxExportService } from '../services/docx-export.service';
import { PptxExportService } from '../services/pptx-export.service';
import { PngExportService } from '../services/png-export.service';
import { JpegExportService } from '../services/jpeg-export.service';
import { PreviewService } from '../services/preview.service';
import { PreflightService } from '../services/preflight.service';
import { TemplateType } from '../templates/template-types';
import { TEMPLATE_CONFIGS } from '../templates/template-configs';
import { PRO_TEMPLATE_REGISTRY } from '../pro-templates/registry/pro-template.registry';
import { PrismaService } from '../../prisma/prisma.service';
import { FeasibilityStudioService } from '../../feasibility-studio/feasibility-studio.service';
import { PdfStudioLedgerService } from '../../content-ledger/pdf-studio-ledger.service';

@Controller('pdf-studio/export')
@UseGuards(JwtAuthGuard)
export class PdfExportController {
  private readonly logger = new Logger(PdfExportController.name);

  constructor(
    private pdfExportService: PdfExportService,
    private docxExportService: DocxExportService,
    private pptxExportService: PptxExportService,
    private pngExportService: PngExportService,
    private jpegExportService: JpegExportService,
    private previewService: PreviewService,
    private preflightService: PreflightService,
    private prisma: PrismaService,
    private feasibilityStudioService: FeasibilityStudioService,
    private pdfStudioLedger: PdfStudioLedgerService,
  ) {}

  /**
   * Export document in multiple formats
   * POST /api/pdf-studio/export/:id
   */
  /** Sanitize a filename so it's safe to use in Content-Disposition. */
  private sanitizeFilename(name: string): string {
    return (
      name
        .replace(/[^\w.\-]/g, '_') // replace unsafe chars
        .replace(/\.{2,}/g, '_') // collapse ..
        .replace(/^[./]+/, '') // strip leading dots/slashes
        .substring(0, 200) || // max length
      'document'
    );
  }

  private async assertDocumentAccess(documentId: string, user: any) {
    const document = await this.prisma.pdfDocument.findUnique({
      where: { id: documentId },
      include: { project: true },
    });

    if (!document) {
      throw new HttpException('Document not found', HttpStatus.NOT_FOUND);
    }

    if (document.project?.userId && document.project.userId !== user?.id) {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }

    return document;
  }

  @Post(':id')
  async exportDocument(
    @Param('id') documentId: string,
    @GetUser() user: any,
    @Body('format') format: string,
    @Body('templateType') templateType?: string,
    @Body('colorScheme') colorScheme?: string,
    @Body('proTemplateId') proTemplateId?: string | null,
    @Body('exportOptions') exportOptions?: PdfExportOptions,
    @Res() res?: Response,
  ) {
    try {
      this.logger.log(`Export request for document ${documentId} in format ${format}`);

      const exportingDoc = await this.assertDocumentAccess(documentId, user);
      await this.repairFeasibilityDocumentIfNeeded(documentId);

      // Validate colorScheme if provided
      const VALID_COLOR_SCHEMES = [
        'blue',
        'navy',
        'gray',
        'purple',
        'green',
        'red',
        'teal',
        'indigo',
        'emerald',
        'amber',
        'orange',
        'rose',
        'slate',
        'dark',
      ];
      if (colorScheme && !VALID_COLOR_SCHEMES.includes(colorScheme)) {
        throw new HttpException(
          `Invalid colorScheme. Valid values: ${VALID_COLOR_SCHEMES.join(', ')}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      // Validate proTemplateId if provided
      if (proTemplateId) {
        const known = PRO_TEMPLATE_REGISTRY.some((t) => t.id === proTemplateId);
        if (!known) {
          throw new HttpException(
            `Unknown proTemplateId: ${proTemplateId}`,
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      // Preflight always runs and its full report is surfaced to the UI, but it
      // is ADVISORY: quality heuristics (overflow estimates, sparse/empty pages,
      // missing title, orphan headings, broken charts, etc.) must never trap a
      // user from exporting their own content. Only genuinely un-renderable
      // documents — missing document or zero pages — hard-block the export.
      const preflight = await this.preflightService.runPreflight(documentId);
      const FATAL_CODES = new Set(['DOC_NOT_FOUND', 'NO_PAGES']);
      const fatal = preflight.errors.filter((e) => FATAL_CODES.has(e.code));
      if (fatal.length > 0) {
        throw new HttpException(
          {
            message: fatal[0].message || 'Export blocked: document cannot be rendered',
            preflight,
          },
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }
      if (!preflight.exportReady) {
        this.logger.warn(
          `Exporting ${documentId} despite ${preflight.errors.length} preflight error(s): ` +
            preflight.errors.map((e) => e.code).join(', '),
        );
      }

      // Phase Ω.CONTENT.3 (Phase 5) — snapshot the persisted document into the
      // content ledger (imported → rendered) BEFORE export so the round-trip can
      // be certified. Best-effort; never block an export over the ledger.
      try {
        await this.pdfStudioLedger.recordDocument(documentId);
      } catch (err: any) {
        this.logger.warn(`PDF Studio ledger snapshot skipped for ${documentId}: ${err?.message}`);
      }

      let buffer: Buffer;
      let filename: string;
      let contentType: string;

      switch (format?.toLowerCase()) {
        case 'pdf':
          const template = (templateType as TemplateType) || TemplateType.CLEAN_BUSINESS_REPORT;
          const pdfResult = await this.pdfExportService.exportDocument(
            documentId,
            template,
            colorScheme,
            proTemplateId,
            exportOptions,
          );
          buffer = pdfResult.pdfBuffer;
          filename = pdfResult.filename;
          contentType = 'application/pdf';
          break;

        case 'docx':
        case 'word':
          const docxResult = await this.docxExportService.exportDocument(documentId);
          buffer = docxResult.docxBuffer;
          filename = docxResult.filename;
          contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
          break;

        case 'pptx':
        case 'powerpoint':
          const pptxResult = await this.pptxExportService.exportDocument(documentId);
          buffer = pptxResult.pptxBuffer;
          filename = pptxResult.filename;
          contentType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
          break;

        case 'png':
          const pngResult = await this.pngExportService.exportDocument(documentId, {
            resolution: 'medium', // Default to medium quality
            pages: 'all',
          });

          if (pngResult.isZip) {
            // Multiple pages - return ZIP
            buffer = await this.pngExportService.createZipArchive(
              pngResult.pngBuffers,
              pngResult.filename,
            );
            filename = `${pngResult.filename}.zip`;
            contentType = 'application/zip';
          } else {
            // Single page - return PNG directly
            buffer = pngResult.pngBuffers[0];
            filename = `${pngResult.filename}.png`;
            contentType = 'image/png';
          }
          break;

        case 'jpeg':
        case 'jpg':
          const jpegResult = await this.jpegExportService.exportDocument(documentId, {
            quality: 85, // Default quality
            pages: 'all',
          });

          if (jpegResult.isZip) {
            // Multiple pages - return ZIP
            buffer = await this.jpegExportService.createZipArchive(
              jpegResult.jpegBuffers,
              jpegResult.filename,
            );
            filename = `${jpegResult.filename}.zip`;
            contentType = 'application/zip';
          } else {
            // Single page - return JPEG directly
            buffer = jpegResult.jpegBuffers[0];
            filename = `${jpegResult.filename}.jpg`;
            contentType = 'image/jpeg';
          }
          break;

        default:
          throw new HttpException(
            `Unsupported export format: ${format}. Supported formats: pdf, docx, pptx, png, jpeg`,
            HttpStatus.BAD_REQUEST,
          );
      }

      // Sanitize and set response headers
      const safeFilename = this.sanitizeFilename(filename);
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
      res.setHeader('Content-Length', buffer.length);

      // Send file
      res.send(buffer);

      this.logger.log(`Export successful: ${filename} (${format})`);

      // Phase Ω.CONTENT.3 (Phase 5) — mark exported, then for text formats reopen
      // by RE-PARSING the actual exported bytes and proving every heading,
      // paragraph, bullet, table, chart and appendix node survived. Best-effort;
      // never fail an export over the ledger.
      this.pdfStudioLedger
        .recordExportReopen(documentId, buffer, format?.toLowerCase())
        .then(
          (r) =>
            r &&
            this.logger.log(
              `PDF ledger reopen ${documentId} (${format}): reopened=${r.reopened} lost=${r.lost}`,
            ),
        )
        .catch((err) =>
          this.logger.warn(`PDF ledger export/reopen skipped for ${documentId}: ${err?.message}`),
        );

      // Bump the owning project's exportCount for the dashboard/analytics
      // "Exports" metric. Best-effort — never fail an export over a counter.
      const exportProjectId = (exportingDoc as any)?.project?.id;
      if (exportProjectId) {
        this.prisma.project
          .update({ where: { id: exportProjectId }, data: { exportCount: { increment: 1 } } })
          .catch((err) =>
            this.logger.warn(
              `Failed to increment exportCount for project ${exportProjectId}: ${err?.message}`,
            ),
          );
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(`Export failed: ${error.message}`, error.stack);
      throw new HttpException(error.message || 'Export failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Get all available Pro Templates.
   * GET /api/pdf-studio/export/pro-templates
   * Public static data. Do not throttle: the editor may request this during
   * template browsing and automated template certification sweeps.
   */
  @Public()
  @SkipThrottle({ short: true, medium: true, long: true })
  @Get('pro-templates')
  async getProTemplates() {
    return {
      success: true,
      data: {
        templates: PRO_TEMPLATE_REGISTRY.map((template) => ({
          id: template.id,
          name: template.name,
          family: template.family,
          category: template.category,
          description: template.description,
          tags: template.tags,
          archetypes: template.archetypes,
          tokens: template.tokens,
        })),
      },
    };
  }

  /**
   * Get live preview HTML for document
   * GET /api/pdf-studio/export/preview/:id
   * Public iframe render endpoint. Do not throttle: preview panes, template
   * browsing, and certification sweeps can legitimately render many previews
   * in a short burst.
   */
  // Auth + ownership required: this returns the full rendered HTML of a
  // document. It was previously @Public(), which let anyone enumerate document
  // IDs and read other users' content (IDOR). The frontend fetches this via
  // api.get() with the bearer token (PreviewModal/LivePreview), so requiring
  // the JwtAuthGuard does not break preview rendering.
  @SkipThrottle({ short: true, medium: true, long: true })
  @Get('preview/:id')
  async getPreview(
    @Param('id') documentId: string,
    @Query('colorScheme') colorScheme: string,
    @Query('templateType') templateType: string,
    @Query('proTemplateId') proTemplateId: string,
    @GetUser() user: any,
    @Res() res: Response,
  ) {
    try {
      this.logger.log(`Preview request for document ${documentId}`);

      await this.assertDocumentAccess(documentId, user);
      await this.repairFeasibilityDocumentIfNeeded(documentId);

      const html = await this.previewService.generatePreview(
        documentId,
        true,
        colorScheme,
        templateType,
        proTemplateId,
      );

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.send(html);

      this.logger.log(`Preview generated for document ${documentId}`);
    } catch (error) {
      this.logger.error(`Preview generation failed: ${error.message}`, error.stack);

      // Return error HTML
      const errorHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Preview Error</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              background: #f3f4f6;
            }
            .error-container {
              text-align: center;
              padding: 40px;
              background: white;
              border-radius: 12px;
              box-shadow: 0 4px 12px rgba(0,0,0,0.1);
              max-width: 500px;
            }
            .error-icon {
              font-size: 48px;
              margin-bottom: 16px;
            }
            h1 {
              color: #ef4444;
              margin: 0 0 12px 0;
              font-size: 24px;
            }
            p {
              color: #6b7280;
              margin: 0;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="error-container">
            <div class="error-icon">⚠️</div>
            <h1>Preview Error</h1>
            <p>${error.message || 'Failed to generate preview'}</p>
          </div>
        </body>
        </html>
      `;

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.status(HttpStatus.OK).send(errorHtml);
    }
  }

  /**
   * Invalidate preview cache for document
   * POST /api/pdf-studio/export/preview/:id/invalidate
   * Auth-required — prevents anonymous users from thrashing the cache.
   */
  @Post('preview/:id/invalidate')
  async invalidatePreviewCache(@Param('id') documentId: string, @GetUser() user: any) {
    try {
      await this.assertDocumentAccess(documentId, user);
      this.previewService.invalidateCache(documentId);
      return {
        success: true,
        message: 'Preview cache invalidated',
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to invalidate cache',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get all available document templates with SVG thumbnails
   * GET /api/pdf-studio/export/templates
   */
  @Get('templates')
  async getTemplates() {
    const templates = Object.values(TEMPLATE_CONFIGS)
      .filter((config) => config.type !== TemplateType.SMART_PDF_BUILDER)
      .map((config) => ({
        type: config.type,
        name: config.name,
        description: config.description,
        category: config.category,
        style: {
          colorScheme: config.style.colorScheme,
          headerStyle: config.style.headerStyle,
          cardStyle: config.style.cardStyle,
          spacing: config.style.spacing,
        },
        thumbnail: this.generateTemplateThumbnail(config),
      }));

    return { success: true, data: { templates } };
  }

  /**
   * Generate an inline SVG thumbnail representing a template's visual style.
   * Returns a data URI string safe to use in <img src="…">.
   */
  private generateTemplateThumbnail(config: any): string {
    const colors: Record<
      string,
      { primary: string; secondary: string; accent: string; bg: string }
    > = {
      blue: { primary: '#2563EB', secondary: '#1D4ED8', accent: '#60A5FA', bg: '#EFF6FF' },
      navy: { primary: '#1E40AF', secondary: '#1E3A8A', accent: '#3B82F6', bg: '#EFF6FF' },
      gray: { primary: '#4B5563', secondary: '#374151', accent: '#9CA3AF', bg: '#F9FAFB' },
      purple: { primary: '#7C3AED', secondary: '#6D28D9', accent: '#A78BFA', bg: '#F5F3FF' },
      green: { primary: '#059669', secondary: '#047857', accent: '#34D399', bg: '#ECFDF5' },
      red: { primary: '#DC2626', secondary: '#B91C1C', accent: '#F87171', bg: '#FEF2F2' },
      teal: { primary: '#0D9488', secondary: '#0F766E', accent: '#2DD4BF', bg: '#F0FDFA' },
      indigo: { primary: '#4F46E5', secondary: '#4338CA', accent: '#818CF8', bg: '#EEF2FF' },
      emerald: { primary: '#10B981', secondary: '#059669', accent: '#6EE7B7', bg: '#ECFDF5' },
      amber: { primary: '#D97706', secondary: '#B45309', accent: '#FBBF24', bg: '#FFFBEB' },
      orange: { primary: '#EA580C', secondary: '#C2410C', accent: '#FB923C', bg: '#FFF7ED' },
      rose: { primary: '#F43F5E', secondary: '#E11D48', accent: '#FB7185', bg: '#FFF1F2' },
      slate: { primary: '#475569', secondary: '#334155', accent: '#94A3B8', bg: '#F8FAFC' },
      dark: { primary: '#1F2937', secondary: '#111827', accent: '#6B7280', bg: '#F3F4F6' },
    };

    const c = colors[config.style.colorScheme] || colors.blue;
    const headerH = config.style.headerStyle === 'gradient' ? 28 : 20;
    const radius =
      config.style.cardStyle === 'rounded' ? 4 : config.style.cardStyle === 'soft' ? 2 : 0;
    const headerBg =
      config.style.headerStyle === 'minimal'
        ? `fill="${c.bg}" stroke="${c.primary}" stroke-width="1"`
        : `fill="${c.primary}"`;

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 160" width="120" height="160">
  <!-- Page background -->
  <rect width="120" height="160" fill="white" rx="3" ry="3"/>
  <!-- Header -->
  <rect x="0" y="0" width="120" height="${headerH}" ${headerBg} rx="3" ry="3"/>
  <rect x="0" y="${headerH - 4}" width="120" height="4" fill="${c.primary}"/>
  <!-- Header text lines -->
  <rect x="8" y="6" width="50" height="5" fill="${config.style.headerStyle === 'minimal' ? c.primary : 'rgba(255,255,255,0.9)'}" rx="1"/>
  <rect x="8" y="14" width="32" height="3" fill="${config.style.headerStyle === 'minimal' ? c.accent : 'rgba(255,255,255,0.6)'}" rx="1"/>
  <!-- Content cards -->
  <rect x="6" y="${headerH + 6}" width="108" height="22" fill="${c.bg}" rx="${radius}" ry="${radius}" stroke="${c.accent}" stroke-width="0.5"/>
  <rect x="10" y="${headerH + 10}" width="40" height="4" fill="${c.primary}" rx="1"/>
  <rect x="10" y="${headerH + 17}" width="88" height="3" fill="#D1D5DB" rx="1"/>
  <rect x="10" y="${headerH + 22}" width="70" height="2.5" fill="#E5E7EB" rx="1"/>
  <!-- Second card -->
  <rect x="6" y="${headerH + 34}" width="108" height="22" fill="${c.bg}" rx="${radius}" ry="${radius}" stroke="${c.accent}" stroke-width="0.5"/>
  <rect x="6" y="${headerH + 34}" width="3" height="22" fill="${c.primary}" rx="1"/>
  <rect x="13" y="${headerH + 38}" width="35" height="4" fill="${c.primary}" rx="1"/>
  <rect x="13" y="${headerH + 45}" width="85" height="2.5" fill="#D1D5DB" rx="1"/>
  <rect x="13" y="${headerH + 49}" width="65" height="2.5" fill="#E5E7EB" rx="1"/>
  <!-- Third card -->
  <rect x="6" y="${headerH + 62}" width="108" height="22" fill="${c.bg}" rx="${radius}" ry="${radius}" stroke="${c.accent}" stroke-width="0.5"/>
  <rect x="6" y="${headerH + 62}" width="3" height="22" fill="${c.accent}" rx="1"/>
  <rect x="13" y="${headerH + 66}" width="45" height="4" fill="${c.secondary}" rx="1"/>
  <rect x="13" y="${headerH + 73}" width="80" height="2.5" fill="#D1D5DB" rx="1"/>
  <rect x="13" y="${headerH + 77}" width="55" height="2.5" fill="#E5E7EB" rx="1"/>
  <!-- Footer -->
  <rect x="0" y="148" width="120" height="12" fill="${c.bg}"/>
  <rect x="0" y="148" width="120" height="1" fill="${c.primary}" opacity="0.3"/>
  <rect x="8" y="152" width="30" height="2.5" fill="#9CA3AF" rx="1"/>
  <rect x="95" y="152" width="18" height="2.5" fill="#9CA3AF" rx="1"/>
</svg>`;

    const encoded = Buffer.from(svg).toString('base64');
    return `data:image/svg+xml;base64,${encoded}`;
  }

  /**
   * Run publishing preflight checks on a document
   * GET /api/pdf-studio/export/preflight/:id
   */
  @Get('preflight/:id')
  async runPreflight(@Param('id') documentId: string, @GetUser() user: any) {
    try {
      await this.assertDocumentAccess(documentId, user);
      await this.repairFeasibilityDocumentIfNeeded(documentId);
      const result = await this.preflightService.runPreflight(documentId);
      return { success: true, data: result };
    } catch (error) {
      throw new HttpException(
        error.message || 'Preflight check failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async repairFeasibilityDocumentIfNeeded(documentId: string) {
    try {
      const repaired = await this.feasibilityStudioService.repairPdfDocumentIfNeeded(documentId);
      if (repaired) {
        this.previewService.invalidateCache(documentId);
        this.logger.log(`Repaired structured Feasibility PDF pages for document ${documentId}`);
      }
    } catch (error: any) {
      this.logger.warn(
        `Feasibility PDF repair skipped for ${documentId}: ${error?.message || error}`,
      );
    }
  }
}
