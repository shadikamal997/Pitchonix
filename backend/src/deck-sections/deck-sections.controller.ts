import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DeckSectionsService, SectionInput } from './deck-sections.service';

// =============================================================================
//  Phase 38G — DeckSectionsController
//
//    GET    /decks/:deckId/sections
//    POST   /decks/:deckId/sections
//    PATCH  /sections/:id
//    DELETE /sections/:id
//    POST   /decks/:deckId/sections/reorder   { ids: string[] }
//    POST   /sections/:id/duplicate
//    POST   /sections/:id/slides/:slideId     attach slide
//    POST   /slides/:slideId/section          { sectionId | null }   move slide
// =============================================================================

@ApiTags('Deck Sections')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller()
export class DeckSectionsController {
  constructor(private sections: DeckSectionsService) {}

  @Get('decks/:deckId/sections')
  list(@Param('deckId') deckId: string) {
    return this.sections.list(deckId);
  }

  @Post('decks/:deckId/sections')
  create(@Param('deckId') deckId: string, @Body() body: SectionInput) {
    return this.sections.create(deckId, body || {});
  }

  @Patch('sections/:id')
  update(@Param('id') id: string, @Body() body: SectionInput) {
    return this.sections.update(id, body || {});
  }

  @Delete('sections/:id')
  remove(@Param('id') id: string) {
    return this.sections.remove(id);
  }

  @Post('decks/:deckId/sections/reorder')
  @ApiOperation({ summary: 'Reorder sections (Phase 38G)' })
  reorder(@Param('deckId') deckId: string, @Body() body: { ids: string[] }) {
    return this.sections.reorder(deckId, body?.ids ?? []);
  }

  @Post('sections/:id/duplicate')
  @ApiOperation({ summary: 'Duplicate a section with all its slides' })
  duplicate(@Param('id') id: string) {
    return this.sections.duplicate(id);
  }

  @Post('sections/:id/slides/:slideId')
  addSlide(@Param('id') id: string, @Param('slideId') slideId: string) {
    return this.sections.addSlide(id, slideId);
  }

  @Post('slides/:slideId/section')
  moveSlide(@Param('slideId') slideId: string, @Body() body: { sectionId: string | null }) {
    return this.sections.moveSlide(slideId, body?.sectionId ?? null);
  }
}
