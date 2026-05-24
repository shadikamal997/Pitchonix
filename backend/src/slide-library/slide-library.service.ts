import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// =============================================================================
//  Phase 38O — SlideLibraryService
//
//  Save slides / sections / component groups as ReusableSlide entries, then
//  insert them into any deck. Payload mirrors the deck snapshot shape so a
//  ReusableSlide can be a single slide or a multi-slide chunk.
//
//    Payload (single slide):
//      { type:'slide', slide:{ title, subtitle, content, layoutKey, themeKey,
//                              speakerNotes, background, themeTokens,
//                              transition, elements:[…] } }
//    Payload (section):
//      { type:'section', name, color?, slides:[ … ] }
// =============================================================================

export interface SaveSlideInput {
  name:        string;
  description?: string;
  slideId:     string;
  tags?:       string[];
  thumbnail?:  string | null;
  userId?:     string | null;
  workspaceId?: string | null;
}

export interface SaveSectionInput {
  name:        string;
  description?: string;
  sectionId:   string;
  tags?:       string[];
  thumbnail?:  string | null;
  userId?:     string | null;
  workspaceId?: string | null;
}

@Injectable()
export class SlideLibraryService {
  constructor(private prisma: PrismaService) {}

  list(opts: { userId?: string | null; workspaceId?: string | null; kind?: string }) {
    const where: any = {};
    if (opts.userId)      where.userId      = opts.userId;
    if (opts.workspaceId) where.workspaceId = opts.workspaceId;
    if (opts.kind)        where.kind        = opts.kind;
    return this.prisma.reusableSlide.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
    });
  }

  findOne(id: string) {
    return this.prisma.reusableSlide.findUnique({ where: { id } });
  }

  // --- Save -----------------------------------------------------------------

  async saveSlide(input: SaveSlideInput) {
    const slide = await this.prisma.slide.findUnique({
      where: { id: input.slideId },
      include: { elements: true },
    });
    if (!slide) throw new NotFoundException('Slide not found');

    return this.prisma.reusableSlide.create({
      data: {
        userId:      input.userId ?? null,
        workspaceId: input.workspaceId ?? null,
        name:        input.name.trim() || `Saved slide ${slide.order + 1}`,
        description: input.description ?? null,
        kind:        'slide',
        thumbnail:   input.thumbnail ?? null,
        tags:        input.tags ?? [],
        payload: {
          version: 1,
          type:    'slide',
          slide: this.snapshotSlide(slide),
        } as any,
      },
    });
  }

  async saveSection(input: SaveSectionInput) {
    const section = await this.prisma.deckSection.findUnique({
      where: { id: input.sectionId },
      include: { slides: { include: { elements: true } } },
    });
    if (!section) throw new NotFoundException('Section not found');

    return this.prisma.reusableSlide.create({
      data: {
        userId:      input.userId ?? null,
        workspaceId: input.workspaceId ?? null,
        name:        input.name.trim() || section.name,
        description: input.description ?? null,
        kind:        'section',
        thumbnail:   input.thumbnail ?? null,
        tags:        input.tags ?? [],
        payload: {
          version: 1,
          type:    'section',
          name:    section.name,
          color:   section.color,
          slides:  section.slides.map((s) => this.snapshotSlide(s)),
        } as any,
      },
    });
  }

  // --- Insert ---------------------------------------------------------------

  async insertIntoDeck(reusableId: string, deckId: string) {
    const entry = await this.findOne(reusableId);
    if (!entry) throw new NotFoundException('Library entry not found');
    const payload = entry.payload as any;

    const last = await this.prisma.slide.findFirst({
      where: { deckId }, orderBy: { order: 'desc' },
    });
    let nextOrder = (last?.order ?? -1) + 1;
    const createdSlideIds: string[] = [];

    const insertOne = async (s: any) => {
      const created = await this.prisma.slide.create({
        data: {
          deckId,
          type:         s.type ?? 'content',
          order:        nextOrder++,
          title:        s.title ?? 'Untitled',
          subtitle:     s.subtitle ?? null,
          content:      s.content ?? {},
          layoutKey:    s.layoutKey ?? null,
          themeKey:     s.themeKey ?? null,
          speakerNotes: s.speakerNotes ?? null,
          background:   s.background ?? null,
          themeTokens:  s.themeTokens ?? null,
          metadata:     s.metadata ?? null,
          transition:   s.transition ?? null,
        },
      });
      if (Array.isArray(s.elements) && s.elements.length) {
        await this.prisma.slideElement.createMany({
          data: s.elements.map((el: any) => ({
            slideId: created.id,
            type:    el.type,
            name:    el.name ?? null,
            order:   el.order ?? 0,
            x: el.x ?? 0, y: el.y ?? 0, width: el.width ?? 50, height: el.height ?? 10,
            rotation: el.rotation ?? 0, zIndex: el.zIndex ?? 0,
            locked: el.locked ?? false, visible: el.visible ?? true,
            content: el.content ?? null,
            data:    el.data ?? null,
            style:   el.style ?? null,
            animations:   el.animations ?? null,
            accessibility: el.accessibility ?? null,
          })),
        });
      }
      createdSlideIds.push(created.id);
    };

    if (payload?.type === 'slide' && payload.slide) {
      await insertOne(payload.slide);
    } else if (payload?.type === 'section' && Array.isArray(payload.slides)) {
      const section = await this.prisma.deckSection.create({
        data: {
          deckId,
          name:  payload.name || entry.name,
          color: payload.color || null,
          order: await this.nextSectionOrder(deckId),
        },
      });
      for (const s of payload.slides) {
        await insertOne(s);
        await this.prisma.slide.updateMany({
          where: { id: { in: createdSlideIds } },
          data:  { sectionId: section.id },
        });
      }
    }
    return { inserted: createdSlideIds.length, slideIds: createdSlideIds };
  }

  async remove(id: string) {
    if (!(await this.findOne(id))) throw new NotFoundException('Library entry not found');
    return this.prisma.reusableSlide.delete({ where: { id } });
  }

  // --- Helpers --------------------------------------------------------------

  private snapshotSlide(slide: any) {
    return {
      type:         slide.type,
      title:        slide.title,
      subtitle:     slide.subtitle,
      content:      slide.content,
      layoutKey:    slide.layoutKey,
      themeKey:     slide.themeKey,
      speakerNotes: slide.speakerNotes,
      background:   slide.background,
      themeTokens:  slide.themeTokens,
      metadata:     slide.metadata,
      transition:   slide.transition,
      elements: (slide.elements || []).map((el: any) => ({
        type: el.type, name: el.name, order: el.order,
        x: el.x, y: el.y, width: el.width, height: el.height,
        rotation: el.rotation, zIndex: el.zIndex,
        locked: el.locked, visible: el.visible,
        content: el.content, data: el.data, style: el.style,
        animations: el.animations, accessibility: el.accessibility,
      })),
    };
  }

  private async nextSectionOrder(deckId: string): Promise<number> {
    const last = await this.prisma.deckSection.findFirst({
      where: { deckId }, orderBy: { order: 'desc' },
    });
    return (last?.order ?? -1) + 1;
  }
}
