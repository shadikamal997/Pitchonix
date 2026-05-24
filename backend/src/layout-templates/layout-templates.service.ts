import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// =============================================================================
//  Phase 38B — LayoutTemplatesService
//
//  Workspace-scoped layout library. A LayoutTemplate stores slot geometry +
//  default content so a slide can inherit structure without copying every
//  element. "Convert Slide → Layout" snapshots a slide's element boxes into
//  a new template entry.
//
//  Slots payload shape:
//    [{ id, role, x, y, w, h, defaultType, placeholder }]
// =============================================================================

export type LayoutType =
  | 'title' | 'titleContent' | 'twoColumn' | 'comparison' | 'timeline'
  | 'sectionDivider' | 'imageLeft' | 'imageRight' | 'dashboard'
  | 'financial' | 'agenda' | 'custom';

export interface LayoutTemplateInput {
  name?:        string;
  layoutType?:  LayoutType;
  slots?:       any;
  thumbnail?:   string | null;
  workspaceId?: string | null;
}

@Injectable()
export class LayoutTemplatesService {
  constructor(private prisma: PrismaService) {}

  list(workspaceId?: string | null) {
    return this.prisma.layoutTemplate.findMany({
      where: workspaceId
        ? { OR: [{ workspaceId }, { workspaceId: null }] }
        : {},
      orderBy: { updatedAt: 'desc' },
    });
  }

  findOne(id: string) {
    return this.prisma.layoutTemplate.findUnique({ where: { id } });
  }

  create(input: LayoutTemplateInput) {
    return this.prisma.layoutTemplate.create({
      data: {
        workspaceId: input.workspaceId ?? null,
        name:        input.name?.trim() || 'Untitled layout',
        layoutType:  input.layoutType ?? 'custom',
        slots:       input.slots ?? [],
        thumbnail:   input.thumbnail ?? null,
      },
    });
  }

  async update(id: string, patch: LayoutTemplateInput) {
    if (!(await this.findOne(id))) throw new NotFoundException('Layout not found');
    return this.prisma.layoutTemplate.update({ where: { id }, data: patch });
  }

  async remove(id: string) {
    if (!(await this.findOne(id))) throw new NotFoundException('Layout not found');
    // Slides referencing this layout fall back to "no layout" via SetNull.
    return this.prisma.layoutTemplate.delete({ where: { id } });
  }

  // --- Convert slide to layout --------------------------------------------

  async fromSlide(slideId: string, name: string, workspaceId?: string | null) {
    const slide = await this.prisma.slide.findUnique({
      where: { id: slideId },
      include: { elements: true },
    });
    if (!slide) throw new NotFoundException('Slide not found');
    const slots = slide.elements.map((el, i) => ({
      id:           `slot-${i + 1}`,
      role:         el.type,
      x:            el.x,
      y:            el.y,
      w:            el.width,
      h:            el.height,
      defaultType:  el.type,
      placeholder:  el.name || el.type,
    }));
    return this.prisma.layoutTemplate.create({
      data: {
        workspaceId:   workspaceId ?? null,
        name:          name?.trim() || `Layout from ${slide.title || slide.type}`,
        layoutType:    'custom',
        slots,
        sourceSlideId: slideId,
      },
    });
  }

  // --- Apply --------------------------------------------------------------

  async applyToSlide(layoutId: string, slideId: string) {
    const [layout, slide] = await Promise.all([
      this.findOne(layoutId),
      this.prisma.slide.findUnique({ where: { id: slideId } }),
    ]);
    if (!layout) throw new NotFoundException('Layout not found');
    if (!slide)  throw new NotFoundException('Slide not found');
    return this.prisma.slide.update({
      where: { id: slideId },
      data:  { layoutTemplateId: layoutId, layoutKey: layout.layoutType },
    });
  }
}
