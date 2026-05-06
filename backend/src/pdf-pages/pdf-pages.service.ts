import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreatePdfPageDto {
  documentId: string;
  pageType: string;
  title?: string;
  content: any;
  order: number;
  templateId?: string;
  customStyles?: any;
}

export interface UpdatePdfPageDto {
  pageType?: string;
  title?: string;
  content?: any;
  order?: number;
  templateId?: string;
  customStyles?: any;
  qualityScore?: number;
  validationIssues?: any;
}

@Injectable()
export class PdfPagesService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreatePdfPageDto) {
    return this.prisma.pdfPage.create({
      data: {
        documentId: data.documentId,
        pageType: data.pageType,
        title: data.title,
        content: data.content as any,
        order: data.order,
        templateId: data.templateId,
        customStyles: data.customStyles as any,
      },
      include: {
        template: true,
      },
    });
  }

  async findAllByDocument(documentId: string) {
    return this.prisma.pdfPage.findMany({
      where: { documentId },
      include: {
        template: true,
      },
      orderBy: { order: 'asc' },
    });
  }

  async findOne(id: string) {
    const page = await this.prisma.pdfPage.findUnique({
      where: { id },
      include: {
        template: true,
        document: true,
      },
    });

    if (!page) {
      throw new NotFoundException(`PDF Page with ID ${id} not found`);
    }

    return page;
  }

  async update(id: string, data: UpdatePdfPageDto) {
    return this.prisma.pdfPage.update({
      where: { id },
      data: {
        pageType: data.pageType,
        title: data.title,
        content: data.content as any,
        order: data.order,
        templateId: data.templateId,
        customStyles: data.customStyles as any,
        qualityScore: data.qualityScore,
        validationIssues: data.validationIssues as any,
      },
      include: {
        template: true,
      },
    });
  }

  async delete(id: string) {
    return this.prisma.pdfPage.delete({
      where: { id },
    });
  }

  async reorderPages(documentId: string, pageIds: string[]) {
    // Update order for each page
    const updates = pageIds.map((pageId, index) =>
      this.prisma.pdfPage.update({
        where: { id: pageId },
        data: { order: index },
      }),
    );

    await this.prisma.$transaction(updates);

    return this.findAllByDocument(documentId);
  }

  async duplicatePage(id: string) {
    const originalPage = await this.findOne(id);
    
    // Find the max order in the document
    const maxOrderPage = await this.prisma.pdfPage.findFirst({
      where: { documentId: originalPage.documentId },
      orderBy: { order: 'desc' },
    });

    const newOrder = (maxOrderPage?.order ?? 0) + 1;

    return this.create({
      documentId: originalPage.documentId,
      pageType: originalPage.pageType,
      title: originalPage.title ? `${originalPage.title} (Copy)` : undefined,
      content: originalPage.content,
      order: newOrder,
      templateId: originalPage.templateId,
      customStyles: originalPage.customStyles,
    });
  }
}
