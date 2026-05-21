'use client';

import React, { useMemo } from 'react';
import type {
  SlideElementDTO, ChartContent, ChartSeries, ChartKind, ChartInsight,
} from '@/types/slide-element';
import { getChartTheme, paletteColorAt, type ChartTheme } from './chart-theme';

// =============================================================================
//  ChartRenderer
//
//  Inline-SVG chart renderer used by the canvas, slide thumbnails, AND (via
//  the same numeric output) by PNG/JPEG/PPTX export. Pure presentation; no
//  interactions.
//
//  Phase 33 expansion:
//    - Pulls palette/typography from the active composition family via
//      `getChartTheme` (33A + 33G).
//    - Renders six new chart kinds in addition to the legacy seven:
//      stackedBar, funnel, scatter, waterfall, radar, heatmap (33B/33C/33D/33F).
//    - Applies an "insight layer" on top of each chart that highlights the
//      best/worst values, surfaces growth callouts, and pins user-defined
//      annotations (33I).
// =============================================================================

interface Props {
  el: SlideElementDTO;
  pageNumber?: number;
  total?: number;
  /** Composition family active on this slide (Phase 33G). Set by the canvas. */
  familyId?: string;
}

export const ChartRenderer: React.FC<Props> = ({ el, familyId }) => {
  const content = useMemo(() => normaliseContent(el.content), [el.content]);
  // Family resolution priority: ChartContent.familyId override → canvas prop
  const resolvedFamilyId = content.familyId ?? familyId ?? null;
  const theme = useMemo(() => getChartTheme(resolvedFamilyId), [resolvedFamilyId]);

  const style: React.CSSProperties = {
    width: '100%',
    height: '100%',
    background: (el.style as any)?.fill || 'transparent',
    borderRadius: (el.style as any)?.borderRadius ?? 0,
    color: (el.style as any)?.color || theme.text,
    fontFamily: (el.style as any)?.fontFamily || theme.fontFamily,
    padding: 4,
    boxSizing: 'border-box',
    overflow: 'hidden',
  };

  return (
    <div style={style} className="slide-chart">
      <ChartByKind content={content} theme={theme} />
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
    insight:    c.insight,
    familyId:   c.familyId,
  };
}

// =============================================================================
//  Dispatch by chart kind
// =============================================================================

const ChartByKind: React.FC<{ content: ChartContent; theme: ChartTheme }> = ({ content, theme }) => {
  switch (content.type) {
    case 'kpi':         return <KpiChart        content={content} theme={theme} />;
    case 'comparison':  return <BarChart        content={content} theme={theme} grouped />;
    case 'pie':         return <PieChart        content={content} theme={theme} kind="pie" />;
    case 'donut':       return <PieChart        content={content} theme={theme} kind="donut" />;
    case 'line':        return <LineOrArea      content={content} theme={theme} kind="line" />;
    case 'area':        return <LineOrArea      content={content} theme={theme} kind="area" />;
    case 'stackedBar':  return <BarChart        content={content} theme={theme} stacked />;
    case 'funnel':      return <FunnelChart     content={content} theme={theme} />;
    case 'scatter':     return <ScatterChart    content={content} theme={theme} />;
    case 'waterfall':   return <WaterfallChart  content={content} theme={theme} />;
    case 'radar':       return <RadarChart      content={content} theme={theme} />;
    case 'heatmap':     return <HeatmapChart    content={content} theme={theme} />;
    default:            return <BarChart        content={content} theme={theme} grouped />;
  }
};

// =============================================================================
//  Common chart shell: title + plot region + legend + growth callout
// =============================================================================

const PAD = 14;
const W = 600;
const H = 360;

const ChartShell: React.FC<{
  content: ChartContent;
  theme:   ChartTheme;
  children: (innerBox: { x: number; y: number; w: number; h: number }) => React.ReactNode;
}> = ({ content, theme, children }) => {
  const TITLE_H = content.title ? 22 : 0;
  const LEGEND_H = content.legend?.visible === false ? 0 : 22;

  const innerX = PAD;
  const innerY = PAD + TITLE_H;
  const innerW = W - PAD * 2;
  const innerH = H - PAD * 2 - TITLE_H - LEGEND_H;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" width="100%" height="100%">
      {content.title && (
        <text x={PAD} y={PAD + 14} fontSize={14} fontWeight={700} fill={theme.text}>
          {content.title}
        </text>
      )}
      {/* Phase 33I — growth callout in the upper-right corner */}
      {content.insight?.growth && (
        <GrowthBadge insight={content.insight} theme={theme} x={W - PAD} y={PAD + 10} />
      )}
      {children({ x: innerX, y: innerY, w: innerW, h: innerH })}
      {content.legend?.visible !== false && (
        <Legend content={content} theme={theme} y={H - LEGEND_H + 6} />
      )}
    </svg>
  );
};

