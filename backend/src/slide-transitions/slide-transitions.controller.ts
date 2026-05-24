import { Controller, Get, Put, Delete, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SlideTransitionsService, SlideTransition } from './slide-transitions.service';

// =============================================================================
//  Phase 38I — SlideTransitionsController
//
//    GET    /slides/:id/transition
//    PUT    /slides/:id/transition       { effect, duration, … }
//    DELETE /slides/:id/transition
//    POST   /decks/:deckId/transition    { effect, duration, … }  apply to all
// =============================================================================

@ApiTags('Slide Transitions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller()
export class SlideTransitionsController {
  constructor(private transitions: SlideTransitionsService) {}

  @Get('slides/:id/transition')
  get(@Param('id') id: string) {
    return this.transitions.get(id);
  }

  @Put('slides/:id/transition')
  @ApiOperation({ summary: 'Set per-slide transition (Phase 38I)' })
  set(@Param('id') id: string, @Body() body: SlideTransition) {
    return this.transitions.set(id, body);
  }

  @Delete('slides/:id/transition')
  clear(@Param('id') id: string) {
    return this.transitions.clear(id);
  }

  @Post('decks/:deckId/transition')
  @ApiOperation({ summary: 'Apply transition to every slide in a deck' })
  applyToDeck(@Param('deckId') deckId: string, @Body() body: SlideTransition) {
    return this.transitions.applyToDeck(deckId, body);
  }
}
