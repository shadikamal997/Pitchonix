import {
  Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, HttpException, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser } from '../auth/get-user.decorator';
import { RequireRole } from '../workspaces/role.guard';
import { SlideElementsService } from './slide-elements.service';
import { SlideElementsMigrationService } from './slide-elements-migration.service';
import { SlideElementDTO } from './element-types';

/**
 * REST API for atomic editable elements on a slide.
 *
 *   GET    /api/slides/:slideId/elements                  list elements
 *   POST   /api/slides/:slideId/elements                  create element
 *   PATCH  /api/slides/:slideId/elements/:elementId       update element
 *   DELETE /api/slides/:slideId/elements/:elementId       delete element
 *   POST   /api/slides/:slideId/elements/:elementId/duplicate
 *   POST   /api/slides/:slideId/elements/reorder          bulk reorder
 *   POST   /api/slides/:slideId/elements/ensure-migrated  idempotent migrate
 *   POST   /api/slides/:slideId/elements/remigrate        force remigrate
 */
@ApiTags('Slide Elements')
@Controller('slides/:slideId/elements')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SlideElementsController {
  constructor(
    private readonly elements:  SlideElementsService,
    private readonly migration: SlideElementsMigrationService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all editable elements on a slide' })
  @RequireRole('elements.view', { kind: 'workspaceFromSlide', param: 'slideId' })
  async list(
    @Param('slideId') slideId: string,
    @GetUser() user: any,
  ): Promise<SlideElementDTO[]> {
    await this.elements.assertSlideOwnership(slideId, user.id);
    return this.elements.listForSlide(slideId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new element on a slide' })
  @RequireRole('elements.edit', { kind: 'workspaceFromSlide', param: 'slideId' })
  async create(
    @Param('slideId') slideId: string,
    @Body() body: Partial<SlideElementDTO>,
    @GetUser() user: any,
  ): Promise<SlideElementDTO> {
    await this.elements.assertSlideOwnership(slideId, user.id);
    if (!body.type) throw new HttpException('type is required', HttpStatus.BAD_REQUEST);
    return this.elements.create(slideId, body);
  }

  @Patch(':elementId')
  @ApiOperation({ summary: 'Update an element (partial)' })
  @RequireRole('elements.edit', { kind: 'workspaceFromElement', param: 'elementId' })
  async update(
    @Param('slideId')   _slideId: string,
    @Param('elementId') elementId: string,
    @Body() patch: Partial<SlideElementDTO>,
    @GetUser() user: any,
  ): Promise<SlideElementDTO> {
    await this.elements.assertElementOwnership(elementId, user.id);
    return this.elements.update(elementId, patch);
  }

  @Delete(':elementId')
  @ApiOperation({ summary: 'Delete an element' })
  @RequireRole('elements.edit', { kind: 'workspaceFromElement', param: 'elementId' })
  async remove(
    @Param('slideId')   _slideId: string,
    @Param('elementId') elementId: string,
    @GetUser() user: any,
  ): Promise<{ id: string }> {
    await this.elements.assertElementOwnership(elementId, user.id);
    return this.elements.remove(elementId);
  }

  @Post(':elementId/duplicate')
  @ApiOperation({ summary: 'Duplicate an element on the same slide' })
  @RequireRole('elements.edit', { kind: 'workspaceFromElement', param: 'elementId' })
  async duplicate(
    @Param('slideId')   _slideId: string,
    @Param('elementId') elementId: string,
    @GetUser() user: any,
  ): Promise<SlideElementDTO> {
    await this.elements.assertElementOwnership(elementId, user.id);
    return this.elements.duplicate(elementId);
  }

  @Post('reorder')
  @ApiOperation({ summary: 'Bulk re-order / re-stack elements on a slide' })
  async reorder(
    @Param('slideId') slideId: string,
    @Body() body: { entries: Array<{ id: string; order: number; zIndex?: number }> },
    @GetUser() user: any,
  ): Promise<SlideElementDTO[]> {
    await this.elements.assertSlideOwnership(slideId, user.id);
    return this.elements.reorder(slideId, body.entries);
  }

  @Post('sync')
  @ApiOperation({ summary: 'Atomic replace-all (used by undo/redo to restore a snapshot)' })
  async sync(
    @Param('slideId') slideId: string,
    @Body() body: { elements: Array<Partial<SlideElementDTO>> },
    @GetUser() user: any,
  ): Promise<SlideElementDTO[]> {
    await this.elements.assertSlideOwnership(slideId, user.id);
    return this.elements.syncAll(slideId, body.elements || []);
  }

  // ── Migration ops (per-slide; the bulk migration runs at startup) ─────────

  @Post('ensure-migrated')
  @ApiOperation({ summary: 'Idempotently materialize elements from legacy slide.content' })
  async ensureMigrated(
    @Param('slideId') slideId: string,
    @GetUser() user: any,
  ): Promise<{ created: number | null }> {
    await this.elements.assertSlideOwnership(slideId, user.id);
    const created = await this.migration.migrateOne(slideId, { force: false });
    return { created };
  }

  @Post('remigrate')
  @ApiOperation({ summary: 'Force re-migrate (drops + recreates elements from legacy content)' })
  async remigrate(
    @Param('slideId') slideId: string,
    @GetUser() user: any,
  ): Promise<{ created: number | null }> {
    await this.elements.assertSlideOwnership(slideId, user.id);
    const created = await this.migration.migrateOne(slideId, { force: true });
    return { created };
  }
}
