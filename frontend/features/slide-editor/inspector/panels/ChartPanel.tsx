'use client';

import React, { useMemo } from 'react';
import { Plus, X, ChevronUp, ChevronDown, Palette as PaletteIcon } from 'lucide-react';
import type { SlideElementDTO, ChartContent, ChartKind, ChartSeries } from '@/types/slide-element';
import {
  PanelSection, Row, TextField, NumberField, ColorField, SelectField, SegmentedControl, Toggle,
} from '../Primitives';

// =============================================================================
//  ChartPanel — full editor for chart elements.
//
//  Lets the user change:
//    - chart kind (bar / line / area / pie / donut / kpi / comparison)
//    - title, X / Y axis labels
//    - legend visibility + position
//    - showValues, showGrid toggles
//    - categories[]: add / remove / reorder / rename
//    - series[]:      add / remove / rename / color
//    - data matrix (categories × series) of numeric values
// =============================================================================

interface Props {
  element: SlideElementDTO;
  onPatch: (patch: Partial<SlideElementDTO>) => void;
}

const CHART_KINDS: Array<{ value: ChartKind; label: string }> = [
  // Core
  { value: 'bar',        label: 'Bar' },
  { value: 'stackedBar', label: 'Stacked bar' },
  { value: 'line',       label: 'Line' },
  { value: 'area',       label: 'Area' },
  { value: 'pie',        label: 'Pie' },
  { value: 'donut',      label: 'Donut' },
  { value: 'kpi',        label: 'KPI' },
  { value: 'comparison', label: 'Comparison' },
  // Phase 33 additions
  { value: 'funnel',     label: 'Funnel' },
  { value: 'scatter',    label: 'Scatter' },
  { value: 'waterfall',  label: 'Waterfall' },
  { value: 'radar',      label: 'Radar' },
  { value: 'heatmap',    label: 'Heatmap' },
];

const DEFAULT_PALETTE = ['#16a34a','#0ea5e9','#7c3aed','#f59e0b','#ef4444','#0891b2','#db2777','#525252'];

