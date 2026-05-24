import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// =============================================================================
//  Phase 38A — MasterSlidesService
//
//  Deck-scoped master records. A MasterSlide carries background, slot config,
//  default styles and (optionally) a snapshot preview. Slides reference a
//  master via Slide.masterSlideId; existing MasterElement rows that were
//  previously deck-scoped continue to render through the MastersOverlay.
//
//  Operations:
//    list(deckId)
//    create(deckId, input)        — create a new master
//    findOne(id)
//    update(id, patch)
//    duplicate(id)                — clone "X (copy)"
//    remove(id)
//    applyToDeck(masterId)        — link every slide in the deck
//    applyToSlides(masterId, ids) — link specific slides
//    unlinkAll(deckId)            — clear masterSlideId on every slide
// =============================================================================

export interface MasterSlideInput {
  name?:          string;
  layoutType?:    'cover' | 'body' | 'divider' | 'appendix' | 'custom';
  background?:    any;
  slots?:         any;
  defaultStyles?: any;
  preview?:       any;
}

@Injectable()
export class MasterSlidesService {
  constructor(private prisma: PrismaService) {}

  list(deckId: string) {
    return this.prisma.masterSlide.findMany({
      where: { deckId },
      orderBy: { createdAt: 'asc' },
    });
  }

  findOne(id: string) {
    return this.prisma.masterSlide.findUnique({ where: { id } });
  }

  create(deckId: string, input: MasterSlideInput) {
    return this.prisma.masterSlide.create({
      data: {
        deckId,
        name:          input.name?.trim() || 'Untitled master',
        layoutType:    input.layoutType ?? 'body',
        background:    input.background ?? null,
        slots:         input.slots ?? null,
        defaultStyles: input.defaultStyles ?? null,
        preview:       input.preview ?? null,
      },
    });
  }

  async update(id: string, patch: MasterSlideInput) {
    const master = await this.findOne(id);
    if (!master) throw new NotFoundException('Master not found');
    return this.prisma.masterSlide.update({ where: { id }, data: patch });
  }

  async duplicate(id: string) {
    const src = await this.findOne(id);
    if (!src) throw new NotFoundException('Master not found');
    return this.prisma.masterSlide.create({
      data: {
        deckId:        src.deckId,
        name:          `${src.name} (copy)`,
        layoutType:    src.layoutType,
        background:    src.background  as any,
        slots:         src.slots         as any,
        defaultStyles: src.defaultStyles as any,
        preview:       src.preview       as any,
      },
    });
  }

  async remove(id: string) {
    const master = await this.findOne(id);
    if (!master) throw new NotFoundException('Master not found');
    // Slides referencing this master fall back to "no master" via SetNull.
    return this.prisma.masterSlide.delete({ where: { id } });
  }

  // --- Apply --------------------------------------------------------------

  async applyToDeck(masterId: string) {
    const master = await this.findOne(masterId);
    if (!master) throw new NotFoundException('Master not found');
    const res = await this.prisma.slide.updateMany({
      where: { deckId: master.deckId },
      data:  { masterSlideId: masterId },
    });
    return { applied: res.count };
  }

  async applyToSlides(masterId: string, slideIds: string[]) {
    if (!Array.isArray(slideIds) || slideIds.length === 0) return { applied: 0 };
    const res = await this.prisma.slide.updateMany({
      where: { id: { in: slideIds } },
      data:  { masterSlideId: masterId },
    });
    return { applied: res.count };
  }

  async unlinkAll(deckId: string) {
    const res = await this.prisma.slide.updateMany({
      where: { deckId, NOT: { masterSlideId: null } },
      data:  { masterSlideId: null },
    });
    return { cleared: res.count };
  }
}
