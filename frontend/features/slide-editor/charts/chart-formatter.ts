// =============================================================================
//  Phase 33.5 — Chart value formatter
//
//  Pure formatter used by every chart renderer + the inspector preview. The
//  backend SVG builder has its own copy (svg-chart-builder.ts) for export
//  parity; both implementations must produce identical strings.
//
//  Supported formats:
//    currency    "$1.2M" / "$420"
//    percent     "18.4%"
//    integer     "1,200"  (locale-aware)
//    decimal     "12.5"
//    compact     "12.5K" / "1.2M" / "4.7B"
// =============================================================================

import type { ChartNumberFormat } from '@/types/slide-element';

export function formatNumber(v: number, fmt?: ChartNumberFormat): string {
  if (!Number.isFinite(v)) return '';
  const decimals = fmt?.decimals ?? 1;
  switch (fmt?.kind) {
    case 'currency': return `${fmt.currency || '$'}${compact(v, decimals)}`;
    case 'percent':  return `${v.toFixed(decimals)}%`;
    case 'integer':  return Math.round(v).toLocaleString();
    case 'decimal':  return v.toFixed(decimals);
    case 'compact':  return compact(v, decimals);
    default:         return formatDefault(v);
  }
}

/** Compact axis-tick variant — always uses compact mode so labels stay short. */
export function formatTick(v: number, fmt?: ChartNumberFormat): string {
  return formatNumber(v, fmt ?? { kind: 'compact' });
}

function compact(v: number, decimals: number): string {
  const abs = Math.abs(v);
  if (abs >= 1e9) return `${(v / 1e9).toFixed(decimals)}B`;
  if (abs >= 1e6) return `${(v / 1e6).toFixed(decimals)}M`;
  if (abs >= 1e3) return `${(v / 1e3).toFixed(decimals)}K`;
  return v.toFixed(abs < 1 ? decimals : 0);
}

function formatDefault(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1e6) return compact(v, 1);
  if (abs >= 1e3) return v.toLocaleString();
  if (Number.isInteger(v)) return String(v);
  return v.toFixed(1);
}
