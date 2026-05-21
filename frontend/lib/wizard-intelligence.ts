/**
 * Phase 28 — Wizard intelligence
 *
 * Pure-function module for:
 *   - Completeness Score   (28F) — how filled in the form is, 0–100
 *   - Opportunity Detector (28G) — which visual blocks the generator will create
 *   - Readiness Checks     (28I) — warnings before the user clicks Generate
 *   - Document Quality     (28H) — predicted structure + narrative score
 *
 * No LLM, no AI. All logic is rule-based and runs client-side.
 */

import type { StructuredWizardData, StructuredSectionKey } from './wizard-structured';
import { getSectionsFor } from './wizard-structured';

// =============================================================================
//  Inputs
// =============================================================================

/** Minimal shape from the wizard's free-text + structured payload. */
export interface WizardCompleteness {
  documentType:   string;
  companyName:    string;
  industry?:      string;
  audience?:      string;
  tone?:          string;
  problem?:       string;
  solution?:      string;
  targetCustomers?: string;
  marketOpportunity?: string;
  competitors?:   string;
  differentiation?: string;
  revenueModel?:  string;
  pricing?:       string;
  traction?:      string;
  team?:          string;
  fundingAsk?:    string;
  roadmap?:       string;
  /** Phase 28 — structured payload. Optional but heavily preferred. */
  structured?:    StructuredWizardData;
}

// =============================================================================
//  Completeness Score (28F)
// =============================================================================

export interface CompletenessReport {
  total:         number;             // 0..100
  required:      number;             // 0..100, hard-required only
  structured:    number;             // 0..100, structured data contribution
  perSection:    Record<string, { score: number; filled: boolean; required: boolean }>;
  missing:       string[];
}

interface SectionCheck {
  key:        string;
  label:      string;
  weight:     number;
  required:   boolean;
  /** Returns 0..1 (partial credit possible). */
  score:      (d: WizardCompleteness) => number;
  /** Show in "missing" list when score < 0.5. */
  visibleAt:  (doc: string) => boolean;
}

const ALWAYS = (_: string) => true;
const isSectionRelevant = (key: StructuredSectionKey) =>
  (doc: string) => getSectionsFor(doc).includes(key);

const SECTION_CHECKS: SectionCheck[] = [
  // ── Always-required basics ────────────────────────────────────────────────
  { key: 'documentType', label: 'Document type',  weight: 8, required: true,  visibleAt: ALWAYS,
    score: (d) => d.documentType ? 1 : 0 },
  { key: 'companyName',  label: 'Company name',   weight: 6, required: true,  visibleAt: ALWAYS,
    score: (d) => d.companyName ? 1 : 0 },
  { key: 'industry',     label: 'Industry',       weight: 4, required: false, visibleAt: ALWAYS,
    score: (d) => d.industry ? 1 : 0 },
  { key: 'audience',     label: 'Audience',       weight: 4, required: false, visibleAt: ALWAYS,
    score: (d) => d.audience ? 1 : 0 },
  { key: 'problem',      label: 'Problem',        weight: 6, required: true,  visibleAt: ALWAYS,
    score: (d) => textRichness(d.problem) },
  { key: 'solution',     label: 'Solution',       weight: 6, required: true,  visibleAt: ALWAYS,
    score: (d) => textRichness(d.solution) },

  // ── Structured data — heavy weighting ────────────────────────────────────
  { key: 'kpis',         label: 'KPIs',           weight: 10, required: false, visibleAt: isSectionRelevant('kpis'),
    score: (d) => Math.min(1, (d.structured?.kpis?.length ?? 0) / 3) },
  { key: 'pricing',      label: 'Pricing tiers',  weight: 8,  required: false, visibleAt: isSectionRelevant('pricing'),
    score: (d) => {
      const tiers = d.structured?.pricingTiers ?? [];
      if (tiers.length === 0) return textRichness(d.pricing) * 0.4;
      return Math.min(1, tiers.length / 3);
    } },
  { key: 'roadmap',      label: 'Roadmap phases', weight: 8,  required: false, visibleAt: isSectionRelevant('roadmap'),
    score: (d) => {
      const phases = d.structured?.roadmapPhases ?? [];
      if (phases.length === 0) return textRichness(d.roadmap) * 0.4;
      return Math.min(1, phases.length / 3);
    } },
  { key: 'team',         label: 'Team members',   weight: 8,  required: false, visibleAt: isSectionRelevant('team'),
    score: (d) => {
      const members = d.structured?.teamMembers ?? [];
      if (members.length === 0) return textRichness(d.team) * 0.4;
      return Math.min(1, members.length / 3);
    } },
  { key: 'market',       label: 'Market sizing',  weight: 8,  required: false, visibleAt: isSectionRelevant('market'),
    score: (d) => {
      const m = d.structured?.marketSizing;
      if (!m) return textRichness(d.marketOpportunity) * 0.4;
      const fields = [m.tam, m.sam, m.som, m.growthRate, m.region].filter(Boolean).length;
      return Math.min(1, fields / 3);
    } },
  { key: 'competitors',  label: 'Competitors',    weight: 6,  required: false, visibleAt: isSectionRelevant('competitors'),
    score: (d) => {
      const comps = d.structured?.competitors ?? [];
      if (comps.length === 0) return textRichness(d.competitors) * 0.4;
      return Math.min(1, comps.length / 3);
    } },
  { key: 'funding',      label: 'Funding ask',    weight: 8,  required: false, visibleAt: isSectionRelevant('funding'),
    score: (d) => {
      const f = d.structured?.funding;
      if (!f || (!f.amount && f.allocations.length === 0)) return textRichness(d.fundingAsk) * 0.4;
      const hasAmount = !!f.amount;
      const hasAlloc  = f.allocations.length >= 2 ? 1 : f.allocations.length === 1 ? 0.5 : 0;
      return Math.min(1, (hasAmount ? 0.5 : 0) + hasAlloc * 0.5);
    } },
  { key: 'swot',         label: 'SWOT',           weight: 6,  required: false, visibleAt: isSectionRelevant('swot'),
    score: (d) => {
      const s = d.structured?.swot;
      if (!s) return 0;
      const filled = [s.strengths, s.weaknesses, s.opportunities, s.threats]
        .filter((arr) => arr.length > 0).length;
      return filled / 4;
    } },
  { key: 'financials',   label: 'Financials',     weight: 4,  required: false, visibleAt: isSectionRelevant('financials'),
    score: (d) => {
      const f = d.structured?.financials;
      if (!f) return 0;
      const filled = [f.revenue, f.costs, f.grossMargin, f.burnRate, f.runway].filter(Boolean).length;
      return Math.min(1, filled / 3);
    } },
];

