import {
  Controller, Get, Post, Param, Query, Req, Res, UseGuards, Logger,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequireRole } from '../workspaces/role.guard';
import { SlideExportService, ExportFormat } from './slide-export.service';
import { ExportCompatReportService } from './export-compat-report.service';

const FORMATS: ExportFormat[] = ['pptx', 'pdf', 'png', 'jpeg'];

@ApiTags('Slide Export (element-aware)')
@Controller('slide-export')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SlideExportController {
  private readonly logger = new Logger(SlideExportController.name);

  constructor(
    private readonly exportService:  SlideExportService,
    private readonly compatReport:   ExportCompatReportService,
  ) {}

  // ---------- Phase 38.2I — Export compatibility report (pre-export) ----------
  @Get(':deckId/compatibility')
  @ApiOperation({ summary: 'Compute the export compatibility report for this deck (Phase 38.2I)' })
  @RequireRole('exports.generate', { kind: 'workspaceFromDeck', param: 'deckId' })
  async compatibility(@Param('deckId') deckId: string, @Req() req: any) {
    await this.exportService.assertDeckOwnership(deckId, req.user.id);
    return this.compatReport.run(deckId);
  }

  // Inspect (no file) — useful for previewing the manifest before downloading.
  @Get(':deckId/manifest')
  @ApiOperation({ summary: 'Get an element export manifest preview (no file)' })
  @RequireRole('exports.generate', { kind: 'workspaceFromDeck', param: 'deckId' })
  async manifest(
    @Param('deckId') deckId: string,
    @Query('format') format: string,
    @Req() req: any,
  ) {
    const fmt = validateFormat(format);
    await this.exportService.assertDeckOwnership(deckId, req.user.id);
    // Note: full export still happens to compute the manifest. For now we
    // accept that cost (≪200ms for most decks) — refactor later if needed.
    const result = await this.exportService.export(deckId, fmt);
    return result.manifest;
  }

  // Download — streams the file back with proper headers.
  @Post(':deckId/:format')
  @ApiOperation({ summary: 'Export deck (PPTX / PDF / PNG / JPEG)' })
  @RequireRole('exports.generate', { kind: 'workspaceFromDeck', param: 'deckId' })
  async download(
    @Param('deckId') deckId: string,
    @Param('format') format: string,
    @Query('withComments') withComments: string | undefined,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const fmt = validateFormat(format);
    await this.exportService.assertDeckOwnership(deckId, req.user.id);

    try {
      // Phase 36.1J — comments appendix opt-in (PDF only for now).
      const includeComments = withComments === '1' || withComments === 'true';
      const result = await this.exportService.export(deckId, fmt, { includeComments });
      res.setHeader('Content-Type', result.mime);
      res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
      res.setHeader('Content-Length', String(result.buffer.length));
      res.setHeader('X-Export-Manifest', encodeURIComponent(JSON.stringify(result.manifest).slice(0, 4000)));
      res.send(result.buffer);
    } catch (err) {
      this.logger.error(`Export failed for deck ${deckId} (${fmt}): ${(err as Error).message}`, (err as Error).stack);
      res.status(500).json({ message: 'Export failed', error: (err as Error).message });
    }
  }
}

function validateFormat(s: string): ExportFormat {
  if (!FORMATS.includes(s as any)) {
    throw new BadRequestException(`Unsupported format "${s}". Supported: ${FORMATS.join(', ')}`);
  }
  return s as ExportFormat;
}
