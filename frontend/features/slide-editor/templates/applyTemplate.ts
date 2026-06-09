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
  void projectId;

  if (opts.fullDeck === false && opts.slideIds?.length) {
    // The bulk endpoint is deck-wide by design. Keep a guarded escape hatch for
    // future partial-template UX without returning to request-per-slide storms.
    throw new Error('Partial template application is not supported yet.');
  }

  // Template application must be non-destructive. The generation pipeline's
  // TEMPLATE_SWITCH command rebuilds the deck from wizard input and deletes
  // existing slides first, which can drop user edits and sparse content. Use the
  // deck-scoped visual apply endpoint instead: it only updates theme tokens,
  // backgrounds, deck metadata, and element style fields.
  const { data } = await api.post<{
    slidesApplied: number;
    elementsRestyled: number;
    slides: DeckSlide[];
  }>(`/slides/deck/${deckId}/apply-template`, {
    templateId: template.id,
    theme: template.theme,
    blueprint: template.blueprint,
  });

  const normalizedSlides = Array.isArray(data?.slides) ? data.slides : [];

  for (const slide of normalizedSlides) opts.onSlideDone?.(slide.id);
  return {
    slidesApplied: data?.slidesApplied ?? normalizedSlides.length,
    elementsRestyled: data?.elementsRestyled ?? 0,
    slides: normalizedSlides,
  };
}
