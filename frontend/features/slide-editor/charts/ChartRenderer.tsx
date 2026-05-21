'use client';

import React, { useMemo } from 'react';
import type { SlideElementDTO, ChartContent, ChartKind } from '@/types/slide-element';
import { buildChartSvg } from './svg-chart-builder';

// =============================================================================
//  ChartRenderer  (Phase 33.5 unified)
//
//  Renders any ChartContent by calling the shared `buildChartSvg` and
//  injecting the result via `dangerouslySetInnerHTML`. The same builder runs
//  server-side (via sharp) for PNG/PPTX/PDF export — guaranteeing that the
//  editor canvas and the exported document are pixel-equivalent.
//
//  Supports every ChartKind:
//    bar / line / pie / donut / area / kpi / comparison
//    stackedBar / funnel / scatter / waterfall / radar / heatmap
//    bubble / gauge / treemap / stackedArea / percentStackedBar /
//    percentStackedArea / dualAxis / matrix2x2
// =============================================================================

interface Props {
  el: SlideElementDTO;
  pageNumber?: number;
  total?: number;
  /** Composition family active on this slide. Passed by the canvas. */
  familyId?: string;
}

export const ChartRenderer: React.FC<Props> = ({ el, familyId }) => {
  const content = useMemo(() => normalise(el.content, familyId), [el.content, familyId]);
  const svg = useMemo(() => buildChartSvg(content), [content]);

  const style: React.CSSProperties = {
    width: '100%',
    height: '100%',
    background: (el.style as any)?.fill || 'transparent',
    borderRadius: (el.style as any)?.borderRadius ?? 0,
    color: (el.style as any)?.color || '#111827',
    fontFamily: (el.style as any)?.fontFamily,
    padding: 4,
    boxSizing: 'border-box',
    overflow: 'hidden',
  };

  // dangerouslySetInnerHTML is safe here — the SVG string is produced by our
  // own builder (no user-provided markup is injected; text is HTML-escaped via
  // `esc()` inside the builder).
  return (
    <div
      style={style}
      className="slide-chart"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};

function normalise(raw: any, familyId?: string): ChartContent {
  const c = (raw || {}) as Partial<ChartContent>;
  return {
    type:         (c.type as ChartKind) || 'bar',
    title:        typeof c.title === 'string' ? c.title : undefined,
    categories:   Array.isArray(c.categories) ? c.categories.map(String) : [],
    series:       Array.isArray(c.series) ? c.series : [],
    axes:         c.axes,
    legend:       c.legend ?? { visible: true, position: 'bottom' },
    showValues:   c.showValues,
    showGrid:     c.showGrid,
    insight:      c.insight,
    familyId:     c.familyId ?? familyId,
    numberFormat: c.numberFormat,
  };
}
