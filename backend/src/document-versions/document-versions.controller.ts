import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DocumentVersionsService } from './document-versions.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser } from '../auth/get-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Document Versions')
@Controller('pdf-documents/:documentId/versions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DocumentVersionsController {
  constructor(
    private readonly versionsService: DocumentVersionsService,
    private readonly prisma: PrismaService,
  ) {}

  // Ownership guard: list/create/restore all expose or mutate a document's
  // version history, so verify the caller owns the document via its project.
  private async assertDocumentAccess(documentId: string, user: any) {
    const document = await this.prisma.pdfDocument.findUnique({
      where: { id: documentId },
      include: { project: true },
    });
    if (!document) throw new HttpException('Document not found', HttpStatus.NOT_FOUND);
    if (document.project?.userId && document.project.userId !== user?.id) {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }
    return document;
  }

  @Get()
  @ApiOperation({ summary: 'List all versions of a document' })
  async listVersions(@Param('documentId') documentId: string, @GetUser() user: any) {
    await this.assertDocumentAccess(documentId, user);
    return this.versionsService.listVersions(documentId);
  }

  @Post()
  @ApiOperation({ summary: 'Save a new version snapshot' })
  async createSnapshot(
    @Param('documentId') documentId: string,
    @Body() body: { title: string; pagesSnapshot: any },
    @GetUser() user: any,
  ) {
    await this.assertDocumentAccess(documentId, user);
    return this.versionsService.createSnapshot(documentId, body.title, body.pagesSnapshot);
  }

  @Post(':versionId/restore')
  @ApiOperation({ summary: 'Restore a version' })
  async restore(
    @Param('documentId') documentId: string,
    @Param('versionId') versionId: string,
    @GetUser() user: any,
  ) {
    await this.assertDocumentAccess(documentId, user);
    return this.versionsService.restoreVersion(documentId, versionId);
  }
}
