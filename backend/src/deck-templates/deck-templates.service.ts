import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// =============================================================================
//  Phase 38P — DeckTemplatesService
//
//  Convert a deck into a reusable template. Payload bundles:
//    - masters     : all MasterSlide rows
//    - masterEls   : all MasterElement rows
//    - layouts     : referenced LayoutTemplate rows (snapshot)
//    - themes      : referenced DeckTheme rows (snapshot)
//    - sections    : DeckSection rows
//    - slides      : Slide rows + nested elements
//
//  Distinct from the legacy `Template` model (which is a coarse generation
//  preset). DeckTemplate is the editor-side template, instantiated via
//  instantiate(templateId, projectId) to spin up a fresh Deck.
// =============================================================================

export interface DeckTemplateInput {
  name?:        string;
  description?: string;
  thumbnail?:   string | null;
  isPublic?:    boolean;
  workspaceId?: string | null;
}

@Injectable()
export class DeckTemplatesService {
  constructor(private prisma: PrismaService) {}

  list(opts: { workspaceId?: string | null } = {}) {
    return this.prisma.deckTemplate.findMany({
      where: opts.workspaceId
        ? { OR: [{ workspaceId: opts.workspaceId }, { isPublic: true }] }
        : { isPublic: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  findOne(id: string) {
    return this.prisma.deckTemplate.findUnique({ where: { id } });
  }

  // --- Snapshot a deck into a new template --------------------------------

  async fromDeck(deckId: string, input: DeckTemplateInput) {
    const deck = await this.prisma.deck.findUnique({
      where: { id: deckId },
      include: {
        slides:         { include: { elements: true } },
        masterSlides:   true,
        masterElements: true,
        sections:       true,
        themes:         true,
      },
    });
    if (!deck) throw new NotFoundException('Deck not found');

    const layoutIds = Array.from(
      new Set(deck.slides.map((s) => s.layoutTemplateId).filter(Boolean) as string[]),
    );
    const layouts = layoutIds.length
      ? await this.prisma.layoutTemplate.findMany({ where: { id: { in: layoutIds } } })
      : [];

    return this.prisma.deckTemplate.create({
      data: {
        workspaceId:  input.workspaceId ?? null,
        sourceDeckId: deckId,
        name:         input.name?.trim() || `${deck.title} (template)`,
        description:  input.description ?? null,
        thumbnail:    input.thumbnail ?? null,
        isPublic:     input.isPublic ?? false,
        payload: {
          version:  1,
          deck:     { title: deck.title, description: deck.description, masterSettings: deck.masterSettings },
          masters:  deck.masterSlides,
          masterEls: deck.masterElements,
          layouts,
          themes:   deck.themes,
          sections: deck.sections,
          slides:   deck.slides,
        } as any,
      },
    });
  }

  // --- Instantiate a deck from a template ---------------------------------

  async instantiate(templateId: string, projectId: string, title?: string) {
    const tmpl = await this.findOne(templateId);
    if (!tmpl) throw new NotFoundException('Template not found');
    const payload = tmpl.payload as any;

    const deck = await this.prisma.deck.create({
      data: {
        projectId,
        title:          title?.trim() || payload?.deck?.title || tmpl.name,
        description:    payload?.deck?.description ?? null,
        masterSettings: payload?.deck?.masterSettings ?? null,
        status:         'draft',
      },
    });

    // Recreate masters + sections + themes so FKs resolve.
    const masterIdMap  = new Map<string, string>();
    const sectionIdMap = new Map<string, string>();
    const themeIdMap   = new Map<string, string>();

    for (const m of payload?.masters || []) {
      const created = await this.prisma.masterSlide.create({
        data: {
          deckId:        deck.id,
          name:          m.name,
          layoutType:    m.layoutType,
          background:    m.background,
          slots:         m.slots,
          defaultStyles: m.defaultStyles,
          preview:       m.preview,
        },
      });
      masterIdMap.set(m.id, created.id);
    }
    for (const sec of payload?.sections || []) {
      const created = await this.prisma.deckSection.create({
        data: { deckId: deck.id, name: sec.name, color: sec.color, order: sec.order, collapsed: sec.collapsed },
      });
      sectionIdMap.set(sec.id, created.id);
    }
    for (const th of payload?.themes || []) {
      const created = await this.prisma.deckTheme.create({
        data: {
          deckId:      deck.id,
          workspaceId: th.workspaceId,
          name:        th.name,
          tokens:      th.tokens,
          isWorkspace: false,
        },
      });
      themeIdMap.set(th.id, created.id);
    }

    // Slides + elements.
    for (const s of payload?.slides || []) {
      const created = await this.prisma.slide.create({
        data: {
          deckId:           deck.id,
          type:             s.type,
          order:            s.order,
          title:            s.title,
          subtitle:         s.subtitle,
          content:          s.content,
          layoutKey:        s.layoutKey,
          themeKey:         s.themeKey,
          speakerNotes:     s.speakerNotes,
          background:       s.background,
          themeTokens:      s.themeTokens,
          metadata:         s.metadata,
          transition:       s.transition,
          sectionId:        s.sectionId ? sectionIdMap.get(s.sectionId) ?? null : null,
          masterSlideId:    s.masterSlideId ? masterIdMap.get(s.masterSlideId) ?? null : null,
          themeId:          s.themeId ? themeIdMap.get(s.themeId) ?? null : null,
          // layoutTemplateId is workspace-scoped — leave dangling references
          // intact; instantiate() does not re-create layouts.
          layoutTemplateId: s.layoutTemplateId ?? null,
        },
      });
      if (Array.isArray(s.elements) && s.elements.length) {
        await this.prisma.slideElement.createMany({
          data: s.elements.map((el: any) => ({
            slideId: created.id,
            type:    el.type, name: el.name, order: el.order,
            x: el.x, y: el.y, width: el.width, height: el.height,
            rotation: el.rotation, zIndex: el.zIndex,
            locked: el.locked, visible: el.visible,
            content: el.content, data: el.data, style: el.style,
            animations: el.animations, accessibility: el.accessibility,
          })),
        });
      }
    }

    // Master elements.
    for (const me of payload?.masterEls || []) {
      await this.prisma.masterElement.create({
        data: {
          deckId: deck.id,
          type:   me.type, name: me.name,
          x: me.x, y: me.y, width: me.width, height: me.height,
          rotation: me.rotation, zIndex: me.zIndex, sendToFront: me.sendToFront,
          visible: me.visible, excludedSlides: me.excludedSlides ?? [],
          elementData: me.elementData, style: me.style,
        },
      });
    }

    return deck;
  }

  async remove(id: string) {
    if (!(await this.findOne(id))) throw new NotFoundException('Template not found');
    return this.prisma.deckTemplate.delete({ where: { id } });
  }
}
