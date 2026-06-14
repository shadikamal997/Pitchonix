import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser } from '../auth/get-user.decorator';
import { RequireRole } from '../workspaces/role.guard';
import { DeckSharesService, DeckPermission, SharingMode } from './deck-shares.service';
import { WorkspaceAuditService } from '../workspaces/workspace-audit.service';

// =============================================================================
//  Phase 39.1D — DeckSharesController
//
//    GET    /projects/:projectId/shares              — list explicit grants
//    POST   /projects/:projectId/shares              — add/update a grant
//    DELETE /projects/:projectId/shares/:shareId     — revoke a grant
//    PATCH  /projects/:projectId/sharing-mode        — switch private/workspace/shared
//    GET    /projects/:projectId/my-permission       — caller's effective permission
// =============================================================================

@ApiTags('Deck Sharing')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller()
export class DeckSharesController {
  constructor(
    private readonly shares: DeckSharesService,
    private readonly auditService: WorkspaceAuditService,
  ) {}

  @Get('projects/:projectId/shares')
  @ApiOperation({ summary: 'List explicit DeckShare grants for a project' })
  @RequireRole('deck.share', { kind: 'workspaceFromProject', param: 'projectId' })
  list(@Param('projectId') projectId: string, @GetUser() user: any) {
    return this.shares.list(projectId, user.id);
  }

  @Post('projects/:projectId/shares')
  @ApiOperation({ summary: 'Grant a workspace member access (or update their permission)' })
  @RequireRole('deck.share', { kind: 'workspaceFromProject', param: 'projectId' })
  async upsert(
    @Param('projectId') projectId: string,
    @GetUser() user: any,
    @Body() body: { memberId: string; permission: DeckPermission },
    @Req() req: any,
  ) {
    const result = await this.shares.upsert(projectId, user.id, body);
    const wid = req.workspaceContext?.workspaceId;
    if (wid) {
      void this.auditService.log({
        workspaceId: wid,
        actorId: user.id,
        action: 'share.created',
        targetType: 'project',
        targetId: projectId,
        after: { memberId: body.memberId, permission: body.permission },
      }).catch(() => {});
    }
    return result;
  }

  @Delete('projects/:projectId/shares/:shareId')
  @ApiOperation({ summary: 'Revoke an explicit grant' })
  @RequireRole('deck.share', { kind: 'workspaceFromProject', param: 'projectId' })
  async revoke(
    @Param('projectId') projectId: string,
    @Param('shareId') shareId: string,
    @GetUser() user: any,
    @Req() req: any,
  ) {
    const result = await this.shares.revoke(projectId, user.id, shareId);
    const wid = req.workspaceContext?.workspaceId;
    if (wid) {
      void this.auditService.log({
        workspaceId: wid,
        actorId: user.id,
        action: 'share.revoked',
        targetType: 'project',
        targetId: projectId,
        before: { shareId },
      }).catch(() => {});
    }
    return result;
  }

  @Patch('projects/:projectId/sharing-mode')
  @ApiOperation({ summary: 'Set sharing visibility (private | workspace | shared)' })
  @RequireRole('deck.share', { kind: 'workspaceFromProject', param: 'projectId' })
  setMode(
    @Param('projectId') projectId: string,
    @GetUser() user: any,
    @Body() body: { mode: SharingMode },
  ) {
    return this.shares.setMode(projectId, user.id, body.mode);
  }

  /**
   * No @RequireRole — the resolver itself answers "what can the caller do".
   * Callers who aren't even members will get null permission.
   */
  @Get('projects/:projectId/my-permission')
  @ApiOperation({ summary: "Resolve the caller's effective deck permission" })
  async myPermission(@Param('projectId') projectId: string, @GetUser() user: any) {
    const permission = await this.shares.resolvePermission(projectId, user.id);
    return { permission };
  }
}
