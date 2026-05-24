import {
  Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger, OnModuleInit,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspaceAuditService } from './workspace-audit.service';
import { WorkspaceActivityService } from './workspace-activity.service';
import { EmailService } from '../email/email.service';
import {
  canRole, isHigherRole, isAtLeastRole, WorkspaceAction, WorkspaceRole, WORKSPACE_ROLES,
} from './workspace-permissions';

// =============================================================================
//  Phase 39A-D + 39G — WorkspacesService
//
//  Source of truth for organizations, workspaces, members, invites, and the
//  one-time backfill that gives every existing user a Personal workspace.
//
//  All write paths log a corresponding audit entry; member additions also
//  emit a content-level "member.joined" activity.
// =============================================================================

const INVITE_TTL_DAYS = 14;

@Injectable()
export class WorkspacesService implements OnModuleInit {
  private readonly logger = new Logger(WorkspacesService.name);

  constructor(
    private prisma:   PrismaService,
    private audit:    WorkspaceAuditService,
    private activity: WorkspaceActivityService,
    private email:    EmailService,
  ) {}

  // ---------------------------------------------------------------------------
  //  Boot — backfill any user without a Personal workspace
  // ---------------------------------------------------------------------------

  async onModuleInit() {
    try {
      await this.backfillPersonalWorkspaces();
    } catch (e: any) {
      this.logger.error(`Personal workspace backfill failed: ${e?.message}`, e?.stack);
    }
  }

  /**
   * Walk every user and ensure:
   *   1. They own an Organization (slug = "personal-{userId}")
   *   2. That org has a "Personal" Workspace
   *   3. They are a workspace OWNER member
   *   4. Their existing projects (workspaceId = null) move into that workspace
   *
   * Idempotent — running it on already-migrated data is a no-op.
   */
  async backfillPersonalWorkspaces(): Promise<{ usersChecked: number; created: number; projectsMoved: number }> {
    const users = await this.prisma.user.findMany({ select: { id: true, name: true, email: true } });
    let created = 0;
    let projectsMoved = 0;

    for (const u of users) {
      const existingMembership = await this.prisma.workspaceMember.findFirst({
        where:  { userId: u.id },
        select: { workspaceId: true },
      });
      if (existingMembership) continue;

      // No memberships → create Personal org + workspace + owner row.
      const slug = `personal-${u.id.slice(0, 8)}`;
      const org = await this.prisma.organization.upsert({
        where:  { slug },
        create: { slug, name: 'Personal', ownerId: u.id },
        update: {},
      });
      const ws = await this.prisma.workspace.create({
        data: {
          organizationId: org.id,
          name:           'Personal',
          description:    'Your personal workspace',
          members: { create: { userId: u.id, role: 'owner' } },
        },
      });
      created++;

      // Move every existing project owned by this user into the new workspace.
      const moved = await this.prisma.project.updateMany({
        where: { userId: u.id, workspaceId: null },
        data:  { workspaceId: ws.id },
      });
      projectsMoved += moved.count;
    }

    if (created > 0 || projectsMoved > 0) {
      this.logger.log(`Backfill: ${created} personal workspaces created, ${projectsMoved} projects moved`);
    }
    return { usersChecked: users.length, created, projectsMoved };
  }

  // ---------------------------------------------------------------------------
  //  Authorization helpers
  // ---------------------------------------------------------------------------

  /** Returns the caller's WorkspaceMember row or throws. */
  async assertMember(workspaceId: string, userId: string): Promise<{ role: WorkspaceRole }> {
    const member = await this.prisma.workspaceMember.findUnique({
      where:  { workspaceId_userId: { workspaceId, userId } },
      select: { role: true },
    });
    if (!member) throw new ForbiddenException('You are not a member of this workspace');
    return { role: member.role as WorkspaceRole };
  }

  /** Caller must have the role required for `action`, else throw. */
  async assertCan(workspaceId: string, userId: string, action: WorkspaceAction): Promise<WorkspaceRole> {
    const { role } = await this.assertMember(workspaceId, userId);
    if (!canRole(role, action)) {
      throw new ForbiddenException(`Role "${role}" cannot ${action}`);
    }
    return role;
  }

  // ---------------------------------------------------------------------------
  //  Reads
  // ---------------------------------------------------------------------------

