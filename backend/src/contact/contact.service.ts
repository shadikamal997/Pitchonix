import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateContactMessageDto {
  name: string;
  email: string;
  subject: string;
  message: string;
  userId?: string;
}

@Injectable()
export class ContactService {
  constructor(private prisma: PrismaService) {}

  async createContactMessage(dto: CreateContactMessageDto) {
    const contactMessage = await (this.prisma as any).contactMessage.create({
      data: {
        name: dto.name,
        email: dto.email,
        subject: dto.subject,
        message: dto.message,
        userId: dto.userId,
        status: 'new',
      },
    });

    return contactMessage;
  }

  async getAllContactMessages() {
    return (this.prisma as any).contactMessage.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async getContactMessageById(id: string) {
    return (this.prisma as any).contactMessage.findUnique({
      where: { id },
    });
  }

  async updateContactStatus(id: string, status: string) {
    return (this.prisma as any).contactMessage.update({
      where: { id },
      data: { status },
    });
  }
}
