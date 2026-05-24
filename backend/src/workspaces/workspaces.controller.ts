import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser } from '../auth/get-user.decorator';
import { WorkspacesService } from './workspaces.service';
import { WorkspaceActivityService } from './workspace-activity.service';
import { WorkspaceAuditService } from './workspace-audit.service';
import { RequireRole } from './role.guard';
import type { WorkspaceRole } from './workspace-permissions';
import { permissionsFor } from './workspace-permissions';

// =============================================================================
//  Phase 39 — Workspaces controller
//
//  Routes are grouped by surface:
//
//    GET    /workspaces                          — my workspaces
//    POST   /workspaces                          — create
//    GET    /workspaces/:id                      — read
//    PATCH  /workspaces/:id                      — rename/edit
//    DELETE /workspaces/:id                      — delete (owner only)
//    GET    /workspaces/:id/permissions          — caller's permissions
//
//    GET    /workspaces/:id/members              — list members
//    PATCH  /workspaces/:id/members/:memberId    — change role
//    DELETE /workspaces/:id/members/:memberId    — remove member
//    POST   /workspaces/:id/transfer-ownership   — owner-only
//
//    GET    /workspaces/:id/invites              — pending invites
//    POST   /workspaces/:id/invites              — create invite
//    DELETE /workspaces/:id/invites/:inviteId    — revoke
//    POST   /workspace-invites/accept            — accept invite token
//
//    GET    /workspaces/:id/activity             — recent activity
//    GET    /workspaces/:id/audit-log            — admin audit trail
// =============================================================================

@ApiTags('Workspaces')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller()
export class WorkspacesController {
  constructor(
    private workspaces: WorkspacesService,
    private activity:   WorkspaceActivityService,
    private audit:      WorkspaceAuditService,
  ) {}

  // ---------- Workspace CRUD ----------

  @Get('workspaces')
  @ApiOperation({ summary: 'List workspaces the current user belongs to' })
  listMine(@GetUser() user: any) {
    return this.workspaces.listMine(user.id);
  }

  @Post('workspaces')
  @ApiOperation({ summary: 'Create a workspace (auto-creates a personal org if no organizationId)' })
  create(@GetUser() user: any, @Body() body: { name: string; description?: string; organizationId?: string }) {
    return this.workspaces.create(user.id, body);
  }

  @Get('workspaces/:id')
  @ApiOperation({ summary: 'Get a workspace by id (member-gated)' })
  @RequireRole('workspace.view', { kind: 'param', key: 'id' })
  read(@Param('id') id: string, @GetUser() user: any) {
    return this.workspaces.getById(id, user.id);
  }

  @Patch('workspaces/:id')
  @ApiOperation({ summary: 'Rename / edit workspace metadata' })
  @RequireRole('workspace.edit', { kind: 'param', key: 'id' })
  rename(@Param('id') id: string, @GetUser() user: any, @Body() body: { name?: string; description?: string }) {
    return this.workspaces.rename(id, user.id, body);
  }

  @Delete('workspaces/:id')
  @ApiOperation({ summary: 'Delete a workspace (owner only)' })
  @RequireRole('workspace.delete', { kind: 'param', key: 'id' })
  remove(@Param('id') id: string, @GetUser() user: any) {
    return this.workspaces.remove(id, user.id);
  }

  @Get('workspaces/:id/permissions')
  @ApiOperation({ summary: 'Resolved permissions for the current user in this workspace' })
  @RequireRole('workspace.view', { kind: 'param', key: 'id' })
  async permissions(@Param('id') id: string, @GetUser() user: any) {
    const { role } = await this.workspaces.assertMember(id, user.id);
    return { role, can: permissionsFor(role as WorkspaceRole) };
  }

  // ---------- Members ----------

  @Get('workspaces/:id/members')
  @ApiOperation({ summary: 'List workspace members' })
  @RequireRole('member.view', { kind: 'param', key: 'id' })
  listMembers(@Param('id') id: string, @GetUser() user: any) {
    return this.workspaces.listMembers(id, user.id);
  }

