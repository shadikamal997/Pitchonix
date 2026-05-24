import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SlideAnimationsService, AnimationInput } from './slide-animations.service';

// =============================================================================
//  Phase 38H — SlideAnimationsController
//
//    GET    /elements/:id/animations
//    POST   /elements/:id/animations              { effect, duration, ... }
//    PATCH  /elements/:id/animations/:animId
//    DELETE /elements/:id/animations/:animId
//    POST   /elements/:id/animations/reorder      { ids: string[] }
//    POST   /slides/:slideId/animations/clear     (clears every element)
// =============================================================================

@ApiTags('Slide Animations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller()
export class SlideAnimationsController {
  constructor(private animations: SlideAnimationsService) {}

  @Get('elements/:id/animations')
  list(@Param('id') id: string) {
    return this.animations.list(id);
  }

  @Post('elements/:id/animations')
  @ApiOperation({ summary: 'Add an animation to an element (Phase 38H)' })
  add(@Param('id') id: string, @Body() body: AnimationInput) {
    return this.animations.add(id, body);
  }

  @Patch('elements/:id/animations/:animId')
  update(
    @Param('id') id: string,
    @Param('animId') animId: string,
    @Body() body: Partial<AnimationInput>,
  ) {
    return this.animations.update(id, animId, body || {});
  }

  @Delete('elements/:id/animations/:animId')
  remove(@Param('id') id: string, @Param('animId') animId: string) {
    return this.animations.remove(id, animId);
  }

  @Post('elements/:id/animations/reorder')
  reorder(@Param('id') id: string, @Body() body: { ids: string[] }) {
    return this.animations.reorder(id, body?.ids ?? []);
  }

  @Post('slides/:slideId/animations/clear')
  clearForSlide(@Param('slideId') slideId: string) {
    return this.animations.clearForSlide(slideId);
  }
}
