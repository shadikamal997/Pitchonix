// =============================================================================
//  SmartComponentQualityProbe — Phase 32.75 Tier 8
//
//  The single bridge between the Quality system and the Smart Component
//  rendering layer. Walks a slide's `smartComponent.elementTree` (or, when
//  absent, the legacy `slide.content.*` fields) and produces a uniform
//  QualitySignals record that quality-control / executive-quality / readiness
//  engines consume.
//
//  This breaks the last legacy dependency: once every quality consumer reads
//  via this probe, the generator extractors (extractPricingTiers,
//  parseTeamMembers, etc.) become genuinely dead code.
//
//  No DOM. No DB. Pure function. Safe to call from any quality service.
// =============================================================================

/**
 * Business signals derivable from a slide. Every field is optional because
 * not every slide produces every signal — a Cover slide has none of them.
 */
export interface QualitySignals {
  // Counts (used by scorecards + executive-quality)
  metricsCount:        number;
  kpiCount:            number;
  chartCount:          number;
  pricingTierCount:    number;
  teamMemberCount:     number;
  roadmapPhaseCount:   number;
  timelineItemCount:   number;
  featureCount:        number;
  ctaCount:            number;

  // Discovery flags (presence > zero)
  hasMetrics:          boolean;
  hasPricing:          boolean;
  hasTeam:             boolean;
  hasRoadmap:          boolean;
  hasSwot:             boolean;
  hasComparison:       boolean;
  hasFinancialChart:   boolean;
  hasCta:              boolean;

  // Investor / market signals
  hasTam:              boolean;
  hasSam:              boolean;
  hasSom:              boolean;
  hasMarketSizing:     boolean;
  hasFundingAsk:       boolean;

  // Narrative signals (any prose text on the slide)
  hasTagline:          boolean;
  hasDescription:      boolean;
  hasDifferentiators:  boolean;
  hasGrowth:           boolean;
  hasMilestones:       boolean;

  // Raw evidence — useful for richer downstream checks (e.g. "is the largest
  // metric > 10%?"). Empty arrays if the signal is absent.
  metricValues:        Array<{ value: string; label?: string }>;
  pricingTiers:        Array<{ name: string; price: string }>;
  teamMembers:         Array<{ name: string; role?: string }>;
  roadmapPhases:       Array<{ phase: string; period?: string }>;

  /**
   * Provenance of these signals.
   *   'smart' — derived from `smartComponent.elementTree`
   *   'empty' — slide had no smartComponent payload (Tier 10: this is now
   *             treated as a missing-data condition, not a fallback path)
   *
   * The previous `'legacy'` variant was removed in Tier 10 with the
   * `collectFromLegacy()` collector.
   */
  source:              'smart' | 'empty';
}

const EMPTY_SIGNALS: QualitySignals = {
  metricsCount: 0, kpiCount: 0, chartCount: 0,
  pricingTierCount: 0, teamMemberCount: 0,
  roadmapPhaseCount: 0, timelineItemCount: 0, featureCount: 0, ctaCount: 0,
  hasMetrics: false, hasPricing: false, hasTeam: false, hasRoadmap: false,
  hasSwot: false, hasComparison: false, hasFinancialChart: false, hasCta: false,
  hasTam: false, hasSam: false, hasSom: false, hasMarketSizing: false, hasFundingAsk: false,
  hasTagline: false, hasDescription: false, hasDifferentiators: false,
  hasGrowth: false, hasMilestones: false,
  metricValues: [], pricingTiers: [], teamMembers: [], roadmapPhases: [],
  source: 'empty',
};

// =============================================================================
//  Public API
// =============================================================================

/**
 * Analyze a slide's smart-component element tree and produce QualitySignals.
 * If the tree is absent or empty, returns empty signals. Callers should use
 * `analyzeSlide()` for the full bridge (smart → legacy fallback).
 */
export function analyzeElementTree(tree: any[] | null | undefined): QualitySignals {
  if (!Array.isArray(tree) || tree.length === 0) return { ...EMPTY_SIGNALS };
  return collectFromTree(tree, { ...EMPTY_SIGNALS, source: 'smart' });
}

/**
 * Phase 32.75 Tier 10 — Smart Components are the sole source of quality
 * signals. The legacy `collectFromLegacy()` bridge was deleted after the
 * Tier 9 matrix verified `signals.source === 'legacy'` never fires in
 * normal generation (720/720 smart-routed). Slides without a valid
 * smartComponent payload return `source='empty'` and zeroed signals;
 * callers (quality-control, executive-quality) treat empty signals the
 * same way they treat any missing data point — fail the type-specific
 * check, surface an issue, do not crash.
 *
 * Raw imports / pre-Tier-4 decks must be converted to smart components
 * before they reach the quality system (see T10E).
 */
export function analyzeSlide(slide: { content?: any }): QualitySignals {
  const c = slide?.content || {};
  const smart = c.smartComponent;
  if (smart && Array.isArray(smart.elementTree) && smart.elementTree.length > 0) {
    return analyzeElementTree(smart.elementTree);
  }
  return { ...EMPTY_SIGNALS };
}

