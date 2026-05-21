// =============================================================================
//  Phase 33.5 — Auto-Insights
//
//  Given a ChartContent, derives a `ChartInsight` blob that highlights the
//  peak / lowest / overall trend / growth or decline rate. Used by the
//  inspector's "Auto-insight" button — fills the insight slot in a single
//  click without manually selecting categories.
//
//  Pure function. No DOM. No React. Safe to call from anywhere.
// =============================================================================

import type { ChartContent, ChartInsight, ChartSeries } from '@/types/slide-element';
import { formatNumber } from './chart-formatter';

export interface AutoInsightOptions {
  /** Add peak annotation. Default: true. */
  peak?: boolean;
  /** Add lowest annotation. Default: true. */
  lowest?: boolean;
  /** Add overall growth / decline badge. Default: true. */
  growth?: boolean;
  /** Add trend annotation when series is monotone. Default: true. */
  trend?: boolean;
  /** Which series to analyse for growth/peak/lowest. Default: 0. */
  seriesIndex?: number;
}

export function generateInsights(
  content: ChartContent,
  opts: AutoInsightOptions = {},
): ChartInsight {
  const o = {
    peak:   opts.peak   ?? true,
    lowest: opts.lowest ?? true,
    growth: opts.growth ?? true,
    trend:  opts.trend  ?? true,
    seriesIndex: opts.seriesIndex ?? 0,
  };
  const series = content.series[o.seriesIndex];
  if (!series || !series.values || series.values.length === 0) return {};
  const vals = series.values;

  // Find peak + lowest (numeric).
  let peakIdx = 0, lowestIdx = 0;
  for (let i = 1; i < vals.length; i++) {
    if (vals[i] > vals[peakIdx])   peakIdx   = i;
    if (vals[i] < vals[lowestIdx]) lowestIdx = i;
  }

  // Overall growth — first → last
  const first = vals[0];
  const last  = vals[vals.length - 1];
  const pctChange = first !== 0 ? ((last - first) / Math.abs(first)) * 100 : 0;
  const growthTone: 'positive' | 'negative' | 'neutral' =
    pctChange > 0  ? 'positive' :
    pctChange < 0  ? 'negative' :
                     'neutral';

  // Monotone-trend detection
  let monotone: 'up' | 'down' | null = null;
  if (vals.length >= 3) {
    let up = true, down = true;
    for (let i = 1; i < vals.length; i++) {
      if (vals[i] < vals[i - 1]) up   = false;
      if (vals[i] > vals[i - 1]) down = false;
    }
    if (up)   monotone = 'up';
    if (down) monotone = 'down';
  }

  const insight: ChartInsight = {
    annotations: [],
  };

  if (o.peak && vals.length >= 3 && peakIdx !== lowestIdx) {
    insight.annotations!.push({
      categoryIndex: peakIdx,
      seriesIndex:   o.seriesIndex,
      label:         `Peak ${formatNumber(vals[peakIdx], content.numberFormat)}`,
      tone:          'positive',
    });
  }
  if (o.lowest && vals.length >= 3 && peakIdx !== lowestIdx) {
    insight.annotations!.push({
      categoryIndex: lowestIdx,
      seriesIndex:   o.seriesIndex,
      label:         `Low ${formatNumber(vals[lowestIdx], content.numberFormat)}`,
      tone:          'negative',
    });
  }

  if (o.growth && vals.length >= 2) {
    const sign = pctChange > 0 ? '+' : '';
    insight.growth = {
      label: `${sign}${pctChange.toFixed(1)}% ${growthTone === 'positive' ? '↑' : growthTone === 'negative' ? '↓' : '→'}`,
      tone:  growthTone,
    };
  }

  if (o.trend && monotone) {
    insight.annotations!.push({
      categoryIndex: vals.length - 1,
      seriesIndex:   o.seriesIndex,
      label:         monotone === 'up' ? 'Trending up' : 'Trending down',
      tone:          monotone === 'up' ? 'positive' : 'negative',
    });
  }

  // Drop empty annotations array so the UI doesn't render an empty group
  if (insight.annotations!.length === 0) delete insight.annotations;
  return insight;
}

// =============================================================================
//  Heuristic: detect monotone series (used by the inspector to nudge users
//  toward a line / area chart when their data is clearly time-series).
// =============================================================================

export function detectTrend(series: ChartSeries): 'up' | 'down' | 'flat' | 'volatile' {
  const vals = series.values || [];
  if (vals.length < 2) return 'flat';
  let up = true, down = true, flat = true;
  for (let i = 1; i < vals.length; i++) {
    if (vals[i] < vals[i - 1]) up = false;
    if (vals[i] > vals[i - 1]) down = false;
    if (vals[i] !== vals[i - 1]) flat = false;
  }
  if (flat) return 'flat';
  if (up)   return 'up';
  if (down) return 'down';
  return 'volatile';
}
