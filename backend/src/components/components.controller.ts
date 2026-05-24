import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser } from '../auth/get-user.decorator';
import { RequireRole } from '../workspaces/role.guard';
import { ComponentsService } from './components.service';
import {
  SavedComponentDTO, ComponentInstanceDTO,
  CreateComponentInput, ListComponentsQuery, ComponentCategory,
} from './component-types';
import { smartRegistry } from './smart/smart-registry';
import {
  SmartFamilyId, SmartComponentType, SMART_FAMILIES, SMART_COMPONENT_TYPES,
} from './smart/smart-types';

/**
 * Phase 32.75 Tier 2 — Component Library REST API.
 *
 *   GET    /api/components                    list user's library (search/filter)
 *   GET    /api/components/recent             usageCount > 0, sorted by updatedAt
 *   GET    /api/components/favorites          favorited only
 *   POST   /api/components                    save selection as component
 *   GET    /api/components/:id                get one
 *   PATCH  /api/components/:id                update (elementTree change bumps version)
 *   POST   /api/components/:id/duplicate      clone
 *   POST   /api/components/:id/favorite       toggle favourite
 *   DELETE /api/components/:id                delete (cascades to instances)
 *   GET    /api/components/:id/instances      list instances pointing at this comp
 *   GET    /api/components/:id/outdated      count instances behind current version
 *   POST   /api/components/:id/acknowledge   set every instance's version to current
 *
 *   GET    /api/slides/:slideId/component-instances  list instances on a slide
 *   POST   /api/slides/:slideId/component-instances  insert an instance
 *   DELETE /api/component-instances/:instanceId      remove instance
 */