const GrowthBadge: React.FC<{ insight: ChartInsight; theme: ChartTheme; x: number; y: number }> = ({ insight, theme, x, y }) => {
  const g = insight.growth!;
  const tone = g.tone === 'negative' ? theme.negative : g.tone === 'neutral' ? theme.muted : theme.positive;
  const label = g.label;
  const w = Math.max(60, label.length * 7);
  return (
    <g transform={`translate(${x - w} ${y - 12})`}>
      <rect x={0} y={0} rx={4} ry={4} width={w} height={18} fill={tone} opacity={0.12} />
      <text x={w / 2} y={12} fontSize={11} fontWeight={700} textAnchor="middle" fill={tone}>
        {label}
      </text>
    </g>
  );
};

const Legend: React.FC<{ content: ChartContent; theme: ChartTheme; y: number }> = ({ content, theme, y }) => {
  const series = content.series;
  if (series.length === 0) return null;
  const itemWidth = Math.min(140, W / series.length);
  return (
    <g transform={`translate(${(W - itemWidth * series.length) / 2} ${y})`}>
      {series.map((s, i) => (
        <g key={i} transform={`translate(${i * itemWidth} 0)`}>
          <rect x={4} y={4} width={10} height={10} rx={2} fill={colorFor(s, i, theme)} />
          <text x={18} y={13} fontSize={11} fill={theme.muted}>{truncate(s.name, 18)}</text>
        </g>
      ))}
    </g>
  );
};

const colorFor = (s: ChartSeries, i: number, theme: ChartTheme): string =>
  s.color || paletteColorAt(theme, i);

function truncate(s: string, n: number) { return s.length > n ? s.slice(0, n - 1) + '…' : s; }

// =============================================================================
//  Bar chart  (grouped + stacked)
// =============================================================================

