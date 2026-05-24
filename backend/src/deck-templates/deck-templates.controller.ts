import { Controller, Get, Post, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DeckTemplatesService, DeckTemplateInput } from './deck-templates.service';

// =============================================================================
//  Phase 38P — DeckTemplatesController
//
//    GET    /deck-templates?workspaceId=…
//    GET    /deck-templates/:id
//    POST   /deck-templates/from-deck/:deckId      { name, … }
//    POST   /deck-templates/:id/instantiate        { projectId, title }
//    DELETE /deck-templates/:id
// =============================================================================

@ApiTags('Deck Templates')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller()
export class DeckTemplatesController {
  constructor(private templates: DeckTemplatesService) {}

  @Get('deck-templates')
  list(@Query('workspaceId') workspaceId?: string) {
    return this.templates.list({ workspaceId: workspaceId || null });
  }

  @Get('deck-templates/:id')
  findOne(@Param('id') id: string) {
    return this.templates.findOne(id);
  }

  @Post('deck-templates/from-deck/:deckId')
  @ApiOperation({ summary: 'Convert a deck into a reusable template (Phase 38P)' })
  fromDeck(@Param('deckId') deckId: string, @Body() body: DeckTemplateInput) {
    return this.templates.fromDeck(deckId, body || {});
  }

  @Post('deck-templates/:id/instantiate')
  @ApiOperation({ summary: 'Spin up a new deck from a template' })
  instantiate(@Param('id') id: string, @Body() body: { projectId: string; title?: string }) {
    return this.templates.instantiate(id, body.projectId, body.title);
  }

  @Delete('deck-templates/:id')
  remove(@Param('id') id: string) {
    return this.templates.remove(id);
  }
}
