import {
  Controller, Get, Post, Patch, Delete, Param, Body, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser } from '../auth/get-user.decorator';
import { RequireRole } from '../workspaces/role.guard';
import { VersionHistoryService } from './version-history.service';
import { CreateSnapshotInput, DeckVersionDTO } from './version-types';

@ApiTags('Version History')
@Controller()
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class VersionHistoryController {
  constructor(private readonly versions: VersionHistoryService) {}

  // ---------------------------------------------------------------------------
  //  Per-deck history
  // ---------------------------------------------------------------------------

  @Get('decks/:deckId/versions')
  @ApiOperation({ summary: 'List all versions of a deck (newest first)' })
  @RequireRole('deck.view', { kind: 'workspaceFromDeck', param: 'deckId' })
  async list(@Param('deckId') deckId: string, @GetUser() user: any): Promise<DeckVersionDTO[]> {
    await this.versions.assertDeckOwnership(deckId, user.id);
    return this.versions.listVersions(deckId);
  }

  @Post('decks/:deckId/versions')
  @ApiOperation({ summary: 'Manually save a snapshot of the current deck state' })
  @RequireRole('deck.edit', { kind: 'workspaceFromDeck', param: 'deckId' })
  async create(
    @Param('deckId') deckId: string,
    @Body() body: CreateSnapshotInput,
    @GetUser() user: any,
  ) {
    await this.versions.assertDeckOwnership(deckId, user.id);
    return this.versions.createSnapshot(deckId, { ...body, userId: user.id });
  }

  // ---------------------------------------------------------------------------
  //  Per-version actions
  // ---------------------------------------------------------------------------

  @Get('versions/:versionId')
  @ApiOperation({ summary: 'Get a single version including its snapshot payload (for preview)' })
  @RequireRole('deck.view', { kind: 'workspaceFromVersion', param: 'versionId' })
  async getOne(@Param('versionId') versionId: string, @GetUser() user: any) {
    const v = await this.versions.getVersion(versionId);
    await this.versions.assertDeckOwnership(v.meta.deckId, user.id);
    return v;
  }

  @Post('versions/:versionId/restore')
  @ApiOperation({ summary: 'Restore the deck to this version (safety snapshot is taken first)' })
  @RequireRole('versionHistory.restore', { kind: 'workspaceFromVersion', param: 'versionId' })
  async restore(@Param('versionId') versionId: string, @GetUser() user: any) {
    const v = await this.versions.getVersion(versionId);
    await this.versions.assertDeckOwnership(v.meta.deckId, user.id);
    return this.versions.restoreVersion(versionId, user.id);
  }

  @Get('versions/:a/diff/:b')
  @ApiOperation({ summary: 'Compare two versions and return a structured diff' })
  @RequireRole('deck.view', { kind: 'workspaceFromVersion', param: 'a' })
  async diff(@Param('a') a: string, @Param('b') b: string, @GetUser() user: any) {
    const va = await this.versions.getVersion(a);
    await this.versions.assertDeckOwnership(va.meta.deckId, user.id);
    return this.versions.compareVersions(a, b);
  }

  @Patch('versions/:versionId')
  @ApiOperation({ summary: 'Rename a version or update its description' })
  @RequireRole('versionHistory.restore', { kind: 'workspaceFromVersion', param: 'versionId' })
  async rename(
    @Param('versionId') versionId: string,
    @Body() body: { name?: string; description?: string },
    @GetUser() user: any,
  ) {
    const v = await this.versions.getVersion(versionId);
    await this.versions.assertDeckOwnership(v.meta.deckId, user.id);
    return this.versions.renameVersion(versionId, body);
  }

  @Delete('versions/:versionId')
  @ApiOperation({ summary: 'Delete a version row (no restore possible after this)' })
  @RequireRole('versionHistory.delete', { kind: 'workspaceFromVersion', param: 'versionId' })
  async remove(@Param('versionId') versionId: string, @GetUser() user: any): Promise<void> {
    const v = await this.versions.getVersion(versionId);
    await this.versions.assertDeckOwnership(v.meta.deckId, user.id);
    return this.versions.deleteVersion(versionId);
  }
}
