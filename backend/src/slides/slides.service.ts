import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateSlideDto, UpdateSlideDto } from './dto/slide.dto';
import { CollaborationBroadcaster } from '../collaboration/collaboration-broadcaster';
import { familyForTemplate } from '../generation/template-family-map';
import { getFamilyTokens } from '../components/smart/family-tokens';
import type { SmartFamilyId } from '../components/smart/smart-types';

@Injectable()
export class SlidesService {
  constructor(
    private prisma: PrismaService,
    private broadcaster: CollaborationBroadcaster,
  ) {}

  async create(deckId: string, dto: CreateSlideDto) {
    const slide = await this.prisma.slide.create({
      data: {
        deckId,
        type: dto.type,
        order: dto.order,
        title: dto.title,
        subtitle: dto.subtitle,
        content: dto.content,
        speakerNotes: dto.speakerNotes,
        layoutKey: dto.layoutKey,
        themeKey: dto.themeKey,
        ...(dto.background !== undefined ? { background: dto.background } : {}),
        ...(dto.themeTokens !== undefined ? { themeTokens: dto.themeTokens } : {}),
        ...(dto.metadata !== undefined ? { metadata: dto.metadata } : {}),
      },
    });
    // Phase 34.1A — broadcast structure change to every collaborator.
    this.broadcaster.toDeck(deckId, 'slide.created', { slide });
    return slide;
  }

  async createMany(deckId: string, slides: CreateSlideDto[]) {
    const createdSlides = await Promise.all(slides.map((slide) => this.create(deckId, slide)));
    return createdSlides;
  }

  async findAll(deckId: string) {
    return this.prisma.slide.findMany({
      where: { deckId },
      orderBy: { order: 'asc' },
    });
  }

  async findOne(id: string) {
    const slide = await this.prisma.slide.findUnique({ where: { id } });
    if (!slide) throw new NotFoundException('Slide not found');
    return slide;
  }

  async verifyOwnership(slideId: string, userId: string): Promise<void> {
    const slide = await this.prisma.slide.findFirst({
      where: {
        id: slideId,
        deck: { project: { userId } },
      },
    });
    if (!slide) throw new ForbiddenException('You do not have permission to modify this slide');
  }

  async verifyDeckOwnership(deckId: string, userId: string): Promise<void> {
    const deck = await this.prisma.deck.findFirst({
      where: { id: deckId, project: { userId } },
    });
    if (!deck) throw new ForbiddenException('You do not have permission to modify this deck');
  }

  async update(id: string, dto: UpdateSlideDto) {
    const slide = await this.prisma.slide.update({ where: { id }, data: dto });
    // Phase 34.1A — title/subtitle/order/etc. changes propagate live.
    this.broadcaster.toDeck(slide.deckId, 'slide.updated', { slide });
    return slide;
  }

  async remove(id: string) {
    // Capture deckId BEFORE delete so we can broadcast afterwards.
    const existing = await this.prisma.slide.findUnique({
      where: { id },
      select: { deckId: true },
    });
    await this.prisma.slide.delete({ where: { id } });
    if (existing) this.broadcaster.toDeck(existing.deckId, 'slide.deleted', { slideId: id });
    return { message: 'Slide deleted successfully' };
  }

  // ===========================================================================
  //  Phase 5 — slide-level deck operations
  // ===========================================================================

