import { Controller, Post, Get, Body, Param, Query } from '@nestjs/common';
import { PdfGenerationService } from './pdf-generation.service';

@Controller('pdf-generation')
export class PdfGenerationController {
  constructor(private readonly pdfGenerationService: PdfGenerationService) {}

  @Post('generate')
  async generatePdf(@Body() options: any) {
    return {
      fileUrl: await this.pdfGenerationService.generatePdf(options),
    };
  }

  @Get('export/:id')
  async getExportStatus(@Param('id') id: string) {
    return this.pdfGenerationService.getExportStatus(id);
  }

  @Get('exports')
  async getDocumentExports(@Query('documentId') documentId: string) {
    return this.pdfGenerationService.getDocumentExports(documentId);
  }
}
