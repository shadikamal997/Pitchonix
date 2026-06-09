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
  NotFoundException,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PdfDocumentsService } from './pdf-documents.service';
import { PdfDocumentGenerationService } from './pdf-document-generation.service';
import { PdfGenerationService } from '../pdf-generation/pdf-generation.service';
import { PrismaService } from '../prisma/prisma.service';
import { GetUser } from '../auth/get-user.decorator';
import * as fs from 'fs/promises';
import * as path from 'path';

@UseGuards(JwtAuthGuard)
@Controller('pdf-documents')
export class PdfDocumentsController {
  constructor(
    private readonly pdfDocumentsService: PdfDocumentsService,
    private readonly pdfDocumentGenerationService: PdfDocumentGenerationService,
    private readonly pdfGenerationService: PdfGenerationService,
    private readonly prisma: PrismaService,
  ) {}

  private async assertProjectAccess(projectId: string, user: any) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new HttpException('Project not found', HttpStatus.NOT_FOUND);
    if (project.userId && project.userId !== user?.id) {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }
    return project;
  }

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

  @Post()
  async create(@Body() createDto: any, @GetUser() user: any) {
    await this.assertProjectAccess(createDto.projectId, user);
    return this.pdfDocumentsService.create(createDto);
  }

  @Post('generate')
  async generate(
    @Body() dto: { projectId: string; documentType: string; input: any },
    @GetUser() user: any,
  ) {
    await this.assertProjectAccess(dto.projectId, user);
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
  async findAll(@GetUser() user: any, @Query('projectId') projectId?: string) {
    if (projectId) {
      await this.assertProjectAccess(projectId, user);
      return this.pdfDocumentsService.findAll(projectId);
    }
    return this.prisma.pdfDocument.findMany({
      where: { project: { userId: user?.id } },
      include: {
        project: true,
        brandKit: true,
        _count: { select: { pages: true, exports: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @GetUser() user: any) {
    await this.assertDocumentAccess(id, user);
    return this.pdfDocumentsService.findOne(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateDto: any, @GetUser() user: any) {
    await this.assertDocumentAccess(id, user);
    return this.pdfDocumentsService.update(id, updateDto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @GetUser() user: any) {
    await this.assertDocumentAccess(id, user);
    return this.pdfDocumentsService.delete(id);
  }

  @Get(':id/quality-history')
  async getQualityHistory(@Param('id') id: string, @GetUser() user: any) {
    await this.assertDocumentAccess(id, user);
    return this.pdfDocumentsService.getQualityHistory(id);
  }

  @Post(':id/quality-check')
  async recordQualityCheck(
    @Param('id') id: string,
    @Body() qualityData: any,
    @GetUser() user: any,
  ) {
    await this.assertDocumentAccess(id, user);
    return this.pdfDocumentsService.recordQualityCheck(id, qualityData);
  }

  @Post(':id/export')
  async exportToPdf(@Param('id') id: string, @GetUser() user: any, @Res() res: Response) {
    try {
      await this.assertDocumentAccess(id, user);
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

  // ── Version history ────────────────────────────────────────────────────────

  /** GET /api/pdf-documents/:id/versions */
  @Get(':id/versions')
  async getVersions(@Param('id') documentId: string, @GetUser() user: any) {
    await this.assertDocumentAccess(documentId, user);
    const versions = await this.prisma.documentVersion.findMany({
      where: { documentId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true, version: true, createdAt: true },
    });
    return versions;
  }

  /** POST /api/pdf-documents/:id/versions */
  @Post(':id/versions')
  async saveVersion(
    @Param('id') documentId: string,
    @GetUser() user: any,
    @Body('title') title: string,
    @Body('pagesSnapshot') pagesSnapshot: any[],
  ) {
    await this.assertDocumentAccess(documentId, user);
    if (!pagesSnapshot || !Array.isArray(pagesSnapshot)) {
      throw new BadRequestException('pagesSnapshot must be an array');
    }

    // Auto-increment version number
    const latest = await this.prisma.documentVersion.findFirst({
      where: { documentId },
      orderBy: { version: 'desc' },
      select: { version: true },
    });
    const nextVersion = (latest?.version ?? 0) + 1;

    const version = await this.prisma.documentVersion.create({
      data: {
        documentId,
        version: nextVersion,
        title: title || `Version ${nextVersion}`,
        pagesSnapshot,
      },
    });
    return version;
  }

  /** POST /api/pdf-documents/:id/versions/:versionId/restore */
  @Post(':id/versions/:versionId/restore')
  async restoreVersion(
    @Param('id') documentId: string,
    @Param('versionId') versionId: string,
    @GetUser() user: any,
  ) {
    await this.assertDocumentAccess(documentId, user);
    const version = await this.prisma.documentVersion.findUnique({
      where: { id: versionId },
    });
    if (!version || version.documentId !== documentId) {
      throw new NotFoundException('Version not found');
    }

    const snapshot = version.pagesSnapshot as any[];

    // Restore each page from the snapshot
    for (const snap of snapshot) {
      await this.prisma.pdfPage.updateMany({
        where: { id: snap.id, documentId },
        data: { content: snap.content, title: snap.title },
      });
    }

    return { success: true, pages: snapshot };
  }
}
