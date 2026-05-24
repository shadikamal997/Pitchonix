import { Controller, Get, UseGuards, Req, ForbiddenException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

// =============================================================================
//  Phase Ω.2 — Admin diagnostics gate.
//
//  Pitchonix doesn't have a global "platform admin" role — roles are
//  workspace-scoped (workspace_members.role in { owner, editor, viewer }).
//  For the admin diagnostics area we accept either:
//
//    (a) any user who is the owner of at least one workspace
//    (b) any user whose email is in the ADMIN_EMAILS env allowlist
//        (comma-separated; used for platform-level operators)
//
//  This keeps the spec — "OWNER / ADMIN only" — without requiring a
//  schema migration to add a platform-wide isAdmin flag.
// =============================================================================

export async function isPlatformAdmin(prisma: PrismaService, userId: string): Promise<boolean> {
  if (!userId) return false;

  // Allowlist check (cheap; do first).
  const allow = (process.env.ADMIN_EMAILS || '')
    .split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (allow.length > 0) {
    const u = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    if (u?.email && allow.includes(u.email.toLowerCase())) return true;
  }

  // Workspace owner check.
  const ownerRow = await prisma.workspaceMember.findFirst({
    where: { userId, role: 'owner' }, select: { id: true },
  });
  return !!ownerRow;
}

@UseGuards(JwtAuthGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly prisma: PrismaService) {}

  // Frontend calls this on /admin/diagnostics page load to decide whether
  // to render the panels or redirect with "forbidden".
  @Get('access')
  async access(@Req() req: any) {
    const ok = await isPlatformAdmin(this.prisma, req.user?.id);
    return { isAdmin: ok };
  }

  // Convenience health endpoint admins can use to confirm the page is wired.
  @Get('ping')
  async ping(@Req() req: any) {
    const ok = await isPlatformAdmin(this.prisma, req.user?.id);
    if (!ok) throw new ForbiddenException('Admin access required');
    return { ok: true, ts: new Date().toISOString() };
  }
}
