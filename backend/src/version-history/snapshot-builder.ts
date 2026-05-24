// =============================================================================
//  Snapshot builder — Phase 35
//
//  Pure function: given the rows fetched from Prisma (deck, slides+elements,
//  master elements, component instances), produce a `DeckSnapshot` JSON
//  payload that the version-history service stores. Symmetric with the
//  restore step — anything captured here must be restorable.
// =============================================================================

import type { DeckSnapshot } from './version-types';

export const SNAPSHOT_SCHEMA_VERSION = 1;

export function buildSnapshot(input: {
  deck: any;
  slides: any[];        // each slide has `elements`
  masters: any[];
  componentInstances: any[];
}): DeckSnapshot {
  const { deck, slides, masters, componentInstances } = input;

  // Build a slideId → slideOrder map so component-instance rows can be
  // re-resolved on restore without storing slide ids (which won't exist
  // after a fresh insert).
  const slideOrderById = new Map<string, number>();
  for (const s of slides) slideOrderById.set(s.id, s.order);

  return {
    schemaVersion: SNAPSHOT_SCHEMA_VERSION,
    capturedAt:    new Date().toISOString(),
    deck: {
      title:             deck.title,
      description:       deck.description ?? null,
      status:            deck.status ?? 'ready',
      masterSettings:    deck.masterSettings ?? null,
      qualityScore:      deck.qualityScore ?? null,
      validationResult:  deck.validationResult ?? null,
      generationMetrics: deck.generationMetrics ?? null,
      exportReady:       !!deck.exportReady,
    },
    slides: slides.map((s) => ({
      type:         s.type,
      order:        s.order,
      title:        s.title ?? '',
      subtitle:     s.subtitle ?? null,
      content:      s.content ?? null,
      layoutKey:    s.layoutKey ?? null,
      themeKey:     s.themeKey ?? null,
      speakerNotes: s.speakerNotes ?? null,
      background:   s.background ?? null,
      themeTokens:  s.themeTokens ?? null,
      metadata:     s.metadata ?? null,
      elements: (s.elements || []).map((e: any) => ({
        type: e.type,
        name: e.name ?? null,
        order: e.order, x: e.x, y: e.y, width: e.width, height: e.height,
        rotation: e.rotation, zIndex: e.zIndex,
        locked: !!e.locked, visible: e.visible !== false,
        content: e.content ?? null,
        data: e.data ?? null,
        style: e.style ?? null,
        animations: e.animations ?? null,
        accessibility: e.accessibility ?? null,
      })),
    })),
    masters: (masters || []).map((m) => ({
      type: m.type,
      name: m.name ?? null,
      x: m.x, y: m.y, width: m.width, height: m.height,
      rotation: m.rotation, zIndex: m.zIndex, sendToFront: !!m.sendToFront,
      visible: m.visible !== false,
      excludedSlides: m.excludedSlides || [],
      elementData: m.elementData ?? null,
      style: m.style ?? null,
    })),
    componentInstances: (componentInstances || []).map((ci) => ({
      componentId: ci.componentId,
      slideOrder:  slideOrderById.get(ci.slideId) ?? -1,
      anchorX: ci.anchorX, anchorY: ci.anchorY,
      scale: ci.scale, version: ci.version,
    })).filter((ci) => ci.slideOrder >= 0),
  };
}