function textRichness(text?: string): number {
  if (!text) return 0;
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  if (words === 0) return 0;
  if (words < 8)   return 0.3;
  if (words < 20)  return 0.6;
  if (words < 40)  return 0.85;
  return 1;
}

export function computeCompleteness(data: WizardCompleteness): CompletenessReport {
  const perSection: CompletenessReport['perSection'] = {};
  const missing: string[] = [];
  let totalWeight = 0;
  let totalEarned = 0;
  let requiredWeight = 0;
  let requiredEarned = 0;
  let structuredWeight = 0;
  let structuredEarned = 0;

  for (const check of SECTION_CHECKS) {
    if (!check.visibleAt(data.documentType)) continue;
    const score = clamp01(check.score(data));
    const filled = score >= 0.5;
    perSection[check.key] = { score: Math.round(score * 100), filled, required: check.required };
    totalWeight += check.weight;
    totalEarned += check.weight * score;
    if (check.required) {
      requiredWeight += check.weight;
      requiredEarned += check.weight * score;
    }
    // Structured sections (everything except basics)
    if (!['documentType', 'companyName', 'industry', 'audience', 'problem', 'solution'].includes(check.key)) {
      structuredWeight += check.weight;
      structuredEarned += check.weight * score;
    }
    if (!filled && check.required) missing.push(check.label);
    else if (!filled && score < 0.3) missing.push(check.label);
  }

  return {
    total:      totalWeight   ? Math.round(totalEarned   / totalWeight   * 100) : 0,
    required:   requiredWeight? Math.round(requiredEarned/ requiredWeight* 100) : 100,
    structured: structuredWeight ? Math.round(structuredEarned / structuredWeight * 100) : 0,
    perSection,
    missing,
  };
}

// =============================================================================
//  Opportunity Detector (28G)
// =============================================================================

export type OpportunityKind =
  | 'kpi-cards' | 'metric-grid' | 'pricing-cards' | 'team-cards'
  | 'swot' | 'comparison-matrix' | 'funding-allocation' | 'market-sizing'
  | 'timeline' | 'roadmap' | 'feature-grid' | 'process-steps' | 'chart';

export interface Opportunity {
  kind:        OpportunityKind;
  label:       string;
  available:   boolean;
  reason?:     string;       // why available / why not
  source?:     string;       // which field / section
}

