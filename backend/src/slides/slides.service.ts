import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSlideDto, UpdateSlideDto } from './dto/slide.dto';

@Injectable()
export class SlidesService {
  constructor(private prisma: PrismaService) {}

  async create(deckId: string, dto: CreateSlideDto) {
    return this.prisma.slide.create({
      data: {
        deckId,
        type: dto.type,
        order: dto.order,
        title: dto.title,
        subtitle: dto.subtitle,
        content: dto.content,
        speakerNotes: dto.speakerNotes,
        layoutKey: dto.layoutKey,
        themeKey: dto.themeKey,
      },
    });
  }

  async createMany(deckId: string, slides: CreateSlideDto[]) {
    const createdSlides = await Promise.all(
      slides.map((slide) => this.create(deckId, slide)),
    );
    return createdSlides;
  }

  async findAll(deckId: string) {
    return this.prisma.slide.findMany({
      where: { deckId },
      orderBy: {
        order: 'asc',
      },
    });
  }

  async findOne(id: string) {
    const slide = await this.prisma.slide.findUnique({
      where: { id },
    });

    if (!slide) {
      throw new NotFoundException('Slide not found');
    }

    return slide;
  }

  async verifyOwnership(slideId: string, userId: string): Promise<void> {
    const slide = await this.prisma.slide.findFirst({
      where: {
        id: slideId,
        deck: {
          project: { userId },
        },
      },
    });

    if (!slide) {
      throw new ForbiddenException('You do not have permission to modify this slide');
    }
  }

  async update(id: string, dto: UpdateSlideDto) {
    return this.prisma.slide.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.prisma.slide.delete({
      where: { id },
    });

    return { message: 'Slide deleted successfully' };
  }
}
