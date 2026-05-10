import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DocumentVersionsService {
  constructor(private prisma: PrismaService) {}

  async listVersions(documentId: string) {
    return this.prisma.documentVersion.findMany({
      where: { documentId },
      orderBy: { version: 'desc' },
      select: { id: true, version: true, title: true, createdAt: true },
    });
  }

  async createSnapshot(documentId: string, title: string, pagesSnapshot: any) {
    const latest = await this.prisma.documentVersion.findFirst({
      where: { documentId },
      orderBy: { version: 'desc' },
      select: { version: true },
    });
    const nextVersion = (latest?.version ?? 0) + 1;
    return this.prisma.documentVersion.create({
      data: { documentId, version: nextVersion, title, pagesSnapshot },
    });
  }

  async getVersion(id: string) {
    const version = await this.prisma.documentVersion.findUnique({ where: { id } });
    if (!version) throw new NotFoundException('Version not found');
    return version;
  }

  async restoreVersion(documentId: string, versionId: string) {
    const version = await this.getVersion(versionId);
    await this.prisma.pdfDocument.update({
      where: { id: documentId },
      data: { updatedAt: new Date() },
    });
    return { message: 'Version restored', pages: version.pagesSnapshot };
  }
}
