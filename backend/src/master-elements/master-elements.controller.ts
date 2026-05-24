import {
  Controller, Get, Post, Patch, Delete, Param, Body, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser } from '../auth/get-user.decorator';
import { RequireRole } from '../workspaces/role.guard';
import { MasterElementsService } from './master-elements.service';
import { MasterElementDTO, DeckMasterSettings } from './master-element-types';

/**
 * REST API for deck-wide master elements + master settings (Phase 32.75).
 *
 *   GET    /api/decks/:deckId/masters                 list masters
 *   POST   /api/decks/:deckId/masters                 create master
 *   PATCH  /api/decks/:deckId/masters/:masterId       update master
 *   DELETE /api/decks/:deckId/masters/:masterId       delete master
 *   GET    /api/decks/:deckId/masters/settings        read deck master settings
 *   PATCH  /api/decks/:deckId/masters/settings        update deck master settings
 */
@ApiTags('Master Elements')
@Controller('decks/:deckId/masters')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MasterElementsController {
  constructor(private readonly masters: MasterElementsService) {}

  @Get()
  @ApiOperation({ summary: 'List all master elements on a deck' })
  @RequireRole('deck.view', { kind: 'workspaceFromDeck', param: 'deckId' })
  async list(@Param('deckId') deckId: string, @GetUser() user: any): Promise<MasterElementDTO[]> {
    await this.masters.assertDeckOwnership(deckId, user.id);
    return this.masters.listForDeck(deckId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a master element on a deck' })
  @RequireRole('masters.edit', { kind: 'workspaceFromDeck', param: 'deckId' })
  async create(
    @Param('deckId') deckId: string,
    @Body() body: Partial<MasterElementDTO>,
    @GetUser() user: any,
  ): Promise<MasterElementDTO> {
    await this.masters.assertDeckOwnership(deckId, user.id);
    return this.masters.create(deckId, body);
  }

  @Patch(':masterId')
  @ApiOperation({ summary: 'Update a master element' })
  @RequireRole('masters.edit', { kind: 'workspaceFromDeck', param: 'deckId' })
  async update(
    @Param('deckId') deckId: string,
    @Param('masterId') masterId: string,
    @Body() body: Partial<MasterElementDTO>,
    @GetUser() user: any,
  ): Promise<MasterElementDTO> {
    await this.masters.assertDeckOwnership(deckId, user.id);
    return this.masters.update(deckId, masterId, body);
  }

  @Delete(':masterId')
  @ApiOperation({ summary: 'Delete a master element' })
  @RequireRole('masters.edit', { kind: 'workspaceFromDeck', param: 'deckId' })
  async remove(
    @Param('deckId') deckId: string,
    @Param('masterId') masterId: string,
    @GetUser() user: any,
  ): Promise<void> {
    await this.masters.assertDeckOwnership(deckId, user.id);
    return this.masters.remove(deckId, masterId);
  }

  @Get('settings')
  @ApiOperation({ summary: 'Read deck-level master settings (show/hide flags)' })
  @RequireRole('deck.view', { kind: 'workspaceFromDeck', param: 'deckId' })
  async getSettings(@Param('deckId') deckId: string, @GetUser() user: any) {
    await this.masters.assertDeckOwnership(deckId, user.id);
    return this.masters.getSettings(deckId);
  }

  @Patch('settings')
  @ApiOperation({ summary: 'Update deck-level master settings' })
  @RequireRole('masters.edit', { kind: 'workspaceFromDeck', param: 'deckId' })
  async updateSettings(
    @Param('deckId') deckId: string,
    @Body() body: DeckMasterSettings,
    @GetUser() user: any,
  ) {
    await this.masters.assertDeckOwnership(deckId, user.id);
    return this.masters.updateSettings(deckId, body);
  }
}