  async listMine(userId: string) {
    const memberships = await this.prisma.workspaceMember.findMany({
      where:   { userId },
      include: {
        workspace: {
          include: {
            organization: { select: { id: true, name: true, slug: true } },
            _count:       { select: { members: true, projects: true } },
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });
    return memberships.map((m) => ({
      role:        m.role,
      workspace:   m.workspace,
      memberCount: m.workspace._count.members,
      projectCount: m.workspace._count.projects,
    }));
  }

  async getById(workspaceId: string, userId: string) {
    await this.assertMember(workspaceId, userId);
    const ws = await this.prisma.workspace.findUnique({
      where:   { id: workspaceId },
      include: {
        organization: true,
        _count:       { select: { members: true, projects: true, invites: { where: { acceptedAt: null, revokedAt: null } } } },
      },
    });
    if (!ws) throw new NotFoundException('Workspace not found');
    return ws;
  }

  // ---------------------------------------------------------------------------
  //  Mutations — workspace
  // ---------------------------------------------------------------------------

  async create(userId: string, input: { name: string; description?: string; organizationId?: string }) {
    if (!input.name?.trim()) throw new BadRequestException('Workspace name is required');

    // If no orgId, create a new "owned by this user" org named after the workspace.
    let orgId = input.organizationId;
    if (!orgId) {
      const slug = `${slugify(input.name)}-${crypto.randomBytes(3).toString('hex')}`;
      const org = await this.prisma.organization.create({
        data: { slug, name: input.name.trim(), ownerId: userId },
      });
      orgId = org.id;
    } else {
      // If specified, caller must own it.
      const org = await this.prisma.organization.findUnique({
        where: { id: orgId }, select: { ownerId: true },
      });
      if (!org) throw new NotFoundException('Organization not found');
      if (org.ownerId !== userId) {
        throw new ForbiddenException('Only the organization owner can create workspaces in it');
      }
    }

    const ws = await this.prisma.workspace.create({
      data: {
        organizationId: orgId,
        name:           input.name.trim(),
        description:    input.description?.trim() || null,
        members:        { create: { userId, role: 'owner' } },
      },
      include: { organization: true },
    });

    await this.audit.log({
      workspaceId: ws.id, actorId: userId, action: 'workspace.created',
      targetType:  'workspace', targetId: ws.id, after: { name: ws.name },
    });
    return ws;
  }

  async rename(workspaceId: string, userId: string, patch: { name?: string; description?: string }) {
    await this.assertCan(workspaceId, userId, 'workspace.edit');
    const before = await this.prisma.workspace.findUnique({
      where: { id: workspaceId }, select: { name: true, description: true },
    });
    const updated = await this.prisma.workspace.update({
      where: { id: workspaceId },
      data:  {
        ...(patch.name !== undefined        ? { name: patch.name.trim() } : {}),
        ...(patch.description !== undefined ? { description: patch.description.trim() || null } : {}),
      },
    });
    await this.audit.log({
      workspaceId, actorId: userId, action: 'workspace.renamed',
      targetType:  'workspace', targetId: workspaceId, before, after: { name: updated.name, description: updated.description },
    });
    return updated;
  }

  async remove(workspaceId: string, userId: string) {
    await this.assertCan(workspaceId, userId, 'workspace.delete');
    await this.audit.log({
      workspaceId, actorId: userId, action: 'workspace.deleted',
      targetType: 'workspace', targetId: workspaceId,
    });
    await this.prisma.workspace.delete({ where: { id: workspaceId } });
    return { ok: true };
  }

  // ---------------------------------------------------------------------------
  //  Mutations — members
  // ---------------------------------------------------------------------------

  async listMembers(workspaceId: string, userId: string) {
    await this.assertCan(workspaceId, userId, 'member.view');
    return this.prisma.workspaceMember.findMany({
      where:   { workspaceId },
      include: {
        user:      { select: { id: true, name: true, email: true } },
        invitedBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { joinedAt: 'asc' },
    });
  }

  async changeRole(workspaceId: string, actorId: string, memberId: string, newRole: WorkspaceRole) {
    const actorRole = await this.assertCan(workspaceId, actorId, 'member.role_change');
    if (!WORKSPACE_ROLES.includes(newRole)) throw new BadRequestException('Invalid role');

    const target = await this.prisma.workspaceMember.findUnique({
      where:  { id: memberId },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    if (!target || target.workspaceId !== workspaceId) throw new NotFoundException('Member not found');

    // Can't manipulate an owner unless YOU are an owner (and you can't demote
    // the LAST owner — see ownership.transfer for that).
    if (target.role === 'owner' && actorRole !== 'owner') {
      throw new ForbiddenException('Only an owner can change another owner\'s role');
    }
    if (newRole === 'owner') {
      throw new BadRequestException('Use the ownership-transfer endpoint to promote an owner');
    }
    // TS narrows newRole to non-owner here because we threw above on `newRole === 'owner'`.
    if (target.role === 'owner') {
      const ownerCount = await this.prisma.workspaceMember.count({ where: { workspaceId, role: 'owner' } });
      if (ownerCount <= 1) throw new BadRequestException('Cannot demote the last owner');
    }

    const before = { role: target.role };
    const updated = await this.prisma.workspaceMember.update({
      where: { id: memberId }, data: { role: newRole },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    await this.audit.log({
      workspaceId, actorId, action: 'member.role_changed',
      targetType:  'member', targetId: memberId, before, after: { role: newRole },
    });
    return updated;
  }

  async removeMember(workspaceId: string, actorId: string, memberId: string) {
    const actorRole = await this.assertCan(workspaceId, actorId, 'member.remove');
    const target = await this.prisma.workspaceMember.findUnique({
      where:  { id: memberId },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    if (!target || target.workspaceId !== workspaceId) throw new NotFoundException('Member not found');

    // Same protections as changeRole.
    if (target.role === 'owner' && actorRole !== 'owner') {
      throw new ForbiddenException('Only an owner can remove another owner');
    }
    if (target.role === 'owner') {
      const ownerCount = await this.prisma.workspaceMember.count({ where: { workspaceId, role: 'owner' } });
      if (ownerCount <= 1) throw new BadRequestException('Cannot remove the last owner');
    }

    await this.prisma.workspaceMember.delete({ where: { id: memberId } });
    await this.audit.log({
      workspaceId, actorId, action: 'member.removed',
      targetType:  'member', targetId: memberId, before: { userId: target.userId, role: target.role },
    });
    await this.activity.log(workspaceId, actorId, 'member.removed', {
      kind: 'member', id: target.userId, name: target.user?.name || target.user?.email,
    });
    return { ok: true };
  }

  async transferOwnership(workspaceId: string, actorId: string, toUserId: string) {
    const actorRole = await this.assertCan(workspaceId, actorId, 'ownership.transfer');
    if (actorRole !== 'owner') throw new ForbiddenException('Only an owner can transfer ownership');
    if (toUserId === actorId) throw new BadRequestException('You already own this workspace');

    const target = await this.prisma.workspaceMember.findUnique({
      where:  { workspaceId_userId: { workspaceId, userId: toUserId } },
      select: { id: true, role: true },
    });
    if (!target) throw new BadRequestException('Target user is not a workspace member');

    await this.prisma.$transaction([
      this.prisma.workspaceMember.update({ where: { id: target.id }, data: { role: 'owner' } }),
      // Demote the actor to admin so there's still a clear chain of authority.
      this.prisma.workspaceMember.update({
        where: { workspaceId_userId: { workspaceId, userId: actorId } },
        data:  { role: 'admin' },
      }),
    ]);
    await this.audit.log({
      workspaceId, actorId, action: 'ownership.transferred',
      targetType: 'member', targetId: target.id,
      before: { ownerId: actorId }, after: { ownerId: toUserId },
    });
    return { ok: true };
  }

  // ---------------------------------------------------------------------------
  //  Mutations — invites
  // ---------------------------------------------------------------------------

  async listInvites(workspaceId: string, userId: string) {
    await this.assertCan(workspaceId, userId, 'member.invite');
    return this.prisma.workspaceInvite.findMany({
      where:   { workspaceId, acceptedAt: null, revokedAt: null },
      include: { createdBy: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async invite(workspaceId: string, actorId: string, input: { email: string; role: WorkspaceRole }) {
    await this.assertCan(workspaceId, actorId, 'member.invite');
    const email = input.email?.trim().toLowerCase();
    if (!email) throw new BadRequestException('Email is required');
    if (!WORKSPACE_ROLES.includes(input.role) || input.role === 'owner') {
      throw new BadRequestException('Invalid role for invitation');
    }

    // If the email belongs to an existing user already in the workspace, skip.
    const user = await this.prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (user) {
      const existing = await this.prisma.workspaceMember.findUnique({
        where:  { workspaceId_userId: { workspaceId, userId: user.id } },
        select: { id: true },
      });
      if (existing) throw new BadRequestException('User is already a member of this workspace');
    }

    // Reuse any pending invite for the same email/role.
    const pending = await this.prisma.workspaceInvite.findFirst({
      where: { workspaceId, email, acceptedAt: null, revokedAt: null },
    });
    if (pending) return pending;

    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);
    const invite = await this.prisma.workspaceInvite.create({
      data: { workspaceId, email, role: input.role, token, expiresAt, createdById: actorId },
    });
    await this.audit.log({
      workspaceId, actorId, action: 'member.invited',
      targetType: 'invite', targetId: invite.id, after: { email, role: input.role },
    });
    // Phase 39.1E — best-effort email delivery. Failure is non-fatal; the
    // copy-link UI in InviteMemberModal continues to work as a fallback.
    await this.sendInviteEmail(invite.id);
    return invite;
  }

  /**
   * Phase 39.1E — resend the invitation email. Useful when the user typed
   * the email wrong, lost it, or the provider was down at create time.
   * Rotates the token + extends the expiry so the link stays usable.
   */
  async resendInvite(workspaceId: string, actorId: string, inviteId: string) {
    await this.assertCan(workspaceId, actorId, 'member.invite');
    const invite = await this.prisma.workspaceInvite.findUnique({ where: { id: inviteId } });
    if (!invite || invite.workspaceId !== workspaceId) throw new NotFoundException('Invite not found');
    if (invite.acceptedAt || invite.revokedAt) {
      throw new BadRequestException('Cannot resend an accepted or revoked invitation');
    }
    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);
    const updated = await this.prisma.workspaceInvite.update({
      where: { id: inviteId },
      data:  { token, expiresAt },
    });
    await this.sendInviteEmail(updated.id);
    return updated;
  }

  /**
   * Phase 39.1E — helper that hydrates the workspace + inviter, then fires
   * the email. Swallows mail-provider failures so the invite stays intact.
   */
  private async sendInviteEmail(inviteId: string): Promise<void> {
    const invite = await this.prisma.workspaceInvite.findUnique({
      where: { id: inviteId },
      include: {
        workspace: { select: { name: true } },
        createdBy: { select: { name: true, email: true } },
      },
    });
    if (!invite) return;
    try {
      await this.email.sendWorkspaceInviteEmail({
        to:            invite.email,
        inviterName:   invite.createdBy.name || invite.createdBy.email,
        workspaceName: invite.workspace.name,
        role:          invite.role,
        token:         invite.token,
        expiresAt:     invite.expiresAt,
      });
    } catch (e: any) {
      this.logger.warn(`Invite email dispatch failed for ${invite.email}: ${e?.message}`);
    }
  }

  async revokeInvite(workspaceId: string, actorId: string, inviteId: string) {
    await this.assertCan(workspaceId, actorId, 'member.invite');
    const invite = await this.prisma.workspaceInvite.findUnique({ where: { id: inviteId } });
    if (!invite || invite.workspaceId !== workspaceId) throw new NotFoundException('Invite not found');
    if (invite.acceptedAt || invite.revokedAt) return invite;

    const updated = await this.prisma.workspaceInvite.update({
      where: { id: inviteId }, data: { revokedAt: new Date() },
    });
    await this.audit.log({
      workspaceId, actorId, action: 'member.invite_revoked',
      targetType: 'invite', targetId: inviteId, before: { email: invite.email, role: invite.role },
    });
    return updated;
  }

  /**
   * Public accept endpoint — the caller is whoever clicks the link. The
   * invited email must match the caller's account.
   */
  async acceptInvite(token: string, userId: string) {
    const invite = await this.prisma.workspaceInvite.findUnique({ where: { token } });
    if (!invite) throw new NotFoundException('Invalid invitation link');
    if (invite.acceptedAt) throw new BadRequestException('This invitation has already been used');
    if (invite.revokedAt)  throw new BadRequestException('This invitation has been revoked');
    if (invite.expiresAt < new Date()) throw new BadRequestException('This invitation has expired');

    const user = await this.prisma.user.findUnique({
      where:  { id: userId }, select: { id: true, email: true },
    });
    if (!user) throw new ForbiddenException('Not authenticated');
    if (user.email.toLowerCase() !== invite.email.toLowerCase()) {
      throw new ForbiddenException('This invitation was sent to a different email address');
    }

    // Idempotent: if already a member, just consume the invite.
    const existing = await this.prisma.workspaceMember.findUnique({
      where:  { workspaceId_userId: { workspaceId: invite.workspaceId, userId } },
      select: { id: true },
    });

    await this.prisma.$transaction(async (tx) => {
      if (!existing) {
        await tx.workspaceMember.create({
          data: {
            workspaceId: invite.workspaceId,
            userId,
            role:        invite.role,
            invitedById: invite.createdById,
          },
        });
      }
      await tx.workspaceInvite.update({
        where: { id: invite.id }, data: { acceptedAt: new Date() },
      });
    });

    await this.audit.log({
      workspaceId: invite.workspaceId, actorId: userId, action: 'member.invite_accepted',
      targetType: 'invite', targetId: invite.id, after: { userId, role: invite.role },
    });
    await this.activity.log(invite.workspaceId, userId, 'member.joined', {
      kind: 'member', id: userId, name: user.email,
    });
    return { workspaceId: invite.workspaceId, role: invite.role };
  }
}

// =============================================================================
//  Helpers
// =============================================================================

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'workspace';
}
