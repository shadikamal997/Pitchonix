import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreatePdfDocumentDto {
  projectId: string;
  title: string;
  description?: string;
  documentType: string;
  brandKitId?: string;
  brandColor?: string;
  accentColor?: string;
}

export interface UpdatePdfDocumentDto {
  title?: string;
  description?: string;
  status?: string;
  outline?: any;
  metadata?: any;
  qualityScore?: number;
  validationResult?: any;
  exportReady?: boolean;
}

@Injectable()
export class PdfDocumentsService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreatePdfDocumentDto) {
    return this.prisma.pdfDocument.create({
      data: {
        projectId: data.projectId,
        title: data.title,
        description: data.description,
        documentType: data.documentType,
        brandKitId: data.brandKitId,
        brandColor: data.brandColor,
        accentColor: data.accentColor,
      },
      include: {
        project: true,
        brandKit: true,
        pages: {
          orderBy: { order: 'asc' },
        },
      },
    });
  }

  async findAll(projectId?: string) {
    return this.prisma.pdfDocument.findMany({
      where: projectId ? { projectId } : undefined,
      include: {
        project: true,
        brandKit: true,
        _count: {
          select: {
            pages: true,
            exports: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const document = await this.prisma.pdfDocument.findUnique({
      where: { id },
      include: {
        project: true,
        brandKit: true,
        pages: {
          orderBy: { order: 'asc' },
          include: {
            template: true,
          },
        },
        exports: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!document) {
      throw new NotFoundException(`PDF Document with ID ${id} not found`);
    }

    return document;
  }

  async update(id: string, data: UpdatePdfDocumentDto) {
    return this.prisma.pdfDocument.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        status: data.status,
        outline: data.outline as any,
        metadata: data.metadata as any,
        qualityScore: data.qualityScore,
        validationResult: data.validationResult as any,
        exportReady: data.exportReady,
        lastQualityCheck: data.qualityScore !== undefined ? new Date() : undefined,
      },
      include: {
        project: true,
        brandKit: true,
        pages: {
          orderBy: { order: 'asc' },
        },
      },
    });
  }

  async delete(id: string) {
    return this.prisma.pdfDocument.delete({
      where: { id },
    });
  }

  async getQualityHistory(documentId: string) {
    return this.prisma.pdfQualityHistory.findMany({
      where: { documentId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  async recordQualityCheck(documentId: string, qualityData: any) {
    return this.prisma.pdfQualityHistory.create({
      data: {
        documentId,
        overallScore: qualityData.overallScore,
        grade: qualityData.grade,
        contentScore: qualityData.contentScore,
        designScore: qualityData.designScore,
        structureScore: qualityData.structureScore,
        professionalScore: qualityData.professionalScore,
        validationPassed: qualityData.validationPassed,
        errorCount: qualityData.errorCount,
        warningCount: qualityData.warningCount,
        infoCount: qualityData.infoCount,
        trigger: qualityData.trigger || 'manual',
        version: qualityData.version || 1,
        changes: qualityData.changes as any,
      },
    });
  }
}
