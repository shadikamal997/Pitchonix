// =============================================================================
//  Vertical-rhythm slot system
//
//  Centralised grid for every family. Each y-band is reserved for a specific
//  role — guarantees no overlap and a consistent visual hierarchy across
//  templates.
//
//   y%   role            slot id      typical h%
//   ──────────────────────────────────────────────
//   8    eyebrow         label        4
//   13   title           title        12
//   27   subtitle        subtitle     5
//   34   lead paragraph  lead         6
//   42   body/composite  body/...     44
//   92   footer/page#    footer/pn    4
//
//  Variants compose by picking which slots to include — but they share the
//  same y-bands so titles never collide with subtitles, paragraphs never
//  collide with composites, etc.
// =============================================================================

import type { VariantSlot } from './types';

// Standard horizontal inset — most families use 8% margins.
const X = 8;
const W = 84;

export const RHYTHM = {
  // Y bands (start positions)
  yLabel:    8,   hLabel:    4,
  yTitle:    13,  hTitle:    12,
  ySubtitle: 27,  hSubtitle: 5,
  yLead:     34,  hLead:     6,
  yBody:     42,  hBody:     44,   // 42 → 86
  yFooter:   92,  hFooter:   4,
};

/** Build the standard slot stack for a typical content slide.
 *  Specify `body` accepts to vary what composite goes in the bottom area. */
export function rhythmSlots(opts: {
  x?: number; w?: number;
  bodyId?: string;
  bodyAccepts?: any[];
  noLead?: boolean;
  noBody?: boolean;
} = {}): VariantSlot[] {
  const x = opts.x ?? X;
  const w = opts.w ?? W;
  const slots: VariantSlot[] = [
    { id: 'label',    acceptsTypes: ['label', 'caption'],   x, y: RHYTHM.yLabel,    w, h: RHYTHM.hLabel },
    { id: 'title',    acceptsTypes: ['heading'],            x, y: RHYTHM.yTitle,    w, h: RHYTHM.hTitle },
    { id: 'subtitle', acceptsTypes: ['subheading'],         x, y: RHYTHM.ySubtitle, w, h: RHYTHM.hSubtitle },
  ];
  if (!opts.noLead) {
    slots.push({ id: 'lead', acceptsTypes: ['paragraph'], x, y: RHYTHM.yLead, w, h: RHYTHM.hLead });
  }
  if (!opts.noBody) {
    slots.push({
      id: opts.bodyId || 'body',
      acceptsTypes: (opts.bodyAccepts as any) || ['paragraph', 'bulletList', 'numberedList'],
      x, y: RHYTHM.yBody, w, h: RHYTHM.hBody,
    });
  }
  return slots;
}

/** Slots reserved at the bottom of every slide — footer text + page number. */
export function footerSlots(opts: { footerW?: number; pageW?: number } = {}): VariantSlot[] {
  const fw = opts.footerW ?? 70;
  const pw = opts.pageW   ?? 8;
  return [
    { id: 'footer',     acceptsTypes: ['footer'],     x: 6,       y: RHYTHM.yFooter, w: fw, h: RHYTHM.hFooter },
    { id: 'pageNumber', acceptsTypes: ['pageNumber'], x: 100 - pw - 6, y: RHYTHM.yFooter, w: pw, h: RHYTHM.hFooter },
  ];
}

/** Convenience: a "split body" — left chart, right metrics/text. */
export function splitBodySlots(opts: {
  x?: number;
  leftId: string;     leftAccepts: any[];     leftW?: number;
  rightId: string;    rightAccepts: any[];    rightW?: number;
} = { leftId: 'left', leftAccepts: ['paragraph'], rightId: 'right', rightAccepts: ['paragraph'] }): VariantSlot[] {
  const x = opts.x ?? X;
  const totalW = 84;
  const gap = 4;
  const leftW = opts.leftW ?? Math.floor((totalW - gap) / 2);
  const rightW = opts.rightW ?? totalW - gap - leftW;
  return [
    { id: opts.leftId,  acceptsTypes: opts.leftAccepts  as any, x,                   y: RHYTHM.yBody, w: leftW,  h: RHYTHM.hBody },
    { id: opts.rightId, acceptsTypes: opts.rightAccepts as any, x: x + leftW + gap,  y: RHYTHM.yBody, w: rightW, h: RHYTHM.hBody },
  ];
}