export function detectOpportunities(data: WizardCompleteness): Opportunity[] {
  const s = data.structured;
  const out: Opportunity[] = [];

  out.push({
    kind: 'kpi-cards', label: 'KPI Cards',
    available: (s?.kpis?.length ?? 0) >= 1 || /\d+%|\$[\d,.]+[KMB]?/.test(data.traction || ''),
    source: (s?.kpis?.length ?? 0) >= 1 ? `${s!.kpis!.length} KPIs entered` : 'Add KPIs to enable',
  });

  out.push({
    kind: 'metric-grid', label: 'Metric Grid',
    available: (s?.kpis?.length ?? 0) >= 2 || hasNumbers(data.traction, 2) || hasNumbers(data.marketOpportunity, 2),
    source: (s?.kpis?.length ?? 0) >= 2 ? `${s!.kpis!.length} KPIs entered` : 'Need 2+ numbers',
  });

  out.push({
    kind: 'pricing-cards', label: 'Pricing Cards',
    available: (s?.pricingTiers?.length ?? 0) >= 1 || /(starter|basic|free|pro|enterprise)/i.test(data.pricing || ''),
    source: (s?.pricingTiers?.length ?? 0) >= 1 ? `${s!.pricingTiers!.length} pricing tiers` : 'Add pricing tiers',
  });

  out.push({
    kind: 'team-cards', label: 'Team Cards',
    available: (s?.teamMembers?.length ?? 0) >= 1 || /(ceo|cto|founder)/i.test(data.team || ''),
    source: (s?.teamMembers?.length ?? 0) >= 1 ? `${s!.teamMembers!.length} team members` : 'Add team members',
  });

  out.push({
    kind: 'swot', label: 'SWOT Analysis',
    available: !!s?.swot && [s.swot.strengths, s.swot.weaknesses, s.swot.opportunities, s.swot.threats]
      .filter((a) => a.length > 0).length >= 2,
    source: s?.swot ? 'SWOT entries detected' : 'Add SWOT items',
  });

  out.push({
    kind: 'comparison-matrix', label: 'Comparison Matrix',
    available: (s?.competitors?.length ?? 0) >= 1 || (!!data.competitors && data.competitors.length > 20),
    source: (s?.competitors?.length ?? 0) >= 1 ? `${s!.competitors!.length} competitors` : 'Add competitors',
  });

  out.push({
    kind: 'funding-allocation', label: 'Funding Allocation Grid',
    available: (s?.funding?.allocations?.length ?? 0) >= 1 || hasNumbers(data.fundingAsk, 1),
    source: (s?.funding?.allocations?.length ?? 0) >= 1 ? `${s!.funding!.allocations.length} allocations` : 'Add allocations',
  });

  out.push({
    kind: 'market-sizing', label: 'TAM / SAM / SOM',
    available: !!(s?.marketSizing?.tam || s?.marketSizing?.sam || s?.marketSizing?.som) ||
               /TAM|SAM|SOM/i.test(data.marketOpportunity || ''),
    source: s?.marketSizing?.tam ? 'Market sizing entered' : 'Add TAM/SAM/SOM',
  });

  out.push({
    kind: 'roadmap', label: 'Roadmap',
    available: (s?.roadmapPhases?.length ?? 0) >= 1 || /Q[1-4]|phase|H[12]/i.test(data.roadmap || ''),
    source: (s?.roadmapPhases?.length ?? 0) >= 1 ? `${s!.roadmapPhases!.length} phases` : 'Add roadmap phases',
  });

  out.push({
    kind: 'timeline', label: 'Timeline',
    available: (s?.roadmapPhases?.length ?? 0) >= 1 || /Q[1-4]|phase|month\s\d/i.test(data.roadmap || ''),
    source: (s?.roadmapPhases?.length ?? 0) >= 1 ? 'Roadmap will render as timeline' : 'Add milestones',
  });

  out.push({
    kind: 'feature-grid', label: 'Feature Grid',
    available: (data.solution?.split(/[.;]/).filter((s) => s.trim().length > 10).length ?? 0) >= 2,
    source: 'Derived from solution / differentiation text',
  });

  out.push({
    kind: 'process-steps', label: 'Process Steps',
    available: /step\s\d|first|then|finally|process|workflow/i.test(data.solution || ''),
    source: 'Derived from solution text',
  });

  out.push({
    kind: 'chart', label: 'Chart',
    available: hasNumbers(data.traction, 2) || hasNumbers(data.marketOpportunity, 2),
    source: 'Derived from numeric values',
  });

  return out;
}

function hasNumbers(text: string | undefined, count: number): boolean {
  if (!text) return false;
  const matches = text.match(/\$[\d,]+(?:\.\d+)?[KMB]?|\d+(?:\.\d+)?%|\d+(?:\.\d+)?x/gi);
  return (matches?.length ?? 0) >= count;
}

// =============================================================================
//  Readiness Checks (28I)
// =============================================================================

