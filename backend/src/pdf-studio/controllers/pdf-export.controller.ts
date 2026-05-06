import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Res,
  HttpException,
  HttpStatus,
  Logger,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { GetUser } from '../../auth/get-user.decorator';
import { PdfExportService } from '../services/pdf-export.service';
import { DocxExportService } from '../services/docx-export.service';
import { PptxExportService } from '../services/pptx-export.service';
import { TemplateType } from '../templates/template-types';

@Controller('pdf-studio/export')
@UseGuards(JwtAuthGuard)
export class PdfExportController {
  private readonly logger = new Logger(PdfExportController.name);

  constructor(
    private pdfExportService: PdfExportService,
    private docxExportService: DocxExportService,
    private pptxExportService: PptxExportService,
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
          const pdfResult = await this.pdfExportService.exportDocument(documentId, template);
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
   * Get document templates
   * GET /api/pdf-studio/export/templates
   */
  @Get('templates')
  async getTemplates() {
    return {
      success: true,
      data: {
        templates: [
          {
            type: TemplateType.MODERN_ONE_PAGER,
            name: 'Modern One Pager',
            description: 'Clean, modern single-page document',
            category: 'business_core',
          },
          {
            type: TemplateType.CLEAN_BUSINESS_REPORT,
            name: 'Clean Business Report',
            description: 'Minimalist business report',
            category: 'business_core',
          },
          {
            type: TemplateType.EXECUTIVE_ONE_PAGER,
            name: 'Executive One Pager',
            description: 'Professional executive summary',
            category: 'business_core',
          },
          {
            type: TemplateType.FINANCIAL_REPORT,
            name: 'Financial Report',
            description: 'Data-driven financial report',
            category: 'analytics',
          },
          {
            type: TemplateType.CLIENT_PROPOSAL_PRO,
            name: 'Client Proposal Pro',
            description: 'Professional client proposal',
            category: 'sales_client',
          },
        ],
      },
    };
  }
}
