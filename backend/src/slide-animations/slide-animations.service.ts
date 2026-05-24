import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// =============================================================================
//  Phase 38H — SlideAnimationsService
//
//  Per-element animations stored as JSON in SlideElement.animations:
//    [{
//      id, effect: 'fade'|'appear'|'flyIn'|'zoom'|'grow'|'wipe',
//      direction?: 'left'|'right'|'top'|'bottom',
//      duration: number,    // ms
//      delay:    number,    // ms
//      order:    number,    // 0-based sequence on the slide
//      trigger?: 'click'|'auto'|'with_previous'|'after_previous',
//    }]
//
//  The editor / presenter / PPTX exporter all read this shape. PPTX export
//  maps each entry to OOXML <p:timing> + <p:par> nodes (the export pipeline
//  does the mapping; this service just maintains data shape).
// =============================================================================

export type AnimationEffect =
  // Entry
  | 'fade' | 'appear' | 'flyIn' | 'zoom' | 'grow' | 'wipe'
  // Exit (Phase 38.2D)
  | 'flyOut' | 'zoomOut' | 'wipeOut'
  // Emphasis (Phase 38.2D)
  | 'pulse' | 'colorChange' | 'spin'
  // Motion path (Phase 38.2E)
  | 'motionPath';

export type AnimationClass = 'entr' | 'exit' | 'emph' | 'path';

export interface SlideAnimation {
  id:        string;
  effect:    AnimationEffect;
  /** 'entr' (default), 'exit', 'emph', 'path'. */
  class?:    AnimationClass;
  direction?: 'left' | 'right' | 'top' | 'bottom';
  duration:  number;
  delay:     number;
  order:     number;
  trigger?:  'click' | 'auto' | 'with_previous' | 'after_previous';
  // Phase 38.2D additions
  repeat?:     number | 'indefinite';
  byParagraph?: boolean;
  /** Phase 38.2E — SVG-like path commands in percent of slide. */
  motionPath?: string;
}

export interface AnimationInput extends Omit<SlideAnimation, 'id'> {
  id?: string;
}

@Injectable()
export class SlideAnimationsService {
  constructor(private prisma: PrismaService) {}

  // --- Per-element CRUD ----------------------------------------------------

  async list(elementId: string): Promise<SlideAnimation[]> {
    const el = await this.prisma.slideElement.findUnique({
      where:  { id: elementId },
      select: { animations: true },
    });
    if (!el) throw new NotFoundException('Element not found');
    return (el.animations as any) || [];
  }

  async add(elementId: string, input: AnimationInput) {
    const list = await this.list(elementId);
    const next = [...list, this.normalise(input, list.length)];
    return this.write(elementId, next);
  }

  async update(elementId: string, animationId: string, patch: Partial<AnimationInput>) {
    const list = await this.list(elementId);
    const idx  = list.findIndex((a) => a.id === animationId);
    if (idx < 0) throw new NotFoundException('Animation not found');
    list[idx] = { ...list[idx], ...patch, id: list[idx].id };
    return this.write(elementId, list);
  }

  async remove(elementId: string, animationId: string) {
    const list = await this.list(elementId);
    return this.write(elementId, list.filter((a) => a.id !== animationId));
  }

  async reorder(elementId: string, ids: string[]) {
    const list = await this.list(elementId);
    const map  = new Map(list.map((a) => [a.id, a]));
    const next = ids.map((id, i) => {
      const a = map.get(id);
      return a ? { ...a, order: i } : null;
    }).filter(Boolean) as SlideAnimation[];
    return this.write(elementId, next);
  }

  async clearForSlide(slideId: string) {
    const res = await this.prisma.slideElement.updateMany({
      where: { slideId, NOT: { animations: null } },
      data:  { animations: [] },
    });
    return { cleared: res.count };
  }

  // --- Helpers -------------------------------------------------------------

  private normalise(input: AnimationInput, fallbackOrder: number): SlideAnimation {
    return {
      id:          input.id || `anim-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      effect:      input.effect,
      class:       input.class ?? 'entr',
      direction:   input.direction,
      duration:    Math.max(0, Number(input.duration ?? 500)),
      delay:       Math.max(0, Number(input.delay ?? 0)),
      order:       Number(input.order ?? fallbackOrder),
      trigger:     input.trigger ?? 'click',
      repeat:      input.repeat,
      byParagraph: input.byParagraph,
      motionPath:  input.motionPath,
    };
  }

  private async write(elementId: string, list: SlideAnimation[]) {
    await this.prisma.slideElement.update({
      where: { id: elementId },
      data:  { animations: list as any },
    });
    return list;
  }
}
