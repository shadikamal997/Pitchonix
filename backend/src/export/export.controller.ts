import { 
  Controller, 
  Post, 
  Get, 
  Patch, 
  Delete, 
  Body, 
  Param, 
  UseGuards, 
  Res, 
  Req 
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ExportService } from './export.service';
import { ExportDto } from './dto/export.dto';
import { 
  CreateTemplateDto, 
  UpdateTemplateDto, 
  CreateBatchExportDto,
  ExportWithOptionsDto 
} from './dto/export-template.dto';
import { 
  ExportTemplateService,
  BatchExportService 
} from './services';

@ApiTags('Export')
@Controller('export')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ExportController {
  constructor(
    private readonly exportService: ExportService,
    private readonly templateService: ExportTemplateService,
    private readonly batchService: BatchExportService
  ) {}

  @Post('pptx')
  @ApiOperation({ summary: 'Export deck to PPTX' })
  async exportPptx(@Body() dto: ExportDto, @Res() res: Response) {
    // Create export record
    const exportRecord = await this.exportService.createExportRecord(dto.deckId, 'pptx');

    try {
      // Generate PPTX
      const buffer = await this.exportService.exportToPptx(dto.deckId);

      // Set headers
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
      res.setHeader('Content-Disposition', `attachment; filename="presentation-${dto.deckId}.pptx"`);
      res.setHeader('Content-Length', buffer.length);

      // Update export record
      await this.exportService.updateExportRecord(exportRecord.id, `exports/${dto.deckId}.pptx`);

      // Send file
      res.send(buffer);
    } catch (error) {
      res.status(500).json({
        message: 'Export failed',
        error: error.message,
      });
    }
  }

  @Post('pdf')
  @ApiOperation({ summary: 'Export deck to PDF' })
  async exportPdf(@Body() dto: ExportDto, @Res() res: Response) {
    const exportRecord = await this.exportService.createExportRecord(dto.deckId, 'pdf');

    try {
      const deck = await this.exportService['prisma'].deck.findUnique({
        where: { id: dto.deckId },
        include: { slides: { orderBy: { order: 'asc' } }, brandKit: true },
      });

      if (!deck) {
        res.status(404).json({ message: 'Deck not found' });
        return;
      }

      const fileUrl = await this.exportService.exportToPDF(deck, {});
      await this.exportService.updateExportRecord(exportRecord.id, fileUrl);

      res.json({ success: true, fileUrl, deckId: dto.deckId });
    } catch (error) {
      res.status(500).json({ message: 'PDF export failed', error: error.message });
    }
  }

  // ===== PHASE 10: Export Templates =====

  @Get('templates')
  @ApiOperation({ summary: 'Get all export templates' })
  async getTemplates(@Req() req: any) {
    const userId = req.user?.id;
    return this.templateService.findAll(userId);
  }

  @Get('templates/:id')
  @ApiOperation({ summary: 'Get export template by ID' })
  async getTemplate(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.id;
    return this.templateService.findById(id, userId);
  }

  @Post('templates')
  @ApiOperation({ summary: 'Create custom export template' })
  async createTemplate(@Body() dto: CreateTemplateDto, @Req() req: any) {
    const userId = req.user.id;
    return this.templateService.create(dto, userId);
  }

  @Patch('templates/:id')
  @ApiOperation({ summary: 'Update custom export template' })
  async updateTemplate(
    @Param('id') id: string,
    @Body() dto: UpdateTemplateDto,
    @Req() req: any
  ) {
    const userId = req.user.id;
    return this.templateService.update(id, dto, userId);
  }

  @Delete('templates/:id')
  @ApiOperation({ summary: 'Delete custom export template' })
  async deleteTemplate(@Param('id') id: string, @Req() req: any) {
    const userId = req.user.id;
    await this.templateService.delete(id, userId);
    return { message: 'Template deleted successfully' };
  }

  // ===== PHASE 10: Batch Export =====

  @Post('batch')
  @ApiOperation({ summary: 'Create batch export job' })
  async createBatchJob(@Body() dto: CreateBatchExportDto, @Req() req: any) {
    const userId = req.user.id;
    return this.batchService.createBatchJob({ ...dto, userId });
  }

  @Get('batch/:jobId')
  @ApiOperation({ summary: 'Get batch export job status' })
  async getBatchJobStatus(@Param('jobId') jobId: string, @Req() req: any) {
    const userId = req.user.id;
    return this.batchService.getJobStatus(jobId, userId);
  }

  @Delete('batch/:jobId')
  @ApiOperation({ summary: 'Cancel batch export job' })
  async cancelBatchJob(@Param('jobId') jobId: string, @Req() req: any) {
    const userId = req.user.id;
    await this.batchService.cancelJob(jobId, userId);
    return { message: 'Batch job cancelled successfully' };
  }

  @Post('batch/:jobId/retry')
  @ApiOperation({ summary: 'Retry failed batch export job' })
  async retryBatchJob(@Param('jobId') jobId: string, @Req() req: any) {
    const userId = req.user.id;
    return this.batchService.retryJob(jobId, userId);
  }

  @Get('batch/:jobId/download')
  @ApiOperation({ summary: 'Download batch export results' })
  async downloadBatchExport(@Param('jobId') jobId: string, @Req() req: any) {
    const userId = req.user.id;
    const status = await this.batchService.getJobStatus(jobId, userId);
    
    if (status.status !== 'completed') {
      return {
        message: 'Export not yet completed',
        status: status.status,
        progress: status.progress,
      };
    }

    return {
      files: status.outputUrls,
      totalFiles: status.outputUrls.length,
    };
  }

  // ===== PHASE 10: Enhanced Export =====

  @Post('decks/:deckId/export')
  @ApiOperation({ summary: 'Export deck with template and options' })
  async exportWithOptions(@Body() dto: ExportWithOptionsDto, @Req() req: any) {
    const userId = req.user.id;
    
    // Create export record
    const exportRecord = await this.exportService.createExportRecord(
      dto.deckId,
      dto.format
    );

    try {
      // Get deck with related data
      const deck = await this.exportService['prisma'].deck.findUnique({
        where: { id: dto.deckId },
        include: {
          slides: { orderBy: { order: 'asc' } },
          brandKit: true,
        },
      });

      if (!deck) {
        throw new Error('Deck not found');
      }

      // Get template if specified
      let template = null;
      if (dto.templateId) {
        template = await this.templateService.findById(dto.templateId, userId);
      }

      let fileUrl: string;

      // Export based on format
      if (dto.format === 'pptx') {
        fileUrl = await this.exportService.exportToPPTX(deck);
      } else if (dto.format === 'pdf') {
        fileUrl = await this.exportService.exportToPDF(deck, {
          template,
          ...dto.options,
        });
      } else {
        throw new Error(`Unsupported format: ${dto.format}`);
      }

      // Update export record
      await this.exportService.updateExportRecord(exportRecord.id, fileUrl);

      return {
        success: true,
        fileUrl,
        format: dto.format,
        deckId: dto.deckId,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
