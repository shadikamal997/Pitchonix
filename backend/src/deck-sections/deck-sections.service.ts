import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// =============================================================================
//  Phase 38G — DeckSectionsService
//
//  Promotes Slide.metadata.sectionId to a first-class DeckSection record.
//  Powers the sidebar sections sidebar (collapse / expand / reorder /
//  duplicate) and the PPTX export "sections" map.
//
//  Operations:
//    list(deckId)
//    create(deckId, input)
//    update(id, patch)
//    remove(id)                — slides revert to no section
//    reorder(deckId, ids)      — bulk update `order` from an ordered id list
//    duplicate(id)             — clone section + slides inside it (snapshot)
//    addSlide(sectionId, slideId)
//    moveSlide(slideId, sectionId | null)
// =============================================================================

export interface SectionInput {
  name?:      string;
  color?:     string | null;
  collapsed?: boolean;
  order?:     number;
}

@Injectable()
export class DeckSectionsService {
  constructor(private prisma: PrismaService) {}

  list(deckId: string) {
    return this.prisma.deckSection.findMany({
      where:   { deckId },
      orderBy: { order: 'asc' },
    });
  }

  findOne(id: string) {
    return this.prisma.deckSection.findUnique({ where: { id } });
  }

  async create(deckId: string, input: SectionInput) {
    const last = await this.prisma.deckSection.findFirst({
      where: { deckId }, orderBy: { order: 'desc' },
    });
    return this.prisma.deckSection.create({
      data: {
        deckId,
        name:      input.name?.trim() || 'Untitled section',
        color:     input.color ?? null,
        order:     input.order ?? ((last?.order ?? -1) + 1),
        collapsed: input.collapsed ?? false,
      },
    });
  }

  async update(id: string, patch: SectionInput) {
    if (!(await this.findOne(id))) throw new NotFoundException('Section not found');
    return this.prisma.deckSection.update({ where: { id }, data: patch });
  }

  async remove(id: string) {
    if (!(await this.findOne(id))) throw new NotFoundException('Section not found');
    return this.prisma.deckSection.delete({ where: { id } });
  }

  async reorder(deckId: string, ids: string[]) {
    if (!Array.isArray(ids)) return { reordered: 0 };
    await this.prisma.$transaction(
      ids.map((id, i) =>
        this.prisma.deckSection.updateMany({
          where: { id, deckId },
          data:  { order: i },
        }),
      ),
    );
    return { reordered: ids.length };
  }

  async duplicate(id: string) {
    const src = await this.prisma.deckSection.findUnique({
      where:   { id },
      include: { slides: { include: { elements: true } } },
    });
    if (!src) throw new NotFoundException('Section not found');

    const cloned = await this.prisma.deckSection.create({
      data: {
        deckId:    src.deckId,
        name:      `${src.name} (copy)`,
        color:     src.color,
        order:     src.order + 1,
        collapsed: src.collapsed,
      },
    });

    // Snapshot-style slide duplication.
    let order = src.slides.length ? Math.max(...src.slides.map((s) => s.order)) + 1 : 0;
    for (const s of src.slides) {
      const dup = await this.prisma.slide.create({
        data: {
          deckId:       s.deckId,
          type:         s.type,
          order:        order++,
          title:        s.title,
          subtitle:     s.subtitle,
          content:      s.content as any,
          layoutKey:    s.layoutKey,
          themeKey:     s.themeKey,
          speakerNotes: s.speakerNotes,
          background:   s.background  as any,
          themeTokens:  s.themeTokens as any,
          metadata:     s.metadata    as any,
          sectionId:    cloned.id,
          masterSlideId: s.masterSlideId,
          layoutTemplateId: s.layoutTemplateId,
          themeId:      s.themeId,
          transition:   s.transition as any,
        },
      });
      if (s.elements?.length) {
        await this.prisma.slideElement.createMany({
          data: s.elements.map((el) => ({
            slideId: dup.id,
            type:    el.type,
            name:    el.name,
            order:   el.order,
            x: el.x, y: el.y, width: el.width, height: el.height,
            rotation: el.rotation, zIndex: el.zIndex,
            locked: el.locked, visible: el.visible,
            content: el.content as any,
            data:    el.data    as any,
            style:   el.style   as any,
            animations:   el.animations   as any,
            accessibility: el.accessibility as any,
          })),
        });
      }
    }
    return cloned;
  }

  addSlide(sectionId: string, slideId: string) {
    return this.prisma.slide.update({
      where: { id: slideId },
      data:  { sectionId },
    });
  }

  moveSlide(slideId: string, sectionId: string | null) {
    return this.prisma.slide.update({
      where: { id: slideId },
      data:  { sectionId },
    });
  }
}
