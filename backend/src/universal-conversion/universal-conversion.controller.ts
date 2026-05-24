import {
  Controller, Post, Get, Param, Query, Body, UseInterceptors, UploadedFile, UploadedFiles,
  BadRequestException, UseGuards, Res,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UniversalConversionService, OutputFormat, OUTPUT_FORMATS } from './universal-conversion.service';
import { ConversionLineageService } from './conversion-lineage.service';

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

@ApiTags('Universal Conversion')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('convert')
export class UniversalConversionController {
  constructor(
    private readonly svc:     UniversalConversionService,
    private readonly lineage: ConversionLineageService,
  ) {}

  // ---------- Phase 41.1I — Lineage + history ----------

  @Get('history')
  @ApiOperation({ summary: 'List recent ConvertedFile records for the caller' })
  history(@Query('workspaceId') workspaceId?: string) {
    return this.lineage.list({ workspaceId: workspaceId || null });
  }

  @Get('lineage/:id')
  @ApiOperation({ summary: 'Walk the conversion lineage chain (root → … → file)' })
  chain(@Param('id') id: string) {
    return this.lineage.chain(id);
  }

  @Post('restore/:id')
  @ApiOperation({ summary: 'Restore + re-convert a stored conversion to another format (Phase 41.1K)' })
  restore(@Param('id') id: string, @Query('targetFormat') target: string) {
    if (!OUTPUT_FORMATS.includes(target as OutputFormat)) throw new BadRequestException(`Unsupported target "${target}"`);
    return this.lineage.restore(id, target as OutputFormat);
  }

  @Get('storage/diagnostics')
  @ApiOperation({ summary: 'Probe the active conversion-storage provider (Phase 41.2D)' })
  async storageDiagnostics() {
    const storage = this.lineage.getStorage();
    const health  = storage.healthcheck ? await storage.healthcheck() : { ok: true, provider: storage.name };
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
        'pptx', 'potx', 'pdf', 'docx', 'doc', 'odt',
        'rtf', 'txt', 'md', 'markdown',
        'html', 'htm', 'csv', 'xlsx', 'xls', 'ods',
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
    @Query('targetFormat') targetFormat: string,
    @Query('brandKitId')   brandKitId: string | undefined,
    @Res() res: Response,
  ) {
    if (!file?.buffer)    throw new BadRequestException('Missing file (multipart field "file")');
    if (!targetFormat)    throw new BadRequestException('Missing targetFormat query param');
    const target = targetFormat as OutputFormat;
    if (!OUTPUT_FORMATS.includes(target)) throw new BadRequestException(`Unsupported target "${targetFormat}"`);

    const result = await this.svc.convert({
      buffer:       file.buffer,
      filename:     file.originalname,
      mimetype:     file.mimetype,
      targetFormat: target,
      brandKitId:   brandKitId || null,
    });

    const safeName = (file.originalname || 'output').replace(/\.[^.]+$/, '');
    res.setHeader('Content-Type', result.mimetype);
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}.${result.extension}"`);
    res.setHeader('X-Pitchonix-Conversion-Overall', String(result.report.overall));
    res.setHeader('X-Pitchonix-Conversion-Duration-Ms', String(result.durationMs));
    res.setHeader('X-Pitchonix-Conversion-Format', result.format);
    res.send(result.buffer);
  }

  @Post('preview')
  @ApiOperation({ summary: 'Preview the conversion: returns the quality report + UDM without the binary' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async preview(
    @UploadedFile() file: any,
    @Query('targetFormat') targetFormat: string,
    @Query('brandKitId')   brandKitId: string | undefined,
  ) {
    if (!file?.buffer)    throw new BadRequestException('Missing file');
    if (!targetFormat)    throw new BadRequestException('Missing targetFormat query param');
    const target = targetFormat as OutputFormat;
    const result = await this.svc.convert({
      buffer:       file.buffer,
      filename:     file.originalname,
      mimetype:     file.mimetype,
      targetFormat: target,
      brandKitId:   brandKitId || null,
    });
    // Strip the binary from the response — caller wants just the structure.
    return {
      format:     result.format,
      mimetype:   result.mimetype,
      extension:  result.extension,
      durationMs: result.durationMs,
      report:     result.report,
      pages:      result.document.pages.map((p) => ({
        title: p.title, nodes: p.nodes.length, notes: !!p.notes,
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
    @Query('brandKitId')   brandKitId: string | undefined,
  ) {
    if (!files?.length) throw new BadRequestException('Missing files (multipart "files")');
    if (!targetFormat)  throw new BadRequestException('Missing targetFormat');
    const job = this.svc.startBatch(files.map((f) => ({
      buffer:       f.buffer,
      filename:     f.originalname,
      mimetype:     f.mimetype,
      targetFormat: targetFormat as OutputFormat,
      brandKitId:   brandKitId || null,
    })));
    return { jobId: job.id, total: job.total, status: job.status };
  }

  @Get('status/:jobId')
  status(@Param('jobId') jobId: string) {
    const job = this.svc.getBatch(jobId);
    if (!job) throw new BadRequestException('Unknown jobId');
    return { id: job.id, total: job.total, done: job.done, status: job.status, error: job.error };
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