  /**
   * Insert a new blank slide after `afterSlideId` (or at the end if not given).
   * Auto-seeds with default elements: heading (title), paragraph (body),
   * footer, page-number. Bumps the order of slides that come after.
   */
  async insertBlank(
    deckId: string,
    opts: { afterSlideId?: string; title?: string; type?: string } = {},
  ) {
    const slidesInDeck = await this.prisma.slide.findMany({
      where: { deckId },
      orderBy: { order: 'asc' },
      select: { id: true, order: true },
    });
    let insertOrder = slidesInDeck.length + 1;
    if (opts.afterSlideId) {
      const idx = slidesInDeck.findIndex((s) => s.id === opts.afterSlideId);
      if (idx >= 0) insertOrder = slidesInDeck[idx].order + 1;
    }

    // Shift everything after insertOrder down by 1 (in a single tx with the create)
    const shifts = slidesInDeck.filter((s) => s.order >= insertOrder);

    const result = await this.prisma.$transaction(async (tx) => {
      // Two-phase order shift to avoid the @@index([deckId, order]) collision:
      // first push them into a high range, then back down.
      const offset = 10_000;
      for (const s of shifts) {
        await tx.slide.update({ where: { id: s.id }, data: { order: s.order + offset } });
      }
      for (const s of shifts) {
        await tx.slide.update({
          where: { id: s.id },
          data: { order: s.order + offset + 1 - offset },
        });
      }
      // Now create the new slide
      const created = await tx.slide.create({
        data: {
          deckId,
          type: opts.type || 'content',
          order: insertOrder,
          title: opts.title || 'New slide',
          subtitle: null,
          content: {},
          speakerNotes: null,
          elementsVersion: 1, // already in element model — skip legacy migrate
        },
      });
      // Seed default elements so the slide isn't empty in the canvas
      await tx.slideElement.createMany({
        data: [
          {
            slideId: created.id,
            type: 'heading',
            name: 'Title',
            order: 0,
            zIndex: 1,
            x: 6,
            y: 10,
            width: 88,
            height: 14,
            rotation: 0,
            locked: false,
            visible: true,
            content: { text: opts.title || 'New slide' } as any,
            data: Prisma.JsonNull,
            style: Prisma.JsonNull,
            animations: Prisma.JsonNull,
            accessibility: Prisma.JsonNull,
          },
          {
            slideId: created.id,
            type: 'paragraph',
            name: 'Body',
            order: 1,
            zIndex: 2,
            x: 6,
            y: 28,
            width: 88,
            height: 30,
            rotation: 0,
            locked: false,
            visible: true,
            content: { text: '' } as any,
            data: Prisma.JsonNull,
            style: Prisma.JsonNull,
            animations: Prisma.JsonNull,
            accessibility: Prisma.JsonNull,
          },
          {
            slideId: created.id,
            type: 'footer',
            name: 'Footer',
            order: 2,
            zIndex: 3,
            x: 6,
            y: 94,
            width: 70,
            height: 4,
            rotation: 0,
            locked: false,
            visible: true,
            content: { text: '' } as any,
            data: Prisma.JsonNull,
            style: Prisma.JsonNull,
            animations: Prisma.JsonNull,
            accessibility: Prisma.JsonNull,
          },
          {
            slideId: created.id,
            type: 'pageNumber',
            name: 'Page #',
            order: 3,
            zIndex: 4,
            x: 88,
            y: 94,
            width: 8,
            height: 4,
            rotation: 0,
            locked: false,
            visible: true,
            content: { format: 'numeric' } as any,
            data: Prisma.JsonNull,
            style: Prisma.JsonNull,
            animations: Prisma.JsonNull,
            accessibility: Prisma.JsonNull,
          },
        ],
      });
      return created;
    });

    return result;
  }

