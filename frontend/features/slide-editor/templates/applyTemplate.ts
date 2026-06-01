'use client';

import api from '@/lib/api';
import type { TemplateSpec } from './registry';

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
  order?: number;
}

export async function applyTemplate(
  projectId: string,
  deckId: string,
  template: TemplateSpec,
  opts: ApplyOpts = {},
): Promise<{ slidesApplied: number; elementsRestyled: number; slides: DeckSlide[] }> {
  if (opts.fullDeck === false && opts.slideIds?.length) {
    // The bulk endpoint is deck-wide by design. Keep a guarded escape hatch for
    // future partial-template UX without returning to request-per-slide storms.
    throw new Error('Partial template application is not supported yet.');
  }

  await api.post(`/generate/template-switch/${projectId}`, {
    deckId,
    templateId: template.id,
  });

  const { data: slides } = await api.get<DeckSlide[]>(`/slides/deck/${deckId}`);
  const normalizedSlides = Array.isArray(slides) ? slides : [];

  for (const slide of normalizedSlides) opts.onSlideDone?.(slide.id);
  return { slidesApplied: normalizedSlides.length, elementsRestyled: 0, slides: normalizedSlides };
}
