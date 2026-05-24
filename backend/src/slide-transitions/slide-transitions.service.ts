import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// =============================================================================
//  Phase 38I — SlideTransitionsService
//
//  Per-slide transition stored on Slide.transition (Json):
//    { effect: 'fade'|'push'|'reveal'|'morph'|'cover',
//      duration: number,             // ms
//      direction?: 'left'|'right'|'top'|'bottom',
//      advanceOnClick?: boolean,
//      advanceAfter?: number }       // ms (auto-advance)
// =============================================================================

export type TransitionEffect = 'fade' | 'push' | 'reveal' | 'morph' | 'cover';

export interface SlideTransition {
  effect:          TransitionEffect;
  duration:        number;
  direction?:      'left' | 'right' | 'top' | 'bottom';
  advanceOnClick?: boolean;
  advanceAfter?:   number;
}

@Injectable()
export class SlideTransitionsService {
  constructor(private prisma: PrismaService) {}

  async get(slideId: string): Promise<SlideTransition | null> {
    const slide = await this.prisma.slide.findUnique({
      where:  { id: slideId },
      select: { transition: true },
    });
    if (!slide) throw new NotFoundException('Slide not found');
    return (slide.transition as any) || null;
  }

  async set(slideId: string, transition: SlideTransition) {
    const data: SlideTransition = {
      effect:          transition.effect,
      duration:        Math.max(0, Number(transition.duration ?? 400)),
      direction:       transition.direction,
      advanceOnClick:  transition.advanceOnClick ?? true,
      advanceAfter:    transition.advanceAfter,
    };
    await this.prisma.slide.update({
      where: { id: slideId },
      data:  { transition: data as any },
    });
    return data;
  }

  async clear(slideId: string) {
    await this.prisma.slide.update({
      where: { id: slideId },
      data:  { transition: null as any },
    });
    return { cleared: true };
  }

  /** Apply the same transition to every slide in a deck. */
  async applyToDeck(deckId: string, transition: SlideTransition) {
    const res = await this.prisma.slide.updateMany({
      where: { deckId },
      data:  { transition: transition as any },
    });
    return { applied: res.count };
  }
}