  /**
   * Duplicate an existing slide INCLUDING its elements.
   * The new slide is inserted directly after the source slide, and following
   * slides are shifted down by 1.
   */
  async duplicate(slideId: string) {
    const src = await this.prisma.slide.findUnique({
      where: { id: slideId },
      include: { elements: true },
    });
    if (!src) throw new NotFoundException('Slide not found');

    const copy = await this.prisma.$transaction(async (tx) => {
      // Shift subsequent slides down by 1 — two-phase to avoid unique violations
      const subsequent = await tx.slide.findMany({
        where: { deckId: src.deckId, order: { gt: src.order } },
        select: { id: true, order: true },
      });
      const offset = 10_000;
      for (const s of subsequent) {
        await tx.slide.update({ where: { id: s.id }, data: { order: s.order + offset } });
      }
      for (const s of subsequent) {
        await tx.slide.update({
          where: { id: s.id },
          data: { order: s.order + offset + 1 - offset },
        });
      }

      const copy = await tx.slide.create({
        data: {
          deckId: src.deckId,
          type: src.type,
          order: src.order + 1,
          title: src.title.endsWith('(copy)') ? src.title : `${src.title} (copy)`,
          subtitle: src.subtitle,
          content: src.content as Prisma.InputJsonValue,
          speakerNotes: src.speakerNotes,
          layoutKey: src.layoutKey,
          themeKey: src.themeKey,
          elementsVersion: src.elementsVersion,
          background: (src.background ?? Prisma.JsonNull) as Prisma.InputJsonValue,
          themeTokens: (src.themeTokens ?? Prisma.JsonNull) as Prisma.InputJsonValue,
          metadata: (src.metadata ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        },
      });

      if (src.elements.length > 0) {
        await tx.slideElement.createMany({
          data: src.elements.map((el) => ({
            slideId: copy.id,
            type: el.type,
            name: el.name,
            order: el.order,
            x: el.x,
            y: el.y,
            width: el.width,
            height: el.height,
            rotation: el.rotation,
            zIndex: el.zIndex,
            locked: el.locked,
            visible: el.visible,
            content: (el.content ?? Prisma.JsonNull) as Prisma.InputJsonValue,
            data: (el.data ?? Prisma.JsonNull) as Prisma.InputJsonValue,
            style: (el.style ?? Prisma.JsonNull) as Prisma.InputJsonValue,
            animations: (el.animations ?? Prisma.JsonNull) as Prisma.InputJsonValue,
            accessibility: (el.accessibility ?? Prisma.JsonNull) as Prisma.InputJsonValue,
          })),
        });
      }

      return copy;
    });
    // Phase 34.1A — broadcast both the new slide AND a reorder hint (since
    // subsequent slides' orders changed inside the transaction).
    this.broadcaster.toDeck(src.deckId, 'slide.created', { slide: copy, duplicateOf: slideId });
    this.broadcaster.toDeck(src.deckId, 'slide.reordered', { changedAround: copy.id });
    return copy;
  }

  /**
   * Bulk reorder slides in a deck. Caller sends the new order as an array of
   * { id, order }. We use a two-phase update so the @@index([deckId, order])
   * unique scenario never collides.
   */
  async reorder(deckId: string, entries: Array<{ id: string; order: number }>) {
    if (!Array.isArray(entries) || entries.length === 0) {
      throw new BadRequestException('reorder requires a non-empty entries[] array');
    }
    // Verify every entry belongs to the deck
    const ids = entries.map((e) => e.id);
    const owned = await this.prisma.slide.findMany({
      where: { id: { in: ids }, deckId },
      select: { id: true },
    });
    if (owned.length !== ids.length) {
      throw new BadRequestException('one or more slide IDs do not belong to this deck');
    }

    const offset = 10_000;
    await this.prisma.$transaction(async (tx) => {
      // Phase A: push everything to offset range
      for (const e of entries) {
        await tx.slide.update({ where: { id: e.id }, data: { order: e.order + offset } });
      }
      // Phase B: bring them back to the requested order
      for (const e of entries) {
        await tx.slide.update({ where: { id: e.id }, data: { order: e.order } });
      }
    });
    // Phase 34.1A — single reorder event with the new ordering. Receivers
    // can either refetch (cheaper) or apply the diff themselves.
    this.broadcaster.toDeck(deckId, 'slide.reordered', {
      order: entries.map((e) => ({ id: e.id, order: e.order })),
    });
    return this.findAll(deckId);
  }

  async applyTemplate(
    deckId: string,
    input: {
      templateId: string;
      theme?: any;
      blueprint?: { background?: Record<string, any> };
    },
  ) {
    if (!input?.templateId) {
      throw new BadRequestException('templateId is required');
    }

    const slides = await this.prisma.slide.findMany({
      where: { deckId },
      orderBy: { order: 'asc' },
      include: { elements: true },
    });
    const familyId = familyForTemplate(input.templateId);
    const theme = input.theme || fallbackThemeForTemplate(input.templateId, familyId);
    const themeTokens = stripDefaultBackground(theme);
    const backgroundMap = input.blueprint?.background || {};
    const defaultBackground = theme.defaultBackground || {
      type: 'solid',
      color: theme.background || '#ffffff',
    };
    const appliedAt = new Date().toISOString();

    let elementsRestyled = 0;
    await this.prisma.$transaction(async (tx) => {
      const deck = await tx.deck.findUnique({
        where: { id: deckId },
        select: { metadata: true },
      });
      await tx.deck.update({
        where: { id: deckId },
        data: {
          metadata: {
            ...((deck?.metadata as any) || {}),
            templateId: input.templateId,
            familyId: familyId || null,
            appliedAt,
            templateAppliedNonDestructively: true,
          } as Prisma.InputJsonValue,
        },
      });

      for (const slide of slides) {
        const background = backgroundMap[slide.type] || defaultBackground;
        const metadata = {
          ...((slide.metadata as any) || {}),
          appliedTemplateId: input.templateId,
          ...(familyId ? { familyId } : {}),
          appliedAt,
          templateAppliedNonDestructively: true,
        };
        await tx.slide.update({
          where: { id: slide.id },
          data: {
            background: (background ?? Prisma.JsonNull) as Prisma.InputJsonValue,
            themeTokens: (themeTokens ?? Prisma.JsonNull) as Prisma.InputJsonValue,
            metadata: metadata as Prisma.InputJsonValue,
          },
        });

        for (const element of slide.elements) {
          const style = {
            ...((element.style as any) || {}),
            ...deriveTemplateElementStyle(theme, element),
          };
          await tx.slideElement.update({
            where: { id: element.id },
            data: { style: style as Prisma.InputJsonValue },
          });
          elementsRestyled++;
        }
      }
    });

    this.broadcaster.toDeck(deckId, 'slide.updated', {
      deckId,
      templateId: input.templateId,
      slidesApplied: slides.length,
      templateApplied: true,
    });

    return {
      slidesApplied: slides.length,
      elementsRestyled,
      templateId: input.templateId,
      slides: await this.findAll(deckId),
    };
  }
}

function fallbackThemeForTemplate(templateId: string, familyId: string | null) {
  try {
    if (familyId) {
      const tok = getFamilyTokens(familyId as SmartFamilyId);
      return {
        background: tok.bg,
        surface: tok.surface,
        text: tok.text,
        muted: tok.muted,
        accent: tok.accent,
        primary: tok.accent,
        accent2: tok.accent2,
        border: tok.border,
        fontHeading: tok.fontHeading,
        fontBody: tok.fontBody,
        defaultBackground: tok.bg.includes('gradient')
          ? { type: 'gradient', value: tok.bg }
          : { type: 'solid', color: tok.bg },
      };
    }
  } catch {
    // Fall through to neutral fallback below.
  }
  return {
    background: '#ffffff',
    surface: '#f8fafc',
    text: '#0f172a',
    muted: '#64748b',
    accent: '#2563eb',
    primary: '#2563eb',
    accent2: '#7c3aed',
    border: '#e2e8f0',
    fontHeading: 'Inter, system-ui, sans-serif',
    fontBody: 'Inter, system-ui, sans-serif',
    defaultBackground: {
      type: 'solid',
      color: templateId.includes('dark') ? '#0f172a' : '#ffffff',
    },
  };
}

const TEXT_TYPES = new Set([
  'heading',
  'subheading',
  'paragraph',
  'quote',
  'caption',
  'label',
  'cta',
  'footer',
  'pageNumber',
]);
const ACCENT_TYPES = new Set(['metric', 'kpi', 'stat']);
const NEUTRAL_FILLS = new Set(['transparent', 'none', '', 'rgba(0,0,0,0)', '#00000000']);
const NEUTRAL_COLORS = new Set(['transparent', 'none', '']);

function stripDefaultBackground(theme: any) {
  const { defaultBackground, ...rest } = theme || {};
  return rest;
}

function isAbsoluteNeutral(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value.toLowerCase().trim();
  return (
    normalized === '#ffffff' ||
    normalized === '#000000' ||
    normalized === '#fff' ||
    normalized === '#000' ||
    normalized === 'white' ||
    normalized === 'black'
  );
}

function deriveTemplateElementStyle(theme: any, element: any): Record<string, any> {
  const existing = (element.style || {}) as Record<string, any>;
  const content = (element.content || {}) as Record<string, any>;
  const out: Record<string, any> = {};

  if (TEXT_TYPES.has(element.type)) {
    const isHeading = element.type === 'heading' || element.type === 'subheading';
    out.fontFamily = isHeading ? theme.fontHeading : theme.fontBody;
    out.color = ['footer', 'pageNumber', 'caption'].includes(element.type)
      ? theme.muted
      : theme.text;
  }

  if (ACCENT_TYPES.has(element.type)) {
    out.color = theme.accent;
    out.fontFamily = theme.fontHeading;
  }

  if (element.type === 'cta') {
    out.fill = theme.primary;
    out.color = '#ffffff';
    out.fontFamily = theme.fontBody;
  }

  if (
    [
      'testimonial',
      'teamCard',
      'pricingCard',
      'comparison',
      'swot',
      'featureGrid',
      'processSteps',
      'timeline',
      'roadmap',
    ].includes(element.type)
  ) {
    out.fontFamily = theme.fontBody;
    out.color = theme.text;
  }

  if (element.type === 'shape') {
    const currentFill = existing.fill || content.fill;
    if (
      currentFill &&
      !NEUTRAL_FILLS.has(String(currentFill)) &&
      !isAbsoluteNeutral(String(currentFill))
    ) {
      const lower = String(currentFill).toLowerCase();
      const looksLikeAccent = lower.includes('accent') || lower.includes('surface');
      out.fill = looksLikeAccent ? theme.accent : theme.primary;
      if (existing.stroke) out.stroke = theme.primary;
    }
  }

  if (element.type === 'line') {
    const currentStroke = existing.stroke || content.stroke;
    if (currentStroke && !NEUTRAL_COLORS.has(String(currentStroke))) out.stroke = theme.accent;
  }

  if (element.type === 'divider') {
    const currentStroke = existing.stroke || content.stroke;
    out.stroke =
      currentStroke && !NEUTRAL_COLORS.has(String(currentStroke)) ? theme.accent : theme.muted;
    out.color = theme.muted;
  }

  if (element.type === 'icon') out.color = theme.primary;
  if (element.type === 'chart') {
    out.fill = theme.primary;
    out.color = theme.accent;
  }

  return out;
}
