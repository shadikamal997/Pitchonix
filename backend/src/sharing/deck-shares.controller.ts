import {
  Controller, Get, Post, Patch, Delete, Param, Body, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser } from '../auth/get-user.decorator';
import { RequireRole } from '../workspaces/role.guard';
import { DeckSharesService, DeckPermission, SharingMode } from './deck-shares.service';

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
  constructor(private readonly shares: DeckSharesService) {}

  @Get('projects/:projectId/shares')
  @ApiOperation({ summary: 'List explicit DeckShare grants for a project' })
  @RequireRole('deck.share', { kind: 'workspaceFromProject', param: 'projectId' })
  list(@Param('projectId') projectId: string, @GetUser() user: any) {
    return this.shares.list(projectId, user.id);
  }

  @Post('projects/:projectId/shares')
  @ApiOperation({ summary: 'Grant a workspace member access (or update their permission)' })
  @RequireRole('deck.share', { kind: 'workspaceFromProject', param: 'projectId' })
  upsert(
    @Param('projectId') projectId: string,
    @GetUser() user: any,
    @Body() body: { memberId: string; permission: DeckPermission },
  ) {
    return this.shares.upsert(projectId, user.id, body);
  }

  @Delete('projects/:projectId/shares/:shareId')
  @ApiOperation({ summary: 'Revoke an explicit grant' })
  @RequireRole('deck.share', { kind: 'workspaceFromProject', param: 'projectId' })
  revoke(
    @Param('projectId') projectId: string,
    @Param('shareId') shareId: string,
    @GetUser() user: any,
  ) {
    return this.shares.revoke(projectId, user.id, shareId);
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
