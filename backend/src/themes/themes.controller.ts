import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ThemesService, ThemeInput } from './themes.service';

// =============================================================================
//  Phase 38C — ThemesController
//
//    GET    /themes?deckId=…&workspaceId=…  — list applicable themes
//    POST   /themes                          — create (workspace or deck)
//    GET    /themes/:id                      — detail
//    PATCH  /themes/:id                      — update tokens / name
//    DELETE /themes/:id                      — remove
//    POST   /themes/:id/apply-to-deck/:deckId  — assign theme to every slide
//    POST   /themes/:id/apply-to-slide/:slideId
// =============================================================================

@ApiTags('Themes')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller()
export class ThemesController {
  constructor(private themes: ThemesService) {}

  @Get('themes')
  list(
    @Query('deckId') deckId?: string,
    @Query('workspaceId') workspaceId?: string,
  ) {
    return this.themes.list({ deckId: deckId || null, workspaceId: workspaceId || null });
  }

  @Post('themes')
  create(@Body() body: ThemeInput) {
    return this.themes.create(body || {});
  }

  @Get('themes/:id')
  findOne(@Param('id') id: string) {
    return this.themes.findOne(id);
  }

  @Patch('themes/:id')
  update(@Param('id') id: string, @Body() body: ThemeInput) {
    return this.themes.update(id, body || {});
  }

  @Delete('themes/:id')
  remove(@Param('id') id: string) {
    return this.themes.remove(id);
  }

  @Post('themes/:id/apply-to-deck/:deckId')
  @ApiOperation({ summary: 'Apply theme to every slide of a deck' })
  applyToDeck(@Param('id') id: string, @Param('deckId') deckId: string) {
    return this.themes.applyToDeck(id, deckId);
  }

  @Post('themes/:id/apply-to-slide/:slideId')
  applyToSlide(@Param('id') id: string, @Param('slideId') slideId: string) {
    return this.themes.applyToSlide(id, slideId);
  }
}
