// =============================================================================
//  Slide Layout Registry
//
//  A "layout" is a named placement spec — a list of typed slots that describe
//  where each kind of element should sit on the canvas. Switching layouts
//  reorganizes a slide's existing elements (preserving content); it doesn't
//  add or delete content (except for the special `blank` layout).
//
//  Slot matching:
//    - For each slot, pick the first un-claimed element on the slide whose
//      `type` matches `acceptsTypes` (in priority order).
//    - Update that element's x/y/width/height to the slot's geometry.
//    - Elements with no matching slot keep their current position.
//
//  Coords are 0..100 (% of the slide), matching the existing element schema.
// =============================================================================

import type { ElementType } from '@/types/slide-element';

export interface LayoutSlot {
  id:           string;
  acceptsTypes: ElementType[];   // priority order
  x:            number;
  y:            number;
  w:            number;
  h:            number;
}

export interface LayoutSpec {
  id:          string;
  name:        string;
  category:    'Basic' | 'Visual' | 'Data' | 'Storytelling';
  description: string;
  /** Visual hint shown in the switcher dropdown */
  iconHint:    'title' | 'titleBody' | 'twoCol' | 'imgL' | 'imgR' | 'metrics' | 'quote' | 'chart' | 'blank';
  slots:       LayoutSlot[];
  /** When true (only for `blank`), applying it drops every element on the slide. */
  blank?:      boolean;
}

// Footer + page number positions are universal across layouts — every layout
// implicitly includes them at the page bottom.
const FOOTER_SLOT: LayoutSlot     = { id: 'footer',     acceptsTypes: ['footer'],     x: 6,  y: 94, w: 70, h: 4 };
const PAGE_NUM_SLOT: LayoutSlot   = { id: 'pageNumber', acceptsTypes: ['pageNumber'], x: 88, y: 94, w: 8,  h: 4 };

// =============================================================================
//  Layouts
// =============================================================================

export const LAY_TITLE_ONLY: LayoutSpec = {
  id: 'title-only',
  name: 'Title only',
  category: 'Basic',
  description: 'Single centered title. Used for section dividers and cover slides.',
  iconHint: 'title',
  slots: [
    { id: 'title',    acceptsTypes: ['heading'],    x: 6, y: 38, w: 88, h: 18 },
    { id: 'subtitle', acceptsTypes: ['subheading'], x: 6, y: 58, w: 88, h: 10 },
    FOOTER_SLOT, PAGE_NUM_SLOT,
  ],
};

export const LAY_TITLE_BODY: LayoutSpec = {
  id: 'title-body',
  name: 'Title + body',
  category: 'Basic',
  description: 'Heading at the top with a paragraph or bullet list below.',
  iconHint: 'titleBody',
  slots: [
    { id: 'title',    acceptsTypes: ['heading'],    x: 6, y: 8,  w: 88, h: 14 },
    { id: 'subtitle', acceptsTypes: ['subheading'], x: 6, y: 22, w: 88, h: 8 },
    { id: 'body',     acceptsTypes: ['paragraph', 'bulletList', 'numberedList', 'quote'], x: 6, y: 32, w: 88, h: 56 },
    FOOTER_SLOT, PAGE_NUM_SLOT,
  ],
};

export const LAY_TWO_COLUMN: LayoutSpec = {
  id: 'two-column',
  name: 'Two columns',
  category: 'Basic',
  description: 'Heading at the top with two content columns underneath.',
  iconHint: 'twoCol',
  slots: [
    { id: 'title',     acceptsTypes: ['heading'],    x: 6,  y: 8,  w: 88, h: 14 },
    { id: 'subtitle',  acceptsTypes: ['subheading'], x: 6,  y: 22, w: 88, h: 8  },
    { id: 'leftCol',   acceptsTypes: ['paragraph', 'bulletList', 'numberedList'], x: 6,  y: 32, w: 42, h: 56 },
    { id: 'rightCol',  acceptsTypes: ['paragraph', 'bulletList', 'numberedList'], x: 52, y: 32, w: 42, h: 56 },
    FOOTER_SLOT, PAGE_NUM_SLOT,
  ],
};

export const LAY_IMAGE_LEFT: LayoutSpec = {
  id: 'image-left',
  name: 'Image left',
  category: 'Visual',
  description: 'Image on the left, text content on the right.',
  iconHint: 'imgL',
  slots: [
    { id: 'image',  acceptsTypes: ['image'],     x: 6,  y: 8,  w: 42, h: 80 },
    { id: 'title',  acceptsTypes: ['heading'],   x: 52, y: 8,  w: 42, h: 14 },
    { id: 'subtitle', acceptsTypes: ['subheading'], x: 52, y: 22, w: 42, h: 8 },
    { id: 'body',   acceptsTypes: ['paragraph', 'bulletList', 'numberedList'], x: 52, y: 32, w: 42, h: 56 },
    FOOTER_SLOT, PAGE_NUM_SLOT,
  ],
};

