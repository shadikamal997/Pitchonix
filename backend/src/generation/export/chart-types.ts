/**
 * Phase 33.5 — Chart content types (backend mirror)
 *
 * Mirrors `frontend/types/slide-element.ts` ChartKind / ChartContent so the
 * backend SVG builder doesn't need to reach across packages. Keep in sync
 * with the frontend file.
 */

export type ChartKind =
  // Legacy / Phase 33
  | 'bar' | 'line' | 'pie' | 'donut' | 'area' | 'kpi' | 'comparison'
  | 'stackedBar' | 'funnel' | 'scatter' | 'waterfall' | 'radar' | 'heatmap'
  // Phase 33.5 additions
  | 'bubble' | 'gauge' | 'treemap'
  | 'stackedArea' | 'percentStackedBar' | 'percentStackedArea'
  | 'dualAxis' | 'matrix2x2';

export interface ChartSeries { name: string; values: number[]; color?: string; }

export interface ChartNumberFormat {
  kind?:     'currency' | 'percent' | 'integer' | 'decimal' | 'compact';
  currency?: string;
  decimals?: number;
}

export interface ChartInsight {
  highlightBest?:  boolean;
  highlightWorst?: boolean;
  annotations?: Array<{
    categoryIndex: number;
    seriesIndex?:  number;
    label:         string;
    tone?:         'positive' | 'negative' | 'neutral';
  }>;
  growth?: { label: string; tone?: 'positive' | 'negative' | 'neutral' };
}

export interface ChartContent {
  type:       ChartKind;
  title?:     string;
  categories: string[];
  series:     ChartSeries[];
  axes?:      { x?: string; y?: string };
  legend?:    { visible: boolean; position?: 'top' | 'bottom' | 'left' | 'right' };
  showValues?: boolean;
  showGrid?:   boolean;
  insight?:    ChartInsight;
  familyId?:   string;
  numberFormat?: ChartNumberFormat;
}
