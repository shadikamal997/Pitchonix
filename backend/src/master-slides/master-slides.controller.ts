import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MasterSlidesService, MasterSlideInput } from './master-slides.service';

// =============================================================================
//  Phase 38A — MasterSlidesController
//
//    GET    /decks/:deckId/master-slides         — list deck masters
//    POST   /decks/:deckId/master-slides         — create master
//    GET    /master-slides/:id                   — detail
//    PATCH  /master-slides/:id                   — update
//    POST   /master-slides/:id/duplicate         — clone
//    DELETE /master-slides/:id                   — remove (slides fall back)
//    POST   /master-slides/:id/apply-to-deck     — link every slide in deck
//    POST   /master-slides/:id/apply-to-slides   — link given slide ids
//    POST   /decks/:deckId/master-slides/unlink-all — clear all masterSlideId
// =============================================================================

@ApiTags('Master Slides')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller()
export class MasterSlidesController {
  constructor(private masters: MasterSlidesService) {}

  @Get('decks/:deckId/master-slides')
  @ApiOperation({ summary: 'List masters for a deck (Phase 38A)' })
  list(@Param('deckId') deckId: string) {
    return this.masters.list(deckId);
  }

  @Post('decks/:deckId/master-slides')
  @ApiOperation({ summary: 'Create a master slide (Phase 38A)' })
  create(@Param('deckId') deckId: string, @Body() body: MasterSlideInput) {
    return this.masters.create(deckId, body || {});
  }

  @Get('master-slides/:id')
  @ApiOperation({ summary: 'Get master slide detail' })
  findOne(@Param('id') id: string) {
    return this.masters.findOne(id);
  }

  @Patch('master-slides/:id')
  @ApiOperation({ summary: 'Update master slide' })
  update(@Param('id') id: string, @Body() body: MasterSlideInput) {
    return this.masters.update(id, body || {});
  }

  @Post('master-slides/:id/duplicate')
  @ApiOperation({ summary: 'Duplicate master slide' })
  duplicate(@Param('id') id: string) {
    return this.masters.duplicate(id);
  }

  @Delete('master-slides/:id')
  @ApiOperation({ summary: 'Delete master slide' })
  remove(@Param('id') id: string) {
    return this.masters.remove(id);
  }

  @Post('master-slides/:id/apply-to-deck')
  @ApiOperation({ summary: 'Apply this master to every slide in the deck' })
  applyToDeck(@Param('id') id: string) {
    return this.masters.applyToDeck(id);
  }

  @Post('master-slides/:id/apply-to-slides')
  @ApiOperation({ summary: 'Apply this master to given slide ids' })
  applyToSlides(@Param('id') id: string, @Body() body: { slideIds: string[] }) {
    return this.masters.applyToSlides(id, body?.slideIds ?? []);
  }

  @Post('decks/:deckId/master-slides/unlink-all')
  @ApiOperation({ summary: 'Clear masterSlideId on every slide of a deck' })
  unlinkAll(@Param('deckId') deckId: string) {
    return this.masters.unlinkAll(deckId);
  }
}
