import {
  Injectable, Logger, NotFoundException, ForbiddenException, BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { ELEMENT_TYPES, ElementType, SlideElementDTO } from './element-types';

interface ReorderEntry { id: string; order: number; zIndex?: number }

@Injectable()
export class SlideElementsService {
  private readonly logger = new Logger(SlideElementsService.name);

  constructor(private prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  //  Ownership / authorization
  // ---------------------------------------------------------------------------

  async assertSlideOwnership(slideId: string, userId: string): Promise<void> {
    const slide = await this.prisma.slide.findFirst({
      where: { id: slideId, deck: { project: { userId } } },
      select: { id: true },
    });
    if (!slide) throw new ForbiddenException('No access to this slide');
  }

  async assertElementOwnership(elementId: string, userId: string): Promise<string> {
    const el = await this.prisma.slideElement.findFirst({
      where: { id: elementId, slide: { deck: { project: { userId } } } },
      select: { id: true, slideId: true },
    });
    if (!el) throw new ForbiddenException('No access to this element');
    return el.slideId;
  }

  // ---------------------------------------------------------------------------
  //  Queries
  // ---------------------------------------------------------------------------

  async listForSlide(slideId: string): Promise<SlideElementDTO[]> {
    const rows = await this.prisma.slideElement.findMany({
      where: { slideId },
      orderBy: [{ order: 'asc' }, { zIndex: 'asc' }],
    });
    return rows.map(toDTO);
  }

  async findOne(elementId: string): Promise<SlideElementDTO> {
    const row = await this.prisma.slideElement.findUnique({ where: { id: elementId } });
    if (!row) throw new NotFoundException('Element not found');
    return toDTO(row);
  }

  // ---------------------------------------------------------------------------
  //  Mutations
  // ---------------------------------------------------------------------------

  async create(slideId: string, input: Partial<SlideElementDTO>): Promise<SlideElementDTO> {
    validateType(input.type);

    const lastOrder = await this.prisma.slideElement.aggregate({
      where: { slideId }, _max: { order: true, zIndex: true },
    });
    const order  = (lastOrder._max.order  ?? -1) + 1;
    const zIndex = (lastOrder._max.zIndex ?? 0)  + 1;

    const row = await this.prisma.slideElement.create({
      data: {
        slideId,
        type: input.type!,
        name: input.name ?? null,
        order:    input.order    ?? order,
        x:        clampPct(input.x ?? 10),
        y:        clampPct(input.y ?? 10),
        width:    clampPct(input.width  ?? 30),
        height:   clampPct(input.height ?? 10),
        rotation: input.rotation ?? 0,
        zIndex:   input.zIndex   ?? zIndex,
        locked:   input.locked   ?? false,
        visible:  input.visible  ?? true,
        content:       (input.content       as Prisma.InputJsonValue | undefined) ?? Prisma.JsonNull,
        data:          (input.data          as Prisma.InputJsonValue | undefined) ?? Prisma.JsonNull,
        style:         (input.style         as Prisma.InputJsonValue | undefined) ?? Prisma.JsonNull,
        animations:    (input.animations    as Prisma.InputJsonValue | undefined) ?? Prisma.JsonNull,
        accessibility: (input.accessibility as Prisma.InputJsonValue | undefined) ?? Prisma.JsonNull,
      },
    });
    return toDTO(row);
  }

  async update(elementId: string, patch: Partial<SlideElementDTO>): Promise<SlideElementDTO> {
    const data: Prisma.SlideElementUpdateInput = {};

    if (patch.type !== undefined)       { validateType(patch.type); data.type = patch.type; }
    if (patch.name !== undefined)       data.name = patch.name;
    if (patch.order !== undefined)      data.order = patch.order;
    if (patch.x !== undefined)          data.x = clampPct(patch.x);
    if (patch.y !== undefined)          data.y = clampPct(patch.y);
    if (patch.width !== undefined)      data.width = clampPct(patch.width);
    if (patch.height !== undefined)     data.height = clampPct(patch.height);
    if (patch.rotation !== undefined)   data.rotation = patch.rotation;
    if (patch.zIndex !== undefined)     data.zIndex = patch.zIndex;
    if (patch.locked !== undefined)     data.locked = patch.locked;
    if (patch.visible !== undefined)    data.visible = patch.visible;

    if (patch.content !== undefined)        data.content       = patch.content       as Prisma.InputJsonValue ?? Prisma.JsonNull;
    if (patch.data !== undefined)           data.data          = patch.data          as Prisma.InputJsonValue ?? Prisma.JsonNull;
    if (patch.style !== undefined)          data.style         = patch.style         as Prisma.InputJsonValue ?? Prisma.JsonNull;
    if (patch.animations !== undefined)     data.animations    = patch.animations    as Prisma.InputJsonValue ?? Prisma.JsonNull;
    if (patch.accessibility !== undefined)  data.accessibility = patch.accessibility as Prisma.InputJsonValue ?? Prisma.JsonNull;

    const row = await this.prisma.slideElement.update({ where: { id: elementId }, data });
    return toDTO(row);
  }

  async remove(elementId: string): Promise<{ id: string }> {
    await this.prisma.slideElement.delete({ where: { id: elementId } });
    return { id: elementId };
  }

  async duplicate(elementId: string): Promise<SlideElementDTO> {
    const src = await this.prisma.slideElement.findUnique({ where: { id: elementId } });
    if (!src) throw new NotFoundException('Element not found');

    const lastOrder = await this.prisma.slideElement.aggregate({
      where: { slideId: src.slideId }, _max: { order: true, zIndex: true },
    });
    const row = await this.prisma.slideElement.create({
      data: {
        slideId: src.slideId,
        type:    src.type,
        name:    src.name ? `${src.name} (copy)` : null,
        order:   (lastOrder._max.order  ?? -1) + 1,
        x:       Math.min(100 - src.width,  src.x + 3),
        y:       Math.min(100 - src.height, src.y + 3),
        width:   src.width,
        height:  src.height,
        rotation: src.rotation,
        zIndex:  (lastOrder._max.zIndex ?? 0) + 1,
        locked:  src.locked,
        visible: src.visible,
        content:       src.content       ?? Prisma.JsonNull,
        data:          src.data          ?? Prisma.JsonNull,
        style:         src.style         ?? Prisma.JsonNull,
        animations:    src.animations    ?? Prisma.JsonNull,
        accessibility: src.accessibility ?? Prisma.JsonNull,
      },
    });
    return toDTO(row);
  }

  async reorder(slideId: string, entries: ReorderEntry[]): Promise<SlideElementDTO[]> {
    if (!Array.isArray(entries) || entries.length === 0) {
      throw new BadRequestException('reorder requires a non-empty entries[] array');
    }
    await this.prisma.$transaction(
      entries.map((e) =>
        this.prisma.slideElement.update({
          where: { id: e.id },
          data: {
            order: e.order,
            ...(e.zIndex !== undefined ? { zIndex: e.zIndex } : {}),
          },
        }),
      ),
    );
    return this.listForSlide(slideId);
  }
}

// =============================================================================
//  Helpers
// =============================================================================

function validateType(type: any): asserts type is ElementType {
  if (!ELEMENT_TYPES.includes(type)) {
    throw new BadRequestException(`Invalid element type: ${type}`);
  }
}

function clampPct(v: number): number {
  if (typeof v !== 'number' || Number.isNaN(v)) return 0;
  return Math.max(0, Math.min(100, v));
}

function toDTO(row: any): SlideElementDTO {
  return {
    id: row.id,
    slideId: row.slideId,
    type: row.type as ElementType,
    name: row.name,
    order: row.order,
    x: row.x,
    y: row.y,
    width: row.width,
    height: row.height,
    rotation: row.rotation,
    zIndex: row.zIndex,
    locked: row.locked,
    visible: row.visible,
    content: row.content ?? null,
    data: row.data ?? null,
    style: row.style ?? null,
    animations: row.animations ?? null,
    accessibility: row.accessibility ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
