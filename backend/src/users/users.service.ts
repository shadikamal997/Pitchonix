import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });
  }

  async updateProfile(id: string, dto: { name?: string; email?: string }) {
    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.email !== undefined) {
      const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (existing && existing.id !== id) {
        throw new BadRequestException('Email already in use');
      }
      data.email = dto.email;
    }
    return this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async changePassword(id: string, dto: { currentPassword: string; newPassword: string }) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    const valid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!valid) throw new BadRequestException('Current password is incorrect');

    const hashed = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({ where: { id }, data: { password: hashed } });
    return { message: 'Password updated successfully' };
  }

  async deleteAccount(id: string) {
    await this.prisma.user.delete({ where: { id } });
    return { message: 'Account deleted successfully' };
  }

  /**
   * Phase 36.1A — user search for mention autocomplete + reviewer picker.
   * Phase 39K — when `workspaceId` is provided, scope strictly to workspace
   * members. Otherwise fall back to the project-collaborator pool (legacy).
   *
   * Excludes the caller. Bounded to 8 results so dropdowns stay snappy.
   */
  async searchCollaborators(currentUserId: string, q: string, limit = 8, workspaceId?: string) {
    const needle = (q || '').trim();
    if (!needle) return [];

    let peerIds: Set<string>;

    if (workspaceId) {
      // Phase 39K — caller must be a workspace member; scope search to members.
      const me = await this.prisma.workspaceMember.findUnique({
        where:  { workspaceId_userId: { workspaceId, userId: currentUserId } },
        select: { id: true },
      });
      if (!me) return [];   // not a member → no results
      const members = await this.prisma.workspaceMember.findMany({
        where:  { workspaceId },
        select: { userId: true },
      });
      peerIds = new Set(members.map((m) => m.userId));
    } else {
      // Legacy — project-share collaborator pool.
      const projects = await this.prisma.project.findMany({
        where: {
          OR: [
            { userId: currentUserId },
            { shares: { some: { userId: currentUserId } } },
          ],
        },
        select: {
          userId: true,
          shares: { select: { userId: true } },
        },
      });
      peerIds = new Set<string>();
      for (const p of projects) {
        peerIds.add(p.userId);
        for (const s of p.shares) peerIds.add(s.userId);
      }
    }

    peerIds.delete(currentUserId);
    if (peerIds.size === 0) return [];

    const lowered = needle.toLowerCase();
    const matches = await this.prisma.user.findMany({
      where: {
        id: { in: Array.from(peerIds) },
        OR: [
          { name:  { contains: needle, mode: 'insensitive' } },
          { email: { contains: needle, mode: 'insensitive' } },
        ],
      },
      select: { id: true, name: true, email: true },
      take: Math.max(1, Math.min(20, limit)),
    });

    // Rank: prefix matches first (name > email), then substring.
    const score = (u: { name: string | null; email: string }) => {
      const n = (u.name || '').toLowerCase();
      const e = u.email.toLowerCase();
      if (n.startsWith(lowered)) return 0;
      if (e.startsWith(lowered)) return 1;
      if (n.includes(lowered))   return 2;
      return 3;
    };
    return matches.sort((a, b) => score(a) - score(b));
  }
}
