import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DocumentVersionsService } from './document-versions.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Document Versions')
@Controller('pdf-documents/:documentId/versions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DocumentVersionsController {
  constructor(private readonly versionsService: DocumentVersionsService) {}

  @Get()
  @ApiOperation({ summary: 'List all versions of a document' })
  listVersions(@Param('documentId') documentId: string) {
    return this.versionsService.listVersions(documentId);
  }

  @Post()
  @ApiOperation({ summary: 'Save a new version snapshot' })
  createSnapshot(
    @Param('documentId') documentId: string,
    @Body() body: { title: string; pagesSnapshot: any },
  ) {
    return this.versionsService.createSnapshot(documentId, body.title, body.pagesSnapshot);
  }

  @Post(':versionId/restore')
  @ApiOperation({ summary: 'Restore a version' })
  restore(@Param('documentId') documentId: string, @Param('versionId') versionId: string) {
    return this.versionsService.restoreVersion(documentId, versionId);
  }
}
