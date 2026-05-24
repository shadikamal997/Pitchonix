import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LayoutTemplatesService, LayoutTemplateInput } from './layout-templates.service';

// =============================================================================
//  Phase 38B — LayoutTemplatesController
//
//    GET    /layout-templates?workspaceId=…   — list (workspace + global)
//    POST   /layout-templates                 — create
//    GET    /layout-templates/:id             — detail
//    PATCH  /layout-templates/:id             — update
//    DELETE /layout-templates/:id             — remove
//    POST   /layout-templates/from-slide/:slideId — Convert Slide → Layout
//    POST   /layout-templates/:id/apply-to-slide/:slideId — apply
// =============================================================================

@ApiTags('Layout Templates')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller()
export class LayoutTemplatesController {
  constructor(private layouts: LayoutTemplatesService) {}

  @Get('layout-templates')
  list(@Query('workspaceId') workspaceId?: string) {
    return this.layouts.list(workspaceId || null);
  }

  @Post('layout-templates')
  create(@Body() body: LayoutTemplateInput) {
    return this.layouts.create(body || {});
  }

  @Get('layout-templates/:id')
  findOne(@Param('id') id: string) {
    return this.layouts.findOne(id);
  }

  @Patch('layout-templates/:id')
  update(@Param('id') id: string, @Body() body: LayoutTemplateInput) {
    return this.layouts.update(id, body || {});
  }

  @Delete('layout-templates/:id')
  remove(@Param('id') id: string) {
    return this.layouts.remove(id);
  }

  @Post('layout-templates/from-slide/:slideId')
  @ApiOperation({ summary: 'Convert a slide into a reusable layout (Phase 38B)' })
  fromSlide(
    @Param('slideId') slideId: string,
    @Body() body: { name?: string; workspaceId?: string | null },
  ) {
    return this.layouts.fromSlide(slideId, body?.name || '', body?.workspaceId ?? null);
  }

  @Post('layout-templates/:id/apply-to-slide/:slideId')
  applyToSlide(@Param('id') id: string, @Param('slideId') slideId: string) {
    return this.layouts.applyToSlide(id, slideId);
  }
}
