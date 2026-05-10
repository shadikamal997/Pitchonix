import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from './email.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailDigestService {
  private readonly logger = new Logger(EmailDigestService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private config: ConfigService,
  ) {}

  // Runs every Monday at 8 AM UTC
  @Cron('0 8 * * 1')
  async sendWeeklyDigests() {
    this.logger.log('Starting weekly digest job');
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const users = await this.prisma.user.findMany({
      where: { isVerified: true },
      select: { id: true, email: true, name: true },
    });

    for (const user of users) {
      try {
        await this.sendDigestForUser(user, oneWeekAgo);
      } catch (err) {
        this.logger.error(`Digest failed for ${user.email}`, err);
      }
    }

    this.logger.log(`Digest sent to ${users.length} users`);
  }

  private async sendDigestForUser(
    user: { id: string; email: string; name: string | null },
    since: Date,
  ) {
    const [projectCount, newProjects, totalViews, totalExports] = await Promise.all([
      this.prisma.project.count({ where: { userId: user.id, archivedAt: null } }),
      this.prisma.project.findMany({
        where: { userId: user.id, createdAt: { gte: since }, archivedAt: null },
        select: { name: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      this.prisma.project.aggregate({
        where: { userId: user.id },
        _sum: { viewCount: true },
      }),
      this.prisma.project.aggregate({
        where: { userId: user.id },
        _sum: { exportCount: true },
      }),
    ]);

    const views = totalViews._sum.viewCount ?? 0;
    const exports = totalExports._sum.exportCount ?? 0;

    if (newProjects.length === 0 && views === 0 && exports === 0) return;

    const appUrl = this.config.get('FRONTEND_URL') || 'http://localhost:3002';
    const firstName = user.name?.split(' ')[0] || 'there';

    const newProjectRows = newProjects
      .map(p => `<li style="margin:4px 0">${p.name}</li>`)
      .join('');

    const html = `
      <div style="font-family:sans-serif;max-width:560px;margin:auto;color:#111827">
        <div style="background:#7C3AED;padding:24px;border-radius:12px 12px 0 0">
          <h1 style="color:white;margin:0;font-size:22px">Your weekly Pitchonix summary</h1>
        </div>
        <div style="background:#F9FAFB;padding:24px;border-radius:0 0 12px 12px;border:1px solid #E5E7EB;border-top:none">
          <p>Hey ${firstName},</p>
          <p>Here's what happened in your workspace this week:</p>

          <div style="display:flex;gap:16px;margin:20px 0">
            <div style="flex:1;background:white;border:1px solid #E5E7EB;border-radius:8px;padding:16px;text-align:center">
              <div style="font-size:28px;font-weight:700;color:#7C3AED">${projectCount}</div>
              <div style="color:#6B7280;font-size:13px">total projects</div>
            </div>
            <div style="flex:1;background:white;border:1px solid #E5E7EB;border-radius:8px;padding:16px;text-align:center">
              <div style="font-size:28px;font-weight:700;color:#2563EB">${views}</div>
              <div style="color:#6B7280;font-size:13px">total views</div>
            </div>
            <div style="flex:1;background:white;border:1px solid #E5E7EB;border-radius:8px;padding:16px;text-align:center">
              <div style="font-size:28px;font-weight:700;color:#059669">${exports}</div>
              <div style="color:#6B7280;font-size:13px">exports</div>
            </div>
          </div>

          ${newProjects.length > 0 ? `
          <h3 style="margin-top:24px">New projects this week</h3>
          <ul style="padding-left:20px;color:#374151">${newProjectRows}</ul>
          ` : ''}

          <div style="margin-top:24px;text-align:center">
            <a href="${appUrl}/dashboard" style="display:inline-block;background:#7C3AED;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600">Open Dashboard</a>
          </div>

          <p style="color:#9CA3AF;font-size:12px;margin-top:24px;text-align:center">
            Pitchonix &mdash; <a href="${appUrl}/settings" style="color:#9CA3AF">manage email preferences</a>
          </p>
        </div>
      </div>
    `;

    await this.emailService.sendRaw(user.email, 'Your weekly Pitchonix summary', html);
  }
}