const BarChart: React.FC<{ content: ChartContent; theme: ChartTheme; grouped?: boolean; stacked?: boolean }> = ({ content, theme, stacked }) => {
  const cats = content.categories;
  const series = content.series;
  // Pre-compute best/worst for the insight layer.
  const bestWorst = computeBestWorst(series, content.insight);

  return (
    <ChartShell content={content} theme={theme}>
      {({ x, y, w, h }) => {
        if (cats.length === 0 || series.length === 0)
          return <EmptyMessage x={x + w / 2} y={y + h / 2} theme={theme} />;

        // For stacked mode we need the total per category as the y-axis max.
        const max = stacked
          ? Math.max(1, ...cats.map((_, ci) => series.reduce((sum, s) => sum + Math.max(0, Number(s.values?.[ci] ?? 0)), 0)))
          : Math.max(1, ...series.flatMap((s) => s.values || []));
        const groupW = w / cats.length;
        const barW = stacked
          ? groupW * 0.6
          : Math.max(2, (groupW * 0.7) / series.length);

        return (
          <>
            {content.showGrid !== false && <YGrid x={x} y={y} w={w} h={h} max={max} theme={theme} />}
            {cats.map((cat, ci) => {
              if (stacked) {
                let runningY = y + h;
                return (
                  <g key={ci}>
                    {series.map((s, si) => {
                      const v  = Number(s.values?.[ci] ?? 0);
                      const bh = (Math.max(0, v) / max) * h;
                      runningY -= bh;
                      const isBest  = bestWorst.best  && bestWorst.best.ci === ci  && bestWorst.best.si  === si;
                      const isWorst = bestWorst.worst && bestWorst.worst.ci === ci && bestWorst.worst.si === si;
                      return (
                        <g key={si}>
                          <rect
                            x={x + ci * groupW + (groupW - barW) / 2}
                            y={runningY}
                            width={barW}
                            height={bh}
                            fill={colorFor(s, si, theme)}
                            opacity={isWorst ? 0.55 : 1}
                            stroke={isBest ? theme.text : 'none'}
                            strokeWidth={isBest ? 2 : 0}
                          />
                        </g>
                      );
                    })}
                    <text x={x + ci * groupW + groupW / 2} y={y + h + 14}
                          fontSize={10} textAnchor="middle" fill={theme.muted}>{truncate(cat, 14)}</text>
                  </g>
                );
              }
              // grouped
              const baseX = x + ci * groupW + (groupW - barW * series.length) / 2;
              return (
                <g key={ci}>
                  {series.map((s, si) => {
                    const v = Number(s.values?.[ci] ?? 0);
                    const bh = (Math.max(0, v) / max) * h;
                    const isBest  = bestWorst.best  && bestWorst.best.ci === ci  && bestWorst.best.si  === si;
                    const isWorst = bestWorst.worst && bestWorst.worst.ci === ci && bestWorst.worst.si === si;
                    return (
                      <g key={si}>
                        <rect
                          x={baseX + si * barW}
                          y={y + h - bh}
                          width={barW * 0.92}
                          height={bh}
                          rx={2}
                          fill={colorFor(s, si, theme)}
                          opacity={isWorst ? 0.55 : 1}
                          stroke={isBest ? theme.text : 'none'}
                          strokeWidth={isBest ? 2 : 0}
                        />
                        {content.showValues && (
                          <text x={baseX + si * barW + barW * 0.46} y={y + h - bh - 4}
                                fontSize={9} textAnchor="middle" fill={theme.muted}>{v}</text>
                        )}
                      </g>
                    );
                  })}
                  <text x={x + ci * groupW + groupW / 2} y={y + h + 14}
                        fontSize={10} textAnchor="middle" fill={theme.muted}>{truncate(cat, 14)}</text>
                </g>
              );
            })}
            <AxisTitles content={content} theme={theme} x={x} y={y} w={w} h={h} />
            {/* Insight annotations */}
            {renderAnnotations(content, theme, ({ ci, si }) => {
              const groupX = x + ci * groupW + groupW / 2;
              const v  = Number(series[si]?.values?.[ci] ?? 0);
              const bh = stacked
                ? series.slice(0, si + 1).reduce((acc, s) => acc + Math.max(0, Number(s.values?.[ci] ?? 0)), 0) / max * h
                : (Math.max(0, v) / max) * h;
              return { ax: groupX, ay: y + h - bh - 8 };
            })}
          </>
        );
      }}
    </ChartShell>
  );
};

// =============================================================================
//  Line / Area chart
// =============================================================================

const LineOrArea: React.FC<{ content: ChartContent; theme: ChartTheme; kind: 'line' | 'area' }> = ({ content, theme, kind }) => {
  const cats = content.categories;
  const series = content.series;
  const bestWorst = computeBestWorst(series, content.insight);

  return (
    <ChartShell content={content} theme={theme}>
      {({ x, y, w, h }) => {
        if (cats.length === 0 || series.length === 0)
          return <EmptyMessage x={x + w / 2} y={y + h / 2} theme={theme} />;
        const all = series.flatMap((s) => s.values || []);
        const max = Math.max(1, ...all);
        const step = cats.length > 1 ? w / (cats.length - 1) : w;
        const xAt = (i: number) => x + (cats.length > 1 ? i * step : w / 2);
        const yAt = (v: number) => y + h - (Math.max(0, v) / max) * h;

        return (
          <>
            {content.showGrid !== false && <YGrid x={x} y={y} w={w} h={h} max={max} theme={theme} />}
            {series.map((s, si) => {
              const pts = (s.values || []).map((v, i) => `${xAt(i)},${yAt(Number(v) || 0)}`).join(' ');
              const col = colorFor(s, si, theme);
              return (
                <g key={si}>
                  {kind === 'area' && (
                    <polygon
                      points={`${xAt(0)},${y + h} ${pts} ${xAt((s.values || []).length - 1)},${y + h}`}
                      fill={col}
                      opacity={0.18}
                    />
                  )}
                  <polyline points={pts} fill="none" stroke={col} strokeWidth={2} />
                  {(s.values || []).map((v, i) => {
                    const isBest  = bestWorst.best  && bestWorst.best.ci === i  && bestWorst.best.si  === si;
                    const isWorst = bestWorst.worst && bestWorst.worst.ci === i && bestWorst.worst.si === si;
                    return (
                      <circle key={i}
                              cx={xAt(i)} cy={yAt(Number(v) || 0)}
                              r={isBest || isWorst ? 5 : 3}
                              fill={col}
                              stroke={isBest ? theme.text : 'none'} strokeWidth={isBest ? 2 : 0}
                              opacity={isWorst ? 0.55 : 1} />
                    );
                  })}
                  {content.showValues && (s.values || []).map((v, i) => (
                    <text key={`v${i}`} x={xAt(i)} y={yAt(Number(v) || 0) - 6}
                          fontSize={9} textAnchor="middle" fill={theme.muted}>{v}</text>
                  ))}
                </g>
              );
            })}
            {cats.map((cat, i) => (
              <text key={i} x={xAt(i)} y={y + h + 14}
                    fontSize={10} textAnchor="middle" fill={theme.muted}>{truncate(cat, 14)}</text>
            ))}
            <AxisTitles content={content} theme={theme} x={x} y={y} w={w} h={h} />
            {renderAnnotations(content, theme, ({ ci, si }) => {
              const v = Number(series[si]?.values?.[ci] ?? 0);
              return { ax: xAt(ci), ay: yAt(v) - 10 };
            })}
          </>
        );
      }}
    </ChartShell>
  );
};

