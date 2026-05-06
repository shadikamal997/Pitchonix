import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBrandKitDto } from './dto/create-brand-kit.dto';
import { UpdateBrandKitDto } from './dto/update-brand-kit.dto';

@Injectable()
export class BrandKitsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new brand kit for a user
   */
  async create(userId: string, dto: CreateBrandKitDto) {
    return this.prisma.brandKit.create({
      data: {
        userId,
        name: dto.name,
        logo: dto.logo,
        primaryColor: dto.primaryColor,
        secondaryColor: dto.secondaryColor,
        fontFamily: dto.fontFamily,
        config: {},
      },
    });
  }

  /**
   * Get all brand kits for a user
   */
  async findAll(userId: string) {
    return this.prisma.brandKit.findMany({
      where: { userId },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Get a specific brand kit by ID
   */
  async findOne(id: string, userId: string) {
    const brandKit = await this.prisma.brandKit.findUnique({
      where: { id },
    });

    if (!brandKit) {
      throw new NotFoundException(`Brand kit with ID ${id} not found`);
    }

    if (brandKit.userId !== userId) {
      throw new ForbiddenException('You do not have permission to access this brand kit');
    }

    return brandKit;
  }

  /**
   * Update a brand kit
   */
  async update(id: string, userId: string, dto: UpdateBrandKitDto) {
    // Verify ownership
    await this.findOne(id, userId);

    return this.prisma.brandKit.update({
      where: { id },
      data: {
        name: dto.name,
        logo: dto.logo,
        primaryColor: dto.primaryColor,
        secondaryColor: dto.secondaryColor,
        fontFamily: dto.fontFamily,
      },
    });
  }

  /**
   * Delete a brand kit
   */
  async remove(id: string, userId: string) {
    // Verify ownership
    await this.findOne(id, userId);

    return this.prisma.brandKit.delete({
      where: { id },
    });
  }
}
