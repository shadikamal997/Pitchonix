import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ActivityService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string, limit = 20) {
    return this.prisma.activity.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 100),
    });
  }

  async log(userId: string, type: string, title: string, description?: string, metadata?: Record<string, any>) {
    return this.prisma.activity.create({
      data: { userId, type, title, description, metadata },
    });
  }
}
