'use client';

import React, { useMemo } from 'react';
import type { SlideElementDTO, ChartContent, ChartSeries, ChartKind, ElementStyle } from '@/types/slide-element';

// =============================================================================
//  ChartRenderer
//
//  Inline-SVG chart renderer used by the canvas, slide thumbnails, AND (via
//  the same numeric output) by PNG/JPEG/PPTX export. Pure presentation; no
//  interactions. Matches the rendering logic in
//  backend/src/pdf-studio/services/preview.service.ts so canvas, preview, and
//  PDF stay visually identical.
//
//  Supports:
//    bar / line / area / pie / donut / kpi / comparison
//
//  The chart sizes itself to whatever container it's in (`width: 100%; height:
//  100%`). The renderer uses a single internal `viewBox` so all elements scale
//  proportionally.
// =============================================================================

const PALETTE = [
  '#16a34a', // green-600
  '#0ea5e9', // sky-500
  '#7c3aed', // violet-600
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#0891b2', // cyan-600
  '#db2777', // pink-600
  '#525252', // neutral-600
];

const colorOf = (s: ChartSeries, i: number) => s.color || PALETTE[i % PALETTE.length];

interface Props {
  el: SlideElementDTO;
  pageNumber?: number;
  total?: number;
}

export const ChartRenderer: React.FC<Props> = ({ el }) => {
  const content = useMemo(() => normaliseContent(el.content), [el.content]);
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

  return (
    <div style={style} className="slide-chart">
      <ChartByKind content={content} />
    </div>
  );
};

function normaliseContent(raw: any): ChartContent {
  const c = (raw || {}) as Partial<ChartContent>;
  return {
    type:       (c.type as ChartKind) || 'bar',
    title:      typeof c.title === 'string' ? c.title : undefined,
    categories: Array.isArray(c.categories) ? c.categories.map(String) : [],
    series:     Array.isArray(c.series) ? c.series : [],
    axes:       c.axes,
    legend:     c.legend ?? { visible: true, position: 'bottom' },
    showValues: c.showValues,
    showGrid:   c.showGrid,
  };
}

// =============================================================================
//  Dispatch by chart kind
// =============================================================================

const ChartByKind: React.FC<{ content: ChartContent }> = ({ content }) => {
  const { type } = content;
  if (type === 'kpi')        return <KpiChart        content={content} />;
  if (type === 'comparison') return <ComparisonChart content={content} />;
  if (type === 'pie')        return <PieChart        content={content} kind="pie" />;
  if (type === 'donut')      return <PieChart        content={content} kind="donut" />;
  if (type === 'line')       return <LineOrArea     content={content} kind="line" />;
  if (type === 'area')       return <LineOrArea     content={content} kind="area" />;
  /* default */               return <BarChart        content={content} />;
};

// =============================================================================
//  Common chart shell: title + plot region + legend
// =============================================================================

const ChartShell: React.FC<{
  content: ChartContent;
  children: (innerBox: { x: number; y: number; w: number; h: number }) => React.ReactNode;
}> = ({ content, children }) => {
  const PAD = 14;
  const TITLE_H = content.title ? 22 : 0;
  const LEGEND_H = content.legend?.visible === false ? 0 : 22;

  // SVG viewport
  const W = 600, H = 360;
  const innerX = PAD;
  const innerY = PAD + TITLE_H;
  const innerW = W - PAD * 2;
  const innerH = H - PAD * 2 - TITLE_H - LEGEND_H;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" width="100%" height="100%">
      {content.title && (
        <text x={PAD} y={PAD + 14} fontSize={14} fontWeight={700} fill="#111827">
          {content.title}
        </text>
      )}
      {children({ x: innerX, y: innerY, w: innerW, h: innerH })}
      {content.legend?.visible !== false && (
        <Legend content={content} y={H - LEGEND_H + 6} W={W} />
      )}
    </svg>
  );
};

const Legend: React.FC<{ content: ChartContent; y: number; W: number }> = ({ content, y, W }) => {
  const series = content.series;
  if (series.length === 0) return null;
  // Distribute legend horizontally
  const itemWidth = Math.min(140, W / series.length);
  return (
    <g transform={`translate(${(W - itemWidth * series.length) / 2} ${y})`}>
      {series.map((s, i) => (
        <g key={i} transform={`translate(${i * itemWidth} 0)`}>
          <rect x={4} y={4} width={10} height={10} rx={2} fill={colorOf(s, i)} />
          <text x={18} y={13} fontSize={11} fill="#374151">{truncate(s.name, 18)}</text>
        </g>
      ))}
    </g>
  );
};

function truncate(s: string, n: number) { return s.length > n ? s.slice(0, n - 1) + '…' : s; }

// =============================================================================
//  Bar chart
// =============================================================================

