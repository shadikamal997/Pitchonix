import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto, UpdateProjectDto, QueryProjectsDto } from './dto/project.dto';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateProjectDto) {
    return this.prisma.project.create({
      data: {
        userId,
        name: dto.name,
        description: dto.description,
        documentType: dto.documentType,
        industry: dto.industry,
        audience: dto.audience,
        tone: dto.tone,
        businessInfo: dto.businessInfo || {},
      },
      include: {
        decks: true,
      },
    });
  }

  async findAll(userId: string, query?: QueryProjectsDto) {
    const where: any = { userId, archivedAt: null };

    // Add search filter
    if (query?.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    // Add document type filter
    if (query?.documentType) {
      where.documentType = query.documentType;
    }

    // Add status filter
    if (query?.status) {
      where.status = query.status;
    }

    const page = query?.page || 1;
    const limit = query?.limit || 20;
    const skip = (page - 1) * limit;

    const [projects, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        include: {
          decks: {
            select: {
              id: true,
              title: true,
              status: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
        orderBy: {
          lastEditedAt: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.project.count({ where }),
    ]);

    return {
      data: projects,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        decks: {
          include: {
            slides: {
              orderBy: {
                order: 'asc',
              },
            },
          },
        },
        generationJobs: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 5,
        },
        qualityReports: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return project;
  }

  async update(id: string, userId: string, dto: UpdateProjectDto) {
    // Check ownership
    await this.findOne(id, userId);

    return this.prisma.project.update({
      where: { id },
      data: {
        ...dto,
        lastEditedAt: new Date(),
      },
      include: {
        decks: true,
      },
    });
  }

  async duplicate(id: string, userId: string) {
    const originalProject = await this.findOne(id, userId);

    // Create duplicate project
    const duplicatedProject = await this.prisma.project.create({
      data: {
        userId,
        name: `${originalProject.name} (Copy)`,
        description: originalProject.description,
        documentType: originalProject.documentType,
        industry: originalProject.industry,
        status: 'draft',
        businessInfo: originalProject.businessInfo,
        audience: originalProject.audience,
        tone: originalProject.tone,
      },
    });

    // Duplicate decks and slides if they exist
    if (originalProject.decks.length > 0) {
      for (const deck of originalProject.decks) {
        const duplicatedDeck = await this.prisma.deck.create({
          data: {
            projectId: duplicatedProject.id,
            templateId: deck.templateId,
            brandKitId: deck.brandKitId,
            title: deck.title,
            description: deck.description,
            status: 'draft',
            metadata: deck.metadata,
          },
        });

        // Duplicate slides
        if (deck.slides.length > 0) {
          const slidesData = deck.slides.map((slide) => ({
            deckId: duplicatedDeck.id,
            type: slide.type,
            order: slide.order,
            title: slide.title,
            subtitle: slide.subtitle,
            content: slide.content,
            layoutKey: slide.layoutKey,
            themeKey: slide.themeKey,
            speakerNotes: slide.speakerNotes,
          }));

          await this.prisma.slide.createMany({
            data: slidesData,
          });
        }
      }
    }

    return this.findOne(duplicatedProject.id, userId);
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);
    await this.prisma.project.delete({ where: { id } });
    return { message: 'Project deleted successfully' };
  }

  async archive(id: string, userId: string) {
    await this.findOne(id, userId);
    await this.prisma.project.update({ where: { id }, data: { archivedAt: new Date() } });
    return { message: 'Project archived' };
  }

  async restore(id: string, userId: string) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project || project.userId !== userId) throw new NotFoundException('Project not found');
    await this.prisma.project.update({ where: { id }, data: { archivedAt: null } });
    return { message: 'Project restored' };
  }

  async findArchived(userId: string) {
    return this.prisma.project.findMany({
      where: { userId, archivedAt: { not: null } },
      orderBy: { archivedAt: 'desc' },
      include: { decks: { select: { id: true } } },
    });
  }

  async bulkDelete(userId: string, ids: string[]) {
    await this.prisma.project.deleteMany({ where: { id: { in: ids }, userId } });
    return { message: `${ids.length} projects deleted` };
  }

  async bulkArchive(userId: string, ids: string[]) {
    await this.prisma.project.updateMany({
      where: { id: { in: ids }, userId },
      data: { archivedAt: new Date() },
    });
    return { message: `${ids.length} projects archived` };
  }

  async generatePublicLink(id: string, userId: string) {
    await this.findOne(id, userId);
    const token = require('crypto').randomBytes(20).toString('hex');
    await this.prisma.project.update({ where: { id }, data: { publicToken: token } });
    return { token };
  }

  async revokePublicLink(id: string, userId: string) {
    await this.findOne(id, userId);
    await this.prisma.project.update({ where: { id }, data: { publicToken: null } });
    return { message: 'Public link revoked' };
  }

  async getPublicProject(token: string) {
    const project = await this.prisma.project.findUnique({
      where: { publicToken: token },
      include: {
        user: { select: { id: true, name: true, email: true } },
        decks: {
          include: { slides: { orderBy: { order: 'asc' } } },
        },
      },
    });
    if (!project) throw new NotFoundException('Share link not found or has been revoked');
    await this.prisma.project.update({ where: { id: project.id }, data: { viewCount: { increment: 1 } } });
    return {
      id: project.id,
      name: project.name,
      description: project.description,
      type: project.documentType,
      viewCount: project.viewCount + 1,
      owner: { name: project.user?.name ?? null, email: project.user?.email ?? '' },
      decks: project.decks,
    };
  }

  async getAnalytics(id: string, userId: string) {
    const project = await this.findOne(id, userId);
    return {
      viewCount: project.viewCount,
      exportCount: project.exportCount,
      qualityScore: project.qualityScore,
      createdAt: project.createdAt,
      lastEditedAt: project.lastEditedAt,
      status: project.status,
    };
  }

  async incrementExport(id: string) {
    await this.prisma.project.update({ where: { id }, data: { exportCount: { increment: 1 } } });
  }
}