export const ChartPanel: React.FC<Props> = ({ element, onPatch }) => {
  const c = useMemo<ChartContent>(() => normalise(element.content), [element.content]);
  const set = (patch: Partial<ChartContent>) => onPatch({ content: { ...c, ...patch } });

  // ── Categories ────────────────────────────────────────────────────────────
  const updateCategory = (i: number, v: string) => {
    const next = [...c.categories]; next[i] = v;
    set({ categories: next });
  };
  const addCategory = () => {
    set({
      categories: [...c.categories, `Item ${c.categories.length + 1}`],
      series: c.series.map(s => ({ ...s, values: [...(s.values || []), 0] })),
    });
  };
  const removeCategory = (i: number) => {
    set({
      categories: c.categories.filter((_, j) => j !== i),
      series: c.series.map(s => ({ ...s, values: (s.values || []).filter((_, j) => j !== i) })),
    });
  };
  const moveCategory = (i: number, dir: -1 | 1) => {
    const j = i + dir; if (j < 0 || j >= c.categories.length) return;
    const cats = [...c.categories]; [cats[i], cats[j]] = [cats[j], cats[i]];
    const series = c.series.map(s => {
      const v = [...(s.values || [])]; [v[i], v[j]] = [v[j], v[i]];
      return { ...s, values: v };
    });
    set({ categories: cats, series });
  };

  // ── Series ────────────────────────────────────────────────────────────────
  const updateSeries = (i: number, patch: Partial<ChartSeries>) => {
    const next = [...c.series]; next[i] = { ...next[i], ...patch };
    set({ series: next });
  };
  const addSeries = () => {
    const palette = DEFAULT_PALETTE[c.series.length % DEFAULT_PALETTE.length];
    const next: ChartSeries = {
      name: `Series ${c.series.length + 1}`,
      values: c.categories.map(() => 0),
      color: palette,
    };
    set({ series: [...c.series, next] });
  };
  const removeSeries = (i: number) => {
    set({ series: c.series.filter((_, j) => j !== i) });
  };

  // ── Cell editing ──────────────────────────────────────────────────────────
  const setCell = (catIdx: number, seriesIdx: number, value: number) => {
    const v = [...(c.series[seriesIdx]?.values || [])];
    while (v.length < c.categories.length) v.push(0);
    v[catIdx] = value;
    const next = [...c.series];
    next[seriesIdx] = { ...next[seriesIdx], values: v };
    set({ series: next });
  };

  // Some chart kinds use only the first series (pie / donut / kpi / funnel /
  // waterfall — waterfall reads series[0].values as signed deltas).
  const isSingleSeries =
    c.type === 'pie' || c.type === 'donut' || c.type === 'kpi' ||
    c.type === 'funnel' || c.type === 'waterfall';

  return (
    <>
      <PanelSection title="Chart type">
        <Row label="Kind">
          <SelectField
            value={c.type}
            onChange={(v) => set({ type: v as ChartKind })}
            options={CHART_KINDS.map(k => ({ value: k.value, label: k.label }))}
          />
        </Row>
        <Row label="Title">
          <TextField value={c.title ?? ''} onChange={(v) => set({ title: v || undefined })} placeholder="Optional chart title" />
        </Row>
      </PanelSection>

      {!isSingleSeries && (
        <PanelSection title="Axes">
          <Row label="X label">
            <TextField value={c.axes?.x ?? ''} onChange={(v) => set({ axes: { ...(c.axes || {}), x: v || undefined } })} />
          </Row>
          <Row label="Y label">
            <TextField value={c.axes?.y ?? ''} onChange={(v) => set({ axes: { ...(c.axes || {}), y: v || undefined } })} />
          </Row>
        </PanelSection>
      )}

      <PanelSection title="Display">
        <Toggle
          value={c.legend?.visible !== false}
          onChange={(v) => set({ legend: { ...(c.legend || {}), visible: v } })}
          label="Show legend"
        />
        {c.legend?.visible !== false && (
          <Row label="Legend">
            <SegmentedControl
              value={c.legend?.position ?? 'bottom'}
              onChange={(v) => set({ legend: { ...(c.legend || {}), position: v as any, visible: true } })}
              options={[
                { value: 'top',    label: 'Top' },
                { value: 'bottom', label: 'Bot' },
                { value: 'left',   label: 'L' },
                { value: 'right',  label: 'R' },
              ]}
            />
          </Row>
        )}
        {!isSingleSeries && (
          <>
            <Toggle value={!!c.showValues}
                    onChange={(v) => set({ showValues: v })}
                    label="Show value labels" />
            <Toggle value={c.showGrid !== false}
                    onChange={(v) => set({ showGrid: v })}
                    label="Show grid" />
          </>
        )}
      </PanelSection>

      {/* Phase 33I — Insights layer */}
      <PanelSection title="Insights">
        <Toggle
          value={!!c.insight?.highlightBest}
          onChange={(v) => set({ insight: { ...(c.insight || {}), highlightBest: v } })}
          label="Highlight best value"
        />
        <Toggle
          value={!!c.insight?.highlightWorst}
          onChange={(v) => set({ insight: { ...(c.insight || {}), highlightWorst: v } })}
          label="Highlight worst value"
        />
        <Row label="Growth">
          <TextField
            value={c.insight?.growth?.label ?? ''}
            onChange={(v) => set({
              insight: { ...(c.insight || {}), growth: v ? { label: v, tone: c.insight?.growth?.tone || 'positive' } : undefined },
            })}
            placeholder="e.g. +24% YoY"
          />
          {c.insight?.growth?.label && (
            <SegmentedControl
              value={c.insight.growth.tone ?? 'positive'}
              onChange={(t) => set({
                insight: { ...(c.insight || {}), growth: { label: c.insight!.growth!.label, tone: t as any } },
              })}
              options={[
                { value: 'positive', label: '+' },
                { value: 'neutral',  label: '•' },
                { value: 'negative', label: '−' },
              ]}
            />
          )}
        </Row>
      </PanelSection>

      <PanelSection title={`Categories (${c.categories.length})`}>
        {c.categories.map((cat, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono text-slate-400 w-4 text-right">{i + 1}</span>
            <TextField value={cat} onChange={(v) => updateCategory(i, v)} placeholder="(empty)" />
            <div className="flex flex-col gap-0.5">
              <button onClick={() => moveCategory(i, -1)} disabled={i === 0}
                className="w-5 h-3 flex items-center justify-center text-slate-400 hover:text-slate-700 disabled:opacity-30">
                <ChevronUp className="w-3 h-3" />
              </button>
              <button onClick={() => moveCategory(i, +1)} disabled={i === c.categories.length - 1}
                className="w-5 h-3 flex items-center justify-center text-slate-400 hover:text-slate-700 disabled:opacity-30">
                <ChevronDown className="w-3 h-3" />
              </button>
            </div>
            <button onClick={() => removeCategory(i)}
              className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-red-600"
              title="Remove category">
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addCategory}
          className="w-full h-7 flex items-center justify-center gap-1.5 text-xs font-semibold text-green-700 bg-green-50 hover:bg-green-100 rounded mt-1"
        >
          <Plus className="w-3 h-3" /> Add category
        </button>
      </PanelSection>

      <PanelSection title={`Series (${c.series.length})${isSingleSeries ? ' — first only' : ''}`}>
        {c.series.map((s, si) => (
          <div key={si} className="bg-slate-50 border border-slate-200 rounded p-2 space-y-1.5">
            <div className="flex items-center gap-1.5">
              <ColorField value={s.color || DEFAULT_PALETTE[si % DEFAULT_PALETTE.length]}
                          onChange={(v) => updateSeries(si, { color: v })} />
              <button onClick={() => removeSeries(si)}
                className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-red-600 flex-shrink-0"
                title="Remove series">
                <X className="w-3 h-3" />
              </button>
            </div>
            <TextField value={s.name} onChange={(v) => updateSeries(si, { name: v })} placeholder={`Series ${si + 1}`} />
          </div>
        ))}
        {!isSingleSeries && (
          <button
            type="button"
            onClick={addSeries}
            className="w-full h-7 flex items-center justify-center gap-1.5 text-xs font-semibold text-green-700 bg-green-50 hover:bg-green-100 rounded mt-1"
          >
            <Plus className="w-3 h-3" /> Add series
          </button>
        )}
        {isSingleSeries && c.series.length === 0 && (
          <button
            type="button"
            onClick={addSeries}
            className="w-full h-7 flex items-center justify-center gap-1.5 text-xs font-semibold text-green-700 bg-green-50 hover:bg-green-100 rounded mt-1"
          >
            <Plus className="w-3 h-3" /> Add series
          </button>
        )}
      </PanelSection>

      <PanelSection title="Data">
        {c.categories.length === 0 || c.series.length === 0 ? (
          <p className="text-[11px] text-slate-400">Add at least one category and series.</p>
        ) : (
          <div className="overflow-x-auto -mx-1.5">
            <table className="w-full text-[11px]">
              <thead>
                <tr>
                  <th className="text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1.5 pb-1">Cat ↓ / Series →</th>
                  {(isSingleSeries ? c.series.slice(0, 1) : c.series).map((s, si) => (
                    <th key={si} className="text-left text-[10px] font-semibold text-slate-700 pb-1 pr-1.5">
                      <span className="inline-flex items-center gap-1 truncate max-w-[80px]">
                        <span className="w-2 h-2 rounded-sm" style={{ background: s.color || DEFAULT_PALETTE[si % DEFAULT_PALETTE.length] }} />
                        {s.name}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {c.categories.map((cat, ci) => (
                  <tr key={ci}>
                    <td className="pr-1.5 py-0.5 pl-1.5 text-slate-600 truncate max-w-[80px]">{cat}</td>
                    {(isSingleSeries ? c.series.slice(0, 1) : c.series).map((s, si) => (
                      <td key={si} className="py-0.5 pr-1.5">
                        <NumberField
                          value={Number(s.values?.[ci] ?? 0)}
                          onChange={(v) => setCell(ci, si, v)}
                          step={1}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PanelSection>
    </>
  );
};

// =============================================================================
//  Normalisation — accepts old shape too (just in case some elements still
//  carry the migration-default `series: [{ name, values }]` with 1 series).
// =============================================================================

function normalise(raw: any): ChartContent {
  const c = (raw || {}) as Partial<ChartContent>;
  return {
    type:       (c.type as ChartKind) || 'bar',
    title:      typeof c.title === 'string' ? c.title : undefined,
    categories: Array.isArray(c.categories) ? c.categories.map(String) : [],
    series:     Array.isArray(c.series)     ? c.series                  : [],
    axes:       c.axes,
    legend:     c.legend,
    showValues: c.showValues,
    showGrid:   c.showGrid,
  };
}