const BarChart: React.FC<{ content: ChartContent }> = ({ content }) => {
  const cats = content.categories;
  const series = content.series;
  return (
    <ChartShell content={content}>
      {({ x, y, w, h }) => {
        if (cats.length === 0 || series.length === 0) return <EmptyMessage x={x + w / 2} y={y + h / 2} />;
        const all = series.flatMap(s => s.values || []);
        const max = Math.max(1, ...all);
        const groupW = w / cats.length;
        const barW = Math.max(2, (groupW * 0.7) / series.length);

        return (
          <>
            {/* Y-axis grid */}
            {content.showGrid !== false && (
              <YGrid x={x} y={y} w={w} h={h} max={max} />
            )}
            {/* Bars */}
            {cats.map((cat, ci) => {
              const baseX = x + ci * groupW + (groupW - barW * series.length) / 2;
              return (
                <g key={ci}>
                  {series.map((s, si) => {
                    const v = Number(s.values?.[ci] ?? 0);
                    const bh = (Math.max(0, v) / max) * h;
                    return (
                      <g key={si}>
                        <rect x={baseX + si * barW} y={y + h - bh} width={barW * 0.92} height={bh} rx={2} fill={colorOf(s, si)} />
                        {content.showValues && (
                          <text x={baseX + si * barW + barW * 0.46} y={y + h - bh - 4}
                                fontSize={9} textAnchor="middle" fill="#475569">{v}</text>
                        )}
                      </g>
                    );
                  })}
                  {/* X label */}
                  <text x={x + ci * groupW + groupW / 2} y={y + h + 14}
                        fontSize={10} textAnchor="middle" fill="#475569">{truncate(cat, 14)}</text>
                </g>
              );
            })}
            {/* Axis title */}
            <AxisTitles content={content} x={x} y={y} w={w} h={h} />
          </>
        );
      }}
    </ChartShell>
  );
};

// =============================================================================
//  Line / Area chart
// =============================================================================

const LineOrArea: React.FC<{ content: ChartContent; kind: 'line' | 'area' }> = ({ content, kind }) => {
  const cats = content.categories;
  const series = content.series;
  return (
    <ChartShell content={content}>
      {({ x, y, w, h }) => {
        if (cats.length === 0 || series.length === 0) return <EmptyMessage x={x + w / 2} y={y + h / 2} />;
        const all = series.flatMap(s => s.values || []);
        const max = Math.max(1, ...all);
        const step = cats.length > 1 ? w / (cats.length - 1) : w;
        const xAt = (i: number) => x + (cats.length > 1 ? i * step : w / 2);
        const yAt = (v: number) => y + h - (Math.max(0, v) / max) * h;

        return (
          <>
            {content.showGrid !== false && <YGrid x={x} y={y} w={w} h={h} max={max} />}
            {series.map((s, si) => {
              const pts = (s.values || []).map((v, i) => `${xAt(i)},${yAt(Number(v) || 0)}`).join(' ');
              if (kind === 'area') {
                const areaPts = `${xAt(0)},${y + h} ${pts} ${xAt((s.values || []).length - 1)},${y + h}`;
                return (
                  <g key={si}>
                    <polygon points={areaPts} fill={colorOf(s, si)} opacity={0.18} />
                    <polyline points={pts} fill="none" stroke={colorOf(s, si)} strokeWidth={2} />
                    {(s.values || []).map((v, i) => (
                      <circle key={i} cx={xAt(i)} cy={yAt(Number(v) || 0)} r={2.5} fill={colorOf(s, si)} />
                    ))}
                  </g>
                );
              }
              return (
                <g key={si}>
                  <polyline points={pts} fill="none" stroke={colorOf(s, si)} strokeWidth={2} />
                  {(s.values || []).map((v, i) => (
                    <circle key={i} cx={xAt(i)} cy={yAt(Number(v) || 0)} r={3} fill={colorOf(s, si)} />
                  ))}
                  {content.showValues && (s.values || []).map((v, i) => (
                    <text key={`v${i}`} x={xAt(i)} y={yAt(Number(v) || 0) - 6}
                          fontSize={9} textAnchor="middle" fill="#475569">{v}</text>
                  ))}
                </g>
              );
            })}
            {/* X labels */}
            {cats.map((cat, i) => (
              <text key={i} x={xAt(i)} y={y + h + 14}
                    fontSize={10} textAnchor="middle" fill="#475569">{truncate(cat, 14)}</text>
            ))}
            <AxisTitles content={content} x={x} y={y} w={w} h={h} />
          </>
        );
      }}
    </ChartShell>
  );
};

// =============================================================================
//  Pie / Donut
// =============================================================================

