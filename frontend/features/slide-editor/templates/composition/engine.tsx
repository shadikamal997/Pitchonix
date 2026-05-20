'use client';

import React from 'react';
import type { SlideElementDTO } from '@/types/slide-element';
import { renderElement } from '../../renderers';
import { findVariant, type TemplateFamily, type SlideVariant, type VariantSlot } from './types';

// =============================================================================
//  TemplateCompositionEngine
//
//  Given a slide (its elements + slide.type) and a TemplateFamily, render the
//  full visual composition:
//
//    1. Stage background (from variant.chrome.background || family.chrome.background)
//    2. Decoration layer (geometric accents, frame lines, corner marks)
//    3. Element layer — each element placed into its matching slot, with
//       family-specific typography applied on top of user style
//    4. Overlay layer (page number style, footer mark)
//
//  Slot matching: for each variant slot, find the first un-claimed element
//  whose type is in `acceptsTypes`. Elements with no slot match keep their
//  original geometry (so user-added decorations / extra blocks aren't lost).
// =============================================================================

export interface ComposedSlideProps {
  family:     TemplateFamily;
  slideType:  string;
  slideTitle?: string;
  slideIndex: number;
  total:      number;
  elements:   SlideElementDTO[];
  /** Set when an element is being live-edited so we render its editor in-place. */
  editingId?:    string | null;
  renderEditor?: (el: SlideElementDTO) => React.ReactNode;
}

export const ComposedSlide: React.FC<ComposedSlideProps> = ({
  family, slideType, slideTitle, slideIndex, total, elements, editingId, renderEditor,
}) => {
  const variant = findVariant(family, slideType);
  const chrome  = (variant?.chrome) || family.chrome;
  const typography = variant?.typography || family.typography;

  // 1. Map elements → slots
  const { positioned, overflow } = matchElementsToSlots(elements, variant);

  // 2. Compute stage background CSS
  const stageBg = chrome.background || family.theme.background || '#ffffff';

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: stageBg,
        overflow: 'hidden',
      }}
    >
      {/* Decoration layer */}
      {chrome.decorations && (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
          <chrome.decorations slideIndex={slideIndex} total={total} />
        </div>
      )}

      {/* Element layer — positioned by slots */}
      {positioned.map(({ slot, el }) => (
        <ElementSlotBox
          key={el.id}
          slot={slot}
          el={el}
          typography={typography}
          slideIndex={slideIndex}
          total={total}
          editingId={editingId}
          renderEditor={renderEditor}
        />
      ))}

      {/* Overflow — elements not matched to any slot keep their original geometry */}
      {overflow.map((el) => (
        <FreePositionedBox
          key={el.id}
          el={el}
          typography={typography}
          slideIndex={slideIndex}
          total={total}
          editingId={editingId}
          renderEditor={renderEditor}
        />
      ))}

      {/* Overlay layer */}
      {chrome.overlays && (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 50 }}>
          <chrome.overlays slideIndex={slideIndex} total={total} title={slideTitle} />
        </div>
      )}
    </div>
  );
};

// =============================================================================
//  Slot matcher (content-preserving). Inspired by Phase 11 applyLayout but
//  doesn't mutate elements — produces a positional plan we render against.
// =============================================================================

interface PositionedElement {
  slot: VariantSlot;
  el:   SlideElementDTO;
}

function matchElementsToSlots(
  elements: SlideElementDTO[],
  variant:  SlideVariant | null,
): { positioned: PositionedElement[]; overflow: SlideElementDTO[] } {
  if (!variant) return { positioned: [], overflow: elements.filter((e) => e.visible !== false) };
  const visible = elements.filter((e) => e.visible !== false);
  const pool    = [...visible].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));
  const claimed = new Set<string>();
  const positioned: PositionedElement[] = [];

  for (const slot of variant.slots) {
    for (const t of slot.acceptsTypes) {
      const found = pool.find((el) => !claimed.has(el.id) && el.type === t);
      if (found) {
        claimed.add(found.id);
        positioned.push({ slot, el: found });
        break;
      }
    }
  }

  const overflow = visible.filter((e) => !claimed.has(e.id));
  return { positioned, overflow };
}

// =============================================================================
//  Element renderers — apply family typography on top of user style
// =============================================================================

function applyTypography(
  el: SlideElementDTO,
  typography: { perType?: any },
): React.CSSProperties {
  const t = typography.perType?.[el.type];
  if (!t) return {};
  const style: React.CSSProperties = {};
  if (t.fontSize       !== undefined) style.fontSize       = t.fontSize;
  if (t.fontWeight     !== undefined) style.fontWeight     = t.fontWeight;
  if (t.letterSpacing  !== undefined) style.letterSpacing  = t.letterSpacing;
  if (t.textTransform  !== undefined) style.textTransform  = t.textTransform as any;
  if (t.lineHeight     !== undefined) style.lineHeight     = t.lineHeight;
  if (t.color)                        style.color          = t.color;
  return style;
}

const ElementSlotBox: React.FC<{
  slot: VariantSlot;
  el:   SlideElementDTO;
  typography: any;
  slideIndex: number;
  total: number;
  editingId?: string | null;
  renderEditor?: (el: SlideElementDTO) => React.ReactNode;
}> = ({ slot, el, typography, slideIndex, total, editingId, renderEditor }) => {
  const tStyle = applyTypography(el, typography);
  const editing = editingId === el.id && !!renderEditor;
  return (
    <div
      style={{
        position: 'absolute',
        left:   `${slot.x}%`,
        top:    `${slot.y}%`,
        width:  `${slot.w}%`,
        height: `${slot.h}%`,
        zIndex: 10,
        // Family typography is the BASE; user-set style in the element wins on top
        // (the element renderer reads el.style as the override).
        ...tStyle,
      }}
      data-slot={slot.id}
      data-role={slot.role}
    >
      {editing ? renderEditor!(el) : renderElement(el, { pageNumber: slideIndex + 1, total })}
    </div>
  );
};

const FreePositionedBox: React.FC<{
  el:   SlideElementDTO;
  typography: any;
  slideIndex: number;
  total: number;
  editingId?: string | null;
  renderEditor?: (el: SlideElementDTO) => React.ReactNode;
}> = ({ el, typography, slideIndex, total, editingId, renderEditor }) => {
  const tStyle = applyTypography(el, typography);
  const editing = editingId === el.id && !!renderEditor;
  return (
    <div
      style={{
        position: 'absolute',
        left:   `${el.x}%`,
        top:    `${el.y}%`,
        width:  `${el.width}%`,
        height: `${el.height}%`,
        transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
        zIndex: 10,
        ...tStyle,
      }}
    >
      {editing ? renderEditor!(el) : renderElement(el, { pageNumber: slideIndex + 1, total })}
    </div>
  );
};