// =============================================================================
//  Smart-component traversal
//
//  Walks the element tree once and emits all signals in a single pass. The
//  shapes referenced here are produced by the Tier 3/6 builders — match
//  changes there if you add new component types.
// =============================================================================

function collectFromTree(tree: any[], acc: QualitySignals): QualitySignals {
  for (const el of tree) {
    if (!el || typeof el !== 'object') continue;
    const c = el.content || {};
    switch (el.type) {
      case 'metric': {
        acc.metricsCount++;
        acc.hasMetrics = true;
        const value = String(c.value ?? '').trim();
        if (value) acc.metricValues.push({ value, label: c.label });
        // Growth detection — value like "+58% YoY" or label containing "growth"
        if (/(?:[+-]?\d+)\s*%/.test(value) || /growth/i.test(String(c.label || ''))) acc.hasGrowth = true;
        break;
      }
      case 'kpi': {
        acc.kpiCount++;
        acc.hasMetrics = true;
        const value = String(c.value ?? '').trim();
        if (value) acc.metricValues.push({ value, label: c.label });
        break;
      }
      case 'chart': {
        acc.chartCount++;
        // financial charts: dualAxis, financialDashboard's chart, growth charts
        const kind = String(c.type || '').toLowerCase();
        if (kind === 'dualaxis' || /revenue|ebitda|projection|forecast|financ/i.test(String(c.title || ''))) {
          acc.hasFinancialChart = true;
        }
        // Market-sizing signals come through chart categories
        if (Array.isArray(c.categories)) {
          for (const cat of c.categories) {
            const s = String(cat).toUpperCase();
            if (s === 'TAM') acc.hasTam = true;
            if (s === 'SAM') acc.hasSam = true;
            if (s === 'SOM') acc.hasSom = true;
          }
          if (acc.hasTam || acc.hasSam || acc.hasSom) acc.hasMarketSizing = true;
        }
        break;
      }
      case 'pricingCard': {
        const tiers = Array.isArray(c.tiers) ? c.tiers : [];
        acc.pricingTierCount += tiers.length;
        if (tiers.length > 0) acc.hasPricing = true;
        for (const t of tiers) {
          acc.pricingTiers.push({ name: String(t?.name || ''), price: String(t?.price || '') });
        }
        break;
      }
      case 'teamCard': {
        const members = Array.isArray(c.members) ? c.members : [];
        acc.teamMemberCount += members.length;
        if (members.length > 0) acc.hasTeam = true;
        for (const m of members) {
          acc.teamMembers.push({ name: String(m?.name || ''), role: m?.role });
        }
        break;
      }
      case 'roadmap': {
        const phases = Array.isArray(c.phases) ? c.phases : [];
        acc.roadmapPhaseCount += phases.length;
        if (phases.length > 0) {
          acc.hasRoadmap = true;
          acc.hasMilestones = true;
        }
        for (const p of phases) {
          acc.roadmapPhases.push({ phase: String(p?.phase || ''), period: p?.period });
        }
        break;
      }
      case 'timeline': {
        const items = Array.isArray(c.items) ? c.items : [];
        acc.timelineItemCount += items.length;
        if (items.length > 0) acc.hasMilestones = true;
        break;
      }
      case 'featureGrid': {
        const items = Array.isArray(c.items) ? c.items : [];
        acc.featureCount += items.length;
        if (items.length > 0) acc.hasDifferentiators = true;
        break;
      }
      case 'swot':       acc.hasSwot = true; break;
      case 'comparison': acc.hasComparison = true; acc.hasDifferentiators = true; break;
      case 'cta':        acc.ctaCount++; acc.hasCta = true; break;
      case 'heading':
      case 'subheading': {
        const text = String(c.text || '');
        if (text.trim()) acc.hasTagline = acc.hasTagline || (el.type === 'heading' && text.length < 80);
        if (/funding|series|raising|invest/i.test(text)) acc.hasFundingAsk = true;
        break;
      }
      case 'paragraph':
      case 'caption':
      case 'label':
      case 'quote':
      case 'testimonial': {
        const text = String(c.text || c.quote || '');
        if (text.trim().length >= 40) acc.hasDescription = true;
        if (/funding|raising|series [a-z]|\$\d/i.test(text)) acc.hasFundingAsk = true;
        if (/grew|growth|increase|YoY|MoM/i.test(text)) acc.hasGrowth = true;
        if (/milestone|launched|shipped|achieved/i.test(text)) acc.hasMilestones = true;
        break;
      }
      default: break;
    }
  }
  return acc;
}

// =============================================================================
//  Phase 32.75 Tier 10 — `collectFromLegacy()` deleted.
//
//  This function used to read the generator-produced `slide.content.metrics`,
//  `.pricingTiers`, `.team`, etc. fields as a compatibility bridge. After the
//  Tier 9 helpers were removed, those fields are no longer populated, and
//  after Tier 8's full quality migration nothing in the matrix triggered the
//  legacy path. The probe is now single-purpose: smart tree in, signals out.
// =============================================================================
