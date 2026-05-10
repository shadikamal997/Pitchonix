import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TemplateFavouritesService {
  constructor(private prisma: PrismaService) {}

  async add(userId: string, templateId: string) {
    await this.prisma.templateFavourite.upsert({
      where: { userId_templateId: { userId, templateId } },
      create: { userId, templateId },
      update: {},
    });
    return { message: 'Added to favourites' };
  }

  async remove(userId: string, templateId: string) {
    await this.prisma.templateFavourite.delete({
      where: { userId_templateId: { userId, templateId } },
    });
    return { message: 'Removed from favourites' };
  }

  async findAll(userId: string) {
    return this.prisma.templateFavourite.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async isFavourite(userId: string, templateId: string) {
    const fav = await this.prisma.templateFavourite.findUnique({
      where: { userId_templateId: { userId, templateId } },
    });
    return { isFavourite: !!fav };
  }
}