export const LAY_IMAGE_RIGHT: LayoutSpec = {
  id: 'image-right',
  name: 'Image right',
  category: 'Visual',
  description: 'Text content on the left, image on the right.',
  iconHint: 'imgR',
  slots: [
    { id: 'title',   acceptsTypes: ['heading'],    x: 6,  y: 8,  w: 42, h: 14 },
    { id: 'subtitle', acceptsTypes: ['subheading'], x: 6, y: 22, w: 42, h: 8 },
    { id: 'body',    acceptsTypes: ['paragraph', 'bulletList', 'numberedList'], x: 6, y: 32, w: 42, h: 56 },
    { id: 'image',   acceptsTypes: ['image'],      x: 52, y: 8, w: 42, h: 80 },
    FOOTER_SLOT, PAGE_NUM_SLOT,
  ],
};

export const LAY_METRICS: LayoutSpec = {
  id: 'metrics',
  name: 'Metrics',
  category: 'Data',
  description: 'Heading with a row of metric / KPI cards underneath.',
  iconHint: 'metrics',
  slots: [
    { id: 'title',    acceptsTypes: ['heading'],    x: 6, y: 8,  w: 88, h: 14 },
    { id: 'subtitle', acceptsTypes: ['subheading'], x: 6, y: 22, w: 88, h: 8 },
    // 4 metric slots in a row; if fewer metrics exist the unused slots are skipped.
    { id: 'metric1',  acceptsTypes: ['metric', 'kpi'], x: 6,  y: 36, w: 21, h: 30 },
    { id: 'metric2',  acceptsTypes: ['metric', 'kpi'], x: 29, y: 36, w: 21, h: 30 },
    { id: 'metric3',  acceptsTypes: ['metric', 'kpi'], x: 52, y: 36, w: 21, h: 30 },
    { id: 'metric4',  acceptsTypes: ['metric', 'kpi'], x: 75, y: 36, w: 21, h: 30 },
    { id: 'body',     acceptsTypes: ['paragraph', 'bulletList', 'numberedList'], x: 6, y: 70, w: 88, h: 18 },
    FOOTER_SLOT, PAGE_NUM_SLOT,
  ],
};

export const LAY_QUOTE: LayoutSpec = {
  id: 'quote',
  name: 'Quote',
  category: 'Storytelling',
  description: 'Large centered quote with attribution.',
  iconHint: 'quote',
  slots: [
    { id: 'quote',    acceptsTypes: ['quote', 'testimonial', 'paragraph'], x: 12, y: 30, w: 76, h: 36 },
    { id: 'subtitle', acceptsTypes: ['subheading'], x: 12, y: 68, w: 76, h: 8 },
    FOOTER_SLOT, PAGE_NUM_SLOT,
  ],
};

export const LAY_CHART_FOCUS: LayoutSpec = {
  id: 'chart-focus',
  name: 'Chart focus',
  category: 'Data',
  description: 'Heading at the top and a large chart taking most of the slide.',
  iconHint: 'chart',
  slots: [
    { id: 'title',    acceptsTypes: ['heading'],    x: 6, y: 8,  w: 88, h: 14 },
    { id: 'subtitle', acceptsTypes: ['subheading'], x: 6, y: 22, w: 88, h: 8 },
    { id: 'chart',    acceptsTypes: ['chart', 'table'], x: 6, y: 32, w: 88, h: 56 },
    FOOTER_SLOT, PAGE_NUM_SLOT,
  ],
};

export const LAY_BLANK: LayoutSpec = {
  id: 'blank',
  name: 'Blank',
  category: 'Basic',
  description: 'Removes every element. Use for a clean starting canvas.',
  iconHint: 'blank',
  slots: [],
  blank: true,
};

// =============================================================================
//  Registry
// =============================================================================

export const LAYOUTS: LayoutSpec[] = [
  LAY_TITLE_ONLY,
  LAY_TITLE_BODY,
  LAY_TWO_COLUMN,
  LAY_IMAGE_LEFT,
  LAY_IMAGE_RIGHT,
  LAY_METRICS,
  LAY_QUOTE,
  LAY_CHART_FOCUS,
  LAY_BLANK,
];

export function findLayout(id: string | null | undefined): LayoutSpec | null {
  if (!id) return null;
  return LAYOUTS.find((l) => l.id === id) || null;
}