// =============================================================================
//  Pie / Donut
// =============================================================================

const PieChart: React.FC<{ content: ChartContent; theme: ChartTheme; kind: 'pie' | 'donut' }> = ({ content, theme, kind }) => {
  const cats = content.categories;
  return (
    <ChartShell content={content} theme={theme}>
      {({ x, y, w, h }) => {
        const values = (content.series[0]?.values || []).map((v) => Number(v) || 0);
        if (cats.length === 0 || values.length === 0)
          return <EmptyMessage x={x + w / 2} y={y + h / 2} theme={theme} />;
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
          return { path, color: paletteColorAt(theme, i), label: cats[i], value: v };
        });

        return (
          <>
            {slices.map((s, i) => <path key={i} d={s.path} fill={s.color} stroke={theme.background === 'transparent' ? '#ffffff' : theme.background} strokeWidth={1.5} />)}
            {kind === 'donut' && (
              <>
                <circle cx={cx} cy={cy} r={r * 0.55} fill={theme.background === 'transparent' ? '#ffffff' : theme.background} />
                <text x={cx} y={cy - 4} fontSize={11} fontWeight={700} textAnchor="middle" fill={theme.text}>{total}</text>
                <text x={cx} y={cy + 10} fontSize={9} textAnchor="middle" fill={theme.muted}>total</text>
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

const KpiChart: React.FC<{ content: ChartContent; theme: ChartTheme }> = ({ content, theme }) => {
  const cats   = content.categories;
  const values = (content.series[0]?.values || []).slice(0, 4);

  return (
    <ChartShell content={content} theme={theme}>
      {({ x, y, w, h }) => {
        if (values.length === 0) return <EmptyMessage x={x + w / 2} y={y + h / 2} theme={theme} />;
        const cellW = w / values.length;
        return (
          <>
            {values.map((v, i) => {
              const col = paletteColorAt(theme, i);
              return (
                <g key={i} transform={`translate(${x + i * cellW} ${y})`}>
                  <rect x={4} y={4} width={cellW - 8} height={h - 8} rx={10} fill={col} opacity={0.08} />
                  <text x={cellW / 2} y={h / 2 - 2} fontSize={Math.min(36, cellW / 3)} fontWeight={800}
                        textAnchor="middle" fill={col}>{v}</text>
                  <text x={cellW / 2} y={h / 2 + 22} fontSize={11} textAnchor="middle" fill={theme.muted}
                        style={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>{truncate(cats[i] || '', 18)}</text>
                </g>
              );
            })}
          </>
        );
      }}
    </ChartShell>
  );
};

// =============================================================================
//  Phase 33C — Funnel chart (sales / conversion / TAM-SAM-SOM)
//
//  Each category is rendered as a horizontal trapezoid that narrows from
//  100% width down to (value / max). Single series (series[0].values).
// =============================================================================

const FunnelChart: React.FC<{ content: ChartContent; theme: ChartTheme }> = ({ content, theme }) => {
  const cats = content.categories;
  const values = (content.series[0]?.values || []).map((v) => Number(v) || 0);
  return (
    <ChartShell content={content} theme={theme}>
      {({ x, y, w, h }) => {
        if (cats.length === 0 || values.length === 0)
          return <EmptyMessage x={x + w / 2} y={y + h / 2} theme={theme} />;
        const max = Math.max(1, ...values);
        const slotH = h / cats.length;
        return (
          <>
            {cats.map((cat, i) => {
              const v = values[i] ?? 0;
              const widthFrac = Math.max(0.08, v / max);
              const topFrac    = i === 0 ? 1 : Math.max(0.08, (values[i - 1] ?? v) / max);
              const cy0 = y + i * slotH;
              const cy1 = y + (i + 1) * slotH;
              const cxC = x + w / 2;
              const topW = (w * topFrac);
              const botW = (w * widthFrac);
              const points = [
                `${cxC - topW / 2},${cy0 + 2}`,
                `${cxC + topW / 2},${cy0 + 2}`,
                `${cxC + botW / 2},${cy1 - 2}`,
                `${cxC - botW / 2},${cy1 - 2}`,
              ].join(' ');
              const col = paletteColorAt(theme, i);
              const labelInside = botW > 90;
              return (
                <g key={i}>
                  <polygon points={points} fill={col} opacity={0.85} />
                  <text x={cxC} y={cy0 + slotH / 2 + 4} fontSize={12} fontWeight={700} textAnchor="middle"
                        fill={labelInside ? '#ffffff' : theme.text}>
                    {truncate(cat, 18)}
                  </text>
                  {/* Value label always on the right side */}
                  <text x={x + w + 4} y={cy0 + slotH / 2 + 4} fontSize={11} textAnchor="start" fill={theme.muted}>
                    {v}
                  </text>
                </g>
              );
            })}
          </>
        );
      }}
    </ChartShell>
  );
};

// =============================================================================
//  Phase 33B — Scatter plot
//
//  Series.values is interpreted as flat pairs: values[2i] = x, values[2i+1] = y.
//  categories[] (if any) is treated as axis labels at every tick.
// =============================================================================

const ScatterChart: React.FC<{ content: ChartContent; theme: ChartTheme }> = ({ content, theme }) => {
  const series = content.series;
  return (
    <ChartShell content={content} theme={theme}>
      {({ x, y, w, h }) => {
        if (series.length === 0)
          return <EmptyMessage x={x + w / 2} y={y + h / 2} theme={theme} />;
        // Find x and y extents across every series
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (const s of series) {
          for (let i = 0; i < (s.values?.length ?? 0) - 1; i += 2) {
            const xv = Number(s.values[i]);
            const yv = Number(s.values[i + 1]);
            if (Number.isFinite(xv)) { if (xv < minX) minX = xv; if (xv > maxX) maxX = xv; }
            if (Number.isFinite(yv)) { if (yv < minY) minY = yv; if (yv > maxY) maxY = yv; }
          }
        }
        if (minX === Infinity) return <EmptyMessage x={x + w / 2} y={y + h / 2} theme={theme} />;
        if (minX === maxX) { minX -= 1; maxX += 1; }
        if (minY === maxY) { minY -= 1; maxY += 1; }
        const xScale = (v: number) => x + ((v - minX) / (maxX - minX)) * w;
        const yScale = (v: number) => y + h - ((v - minY) / (maxY - minY)) * h;

        return (
          <>
            {content.showGrid !== false && <YGrid x={x} y={y} w={w} h={h} max={maxY} theme={theme} />}
            {series.map((s, si) => {
              const col = colorFor(s, si, theme);
              const pts: React.ReactNode[] = [];
              for (let i = 0; i < (s.values?.length ?? 0) - 1; i += 2) {
                const xv = Number(s.values[i]); const yv = Number(s.values[i + 1]);
                if (!Number.isFinite(xv) || !Number.isFinite(yv)) continue;
                pts.push(<circle key={i} cx={xScale(xv)} cy={yScale(yv)} r={4} fill={col} opacity={0.8} />);
              }
              return <g key={si}>{pts}</g>;
            })}
            <AxisTitles content={content} theme={theme} x={x} y={y} w={w} h={h} />
            <text x={x} y={y + h + 14} fontSize={10} fill={theme.muted}>{Math.round(minX)}</text>
            <text x={x + w} y={y + h + 14} fontSize={10} textAnchor="end" fill={theme.muted}>{Math.round(maxX)}</text>
          </>
        );
      }}
    </ChartShell>
  );
};

// =============================================================================
//  Phase 33D — Waterfall chart
//
//  series[0].values are signed deltas. Bars colour positive=green, negative=red.
//  A final "Total" bar (blue) is appended automatically.
// =============================================================================

const WaterfallChart: React.FC<{ content: ChartContent; theme: ChartTheme }> = ({ content, theme }) => {
  const cats = content.categories;
  const deltas = (content.series[0]?.values || []).map((v) => Number(v) || 0);
  return (
    <ChartShell content={content} theme={theme}>
      {({ x, y, w, h }) => {
        if (cats.length === 0 || deltas.length === 0)
          return <EmptyMessage x={x + w / 2} y={y + h / 2} theme={theme} />;
        // Running totals
        const totals = [0];
        for (const d of deltas) totals.push(totals[totals.length - 1] + d);
        const finalTotal = totals[totals.length - 1];
        const allLabels = [...cats, 'Total'];
        const all = [...totals, finalTotal];
        const maxAbs = Math.max(1, ...all.map(Math.abs), Math.abs(finalTotal));
        const yZero = y + h / 2;
        const groupW = w / allLabels.length;
        const barW = groupW * 0.6;
        const scale = (h / 2) / maxAbs;

        return (
          <>
            <line x1={x} y1={yZero} x2={x + w} y2={yZero} stroke={theme.grid} strokeWidth={1} />
            {deltas.map((d, i) => {
              const positive = d >= 0;
              const top = positive ? yZero - totals[i + 1] * scale : yZero - totals[i] * scale;
              const bot = positive ? yZero - totals[i] * scale     : yZero - totals[i + 1] * scale;
              const col = positive ? theme.positive : theme.negative;
              return (
                <g key={i}>
                  <rect x={x + i * groupW + (groupW - barW) / 2} y={top} width={barW} height={Math.abs(bot - top)} fill={col} opacity={0.85} />
                  <text x={x + i * groupW + groupW / 2} y={bot + 12} fontSize={10} textAnchor="middle" fill={theme.muted}>
                    {(positive ? '+' : '') + d}
                  </text>
                  <text x={x + i * groupW + groupW / 2} y={y + h + 14} fontSize={10} textAnchor="middle" fill={theme.muted}>
                    {truncate(cats[i] || '', 12)}
                  </text>
                </g>
              );
            })}
            {/* Final total bar */}
            <rect
              x={x + deltas.length * groupW + (groupW - barW) / 2}
              y={Math.min(yZero, yZero - finalTotal * scale)}
              width={barW}
              height={Math.abs(finalTotal * scale)}
              fill={theme.accent}
            />
            <text x={x + deltas.length * groupW + groupW / 2} y={y + h + 14}
                  fontSize={10} fontWeight={700} textAnchor="middle" fill={theme.text}>Total</text>
            <text x={x + deltas.length * groupW + groupW / 2} y={Math.min(yZero, yZero - finalTotal * scale) - 4}
                  fontSize={11} fontWeight={700} textAnchor="middle" fill={theme.accent}>{finalTotal}</text>
            <AxisTitles content={content} theme={theme} x={x} y={y} w={w} h={h} />
          </>
        );
      }}
    </ChartShell>
  );
};

// =============================================================================
//  Phase 33B — Radar chart (multi-axis polygon)
// =============================================================================

const RadarChart: React.FC<{ content: ChartContent; theme: ChartTheme }> = ({ content, theme }) => {
  const cats = content.categories;
  const series = content.series;
  return (
    <ChartShell content={content} theme={theme}>
      {({ x, y, w, h }) => {
        if (cats.length < 3 || series.length === 0)
          return <EmptyMessage x={x + w / 2} y={y + h / 2} theme={theme} />;
        const cx = x + w / 2;
        const cy = y + h / 2;
        const r  = Math.min(w, h) / 2 - 20;
        const max = Math.max(1, ...series.flatMap((s) => s.values || []));
        const angle = (i: number) => -Math.PI / 2 + (i / cats.length) * Math.PI * 2;
        const point = (i: number, v: number) => {
          const rr = (v / max) * r;
          return { x: cx + rr * Math.cos(angle(i)), y: cy + rr * Math.sin(angle(i)) };
        };

        // Concentric grid rings
        const rings = [0.25, 0.5, 0.75, 1].map((frac) => {
          const pts = cats.map((_, i) => {
            const p = point(i, frac * max);
            return `${p.x},${p.y}`;
          }).join(' ');
          return pts;
        });

        return (
          <>
            {rings.map((pts, i) => (
              <polygon key={i} points={pts} fill="none" stroke={theme.grid} strokeWidth={1} />
            ))}
            {cats.map((_, i) => {
              const p = point(i, max);
              return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke={theme.grid} strokeWidth={1} />;
            })}
            {/* Series polygons */}
            {series.map((s, si) => {
              const col = colorFor(s, si, theme);
              const pts = (s.values || []).slice(0, cats.length).map((v, i) => {
                const p = point(i, Number(v) || 0);
                return `${p.x},${p.y}`;
              }).join(' ');
              return (
                <g key={si}>
                  <polygon points={pts} fill={col} opacity={0.18} />
                  <polygon points={pts} fill="none" stroke={col} strokeWidth={2} />
                </g>
              );
            })}
            {/* Axis labels */}
            {cats.map((cat, i) => {
              const p = point(i, max * 1.12);
              return (
                <text key={i} x={p.x} y={p.y + 4} fontSize={10} textAnchor="middle" fill={theme.muted}>
                  {truncate(cat, 12)}
                </text>
              );
            })}
          </>
        );
      }}
    </ChartShell>
  );
};

// =============================================================================
//  Phase 33B / 33C — Heatmap (cohort-style)
//
//  categories[] x series[] grid; each cell shaded by series.values[ci] / max.
// =============================================================================

const HeatmapChart: React.FC<{ content: ChartContent; theme: ChartTheme }> = ({ content, theme }) => {
  const cats = content.categories;
  const series = content.series;
  return (
    <ChartShell content={content} theme={theme}>
      {({ x, y, w, h }) => {
        if (cats.length === 0 || series.length === 0)
          return <EmptyMessage x={x + w / 2} y={y + h / 2} theme={theme} />;
        const LABEL_W = 90;
        const grid = { x: x + LABEL_W, y, w: w - LABEL_W, h };
        const cellW = grid.w / cats.length;
        const cellH = grid.h / series.length;
        const all = series.flatMap((s) => s.values || []);
        const max = Math.max(1, ...all);
        // Hex with adjustable alpha — used to shade cells based on intensity
        const base = theme.accent;

        return (
          <>
            {/* Category column headers */}
            {cats.map((cat, ci) => (
              <text key={ci} x={grid.x + ci * cellW + cellW / 2} y={y + 10}
                    fontSize={9} textAnchor="middle" fill={theme.muted}>
                {truncate(cat, 8)}
              </text>
            ))}
            {/* Series row labels + cells */}
            {series.map((s, si) => (
              <g key={si}>
                <text x={grid.x - 8} y={grid.y + si * cellH + cellH / 2 + 4}
                      fontSize={10} textAnchor="end" fill={theme.muted}>
                  {truncate(s.name, 12)}
                </text>
                {cats.map((_, ci) => {
                  const v = Number(s.values?.[ci] ?? 0);
                  const frac = Math.max(0, Math.min(1, v / max));
                  return (
                    <g key={ci}>
                      <rect
                        x={grid.x + ci * cellW + 1}
                        y={grid.y + si * cellH + 1}
                        width={cellW - 2}
                        height={cellH - 2}
                        fill={base}
                        opacity={0.1 + frac * 0.85}
                      />
                      {cellW > 38 && cellH > 18 && (
                        <text x={grid.x + ci * cellW + cellW / 2} y={grid.y + si * cellH + cellH / 2 + 4}
                              fontSize={10} textAnchor="middle"
                              fill={frac > 0.55 ? '#ffffff' : theme.text}>{v}</text>
                      )}
                    </g>
                  );
                })}
              </g>
            ))}
          </>
        );
      }}
    </ChartShell>
  );
};

// =============================================================================
//  Phase 33I — Insight layer helpers
// =============================================================================

interface BestWorst {
  best?:  { ci: number; si: number; value: number };
  worst?: { ci: number; si: number; value: number };
}

function computeBestWorst(series: ChartSeries[], insight?: ChartInsight): BestWorst {
  const out: BestWorst = {};
  if (!insight?.highlightBest && !insight?.highlightWorst) return out;
  let bestV = -Infinity, worstV = Infinity;
  for (let si = 0; si < series.length; si++) {
    const vals = series[si].values || [];
    for (let ci = 0; ci < vals.length; ci++) {
      const v = Number(vals[ci]);
      if (!Number.isFinite(v)) continue;
      if (insight.highlightBest  && v > bestV)  { bestV  = v; out.best  = { ci, si, value: v }; }
      if (insight.highlightWorst && v < worstV) { worstV = v; out.worst = { ci, si, value: v }; }
    }
  }
  return out;
}

function renderAnnotations(
  content: ChartContent,
  theme:   ChartTheme,
  anchor:  (ref: { ci: number; si: number }) => { ax: number; ay: number },
): React.ReactNode {
  const items = content.insight?.annotations;
  if (!items || items.length === 0) return null;
  return (
    <g>
      {items.map((a, i) => {
        const ref = { ci: a.categoryIndex, si: a.seriesIndex ?? 0 };
        if (ref.ci < 0 || ref.ci >= content.categories.length) return null;
        const { ax, ay } = anchor(ref);
        const tone = a.tone === 'negative' ? theme.negative : a.tone === 'neutral' ? theme.muted : theme.positive;
        const labelW = Math.max(40, a.label.length * 6.5);
        return (
          <g key={i} transform={`translate(${ax - labelW / 2} ${ay - 22})`}>
            <rect x={0} y={0} width={labelW} height={18} rx={4} fill={tone} opacity={0.18} />
            <text x={labelW / 2} y={12} fontSize={10} fontWeight={700} textAnchor="middle" fill={tone}>
              {a.label}
            </text>
            <line x1={labelW / 2} y1={18} x2={labelW / 2} y2={22} stroke={tone} strokeWidth={2} />
          </g>
        );
      })}
    </g>
  );
}

// =============================================================================
//  Shared helpers (Y grid, axis titles, empty state)
// =============================================================================

const YGrid: React.FC<{ x: number; y: number; w: number; h: number; max: number; theme: ChartTheme }> = ({ x, y, w, h, max, theme }) => {
  const lines = 4;
  const items: React.ReactNode[] = [];
  for (let i = 0; i <= lines; i++) {
    const yy = y + (h * i) / lines;
    items.push(
      <g key={i}>
        <line x1={x} y1={yy} x2={x + w} y2={yy} stroke={theme.grid} strokeWidth={1} strokeDasharray={i === lines ? '0' : '2 2'} />
        <text x={x - 4} y={yy + 3} fontSize={9} textAnchor="end" fill={theme.muted}>
          {Math.round(max * (1 - i / lines))}
        </text>
      </g>,
    );
  }
  return <>{items}</>;
};

const AxisTitles: React.FC<{ content: ChartContent; theme: ChartTheme; x: number; y: number; w: number; h: number }> = ({ content, theme, x, y, w, h }) => (
  <>
    {content.axes?.x && (
      <text x={x + w / 2} y={y + h + 30} fontSize={10} fontWeight={600} textAnchor="middle" fill={theme.muted}>{content.axes.x}</text>
    )}
    {content.axes?.y && (
      <text x={x - 28} y={y + h / 2} fontSize={10} fontWeight={600} textAnchor="middle" fill={theme.muted}
            transform={`rotate(-90 ${x - 28} ${y + h / 2})`}>{content.axes.y}</text>
    )}
  </>
);

const EmptyMessage: React.FC<{ x: number; y: number; theme: ChartTheme }> = ({ x, y, theme }) => (
  <text x={x} y={y} fontSize={11} textAnchor="middle" fill={theme.muted}>No chart data</text>
);