@ApiTags('Components')
@Controller()
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ComponentsController {
  constructor(private readonly components: ComponentsService) {}

  // ---------------------------------------------------------------------------
  //  Smart Components (Phase 32.75 Tier 3)
  //
  //  Built-in, generated-on-demand components themed for each composition
  //  family. The endpoints are intentionally above the `:id` routes so that
  //  the "smart" path segment doesn't get captured as a UUID.
  // ---------------------------------------------------------------------------

  @Get('components/smart')
  @ApiOperation({ summary: 'List every (family × type) built-in component (Tier 3)' })
  async listSmart(
    @Query('family') family?: SmartFamilyId,
    @Query('type')   type?: SmartComponentType,
  ) {
    if (family && !SMART_FAMILIES.includes(family)) return [];
    if (type && !SMART_COMPONENT_TYPES.includes(type)) return [];
    if (family && type) return [smartRegistry.getOne(family, type)];
    if (family)         return smartRegistry.listForFamily(family);
    if (type)           return smartRegistry.listForType(type);
    return smartRegistry.listAll();
  }

  @Get('components/smart/:family/:type')
  @ApiOperation({ summary: 'Get a single built-in component by (family, type)' })
  async getSmart(
    @Param('family') family: SmartFamilyId,
    @Param('type')   type: SmartComponentType,
  ) {
    if (!SMART_FAMILIES.includes(family) || !SMART_COMPONENT_TYPES.includes(type)) {
      return null;
    }
    return smartRegistry.getOne(family, type);
  }

  // ---------------------------------------------------------------------------
  //  Library
  // ---------------------------------------------------------------------------

  @Get('components')
  @ApiOperation({ summary: 'List the current user\'s component library' })
  async list(
    @GetUser() user: any,
    @Query('search')   search?: string,
    @Query('category') category?: ComponentCategory,
    @Query('favorite') favorite?: string,
    @Query('tag')      tag?: string,
    @Query('limit')    limit?: string,
    @Query('offset')   offset?: string,
  ): Promise<SavedComponentDTO[]> {
    const q: ListComponentsQuery = {
      search,
      category,
      tag,
      favorite: favorite === 'true' ? true : undefined,
      limit:    limit  ? parseInt(limit, 10)  : undefined,
      offset:   offset ? parseInt(offset, 10) : undefined,
    };
    return this.components.listForUser(user.id, q);
  }

  @Get('components/recent')
  async recent(@GetUser() user: any): Promise<SavedComponentDTO[]> {
    return this.components.listRecent(user.id);
  }

  @Get('components/favorites')
  async favorites(@GetUser() user: any): Promise<SavedComponentDTO[]> {
    return this.components.listFavorites(user.id);
  }

  @Post('components')
  @ApiOperation({ summary: 'Save a new component (selection → library)' })
  async create(@GetUser() user: any, @Body() body: CreateComponentInput): Promise<SavedComponentDTO> {
    return this.components.create(user.id, body);
  }

  @Get('components/:id')
  async getOne(@Param('id') id: string, @GetUser() user: any): Promise<SavedComponentDTO> {
    await this.components.assertComponentOwnership(id, user.id);
    return this.components.getById(id);
  }

  @Patch('components/:id')
  async update(
    @Param('id') id: string,
    @Body() body: Partial<SavedComponentDTO>,
    @GetUser() user: any,
  ): Promise<SavedComponentDTO> {
    return this.components.update(user.id, id, body);
  }

  @Post('components/:id/duplicate')
  async duplicate(@Param('id') id: string, @GetUser() user: any): Promise<SavedComponentDTO> {
    return this.components.duplicate(user.id, id);
  }

  @Post('components/:id/favorite')
  async favorite(
    @Param('id') id: string,
    @Body() body: { favorite: boolean },
    @GetUser() user: any,
  ): Promise<SavedComponentDTO> {
    return this.components.setFavorite(user.id, id, !!body.favorite);
  }

  @Delete('components/:id')
  async remove(@Param('id') id: string, @GetUser() user: any): Promise<void> {
    return this.components.remove(user.id, id);
  }

  // ---------------------------------------------------------------------------
  //  Instance sync
  // ---------------------------------------------------------------------------
  @Get('components/:id/instances')
  async listInstances(@Param('id') id: string, @GetUser() user: any): Promise<ComponentInstanceDTO[]> {
    await this.components.assertComponentOwnership(id, user.id);
    return this.components.listInstancesForComponent(id);
  }

  @Get('components/:id/outdated')
  async outdatedCount(@Param('id') id: string, @GetUser() user: any) {
    await this.components.assertComponentOwnership(id, user.id);
    const count = await this.components.countOutdatedInstances(id);
    return { count };
  }

  @Post('components/:id/acknowledge')
  @ApiOperation({ summary: '"Update all instances?" → YES (acknowledge latest version everywhere)' })
  async acknowledge(@Param('id') id: string, @GetUser() user: any) {
    return this.components.acknowledgeAllInstances(user.id, id);
  }

  // ---------------------------------------------------------------------------
  //  Instances on a slide
  // ---------------------------------------------------------------------------
  @Get('slides/:slideId/component-instances')
  @RequireRole('deck.view', { kind: 'workspaceFromSlide', param: 'slideId' })
  async listSlideInstances(
    @Param('slideId') slideId: string,
    @GetUser() user: any,
  ): Promise<ComponentInstanceDTO[]> {
    await this.components.assertSlideOwnership(slideId, user.id);
    return this.components.listInstancesForSlide(slideId);
  }

  @Post('slides/:slideId/component-instances')
  @RequireRole('components.edit', { kind: 'workspaceFromSlide', param: 'slideId' })
  async createInstance(
    @Param('slideId') slideId: string,
    @Body() body: { componentId: string; anchorX?: number; anchorY?: number; scale?: number },
    @GetUser() user: any,
  ): Promise<ComponentInstanceDTO> {
    return this.components.createInstance(user.id, body.componentId, slideId, {
      x:     body.anchorX ?? 0,
      y:     body.anchorY ?? 0,
      scale: body.scale,
    });
  }

  @Delete('component-instances/:instanceId')
  async deleteInstance(@Param('instanceId') instanceId: string, @GetUser() user: any): Promise<void> {
    return this.components.deleteInstance(user.id, instanceId);
  }
}
