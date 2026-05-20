'use client';

import api from '@/lib/api';
import type { SlideElementDTO } from '@/types/slide-element';
import type { TemplateSpec } from './registry';
import { deriveElementStyle } from './registry';

// =============================================================================
//  applyTemplate
//
//  Walks every slide in a deck and applies the template:
//    1. slide.themeTokens ← template.theme
//    2. slide.background  ← template.blueprint.background[slide.type] OR defaultBackground
//    3. slide.metadata.appliedTemplateId ← template.id (for UI display)
//    4. For each element on the slide, overwrite the theme-controlled style
//       fields via deriveElementStyle(). All other style + content + geometry
//       is preserved.
//
//  Non-destructive: bullets, charts, images, numbers stay where the user put
//  them. Only theme-driven visual properties change.
//
//  Re-applying the SAME template should be a no-op (idempotent).
// =============================================================================

interface ApplyOpts {
  /** When true (default), every slide is processed. When false, only `slideIds`. */
  fullDeck?: boolean;
  /** Subset to process when fullDeck=false */
  slideIds?: string[];
  /** Called after each slide so the caller can update progress UI / thumbnails */
  onSlideDone?: (slideId: string) => void;
}

interface DeckSlide {
  id: string;
  type: string;
}

export async function applyTemplate(
  deckId: string,
  template: TemplateSpec,
  opts: ApplyOpts = {},
): Promise<{ slidesApplied: number; elementsRestyled: number }> {
  // 1. Load deck slides via the existing endpoint
  const { data: slides } = await api.get<DeckSlide[]>(`/slides/deck/${deckId}`);
  const target: DeckSlide[] = opts.fullDeck === false
    ? slides.filter((s) => (opts.slideIds || []).includes(s.id))
    : slides;

  let elementsRestyled = 0;

  for (const slide of target) {
    // 2. Compute per-slide background (type-specific override beats default)
    const background = template.blueprint.background[slide.type] || template.theme.defaultBackground;

    // 3. PATCH slide-level fields
    await api.patch(`/slides/${slide.id}`, {
      themeTokens: stripDefaultBackground(template.theme),
      background,
      metadata: { appliedTemplateId: template.id, appliedAt: new Date().toISOString() },
    });

    // 4. Restyle elements: GET, transform each, syncAll back
    const { data: elements } = await api.get<SlideElementDTO[]>(`/slides/${slide.id}/elements`);
    const restyled = elements.map((el) => {
      const themeStyle = deriveElementStyle(template, el);
      const mergedStyle = { ...(el.style || {}), ...themeStyle };
      return { ...el, style: mergedStyle };
    });
    await api.post(`/slides/${slide.id}/elements/sync`, { elements: restyled });
    elementsRestyled += elements.length;

    opts.onSlideDone?.(slide.id);
  }

  return { slidesApplied: target.length, elementsRestyled };
}

function stripDefaultBackground(theme: TemplateSpec['theme']) {
  // `theme.defaultBackground` is a registry-only field; it doesn't belong
  // in the persisted themeTokens shape.
  const { defaultBackground, ...rest } = theme;
  return rest;
}
