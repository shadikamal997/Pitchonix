import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class ProjectSharingService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  async inviteByEmail(projectId: string, inviterUserId: string, email: string, role: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');
    if (project.userId !== inviterUserId) throw new ForbiddenException('Only the owner can invite members');

    const invitee = await this.prisma.user.findUnique({ where: { email } });
    if (!invitee) throw new NotFoundException('No user found with that email');

    const existing = await this.prisma.projectShare.findUnique({
      where: { projectId_userId: { projectId, userId: invitee.id } },
    });
    if (existing) throw new ConflictException('User already has access to this project');

    const share = await this.prisma.projectShare.create({
      data: { projectId, userId: invitee.id, role },
      include: { user: { select: { id: true, email: true, name: true } } },
    });

    const inviter = await this.prisma.user.findUnique({
      where: { id: inviterUserId },
      select: { name: true },
    });

    await this.emailService.sendShareInviteEmail(
      email,
      inviter?.name || 'Someone',
      project.name,
      role,
    );

    await this.prisma.notification.create({
      data: {
        userId: invitee.id,
        type: 'share_invite',
        title: 'Project shared with you',
        message: `${inviter?.name || 'Someone'} invited you to "${project.name}" as ${role}`,
        link: `/projects/${projectId}`,
      },
    });

    return share;
  }

  async listMembers(projectId: string) {
    return this.prisma.projectShare.findMany({
      where: { projectId },
      include: { user: { select: { id: true, email: true, name: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async updateRole(projectId: string, ownerUserId: string, memberId: string, role: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');
    if (project.userId !== ownerUserId) throw new ForbiddenException('Only the owner can change roles');

    return this.prisma.projectShare.update({
      where: { projectId_userId: { projectId, userId: memberId } },
      data: { role },
    });
  }

  async removeMember(projectId: string, ownerUserId: string, memberId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');
    if (project.userId !== ownerUserId && ownerUserId !== memberId) {
      throw new ForbiddenException('Only the owner can remove members');
    }

    await this.prisma.projectShare.delete({
      where: { projectId_userId: { projectId, userId: memberId } },
    });
    return { message: 'Member removed' };
  }
}
