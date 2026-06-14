import {
  Controller,
  Get,
  Patch,
  Delete,
  UseGuards,
  Req,
  ForbiddenException,
  NotFoundException,
  Param,
  Query,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

// =============================================================================
//  Phase Ω.2 / Ω.4A / Ω.4B — Platform Admin Controller
//
//  Admin identity: ADMIN_EMAILS env allowlist (comma-separated) OR
//  workspace owner. All management endpoints enforce isPlatformAdmin.
//
//  Phase Ω.4A additions:
//    GET  /admin/users            — list all platform users
//    GET  /admin/users/:id        — view single user
//    GET  /admin/workspaces       — list all workspaces
//    GET  /admin/stats            — platform statistics
//    GET  /admin/audit            — cross-workspace audit log
//
//  Phase Ω.4B additions:
//    PATCH /admin/users/:id/suspend      — soft-suspend a user
//    PATCH /admin/users/:id/ban          — permanently ban a user
//    PATCH /admin/users/:id/reactivate   — clear suspension/ban
//    PATCH /admin/workspaces/:id/lock    — lock a workspace (read-only)
//    PATCH /admin/workspaces/:id/unlock  — unlock a workspace
//    PATCH /admin/workspaces/:id/archive — archive a workspace
//    GET   /admin/users/:id/export-data  — GDPR data export
//    DELETE /admin/users/:id/gdpr-delete — GDPR anonymisation
//    GET   /admin/retention-policies     — list retention policies
//    PATCH /admin/retention-policies/:id — update retention policy
//    GET   /admin/plans                  — list billing plans
//    GET   /admin/subscriptions          — list subscriptions
// =============================================================================

export async function isPlatformAdmin(prisma: PrismaService, userId: string): Promise<boolean> {
  if (!userId) return false;

  const allow = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  if (allow.length > 0) {
    // ADMIN_EMAILS is configured — honour it exclusively.
    // Never fall through to workspace-owner: a workspace owner is admin of their
    // own workspace, not a platform superadmin with access to all tenants' data.
    const u = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    return !!(u?.email && allow.includes(u.email.toLowerCase()));
  }

  // Fallback for self-hosted / single-tenant deployments where ADMIN_EMAILS is
  // not set: the workspace owner acts as the platform admin.
  const ownerRow = await prisma.workspaceMember.findFirst({
    where: { userId, role: 'owner' },
    select: { id: true },
  });
  return !!ownerRow;
}

async function requireAdmin(prisma: PrismaService, userId: string): Promise<void> {
  const ok = await isPlatformAdmin(prisma, userId);
  if (!ok) throw new ForbiddenException('Admin access required');
}

@UseGuards(JwtAuthGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly prisma: PrismaService) {}

  // ── Identity check ──────────────────────────────────────────────────────────

  @Get('access')
  async access(@Req() req: any) {
    const ok = await isPlatformAdmin(this.prisma, req.user?.id);
    return { isAdmin: ok };
  }

  @Get('ping')
  async ping(@Req() req: any) {
    await requireAdmin(this.prisma, req.user?.id);
    return { ok: true, ts: new Date().toISOString() };
  }

  // ── Platform statistics ─────────────────────────────────────────────────────

  @Get('stats')
  async stats(@Req() req: any) {
    await requireAdmin(this.prisma, req.user?.id);
    const [userCount, workspaceCount, projectCount, deckCount, subscriptionCount] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.workspace.count(),
      this.prisma.project.count(),
      this.prisma.deck.count(),
      this.prisma.subscription.count({ where: { status: 'active' } }),
    ]);
    return { userCount, workspaceCount, projectCount, deckCount, subscriptionCount, ts: new Date().toISOString() };
  }

  // ── User management ─────────────────────────────────────────────────────────

  @Get('users')
  async listUsers(
    @Req() req: any,
    @Query('page') page = '1',
    @Query('limit') limit = '50',
    @Query('search') search?: string,
  ) {
    await requireAdmin(this.prisma, req.user?.id);
    const take = Math.min(Number(limit) || 50, 200);
    const skip = (Math.max(Number(page) || 1, 1) - 1) * take;
    const where = search
      ? { OR: [{ email: { contains: search, mode: 'insensitive' as const } }, { name: { contains: search, mode: 'insensitive' as const } }] }
      : {};
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          isVerified: true,
          twoFactorEnabled: true,
          createdAt: true,
          updatedAt: true,
          suspendedAt: true,
          bannedAt: true,
          _count: { select: { projects: true, workspaceMemberships: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.user.count({ where }),
    ]);
    return { data: users, meta: { total, page: Number(page), limit: take } };
  }

  @Get('users/:id')
  async getUser(@Req() req: any, @Param('id') id: string) {
    await requireAdmin(this.prisma, req.user?.id);
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        isVerified: true,
        twoFactorEnabled: true,
        createdAt: true,
        updatedAt: true,
        suspendedAt: true,
        bannedAt: true,
        suspendReason: true,
        banReason: true,
        workspaceMemberships: {
          select: { workspace: { select: { id: true, name: true } }, role: true, joinedAt: true },
        },
        _count: { select: { projects: true } },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  // ── User governance ──────────────────────────────────────────────────────────

  @Patch('users/:id/suspend')
  @HttpCode(HttpStatus.OK)
  async suspendUser(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    await requireAdmin(this.prisma, req.user?.id);
    const user = await this.prisma.user.findUnique({ where: { id }, select: { id: true, email: true } });
    if (!user) throw new NotFoundException('User not found');
    await this.prisma.user.update({
      where: { id },
      data: { suspendedAt: new Date(), suspendReason: body.reason ?? null },
    });
    return { ok: true, userId: id, action: 'suspended' };
  }

  @Patch('users/:id/ban')
  @HttpCode(HttpStatus.OK)
  async banUser(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    await requireAdmin(this.prisma, req.user?.id);
    const user = await this.prisma.user.findUnique({ where: { id }, select: { id: true, email: true } });
    if (!user) throw new NotFoundException('User not found');
    await this.prisma.user.update({
      where: { id },
      data: { bannedAt: new Date(), banReason: body.reason ?? null, suspendedAt: null, suspendReason: null },
    });
    return { ok: true, userId: id, action: 'banned' };
  }

  @Patch('users/:id/reactivate')
  @HttpCode(HttpStatus.OK)
  async reactivateUser(@Req() req: any, @Param('id') id: string) {
    await requireAdmin(this.prisma, req.user?.id);
    const user = await this.prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!user) throw new NotFoundException('User not found');
    await this.prisma.user.update({
      where: { id },
      data: { suspendedAt: null, suspendReason: null, bannedAt: null, banReason: null },
    });
    return { ok: true, userId: id, action: 'reactivated' };
  }

  // ── Workspace management ─────────────────────────────────────────────────────

  @Get('workspaces')
  async listWorkspaces(
    @Req() req: any,
    @Query('page') page = '1',
    @Query('limit') limit = '50',
  ) {
    await requireAdmin(this.prisma, req.user?.id);
    const take = Math.min(Number(limit) || 50, 200);
    const skip = (Math.max(Number(page) || 1, 1) - 1) * take;
    const [workspaces, total] = await Promise.all([
      this.prisma.workspace.findMany({
        select: {
          id: true,
          name: true,
          createdAt: true,
          updatedAt: true,
          lockedAt: true,
          archivedAt: true,
          _count: { select: { members: true, projects: true } },
          members: {
            where: { role: 'owner' },
            select: { user: { select: { id: true, email: true, name: true } } },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.workspace.count(),
    ]);
    return { data: workspaces, meta: { total, page: Number(page), limit: take } };
  }

  @Get('workspaces/:id')
  async getWorkspace(@Req() req: any, @Param('id') id: string) {
    await requireAdmin(this.prisma, req.user?.id);
    return this.prisma.workspace.findUnique({
      where: { id },
      include: {
        members: {
          select: { user: { select: { id: true, email: true, name: true } }, role: true, joinedAt: true },
        },
        _count: { select: { projects: true, auditLog: true } },
      },
    });
  }

  // ── Workspace governance ─────────────────────────────────────────────────────

  @Patch('workspaces/:id/lock')
  @HttpCode(HttpStatus.OK)
  async lockWorkspace(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    await requireAdmin(this.prisma, req.user?.id);
    const ws = await this.prisma.workspace.findUnique({ where: { id }, select: { id: true } });
    if (!ws) throw new NotFoundException('Workspace not found');
    await this.prisma.workspace.update({
      where: { id },
      data: { lockedAt: new Date(), lockReason: body.reason ?? null },
    });
    return { ok: true, workspaceId: id, action: 'locked' };
  }

  @Patch('workspaces/:id/unlock')
  @HttpCode(HttpStatus.OK)
  async unlockWorkspace(@Req() req: any, @Param('id') id: string) {
    await requireAdmin(this.prisma, req.user?.id);
    const ws = await this.prisma.workspace.findUnique({ where: { id }, select: { id: true } });
    if (!ws) throw new NotFoundException('Workspace not found');
    await this.prisma.workspace.update({
      where: { id },
      data: { lockedAt: null, lockReason: null },
    });
    return { ok: true, workspaceId: id, action: 'unlocked' };
  }

  @Patch('workspaces/:id/archive')
  @HttpCode(HttpStatus.OK)
  async archiveWorkspace(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    await requireAdmin(this.prisma, req.user?.id);
    const ws = await this.prisma.workspace.findUnique({ where: { id }, select: { id: true } });
    if (!ws) throw new NotFoundException('Workspace not found');
    await this.prisma.workspace.update({
      where: { id },
      data: { archivedAt: new Date(), archiveReason: body.reason ?? null },
    });
    return { ok: true, workspaceId: id, action: 'archived' };
  }

  // ── Audit log (cross-workspace view) ────────────────────────────────────────

  @Get('audit')
  async platformAudit(
    @Req() req: any,
    @Query('workspaceId') workspaceId?: string,
    @Query('action') action?: string,
    @Query('limit') limit = '100',
  ) {
    await requireAdmin(this.prisma, req.user?.id);
    const take = Math.min(Number(limit) || 100, 500);
    return this.prisma.workspaceAuditLog.findMany({
      where: {
        ...(workspaceId ? { workspaceId } : {}),
        ...(action ? { action } : {}),
      },
      include: {
        actor: { select: { id: true, name: true, email: true } },
        workspace: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take,
    });
  }

  // ── GDPR / Data Governance ───────────────────────────────────────────────────

  @Get('users/:id/export-data')
  async gdprExport(@Req() req: any, @Param('id') id: string) {
    await requireAdmin(this.prisma, req.user?.id);
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true, email: true, name: true, createdAt: true, isVerified: true,
        twoFactorEnabled: true, onboardingCompleted: true, suspendedAt: true, bannedAt: true,
        workspaceMemberships: {
          select: { workspace: { select: { id: true, name: true } }, role: true, joinedAt: true },
        },
        activities: { orderBy: { createdAt: 'desc' }, take: 200 },
        _count: { select: { projects: true } },
      },
    });
    if (!user) throw new NotFoundException('User not found');

    const [projects, decks, pdfDocuments] = await Promise.all([
      this.prisma.project.count({ where: { userId: id } }),
      this.prisma.deck.count({ where: { project: { userId: id } } }),
      this.prisma.pdfDocument.count({ where: { project: { userId: id } } }),
    ]);

    return {
      exportedAt: new Date().toISOString(),
      user,
      contentSummary: { projects, decks, pdfDocuments },
    };
  }

  @Delete('users/:id/gdpr-delete')
  @HttpCode(HttpStatus.OK)
  async gdprDelete(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { confirm: boolean },
  ) {
    await requireAdmin(this.prisma, req.user?.id);
    if (!body.confirm) {
      return { ok: false, error: 'Must send { confirm: true } to execute GDPR deletion' };
    }
    const user = await this.prisma.user.findUnique({ where: { id }, select: { id: true, email: true } });
    if (!user) throw new NotFoundException('User not found');

    // Anonymise PII; preserve row so audit log FKs remain intact.
    const anon = `deleted-${id.slice(0, 8)}@gdpr.invalid`;
    await this.prisma.user.update({
      where: { id },
      data: {
        email: anon,
        name: 'Deleted User',
        password: '',
        twoFactorSecret: null,
        verificationToken: null,
        resetToken: null,
        magicLinkToken: null,
        bannedAt: new Date(),
        banReason: 'GDPR deletion',
      },
    });

    return { ok: true, userId: id, anonymisedEmail: anon };
  }

  // ── Retention policies ───────────────────────────────────────────────────────

  @Get('retention-policies')
  async listRetentionPolicies(@Req() req: any) {
    await requireAdmin(this.prisma, req.user?.id);
    return this.prisma.retentionPolicy.findMany({ orderBy: { resourceType: 'asc' } });
  }

  @Patch('retention-policies/:id')
  @HttpCode(HttpStatus.OK)
  async updateRetentionPolicy(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { retentionDays?: number; softDeleteDays?: number },
  ) {
    await requireAdmin(this.prisma, req.user?.id);
    const policy = await this.prisma.retentionPolicy.findUnique({ where: { id } });
    if (!policy) throw new NotFoundException('Retention policy not found');
    return this.prisma.retentionPolicy.update({
      where: { id },
      data: {
        ...(body.retentionDays !== undefined ? { retentionDays: body.retentionDays } : {}),
        ...(body.softDeleteDays !== undefined ? { softDeleteDays: body.softDeleteDays } : {}),
      },
    });
  }

  // ── Billing / Plans ──────────────────────────────────────────────────────────

  @Get('plans')
  async listPlans(@Req() req: any) {
    await requireAdmin(this.prisma, req.user?.id);
    return this.prisma.plan.findMany({ orderBy: { price: 'asc' } });
  }

  @Get('subscriptions')
  async listSubscriptions(
    @Req() req: any,
    @Query('userId') userId?: string,
    @Query('status') status?: string,
    @Query('limit') limit = '50',
  ) {
    await requireAdmin(this.prisma, req.user?.id);
    const take = Math.min(Number(limit) || 50, 200);
    return this.prisma.subscription.findMany({
      where: {
        ...(userId ? { userId } : {}),
        ...(status ? { status } : {}),
      },
      include: {
        user: { select: { id: true, email: true, name: true } },
        plan: { select: { name: true, displayName: true } },
        workspace: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take,
    });
  }
}
