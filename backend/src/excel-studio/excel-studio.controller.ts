import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser } from '../auth/get-user.decorator';
import { Public } from '../auth/public.decorator';
import { ExcelStudioService } from './excel-studio.service';

@ApiTags('Excel Studio')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('excel-studio')
export class ExcelStudioController {
  constructor(private readonly studio: ExcelStudioService) {}

  @Get('templates')
  templates() {
    return this.studio.listTemplates();
  }

  @Get('projects')
  projects(@GetUser() user: any) {
    return this.studio.listProjects(user.id);
  }

  @Post('projects/upload')
  @ApiOperation({ summary: 'Upload and analyze an Excel workbook or CSV' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024 } }))
  upload(@GetUser() user: any, @UploadedFile() file: any) {
    return this.studio.createFromUpload(user.id, file);
  }

  @Post('smart-builder/analyze')
  @Public()
  analyzeScript(@Body() body: any) {
    return {
      success: true,
      data: this.studio.analyzeScript(body?.script || body?.rawContent || ''),
    };
  }

  @Post('smart-builder/generate')
  generateFromScript(@GetUser() user: any, @Body() body: any) {
    return this.studio.createFromScript(user.id, body || {});
  }

  @Get('projects/:id')
  get(@GetUser() user: any, @Param('id') id: string) {
    return this.studio.getProject(user.id, id);
  }

  @Patch('projects/:id')
  update(@GetUser() user: any, @Param('id') id: string, @Body() body: any) {
    return this.studio.updateProject(user.id, id, body || {});
  }

  @Post('projects/:id/duplicate')
  duplicate(@GetUser() user: any, @Param('id') id: string) {
    return this.studio.duplicateProject(user.id, id);
  }

  @Post('projects/:id/archive')
  archive(@GetUser() user: any, @Param('id') id: string) {
    return this.studio.archiveProject(user.id, id);
  }

  @Post('projects/:id/analyze')
  analyze(@GetUser() user: any, @Param('id') id: string) {
    return this.studio.reAnalyzeProject(user.id, id);
  }

  @Post('projects/:id/enhance')
  enhance(@GetUser() user: any, @Param('id') id: string, @Body() body: any) {
    return this.studio.enhanceProject(user.id, id, body?.templateId);
  }

  @Post('projects/:id/actions')
  action(@GetUser() user: any, @Param('id') id: string, @Body() body: any) {
    return this.studio.applyAction(user.id, id, body?.action);
  }

  @Get('projects/:id/operations')
  operations(@GetUser() user: any, @Param('id') id: string) {
    return this.studio.listWorkbookOperations(user.id, id);
  }

  @Post('projects/:id/operations')
  createOperation(@GetUser() user: any, @Param('id') id: string, @Body() body: any) {
    return this.studio.createWorkbookOperation(user.id, id, body || {});
  }

  @Post('projects/:id/undo')
  undo(@GetUser() user: any, @Param('id') id: string) {
    return this.studio.undoLastWorkbookOperation(user.id, id);
  }

  @Post('projects/:id/redo')
  redo(@GetUser() user: any, @Param('id') id: string) {
    return this.studio.redoLastWorkbookOperation(user.id, id);
  }

  @Get('projects/:id/snapshots')
  snapshots(@GetUser() user: any, @Param('id') id: string) {
    return this.studio.listWorkbookSnapshots(user.id, id);
  }

  @Post('projects/:id/snapshots')
  createSnapshot(@GetUser() user: any, @Param('id') id: string, @Body() body: any) {
    return this.studio.createWorkbookSnapshot(user.id, id, body?.label);
  }

  @Post('projects/:id/snapshots/:snapshotId/restore')
  restoreSnapshot(
    @GetUser() user: any,
    @Param('id') id: string,
    @Param('snapshotId') snapshotId: string,
  ) {
    return this.studio.restoreWorkbookSnapshot(user.id, id, snapshotId);
  }

  @Get('projects/:id/snapshots/compare')
  compareSnapshots(
    @GetUser() user: any,
    @Param('id') id: string,
    @Query('before') before: string,
    @Query('after') after: string,
  ) {
    return this.studio.compareWorkbookSnapshots(user.id, id, before, after);
  }

  @Get('reports')
  reports(@GetUser() user: any) {
    return this.studio.getReports(user.id);
  }

  @Get('projects/:id/export')
  async export(
    @GetUser() user: any,
    @Param('id') id: string,
    @Query('format') format: string,
    @Res() res: Response,
  ) {
    const payload = await this.studio.exportProject(user.id, id, format || 'json');
    if (!payload?.body) throw new BadRequestException('Export failed');
    res.setHeader('Content-Type', payload.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${payload.filename}"`);
    if (Buffer.isBuffer(payload.body)) {
      res.setHeader('Content-Length', payload.body.length);
    }
    res.send(payload.body);
  }
}
