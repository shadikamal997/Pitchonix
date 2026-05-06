import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDeckDto, UpdateDeckDto } from './dto/deck.dto';

@Injectable()
export class DecksService {
  constructor(private prisma: PrismaService) {}

  async create(projectId: string, dto: CreateDeckDto) {
    return this.prisma.deck.create({
      data: {
        projectId,
        title: dto.title,
        description: dto.description,
        templateId: dto.templateId,
        brandKitId: dto.brandKitId,
      },
      include: {
        slides: true,
      },
    });
  }

  async findOne(id: string) {
    const deck = await this.prisma.deck.findUnique({
      where: { id },
      include: {
        project: true,
        slides: {
          orderBy: {
            order: 'asc',
          },
        },
        template: true,
        brandKit: true,
      },
    });

    if (!deck) {
      throw new NotFoundException('Deck not found');
    }

    return deck;
  }

  async verifyOwnership(deckId: string, userId: string): Promise<void> {
    const deck = await this.prisma.deck.findFirst({
      where: {
        id: deckId,
        project: { userId },
      },
    });

    if (!deck) {
      throw new ForbiddenException('You do not have permission to modify this deck');
    }
  }

  async update(id: string, dto: UpdateDeckDto) {
    return this.prisma.deck.update({
      where: { id },
      data: dto,
      include: {
        slides: {
          orderBy: {
            order: 'asc',
          },
        },
      },
    });
  }

  async remove(id: string) {
    await this.prisma.deck.delete({
      where: { id },
    });

    return { message: 'Deck deleted successfully' };
  }
}
