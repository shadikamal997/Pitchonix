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
import { PdfExportService } from '../services/pdf-export.service';
import { DocxExportService } from '../services/docx-export.service';
import { PptxExportService } from '../services/pptx-export.service';
import { PreviewService } from '../services/preview.service';
import { TemplateType } from '../templates/template-types';
import { TEMPLATE_CONFIGS } from '../templates/template-configs';

@Controller('pdf-studio/export')
@UseGuards(JwtAuthGuard)
export class PdfExportController {
  private readonly logger = new Logger(PdfExportController.name);

  constructor(
    private pdfExportService: PdfExportService,
    private docxExportService: DocxExportService,
    private pptxExportService: PptxExportService,
    private previewService: PreviewService,
  ) {}

  /**
   * Export document in multiple formats
   * POST /api/pdf-studio/export/:id
   */
  @Post(':id')
  async exportDocument(
    @Param('id') documentId: string,
    @Body('format') format: string,
    @Body('templateType') templateType?: string,
    @Body('colorScheme') colorScheme?: string,
    @Body('proTemplateId') proTemplateId?: string | null,
    @Res() res?: Response,
  ) {
    try {
      this.logger.log(`Export request for document ${documentId} in format ${format}`);

      let buffer: Buffer;
      let filename: string;
      let contentType: string;

      switch (format?.toLowerCase()) {
        case 'pdf':
          const template = (templateType as TemplateType) || TemplateType.CLEAN_BUSINESS_REPORT;
          const pdfResult = await this.pdfExportService.exportDocument(documentId, template, colorScheme, proTemplateId);
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

        default:
          throw new HttpException(
            `Unsupported export format: ${format}. Supported formats: pdf, docx, pptx`,
            HttpStatus.BAD_REQUEST,
          );
      }

      // Set response headers
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', buffer.length);

      // Send file
      res.send(buffer);

      this.logger.log(`Export successful: ${filename} (${format})`);
    } catch (error) {
      this.logger.error(`Export failed: ${error.message}`, error.stack);
      throw new HttpException(
        error.message || 'Export failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get live preview HTML for document
   * GET /api/pdf-studio/export/preview/:id
   */
  @Public()
  @Get('preview/:id')
  async getPreview(
    @Param('id') documentId: string,
    @Query('colorScheme') colorScheme: string,
    @Query('templateType') templateType: string,
    @Query('proTemplateId') proTemplateId: string,
    @Res() res: Response,
  ) {
    try {
      this.logger.log(`Preview request for document ${documentId}`);

      const html = await this.previewService.generatePreview(documentId, true, colorScheme, templateType, proTemplateId);

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
   */
  @Public()
  @Post('preview/:id/invalidate')
  async invalidatePreviewCache(
    @Param('id') documentId: string,
  ) {
    try {
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
    const templates = Object.values(TEMPLATE_CONFIGS).map((config) => ({
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
    const colors: Record<string, { primary: string; secondary: string; accent: string; bg: string }> = {
      blue:    { primary: '#2563EB', secondary: '#1D4ED8', accent: '#60A5FA', bg: '#EFF6FF' },
      navy:    { primary: '#1E40AF', secondary: '#1E3A8A', accent: '#3B82F6', bg: '#EFF6FF' },
      gray:    { primary: '#4B5563', secondary: '#374151', accent: '#9CA3AF', bg: '#F9FAFB' },
      purple:  { primary: '#7C3AED', secondary: '#6D28D9', accent: '#A78BFA', bg: '#F5F3FF' },
      green:   { primary: '#059669', secondary: '#047857', accent: '#34D399', bg: '#ECFDF5' },
      red:     { primary: '#DC2626', secondary: '#B91C1C', accent: '#F87171', bg: '#FEF2F2' },
      teal:    { primary: '#0D9488', secondary: '#0F766E', accent: '#2DD4BF', bg: '#F0FDFA' },
      indigo:  { primary: '#4F46E5', secondary: '#4338CA', accent: '#818CF8', bg: '#EEF2FF' },
      emerald: { primary: '#10B981', secondary: '#059669', accent: '#6EE7B7', bg: '#ECFDF5' },
      amber:   { primary: '#D97706', secondary: '#B45309', accent: '#FBBF24', bg: '#FFFBEB' },
      orange:  { primary: '#EA580C', secondary: '#C2410C', accent: '#FB923C', bg: '#FFF7ED' },
      rose:    { primary: '#F43F5E', secondary: '#E11D48', accent: '#FB7185', bg: '#FFF1F2' },
      slate:   { primary: '#475569', secondary: '#334155', accent: '#94A3B8', bg: '#F8FAFC' },
      dark:    { primary: '#1F2937', secondary: '#111827', accent: '#6B7280', bg: '#F3F4F6' },
    };

    const c = colors[config.style.colorScheme] || colors.blue;
    const headerH = config.style.headerStyle === 'gradient' ? 28 : 20;
    const radius = config.style.cardStyle === 'rounded' ? 4 : config.style.cardStyle === 'soft' ? 2 : 0;
    const headerBg = config.style.headerStyle === 'minimal'
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
}
