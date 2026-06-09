import {
  Controller,
  Post,
  Get,
  Param,
  Query,
  Body,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  BadRequestException,
  ForbiddenException,
  UseGuards,
  Res,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser } from '../auth/get-user.decorator';
import {
  UniversalConversionService,
  OutputFormat,
  OUTPUT_FORMATS,
} from './universal-conversion.service';
import { ConversionLineageService } from './conversion-lineage.service';
import { ConvertLedgerService } from '../content-ledger/convert-ledger.service';

// =============================================================================
//  Phase 41T — Universal conversion API.
//
//    POST /convert           multipart "file" + query.targetFormat
//    POST /convert/preview   multipart "file" + query.targetFormat → returns
//                            JSON report + UDM only (no binary)
//    POST /convert/batch     multipart "files[]" + query.targetFormat
//    GET  /convert/status/:jobId
//    GET  /convert/result/:jobId      (always JSON; for files use /convert)
//    GET  /convert/formats            list supported input / output formats
// =============================================================================

const MAX_FILE_BYTES = 100 * 1024 * 1024; // 100 MB

@ApiTags('Universal Conversion')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('convert')
export class UniversalConversionController {
  constructor(
    private readonly svc: UniversalConversionService,
    private readonly lineage: ConversionLineageService,
    private readonly convertLedger: ConvertLedgerService,
  ) {}

  // ---------- Phase 41.1I — Lineage + history ----------

  // Ownership guard for stored conversion records. Scopes lineage/restore to
  // the record's owner so one tenant can't read or re-convert another's files.
  private async assertOwnsConversion(id: string, user: any) {
    const entry = await this.lineage.findOne(id);
    if ((entry as any).userId && (entry as any).userId !== user?.id) {
      throw new ForbiddenException('You do not have access to this conversion');
    }
    return entry;
  }

  @Get('history')
  @ApiOperation({ summary: 'List recent ConvertedFile records for the caller' })
  history(@GetUser() user: any) {
    // Always scope to the caller — never trust a client-supplied workspaceId.
    return this.lineage.list({ userId: user?.id });
  }

  @Get('lineage/:id')
  @ApiOperation({ summary: 'Walk the conversion lineage chain (root → … → file)' })
  async chain(@Param('id') id: string, @GetUser() user: any) {
    await this.assertOwnsConversion(id, user);
    return this.lineage.chain(id);
  }

  @Post('restore/:id')
  @ApiOperation({
    summary: 'Restore + re-convert a stored conversion to another format (Phase 41.1K)',
  })
  async restore(
    @Param('id') id: string,
    @Query('targetFormat') target: string,
    @GetUser() user: any,
  ) {
    if (!OUTPUT_FORMATS.includes(target as OutputFormat))
      throw new BadRequestException(`Unsupported target "${target}"`);
    await this.assertOwnsConversion(id, user);
    return this.lineage.restore(id, target as OutputFormat, user?.id);
  }

  @Get('storage/diagnostics')
  @ApiOperation({ summary: 'Probe the active conversion-storage provider (Phase 41.2D)' })
  async storageDiagnostics() {
    const storage = this.lineage.getStorage();
    const health = storage.healthcheck
      ? await storage.healthcheck()
      : { ok: true, provider: storage.name };
    return {
      provider: storage.name,
      health,
      env: {
        CONVERSION_STORAGE: process.env.CONVERSION_STORAGE || 'local',
      },
    };
  }

  @Get('formats')
  @ApiOperation({ summary: 'List supported input/output formats (Phase 41T)' })
  formats() {
    return {
      input: [
        'pptx',
        'potx',
        'pdf',
        'docx',
        'doc',
        'odt',
        'rtf',
        'txt',
        'md',
        'markdown',
        'html',
        'htm',
        'csv',
        'xlsx',
        'xls',
        'ods',
      ],
      output: OUTPUT_FORMATS,
    };
  }