  @Patch('workspaces/:id/members/:memberId')
  @ApiOperation({ summary: 'Change a member\'s role' })
  @RequireRole('member.role_change', { kind: 'param', key: 'id' })
  changeRole(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @GetUser() user: any,
    @Body() body: { role: WorkspaceRole },
  ) {
    return this.workspaces.changeRole(id, user.id, memberId, body.role);
  }

  @Delete('workspaces/:id/members/:memberId')
  @ApiOperation({ summary: 'Remove a member' })
  @RequireRole('member.remove', { kind: 'param', key: 'id' })
  removeMember(@Param('id') id: string, @Param('memberId') memberId: string, @GetUser() user: any) {
    return this.workspaces.removeMember(id, user.id, memberId);
  }

  @Post('workspaces/:id/transfer-ownership')
  @ApiOperation({ summary: 'Transfer workspace ownership to another member' })
  @RequireRole('ownership.transfer', { kind: 'param', key: 'id' })
  transferOwnership(@Param('id') id: string, @GetUser() user: any, @Body() body: { toUserId: string }) {
    return this.workspaces.transferOwnership(id, user.id, body.toUserId);
  }

  // ---------- Invites ----------

  @Get('workspaces/:id/invites')
  @ApiOperation({ summary: 'List pending invites for a workspace' })
  @RequireRole('member.invite', { kind: 'param', key: 'id' })
  listInvites(@Param('id') id: string, @GetUser() user: any) {
    return this.workspaces.listInvites(id, user.id);
  }

  @Post('workspaces/:id/invites')
  @ApiOperation({ summary: 'Create / re-use a pending invite for an email' })
  @RequireRole('member.invite', { kind: 'param', key: 'id' })
  invite(@Param('id') id: string, @GetUser() user: any, @Body() body: { email: string; role: WorkspaceRole }) {
    return this.workspaces.invite(id, user.id, body);
  }

  @Delete('workspaces/:id/invites/:inviteId')
  @ApiOperation({ summary: 'Revoke a pending invite' })
  @RequireRole('member.invite', { kind: 'param', key: 'id' })
  revokeInvite(@Param('id') id: string, @Param('inviteId') inviteId: string, @GetUser() user: any) {
    return this.workspaces.revokeInvite(id, user.id, inviteId);
  }

  @Post('workspaces/:id/invites/:inviteId/resend')
  @ApiOperation({ summary: 'Re-send a pending invitation (rotates token, refreshes expiry)' })
  @RequireRole('member.invite', { kind: 'param', key: 'id' })
  resendInvite(@Param('id') id: string, @Param('inviteId') inviteId: string, @GetUser() user: any) {
    return this.workspaces.resendInvite(id, user.id, inviteId);
  }

  /**
   * Accept endpoint — not @RequireRole-guarded because the caller doesn't
   * have a workspace membership yet. Auth alone is enough; the service
   * matches the JWT user's email to the invite.
   */
  @Post('workspace-invites/accept')
  @ApiOperation({ summary: 'Accept a workspace invitation by token' })
  accept(@GetUser() user: any, @Body() body: { token: string }) {
    return this.workspaces.acceptInvite(body.token, user.id);
  }

  // ---------- Activity + Audit ----------

  @Get('workspaces/:id/activity')
  @ApiOperation({ summary: 'Recent activity feed for the workspace' })
  @RequireRole('activity.view', { kind: 'param', key: 'id' })
  listActivity(@Param('id') id: string, @Query('take') take?: string) {
    return this.activity.list(id, { take: take ? parseInt(take, 10) : undefined });
  }

  @Get('workspaces/:id/audit-log')
  @ApiOperation({ summary: 'Administrative audit log (admins+only)' })
  @RequireRole('audit.view', { kind: 'param', key: 'id' })
  listAudit(@Param('id') id: string, @Query('take') take?: string) {
    return this.audit.list(id, { take: take ? parseInt(take, 10) : undefined });
  }
}
