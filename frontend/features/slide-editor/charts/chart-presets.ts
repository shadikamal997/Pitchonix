// =============================================================================
//  Phase 33.5 — Chart preset library
//
//  Curated, ready-to-insert chart templates that ship with the editor. Users
//  pick one from the Insert menu and it lands on the canvas pre-filled with
//  representative data + sensible insights enabled. They can then edit the
//  data + labels for their own deck.
//
//  Persistence: in-code only. A user-defined "Save current chart as preset"
//  feature would persist to localStorage; intentionally not added in this
//  session — see the Phase 33.5 final report.
// =============================================================================

import type { ChartContent } from '@/types/slide-element';

export interface ChartPreset {
  id:          string;
  name:        string;
  category:    'Investor' | 'SaaS' | 'Sales' | 'Strategy' | 'Market' | 'Finance';
  description: string;
  /** Default size (in % of slide). Insert-menu uses this to position the new element. */
  defaultSize: { width: number; height: number };
  /** The ChartContent that becomes the new element's content blob. */
  content:     ChartContent;
}

export const CHART_PRESETS: ChartPreset[] = [
  // ── Investor ──────────────────────────────────────────────────────────
  {
    id:   'investor-arr-growth',
    name: 'ARR growth',
    category: 'Investor',
    description: 'Quarter-over-quarter ARR with peak callout.',
    defaultSize: { width: 60, height: 40 },
    content: {
      type: 'line',
      title: 'ARR growth',
      categories: ['Q1', 'Q2', 'Q3', 'Q4'],
      series: [{ name: 'ARR', values: [120, 180, 260, 340] }],
      axes: { y: 'ARR ($K)' },
      legend: { visible: false },
      showGrid: true,
      numberFormat: { kind: 'currency' },
      insight: { highlightBest: true, growth: { label: '+183%', tone: 'positive' } },
    },
  },
  {
    id:   'investor-tam-sam-som',
    name: 'TAM / SAM / SOM',
    category: 'Investor',
    description: 'Market sizing funnel with three tiers.',
    defaultSize: { width: 50, height: 45 },
    content: {
      type: 'funnel',
      title: 'Market opportunity',
      categories: ['TAM', 'SAM', 'SOM'],
      series: [{ name: 'Size', values: [185_000, 12_000, 850] }],
      legend: { visible: false },
      numberFormat: { kind: 'currency' },
    },
  },
  {
    id:   'investor-funding-allocation',
    name: 'Funding allocation',
    category: 'Investor',
    description: 'Use-of-funds donut chart.',
    defaultSize: { width: 45, height: 45 },
    content: {
      type: 'donut',
      title: 'Use of funds',
      categories: ['Engineering', 'Go-to-market', 'Operations'],
      series: [{ name: 'Allocation', values: [50, 30, 20] }],
      legend: { visible: true, position: 'right' },
      numberFormat: { kind: 'percent' },
    },
  },

  // ── SaaS ──────────────────────────────────────────────────────────────
  {
    id:   'saas-kpi-dashboard',
    name: 'KPI dashboard',
    category: 'SaaS',
    description: 'Four headline metrics — MRR, users, retention, NPS.',
    defaultSize: { width: 80, height: 30 },
    content: {
      type: 'kpi',
      title: 'Key metrics',
      categories: ['MRR', 'Active users', 'Retention', 'NPS'],
      series: [{ name: 'Values', values: [120_000, 4_200, 92, 62] }],
      legend: { visible: false },
      numberFormat: { kind: 'compact' },
    },
  },
  {
    id:   'saas-mrr-trend',
    name: 'MRR trend',
    category: 'SaaS',
    description: 'Monthly recurring revenue with peak + growth.',
    defaultSize: { width: 60, height: 40 },
    content: {
      type: 'area',
      title: 'MRR',
      categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      series: [{ name: 'MRR', values: [42, 56, 68, 84, 102, 120] }],
      legend: { visible: false },
      showGrid: true,
      numberFormat: { kind: 'currency' },
      insight: { highlightBest: true, growth: { label: '+186% H1', tone: 'positive' } },
    },
  },
  {
    id:   'saas-cohort-retention',
    name: 'Cohort retention',
    category: 'SaaS',
    description: 'Heatmap showing retention by month-cohort.',
    defaultSize: { width: 70, height: 50 },
    content: {
      type: 'heatmap',
      title: 'Retention by cohort',
      categories: ['M0', 'M1', 'M2', 'M3', 'M4', 'M5'],
      series: [
        { name: 'Jan',  values: [100, 86, 78, 72, 68, 65] },
        { name: 'Feb',  values: [100, 88, 82, 76, 71, 0] },
        { name: 'Mar',  values: [100, 92, 84, 79, 0, 0] },
        { name: 'Apr',  values: [100, 89, 80, 0, 0, 0] },
      ],
      legend: { visible: false },
      numberFormat: { kind: 'percent' },
    },
  },

  // ── Sales ─────────────────────────────────────────────────────────────
  {
    id:   'sales-funnel',
    name: 'Sales funnel',
    category: 'Sales',
    description: 'Lead → Qualified → Demo → Close conversion funnel.',
    defaultSize: { width: 55, height: 50 },
    content: {
      type: 'funnel',
      title: 'Sales funnel',
      categories: ['Leads', 'Qualified', 'Demo', 'Negotiation', 'Closed'],
      series: [{ name: 'Count', values: [1200, 480, 240, 96, 32] }],
      legend: { visible: false },
      numberFormat: { kind: 'integer' },
      insight: { growth: { label: '2.7% conversion', tone: 'positive' } },
    },
  },

  // ── Strategy ──────────────────────────────────────────────────────────
  {
    id:   'strategy-2x2',
    name: '2×2 prioritization',
    category: 'Strategy',
    description: 'Impact vs Effort matrix for initiative prioritization.',
    defaultSize: { width: 50, height: 50 },
    content: {
      type: 'matrix2x2',
      title: 'Impact vs Effort',
      axes: { x: 'Effort', y: 'Impact' },
      categories: ['Quick win', 'Big bet', 'Skip', 'Maybe'],
      series: [{ name: 'Projects', values: [0.2, 0.8,  0.8, 0.85,  0.7, 0.2,  0.4, 0.5] }],
      legend: { visible: false },
    },
  },
  {
    id:   'strategy-radar',
    name: 'Competitive positioning',
    category: 'Strategy',
    description: 'Five-axis radar comparing two competitors.',
    defaultSize: { width: 50, height: 50 },
    content: {
      type: 'radar',
      title: 'Positioning',
      categories: ['Speed', 'Price', 'Quality', 'Support', 'UX'],
      series: [
        { name: 'Us',        values: [80, 70, 90, 60, 85] },
        { name: 'Competitor', values: [60, 85, 70, 75, 65] },
      ],
      legend: { visible: true },
    },
  },

  // ── Finance ───────────────────────────────────────────────────────────
  {
    id:   'finance-revenue-mix',
    name: 'Revenue mix',
    category: 'Finance',
    description: 'Stacked bar of revenue by product line over quarters.',
    defaultSize: { width: 65, height: 45 },
    content: {
      type: 'stackedBar',
      title: 'Revenue mix',
      categories: ['Q1', 'Q2', 'Q3', 'Q4'],
      series: [
        { name: 'Subscriptions', values: [80, 110, 150, 190] },
        { name: 'Services',      values: [20, 25, 30, 40] },
        { name: 'Licensing',     values: [10, 12, 15, 18] },
      ],
      legend: { visible: true },
      numberFormat: { kind: 'currency' },
    },
  },
  {
    id:   'finance-waterfall',
    name: 'Variance analysis',
    category: 'Finance',
    description: 'Waterfall chart of contributors to EBITDA.',
    defaultSize: { width: 60, height: 40 },
    content: {
      type: 'waterfall',
      title: 'EBITDA bridge',
      categories: ['Revenue', 'COGS', 'OpEx', 'Other'],
      series: [{ name: 'Δ', values: [320, -120, -80, 15] }],
      legend: { visible: false },
      numberFormat: { kind: 'currency' },
    },
  },
  {
    id:   'finance-budget-treemap',
    name: 'Budget allocation',
    category: 'Finance',
    description: 'Treemap of budget by department.',
    defaultSize: { width: 60, height: 45 },
    content: {
      type: 'treemap',
      title: 'Budget allocation',
      categories: ['Engineering', 'Sales', 'Marketing', 'Operations', 'Support', 'Other'],
      series: [{ name: 'Budget', values: [400, 250, 150, 100, 50, 50] }],
      legend: { visible: false },
      numberFormat: { kind: 'currency' },
    },
  },
  {
    id:   'finance-gauge',
    name: 'Goal progress',
    category: 'Finance',
    description: 'Semicircular gauge of current value vs annual goal.',
    defaultSize: { width: 35, height: 35 },
    content: {
      type: 'gauge',
      title: 'Goal progress',
      categories: ['Progress'],
      series: [{ name: 'Progress', values: [72, 100] }],
      legend: { visible: false },
      numberFormat: { kind: 'percent' },
    },
  },

  // ── Market ────────────────────────────────────────────────────────────
  {
    id:   'market-bubble',
    name: 'Market segments',
    category: 'Market',
    description: 'Bubble chart of segment growth vs size vs revenue.',
    defaultSize: { width: 60, height: 45 },
    content: {
      type: 'bubble',
      title: 'Segment opportunity',
      axes: { x: 'Growth', y: 'Margin' },
      categories: [],
      series: [{ name: 'Segments', values: [20, 30, 10, 35, 25, 20, 60, 40, 30, 12, 18, 5] }],
      legend: { visible: false },
    },
  },
];

export function presetsByCategory(): Record<string, ChartPreset[]> {
  const out: Record<string, ChartPreset[]> = {};
  for (const p of CHART_PRESETS) {
    if (!out[p.category]) out[p.category] = [];
    out[p.category].push(p);
  }
  return out;
}