const PieChart: React.FC<{ content: ChartContent; kind: 'pie' | 'donut' }> = ({ content, kind }) => {
  const cats = content.categories;
  return (
    <ChartShell content={content}>
      {({ x, y, w, h }) => {
        const values = (content.series[0]?.values || []).map((v) => Number(v) || 0);
        if (cats.length === 0 || values.length === 0) return <EmptyMessage x={x + w / 2} y={y + h / 2} />;
        const total = values.reduce((a, b) => a + b, 0) || 1;
        const cx = x + w / 2;
        const cy = y + h / 2;
        const r  = Math.min(w, h) / 2 - 4;

        let start = 0;
        const slices = values.map((v, i) => {
          const sweep = (v / total) * Math.PI * 2;
          const end = start + sweep;
          const x1 = cx + r * Math.cos(start - Math.PI / 2);
          const y1 = cy + r * Math.sin(start - Math.PI / 2);
          const x2 = cx + r * Math.cos(end   - Math.PI / 2);
          const y2 = cy + r * Math.sin(end   - Math.PI / 2);
          const largeArc = sweep > Math.PI ? 1 : 0;
          const path = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
          start = end;
          return { path, color: PALETTE[i % PALETTE.length], label: cats[i], value: v };
        });

        return (
          <>
            {slices.map((s, i) => <path key={i} d={s.path} fill={s.color} stroke="#fff" strokeWidth={1.5} />)}
            {kind === 'donut' && (
              <>
                <circle cx={cx} cy={cy} r={r * 0.55} fill="#fff" />
                <text x={cx} y={cy - 4} fontSize={11} fontWeight={700} textAnchor="middle" fill="#111827">{total}</text>
                <text x={cx} y={cy + 10} fontSize={9} textAnchor="middle" fill="#6b7280">total</text>
              </>
            )}
          </>
        );
      }}
    </ChartShell>
  );
};

// =============================================================================
//  KPI chart  (big numbers + small label, up to 4)
// =============================================================================

const KpiChart: React.FC<{ content: ChartContent }> = ({ content }) => {
  const cats   = content.categories;
  const values = (content.series[0]?.values || []).slice(0, 4);

  return (
    <ChartShell content={content}>
      {({ x, y, w, h }) => {
        if (values.length === 0) return <EmptyMessage x={x + w / 2} y={y + h / 2} />;
        const cellW = w / values.length;
        return (
          <>
            {values.map((v, i) => (
              <g key={i} transform={`translate(${x + i * cellW} ${y})`}>
                <rect x={4} y={4} width={cellW - 8} height={h - 8} rx={10}
                      fill={(PALETTE[i % PALETTE.length])} opacity={0.08} />
                <text x={cellW / 2} y={h / 2 - 2} fontSize={Math.min(36, cellW / 3)} fontWeight={800}
                      textAnchor="middle" fill={PALETTE[i % PALETTE.length]}>{v}</text>
                <text x={cellW / 2} y={h / 2 + 22} fontSize={11} textAnchor="middle" fill="#475569"
                      style={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>{truncate(cats[i] || '', 18)}</text>
              </g>
            ))}
          </>
        );
      }}
    </ChartShell>
  );
};

// =============================================================================
//  Comparison chart (side-by-side bars for 2 series across a few categories)
// =============================================================================

const ComparisonChart: React.FC<{ content: ChartContent }> = ({ content }) => <BarChart content={content} />;

// =============================================================================
//  Helpers
// =============================================================================

const YGrid: React.FC<{ x: number; y: number; w: number; h: number; max: number }> = ({ x, y, w, h, max }) => {
  const lines = 4;
  const items = [];
  for (let i = 0; i <= lines; i++) {
    const yy = y + (h * i) / lines;
    items.push(
      <g key={i}>
        <line x1={x} y1={yy} x2={x + w} y2={yy} stroke="#e5e7eb" strokeWidth={1} strokeDasharray={i === lines ? '0' : '2 2'} />
        <text x={x - 4} y={yy + 3} fontSize={9} textAnchor="end" fill="#9ca3af">
          {Math.round(max * (1 - i / lines))}
        </text>
      </g>,
    );
  }
  return <>{items}</>;
};

const AxisTitles: React.FC<{ content: ChartContent; x: number; y: number; w: number; h: number }> = ({ content, x, y, w, h }) => (
  <>
    {content.axes?.x && (
      <text x={x + w / 2} y={y + h + 30} fontSize={10} fontWeight={600} textAnchor="middle" fill="#475569">{content.axes.x}</text>
    )}
    {content.axes?.y && (
      <text x={x - 28} y={y + h / 2} fontSize={10} fontWeight={600} textAnchor="middle" fill="#475569"
            transform={`rotate(-90 ${x - 28} ${y + h / 2})`}>{content.axes.y}</text>
    )}
  </>
);

const EmptyMessage: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <text x={x} y={y} fontSize={11} textAnchor="middle" fill="#94a3b8">No chart data</text>
);