export interface ReadinessCheck {
  severity: 'info' | 'warn' | 'error';
  code:     string;
  message:  string;
  hint?:    string;
}

export function runReadinessChecks(data: WizardCompleteness): ReadinessCheck[] {
  const issues: ReadinessCheck[] = [];
  const cmp = computeCompleteness(data);
  const sections = getSectionsFor(data.documentType);
  const s = data.structured;

  if (cmp.required < 100) {
    issues.push({
      severity: 'error', code: 'required-missing',
      message: `Required fields incomplete (${cmp.required}%)`,
      hint:    `Fill: ${cmp.missing.slice(0, 3).join(', ')}`,
    });
  }

  if (cmp.total < 40) {
    issues.push({
      severity: 'warn', code: 'low-completeness',
      message: `Form completeness is low (${cmp.total}%)`,
      hint: 'Generated decks may be paragraph-heavy. Add structured data to unlock visual blocks.',
    });
  }

  if (sections.includes('kpis') && (s?.kpis?.length ?? 0) === 0) {
    issues.push({ severity: 'warn', code: 'missing-kpis', message: 'No KPIs entered', hint: 'Add at least 3 KPIs to generate metric cards.' });
  }
  if (sections.includes('pricing') && (s?.pricingTiers?.length ?? 0) === 0 && !data.pricing) {
    issues.push({ severity: 'warn', code: 'missing-pricing', message: 'No pricing data', hint: 'Add pricing tiers to unlock pricing card visuals.' });
  }
  if (sections.includes('roadmap') && (s?.roadmapPhases?.length ?? 0) === 0 && !data.roadmap) {
    issues.push({ severity: 'warn', code: 'missing-roadmap', message: 'No roadmap data', hint: 'Add roadmap phases to generate timeline.' });
  }
  if (sections.includes('team') && (s?.teamMembers?.length ?? 0) === 0 && !data.team) {
    issues.push({ severity: 'warn', code: 'missing-team', message: 'No team members', hint: 'Add team members to generate team cards.' });
  }
  if (sections.includes('market') && !s?.marketSizing?.tam && !data.marketOpportunity) {
    issues.push({ severity: 'warn', code: 'missing-market', message: 'No market data', hint: 'Add TAM/SAM/SOM to generate market sizing visuals.' });
  }
  if (sections.includes('funding') && !s?.funding?.amount && !data.fundingAsk) {
    issues.push({ severity: 'warn', code: 'missing-funding', message: 'No funding ask', hint: 'Add funding amount and allocations.' });
  }

  return issues;
}

// =============================================================================
//  Document Quality Score (28H) — predict the downstream scores
// =============================================================================

export interface DocumentQualityPrediction {
  completenessScore:        number;
  expectedStructureScore:   number;     // 0..100, predicts Phase 27 score
  expectedNarrativeScore:   number;     // 0..100, predicts Phase 26 score
  visualOpportunityCount:   number;
  /** Coarse label. */
  band:                     'poor' | 'fair' | 'good' | 'excellent';
  notes:                    string[];
}

export function predictDocumentQuality(data: WizardCompleteness): DocumentQualityPrediction {
  const cmp  = computeCompleteness(data);
  const opps = detectOpportunities(data).filter((o) => o.available);
  const visualOpportunityCount = opps.length;

  // Empirical: Phase 27 score ≈ 30 + 0.6 × completeness + 3 × visualOpps
  const expectedStructureScore = clamp(30 + cmp.total * 0.6 + visualOpportunityCount * 3, 0, 100);
  // Phase 26 narrative score depends on slide variety; opportunities are a proxy.
  const expectedNarrativeScore = clamp(40 + cmp.total * 0.4 + visualOpportunityCount * 2.5, 0, 100);

  const band =
    expectedStructureScore >= 85 ? 'excellent' :
    expectedStructureScore >= 70 ? 'good' :
    expectedStructureScore >= 50 ? 'fair' : 'poor';

  const notes: string[] = [];
  if (cmp.total < 50) notes.push('Low completeness — add structured data');
  if (visualOpportunityCount < 4) notes.push(`Only ${visualOpportunityCount} visual block kinds available`);
  if (expectedStructureScore >= 85) notes.push('Decks will be visually rich');

  return {
    completenessScore: cmp.total,
    expectedStructureScore,
    expectedNarrativeScore,
    visualOpportunityCount,
    band,
    notes,
  };
}

// =============================================================================
//  Helpers
// =============================================================================

function clamp01(v: number): number { return Math.max(0, Math.min(1, v)); }
function clamp(v: number, lo: number, hi: number): number { return Math.max(lo, Math.min(hi, v)); }
