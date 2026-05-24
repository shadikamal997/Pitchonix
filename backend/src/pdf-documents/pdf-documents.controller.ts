import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PdfDocumentsService } from './pdf-documents.service';
import { PdfDocumentGenerationService } from './pdf-document-generation.service';
import { PdfGenerationService } from '../pdf-generation/pdf-generation.service';
import * as fs from 'fs/promises';
import * as path from 'path';

@UseGuards(JwtAuthGuard)
@Controller('pdf-documents')
export class PdfDocumentsController {
  constructor(
    private readonly pdfDocumentsService: PdfDocumentsService,
    private readonly pdfDocumentGenerationService: PdfDocumentGenerationService,
    private readonly pdfGenerationService: PdfGenerationService,
  ) {}

  @Post()
  async create(@Body() createDto: any) {
    return this.pdfDocumentsService.create(createDto);
  }

  @Post('generate')
  async generate(@Body() dto: { projectId: string; documentType: string; input: any }) {
    // Generate complete PDF document with pages
    const pdfDocument = await this.pdfDocumentGenerationService.generatePdfDocument({
      projectId: dto.projectId,
      documentType: dto.documentType,
      input: dto.input,
    });

    return {
      success: true,
      pdfDocumentId: pdfDocument.id,
      pageCount: pdfDocument.pages?.length || 0,
      document: pdfDocument,
    };
  }

  @Get()
  async findAll(@Query('projectId') projectId?: string) {
    return this.pdfDocumentsService.findAll(projectId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.pdfDocumentsService.findOne(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateDto: any) {
    return this.pdfDocumentsService.update(id, updateDto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.pdfDocumentsService.delete(id);
  }

  @Get(':id/quality-history')
  async getQualityHistory(@Param('id') id: string) {
    return this.pdfDocumentsService.getQualityHistory(id);
  }

  @Post(':id/quality-check')
  async recordQualityCheck(@Param('id') id: string, @Body() qualityData: any) {
    return this.pdfDocumentsService.recordQualityCheck(id, qualityData);
  }

  @Post(':id/export')
  async exportToPdf(@Param('id') id: string, @Res() res: Response) {
    try {
      // Generate PDF using the PDF generation service
      const fileUrl = await this.pdfGenerationService.generatePdf({
        documentId: id,
        format: 'A4',
        printBackground: true,
      });

      // Read the file
      const filePath = path.join(process.cwd(), fileUrl);
      const fileBuffer = await fs.readFile(filePath);

      // Get document info for filename
      const document = await this.pdfDocumentsService.findOne(id);
      const filename = `${document.title || 'document'}.pdf`;

      // Set headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', fileBuffer.length);

      // Send file
      res.send(fileBuffer);
    } catch (error) {
      res.status(500).json({
        statusCode: 500,
        message: 'Failed to export PDF',
        error: error.message,
      });
    }
  }
}
