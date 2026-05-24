import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  SavedComponentDTO, ComponentInstanceDTO, CreateComponentInput, ListComponentsQuery,
  ComponentCategory, ComponentElementTree,
} from './component-types';

/**
 * ComponentsService — Phase 32.75 Tier 2
 *
 * Manages the user-scoped component library + per-slide linked instances.
 * The render pipeline (slide-export) reads instances at export time to
 * expand them into concrete SlideElement rows.
 */
@Injectable()
export class ComponentsService {
  constructor(private prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  //  Auth helpers
  // ---------------------------------------------------------------------------
  async assertComponentOwnership(id: string, userId: string): Promise<void> {
    const row = await this.prisma.savedComponent.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!row) throw new ForbiddenException('No access to this component');
  }

  async assertSlideOwnership(slideId: string, userId: string): Promise<void> {
    const slide = await this.prisma.slide.findFirst({
      where: { id: slideId, deck: { project: { userId } } },
      select: { id: true },
    });
    if (!slide) throw new ForbiddenException('No access to this slide');
  }

  // ---------------------------------------------------------------------------
  //  Library — list + search + filter (cross-deck, user-scoped)
  // ---------------------------------------------------------------------------
  async listForUser(userId: string, query: ListComponentsQuery): Promise<SavedComponentDTO[]> {
    const where: any = { userId };
    if (query.category) where.category = query.category;
    if (query.favorite) where.favorite = true;
    if (query.tag)      where.tags     = { has: query.tag };
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { tags: { has: query.search.toLowerCase() } },
      ];
    }

    const rows = await this.prisma.savedComponent.findMany({
      where,
      orderBy: [{ updatedAt: 'desc' }],
      take:    query.limit  ?? 200,
      skip:    query.offset ?? 0,
    });
    return rows.map(toComponentDTO);
  }

  async listFavorites(userId: string): Promise<SavedComponentDTO[]> {
    return this.listForUser(userId, { favorite: true });
  }

  async listRecent(userId: string, limit = 20): Promise<SavedComponentDTO[]> {
    const rows = await this.prisma.savedComponent.findMany({
      where: { userId, usageCount: { gt: 0 } },
      orderBy: [{ updatedAt: 'desc' }],
      take: limit,
    });
    return rows.map(toComponentDTO);
  }

  async getById(id: string): Promise<SavedComponentDTO> {
    const row = await this.prisma.savedComponent.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Component not found');
    return toComponentDTO(row);
  }

  // ---------------------------------------------------------------------------
  //  Library — create / update / delete
  // ---------------------------------------------------------------------------
  async create(userId: string, input: CreateComponentInput): Promise<SavedComponentDTO> {
    const row = await this.prisma.savedComponent.create({
      data: {
        userId,
        name:        input.name,
        description: input.description ?? null,
        category:    input.category,
        familyId:    input.familyId   ?? null,
        thumbnail:   input.thumbnail  ?? null,
        tags:        input.tags ?? [],
        elementTree: input.elementTree as any,
      },
    });
    return toComponentDTO(row);
  }

  async update(userId: string, id: string, patch: Partial<SavedComponentDTO>): Promise<SavedComponentDTO> {
    await this.assertComponentOwnership(id, userId);

    // If elementTree changes, bump version so instances can detect drift.
    const treeChanged = patch.elementTree !== undefined;
    const data: any = {
      name:        patch.name        ?? undefined,
      description: patch.description ?? undefined,
      category:    patch.category    ?? undefined,
      thumbnail:   patch.thumbnail   ?? undefined,
      familyId:    patch.familyId    ?? undefined,
      tags:        patch.tags        ?? undefined,
      favorite:    patch.favorite    ?? undefined,
      elementTree: treeChanged ? (patch.elementTree as any) : undefined,
      version:     treeChanged ? { increment: 1 } : undefined,
    };
    const row = await this.prisma.savedComponent.update({ where: { id }, data });
    return toComponentDTO(row);
  }

  async setFavorite(userId: string, id: string, favorite: boolean): Promise<SavedComponentDTO> {
    await this.assertComponentOwnership(id, userId);
    const row = await this.prisma.savedComponent.update({
      where: { id },
      data: { favorite },
    });
    return toComponentDTO(row);
  }

  async duplicate(userId: string, id: string): Promise<SavedComponentDTO> {
    await this.assertComponentOwnership(id, userId);
    const source = await this.prisma.savedComponent.findUnique({ where: { id } });
    if (!source) throw new NotFoundException('Component not found');
    const copy = await this.prisma.savedComponent.create({
      data: {
        userId,
        name:        `${source.name} (copy)`,
        description: source.description,
        category:    source.category,
        familyId:    source.familyId,
        thumbnail:   source.thumbnail,
        tags:        source.tags,
        elementTree: source.elementTree as any,
      },
    });
    return toComponentDTO(copy);
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.assertComponentOwnership(id, userId);
    // Component delete cascades to ComponentInstance via Prisma onDelete.
    await this.prisma.savedComponent.delete({ where: { id } });
  }

  // ---------------------------------------------------------------------------
  //  Linked Instances
  // ---------------------------------------------------------------------------
  async listInstancesForSlide(slideId: string): Promise<ComponentInstanceDTO[]> {
    const rows = await this.prisma.componentInstance.findMany({
      where: { slideId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(toInstanceDTO);
  }

  async listInstancesForComponent(componentId: string): Promise<ComponentInstanceDTO[]> {
    const rows = await this.prisma.componentInstance.findMany({
      where: { componentId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(toInstanceDTO);
  }

  async createInstance(
    userId: string,
    componentId: string,
    slideId: string,
    anchor: { x: number; y: number; scale?: number },
  ): Promise<ComponentInstanceDTO> {
    await this.assertComponentOwnership(componentId, userId);
    await this.assertSlideOwnership(slideId, userId);
    const component = await this.prisma.savedComponent.findUnique({
      where: { id: componentId },
      select: { version: true },
    });
    if (!component) throw new NotFoundException('Component not found');

    const row = await this.prisma.$transaction(async (tx) => {
      const inst = await tx.componentInstance.create({
        data: {
          componentId,
          slideId,
          anchorX: anchor.x,
          anchorY: anchor.y,
          scale:   anchor.scale ?? 1,
          version: component.version,
        },
      });
      await tx.savedComponent.update({
        where: { id: componentId },
        data: { usageCount: { increment: 1 } },
      });
      return inst;
    });
    return toInstanceDTO(row);
  }

  async deleteInstance(userId: string, instanceId: string): Promise<void> {
    const inst = await this.prisma.componentInstance.findUnique({ where: { id: instanceId } });
    if (!inst) throw new NotFoundException('Instance not found');
    await this.assertSlideOwnership(inst.slideId, userId);
    await this.prisma.componentInstance.delete({ where: { id: instanceId } });
  }

  /**
   * "Update all instances?" YES branch. Sets every instance's acknowledged
   * version to the current component version. Rendering already uses the
   * latest version; this just clears the "outdated" indicator.
   */
  async acknowledgeAllInstances(userId: string, componentId: string): Promise<{ updated: number }> {
    await this.assertComponentOwnership(componentId, userId);
    const component = await this.prisma.savedComponent.findUnique({
      where: { id: componentId },
      select: { version: true },
    });
    if (!component) throw new NotFoundException('Component not found');
    const res = await this.prisma.componentInstance.updateMany({
      where: { componentId },
      data:  { version: component.version },
    });
    return { updated: res.count };
  }

  async countOutdatedInstances(componentId: string): Promise<number> {
    const component = await this.prisma.savedComponent.findUnique({
      where: { id: componentId },
      select: { version: true },
    });
    if (!component) return 0;
    return this.prisma.componentInstance.count({
      where: { componentId, version: { lt: component.version } },
    });
  }
}

// =============================================================================
//  Helpers
// =============================================================================

function toComponentDTO(row: any): SavedComponentDTO {
  return {
    id:          row.id,
    userId:      row.userId,
    workspaceId: row.workspaceId,
    name:        row.name,
    description: row.description,
    category:    row.category as ComponentCategory,
    thumbnail:   row.thumbnail,
    familyId:    row.familyId,
    tags:        row.tags || [],
    favorite:    !!row.favorite,
    usageCount:  row.usageCount,
    version:     row.version,
    elementTree: (row.elementTree as ComponentElementTree) || [],
    createdAt:   row.createdAt.toISOString(),
    updatedAt:   row.updatedAt.toISOString(),
  };
}

function toInstanceDTO(row: any): ComponentInstanceDTO {
  return {
    id:          row.id,
    componentId: row.componentId,
    slideId:     row.slideId,
    anchorX:     row.anchorX,
    anchorY:     row.anchorY,
    scale:       row.scale,
    version:     row.version,
    createdAt:   row.createdAt.toISOString(),
  };
}