  @Post()
  @ApiOperation({ summary: 'Convert one file to the requested format' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async convert(
    @UploadedFile() file: any,
    @GetUser() user: any,
    @Query('targetFormat') targetFormat: string,
    @Query('brandKitId') brandKitId: string | undefined,
    @Res() res: Response,
  ) {
    if (!file?.buffer) throw new BadRequestException('Missing file (multipart field "file")');
    if (!targetFormat) throw new BadRequestException('Missing targetFormat query param');
    if (file.size > MAX_FILE_BYTES) throw new BadRequestException('File exceeds the 100 MB limit');
    const target = targetFormat as OutputFormat;
    if (!OUTPUT_FORMATS.includes(target))
      throw new BadRequestException(`Unsupported target "${targetFormat}"`);

    const result = await this.svc.convert({
      buffer: file.buffer,
      filename: file.originalname,
      mimetype: file.mimetype,
      targetFormat: target,
      brandKitId: brandKitId || null,
    });

    // Record the conversion (owned by the caller) so History/Lineage/Restore
    // work. Best-effort — never fail the download over a history write.
    try {
      const entry = await this.lineage.record({
        result,
        sourceFilename: file.originalname || 'output',
        sourceBuffer: file.buffer,
        userId: user?.id ?? null,
        brandKitId: brandKitId || null,
      });
      // Phase Ω.CONTENT.2E — content ledger: re-parse the converted output bytes
      // and prove every source node survived the conversion. Never fail over it.
      try {
        await this.convertLedger.record(
          entry.id,
          result.sourceDocument,
          result.buffer,
          result.extension,
        );
      } catch (ledgerErr: any) {
        console.warn('[convert] content ledger skipped:', ledgerErr?.message || ledgerErr);
      }
    } catch {
      /* history is non-critical */
    }

    const safeName = (file.originalname || 'output').replace(/\.[^.]+$/, '');
    res.setHeader('Content-Type', result.mimetype);
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}.${result.extension}"`);
    res.setHeader('X-Pitchonix-Conversion-Overall', String(result.report.overall));
    res.setHeader('X-Pitchonix-Conversion-Duration-Ms', String(result.durationMs));
    res.setHeader('X-Pitchonix-Conversion-Format', result.format);
    res.send(result.buffer);
  }

  @Post('preview')
  @ApiOperation({
    summary: 'Preview the conversion: returns the quality report + UDM without the binary',
  })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async preview(
    @UploadedFile() file: any,
    @Query('targetFormat') targetFormat: string,
    @Query('brandKitId') brandKitId: string | undefined,
  ) {
    if (!file?.buffer) throw new BadRequestException('Missing file');
    if (!targetFormat) throw new BadRequestException('Missing targetFormat query param');
    if (file.size > MAX_FILE_BYTES) throw new BadRequestException('File exceeds the 100 MB limit');
    const target = targetFormat as OutputFormat;
    const result = await this.svc.convert({
      buffer: file.buffer,
      filename: file.originalname,
      mimetype: file.mimetype,
      targetFormat: target,
      brandKitId: brandKitId || null,
    });
    // Strip the binary from the response — caller wants just the structure.
    return {
      format: result.format,
      mimetype: result.mimetype,
      extension: result.extension,
      durationMs: result.durationMs,
      report: result.report,
      pages: result.document.pages.map((p) => ({
        title: p.title,
        nodes: p.nodes.length,
        notes: !!p.notes,
      })),
    };
  }

  @Post('batch')
  @ApiOperation({ summary: 'Convert N files in the background; returns a job id' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('files', 50))
  startBatch(
    @UploadedFiles() files: any[],
    @Query('targetFormat') targetFormat: string,
    @Query('brandKitId') brandKitId: string | undefined,
  ) {
    if (!files?.length) throw new BadRequestException('Missing files (multipart "files")');
    if (!targetFormat) throw new BadRequestException('Missing targetFormat');
    const oversized = files.filter((f) => f.size > MAX_FILE_BYTES).map((f) => f.originalname);
    if (oversized.length)
      throw new BadRequestException(`Files exceed 100 MB limit: ${oversized.join(', ')}`);
    const job = this.svc.startBatch(
      files.map((f) => ({
        buffer: f.buffer,
        filename: f.originalname,
        mimetype: f.mimetype,
        targetFormat: targetFormat as OutputFormat,
        brandKitId: brandKitId || null,
      })),
    );
    return { jobId: job.id, total: job.total, status: job.status };
  }

  @Get('status/:jobId')
  status(@Param('jobId') jobId: string) {
    const job = this.svc.getBatch(jobId);
    if (!job) throw new BadRequestException('Unknown jobId');
    return {
      id: job.id,
      total: job.total,
      done: job.done,
      status: job.status,
      error: job.error,
      results: job.results, // ← was missing; frontend needs this to display per-file status
    };
  }

  @Get('result/:jobId')
  result(@Param('jobId') jobId: string) {
    const job = this.svc.getBatch(jobId);
    if (!job) throw new BadRequestException('Unknown jobId');
    if (job.status !== 'complete') {
      return { id: job.id, status: job.status, done: job.done, total: job.total };
    }
    return job;
  }
}
