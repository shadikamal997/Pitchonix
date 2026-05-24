/**
 * Phase 28 — Wizard Intelligence validation
 *
 * For 6 document types, generate decks TWICE through the real Phase 27 pipeline:
 *   A. WITHOUT structured wizard input (text-only — Phase 27 baseline)
 *   B. WITH  structured wizard input (Phase 28 — KPIs/pricing/team/roadmap/market…)
 *
 * Compare:
 *   - structureScore
 *   - visual block counts
 *   - paragraph ratio
 *   - opportunity unlocking
 *
 * NO LLM anywhere.
 */

import { SlideFactory } from '../src/generation/slide-types/slide.factory';
import { WizardInput, StructuredWizardInput } from '../src/generation/slide-types/types';
import { ContentStructureAnalyzer } from '../src/generation/content-structure/content-analyzer.service';
import { VisualBlockDetector } from '../src/generation/content-structure/visual-block-detector.service';
import { ContentBlockMapper } from '../src/generation/content-structure/content-block-mapper.service';
import { SlideBlueprintGenerator } from '../src/generation/content-structure/slide-blueprint.service';
import { StructureScorer } from '../src/generation/content-structure/structure-scorer.service';
import { StructureValidator } from '../src/generation/content-structure/structure-validator.service';

// -----------------------------------------------------------------------------
// 6 test cases — same problem/solution text, but case "B" adds structured input
// -----------------------------------------------------------------------------

interface TestCase {
  label:     string;
  base:      Partial<WizardInput>;
  structured: StructuredWizardInput;
}

const TESTS: TestCase[] = [
  {
    label: 'Pitch Deck',
    base: {
      documentType: 'pitch_deck', companyName: 'CYKEL', industry: 'Mobility',
      audience: 'investors', tone: 'professional',
      problem: 'Urban commuters waste billions on inefficient transport.',
      solution: 'Smart e-bike sharing platform with AI-optimized routing.',
      // BEFORE: minimal text in the structured-eligible fields
    },
    structured: {
      kpis: [
        { label: 'Active Users', value: '15,000', trend: '+250% YoY', trendDirection: 'up' },
        { label: 'MRR',          value: '$50K',   trend: '+180% MoM', trendDirection: 'up' },
        { label: 'NPS',          value: '72',     trend: '+8 pts',    trendDirection: 'up' },
        { label: 'Retention',    value: '94%',                       trendDirection: 'flat' },
      ],
      marketSizing: { tam: '$185B', sam: '$12B', som: '$850M', growthRate: '24% CAGR', region: 'Global' },
      pricingTiers: [
        { name: 'Starter',    price: '$9/mo',  features: ['60 min/day', 'Mobile app', 'Email support'] },
        { name: 'Pro',        price: '$29/mo', features: ['Unlimited rides', 'Priority routing', 'In-app chat'], highlight: true },
        { name: 'Enterprise', price: 'Custom', features: ['Fleet management', 'SLA', 'Dedicated account exec'] },
      ],
      teamMembers: [
        { name: 'Sarah Chen',  role: 'CEO',  experience: 'ex-Lyft VP Mobility' },
        { name: 'Marcus Wong', role: 'CTO',  experience: 'MIT PhD, ex-Google ML' },
        { name: 'Aisha Patel', role: 'COO',  experience: 'ex-Bird operations director' },
      ],
      competitors: [
        { name: 'Lime', strengths: 'Scale and brand recognition', weaknesses: 'High theft rate, no dedicated racks' },
        { name: 'Bird', strengths: 'Aggressive expansion', weaknesses: 'High unit economics burn' },
        { name: 'Spin', strengths: 'Ford backing', weaknesses: 'Slow product velocity' },
      ],
      funding: {
        amount: '$2M', roundType: 'Seed', runway: '18 months',
        allocations: [
          { category: 'Engineering',         percentage: 50, amount: '$1M' },
          { category: 'Operations expansion',percentage: 30, amount: '$600K' },
          { category: 'Marketing',           percentage: 20, amount: '$400K' },
        ],
      },
      roadmapPhases: [
        { phase: 'Launch in 3 new cities', period: 'Q1 2026', milestones: ['Seattle, Portland, Vancouver', 'Operations team hiring'] },
        { phase: 'Enterprise partnerships',  period: 'Q2 2026', milestones: ['Corporate fleet pilots', 'University programs'] },
        { phase: 'International expansion',  period: 'Q3 2026', milestones: ['EU launch', 'Local team in Amsterdam'] },
        { phase: 'Series A preparation',     period: 'Q4 2026', milestones: ['$15M target', 'Lead investor signed'] },
      ],
    },
  },
  {
    label: 'Sales Deck',
    base: {
      documentType: 'sales_deck', companyName: 'Helix Analytics', industry: 'SaaS',
      audience: 'enterprise CTOs', tone: 'professional',
      problem: 'Enterprise analytics is fragmented.',
      solution: 'Unified analytics platform with 50+ connectors.',
    },
    structured: {
      kpis: [
        { label: 'Deployment time', value: '2 weeks', trend: '3× faster than Looker' },
        { label: 'TCO savings',     value: '50%',     trend: 'vs Tableau' },
        { label: 'Customer ARR',    value: '$12M' },
      ],
      pricingTiers: [
        { name: 'Starter',    price: '$499/mo',   features: ['10 users', 'Basic dashboards', '5 connectors'] },
        { name: 'Pro',        price: '$2,499/mo', features: ['100 users', 'Advanced features', '50 connectors'], highlight: true },
        { name: 'Enterprise', price: 'Custom',    features: ['Unlimited', 'SSO + SCIM', 'Dedicated AE'] },
      ],
      competitors: [
        { name: 'Looker',   strengths: 'Google ecosystem', weaknesses: 'Slow deployment, high TCO' },
        { name: 'Tableau',  strengths: 'Visualization depth', weaknesses: 'Steep learning curve' },
        { name: 'PowerBI',  strengths: 'Microsoft ecosystem', weaknesses: 'Limited custom connectors' },
      ],
    },
  },
  {
    label: 'Board Meeting',
    base: {
      documentType: 'board_meeting_deck', companyName: 'Acme Corp', industry: 'Fintech',
      audience: 'board', tone: 'executive',
      problem: 'Q4 CAC rose 35%.', solution: 'Pivot to content-led growth and add 3 SDRs.',
    },
    structured: {
      kpis: [
        { label: 'Q4 Revenue', value: '$18M',  trend: '+22% QoQ',    trendDirection: 'up' },
        { label: 'Customers',  value: '12,500',trend: '+15%',         trendDirection: 'up' },
        { label: 'MRR',        value: '$1.5M', trend: '+9% QoQ',      trendDirection: 'up' },
        { label: 'Churn',      value: '2.1%',  trend: '−0.4 pts MoM', trendDirection: 'down' },
      ],
      financials: { revenue: '$18M Q4', grossMargin: '75%', burnRate: '$220K/mo', runway: '22 months' },
      roadmapPhases: [
        { phase: 'AI risk module',  period: 'Q1 2026', milestones: ['Launch beta', 'Customer migration'] },
        { phase: 'Mobile app v3',   period: 'Q1 2026', milestones: ['App store release', '40% adoption'] },
        { phase: 'EU expansion',    period: 'Q2 2026', milestones: ['Dublin office', 'GDPR cert'] },
        { phase: 'IPO prep',        period: 'Q3 2026', milestones: ['Audit complete', 'S-1 filed'] },
      ],
    },
  },
  {
    label: 'Product Launch',
    base: {
      documentType: 'product_launch', companyName: 'Pulse', industry: 'Health Tech',
      audience: 'press', tone: 'energetic',
      problem: 'Wearables abandon rates are high.', solution: 'AI-coached health wearable.',
    },
    structured: {
      kpis: [
        { label: 'Pre-orders', value: '50,000', trend: 'in 14 days' },
        { label: 'Beta NPS',   value: '85',     trend: '+10 vs Apple Watch' },
        { label: 'Accuracy',   value: '+40%',   trend: 'vs Fitbit' },
      ],
      pricingTiers: [
        { name: 'Pulse Device', price: '$199',     features: ['Sleep tracking', 'HRV analysis', '14-day battery'] },
        { name: 'Premium',      price: '$9.99/mo', features: ['Personalized workouts', 'Nutrition guidance'], highlight: true },
        { name: 'Pro',          price: '$19.99/mo',features: ['Live coaching', 'Mental health insights'] },
      ],
      roadmapPhases: [
        { phase: 'US launch',         period: 'Q1 2026', milestones: ['Amazon + DTC', 'Press tour'] },
        { phase: 'EU/UK launch',      period: 'Q2 2026', milestones: ['UK + DE + FR', 'Local CS team'] },
        { phase: 'Enterprise wellness',period:'Q3 2026', milestones: ['Fortune 500 pilots', 'HR integrations'] },
        { phase: 'Pulse 2.0 with ECG', period:'Q4 2026', milestones: ['FDA filing', 'Beta program'] },
      ],
    },
  },
  {
    label: 'Training',
    base: {
      documentType: 'training_presentation', companyName: 'Acme', industry: 'SaaS',
      audience: 'new hires', tone: 'instructive',
      problem: 'Onboarding takes 6 weeks.', solution: '4-week bootcamp with paired programming.',
    },
    structured: {
      roadmapPhases: [
        { phase: 'Environment setup',     period: 'Day 1',  milestones: ['Repo cloned', 'Local server running'] },
        { phase: 'Codebase tour',         period: 'Day 2',  milestones: ['Architecture walkthrough', 'Q&A session'] },
        { phase: 'First commit',          period: 'Day 3',  milestones: ['Pair with senior', 'PR merged'] },
        { phase: 'Paired programming',    period: 'Week 2', milestones: ['Daily pair sessions', 'Mid-week check-in'] },
        { phase: 'Solo project',          period: 'Week 3', milestones: ['Ship a feature end-to-end', 'Code review'] },
        { phase: 'Retro and feedback',    period: 'Week 4', milestones: ['1:1 with manager', 'Project demo'] },
      ],
    },
  },
  {
    label: 'Strategy',
    base: {
      documentType: 'strategy_presentation', companyName: 'Acme', industry: 'Enterprise SaaS',
      audience: 'leadership', tone: 'strategic',
      problem: 'Losing enterprise deals to bigger competitors.', solution: 'Build integrations, hire AEs, launch partner program.',
    },
    structured: {
      swot: {
        strengths:     ['Best UX in category', 'Fastest deployment time', 'Strong SOC 2 posture', '95% retention'],
        weaknesses:    ['Only 12 integrations vs 50+', 'Small enterprise sales team', 'Limited brand awareness'],
        opportunities: ['Emerging AI vertical', 'EU AI Act compliance demand', 'Channel partnerships'],
        threats:       ['Large incumbents copying features', 'Pricing pressure from open-source', 'Talent competition'],
      },
      competitors: [
        { name: 'Salesforce',         strengths: 'Massive scale, ecosystem', weaknesses: 'Slow innovation, complex pricing' },
        { name: 'HubSpot',            strengths: 'Strong SMB brand',         weaknesses: 'Weak enterprise tools' },
        { name: 'Microsoft Dynamics', strengths: 'Microsoft ecosystem',      weaknesses: 'Poor UX, hard to customize' },
      ],
      roadmapPhases: [
        { phase: 'Integration sprint', period: 'H1 2026', milestones: ['25 new integrations', 'Cert program'] },
        { phase: 'Enterprise team buildout', period: 'H2 2026', milestones: ['5 AEs hired', '$5M ARR pipeline'] },
        { phase: 'Partner channel launch', period: 'Q1 2027', milestones: ['50 partners signed', '$1M partner revenue'] },
      ],
    },
  },
];

function fillDefaults(input: Partial<WizardInput>): WizardInput {
  return {
    documentType: 'pitch_deck', companyName: 'TestCo', industry: 'Tech',
    audience: 'investors', tone: 'professional', problem: '', solution: '',
    theme: 'modern', brandColors: { primary: '#000', secondary: '#666', accent: '#0f0' },
    fontStyle: 'sans-serif', visualStyle: 'minimal',
    slideCount: 10, contentDepth: 'balanced', includeCharts: true,
    includeFinancials: false, includeSpeakerNotes: true, includeExecutiveSummary: false,
    ...input,
  } as WizardInput;
}

function runOne(testCase: TestCase, withStructured: boolean) {
  const input = fillDefaults(testCase.base);
  if (withStructured) input.structured = testCase.structured;

  const factory = new SlideFactory();
  const slides  = factory.generateDeck(input);

  const analyzer  = new ContentStructureAnalyzer();
  const detector  = new VisualBlockDetector();
  const mapper    = new ContentBlockMapper();
  const engine    = new SlideBlueprintGenerator(analyzer, detector, mapper);
  const scorer    = new StructureScorer();
  const validator = new StructureValidator();

  const blueprints = engine.generateBlueprints(slides, input);
  const score      = scorer.score(blueprints, input.documentType);
  const report     = validator.validate(blueprints);

  // Element counts (mirrors what migration service would create)
  const elementHistogram: Record<string, number> = {};
  const inc = (k: string) => { elementHistogram[k] = (elementHistogram[k] ?? 0) + 1; };
  for (let i = 0; i < slides.length; i++) {
    const c = (slides[i].content || {}) as any;
    const bp = blueprints[i];
    // Apply blueprint then count
    const enriched = engine.applyBlueprint(slides[i], bp).content as any;
    inc('heading'); inc('subheading'); inc('footer'); inc('pageNumber');
    if (typeof enriched.body === 'string' || typeof enriched.description === 'string') inc('paragraph');
    if (Array.isArray(enriched.bullets)    && enriched.bullets.length    > 0) inc('bulletList');
    if (Array.isArray(enriched.metrics)    && enriched.metrics.length    > 0) inc('metric');
    if (Array.isArray(enriched.kpis)       && enriched.kpis.length       > 0) inc('kpi');
    if (Array.isArray(enriched.charts)     && enriched.charts.length     > 0) inc('chart');
    if (Array.isArray(enriched.pricingTiers) && enriched.pricingTiers.length > 0) inc('pricingCard');
    if (Array.isArray(enriched.phases)     && enriched.phases.length     > 0) inc('roadmap');
    if (Array.isArray(enriched.timeline)   && enriched.timeline.length   > 0) inc('timeline');
    if (Array.isArray(enriched.team)       && enriched.team.length       > 0) inc('teamCard');
    if (enriched.featureGrid && Array.isArray(enriched.featureGrid.items) && enriched.featureGrid.items.length > 0) inc('featureGrid');
    if (enriched.processSteps && Array.isArray(enriched.processSteps.steps) && enriched.processSteps.steps.length > 0) inc('processSteps');
    if (enriched.swot)        inc('swot');
    if (enriched.comparison)  inc('comparison');
  }

  const totalElements = Object.values(elementHistogram).reduce((s, v) => s + v, 0);
  const visualElements = Object.entries(elementHistogram)
    .filter(([k]) => !['heading', 'subheading', 'paragraph', 'bulletList', 'footer', 'pageNumber'].includes(k))
    .reduce((s, [, v]) => s + v, 0);

  return { slides, blueprints, score, report, elementHistogram, totalElements, visualElements };
}

function pad(n: number, w = 4): string { return String(n).padStart(w); }

console.log('======================================================================');
console.log('  PHASE 28 — Wizard Intelligence — Before/After validation');
console.log('======================================================================\n');

interface RunSummary {
  label: string;
  beforeScore: number;
  afterScore:  number;
  beforeVisual: number;
  afterVisual:  number;
  beforeTotal:  number;
  afterTotal:   number;
  beforeKinds:  Set<string>;
  afterKinds:   Set<string>;
}

const summaries: RunSummary[] = [];

for (const t of TESTS) {
  const before = runOne(t, false);  // text only
  const after  = runOne(t, true);   // text + structured

  console.log(`▌ ${t.label}  (${(t.base as any).companyName}, ${t.base.documentType})  ·  ${before.slides.length} slides`);

  const allKinds = Array.from(new Set([
    ...Object.keys(before.elementHistogram),
    ...Object.keys(after.elementHistogram),
  ])).sort();
  console.log(`  ${'type'.padEnd(16)}  before  after  delta`);
  for (const k of allKinds) {
    const b = before.elementHistogram[k] ?? 0;
    const a = after.elementHistogram[k]  ?? 0;
    const delta = a - b;
    const arrow = delta > 0 ? '+' : '';
    if (delta !== 0 || b > 0) {
      console.log(`  ${k.padEnd(16)}  ${pad(b, 5)}  ${pad(a, 5)}  ${arrow}${delta}`);
    }
  }
  console.log(`  ${'TOTAL'.padEnd(16)}  ${pad(before.totalElements, 5)}  ${pad(after.totalElements, 5)}  +${after.totalElements - before.totalElements}`);
  console.log(`  visual blocks   ${pad(before.visualElements, 5)}  ${pad(after.visualElements, 5)}  +${after.visualElements - before.visualElements}`);
  console.log(`  StructureScore  ${pad(Math.round(before.score.total), 5)}  ${pad(Math.round(after.score.total), 5)}  +${Math.round(after.score.total - before.score.total)}`);
  console.log();

  summaries.push({
    label: t.label,
    beforeScore: Math.round(before.score.total),
    afterScore:  Math.round(after.score.total),
    beforeVisual: before.visualElements,
    afterVisual:  after.visualElements,
    beforeTotal:  before.totalElements,
    afterTotal:   after.totalElements,
    beforeKinds:  new Set(Object.keys(before.elementHistogram).filter((k) => !['heading','subheading','paragraph','bulletList','footer','pageNumber'].includes(k))),
    afterKinds:   new Set(Object.keys(after.elementHistogram).filter((k)  => !['heading','subheading','paragraph','bulletList','footer','pageNumber'].includes(k))),
  });
}

// -----------------------------------------------------------------------------
// Aggregate
// -----------------------------------------------------------------------------
console.log('\n══════════════════════════════════════════════════════════════════════');
console.log('  AGGREGATE: structured wizard input vs text-only');
console.log('══════════════════════════════════════════════════════════════════════');
console.log(`  ${'deck'.padEnd(16)}  bScore  aScore  Δscore  bVisual  aVisual  Δvis  bKinds aKinds`);
let sumB = 0, sumA = 0, sumBV = 0, sumAV = 0;
for (const s of summaries) {
  console.log(`  ${s.label.padEnd(16)}  ${pad(s.beforeScore, 6)}  ${pad(s.afterScore, 6)}  ${pad(s.afterScore - s.beforeScore, 6)}  ${pad(s.beforeVisual, 7)}  ${pad(s.afterVisual, 7)}  +${s.afterVisual - s.beforeVisual}    ${pad(s.beforeKinds.size, 5)}  ${pad(s.afterKinds.size, 5)}`);
  sumB += s.beforeScore; sumA += s.afterScore; sumBV += s.beforeVisual; sumAV += s.afterVisual;
}
console.log(`\n  Mean structure score    BEFORE: ${(sumB / summaries.length).toFixed(1)}   AFTER: ${(sumA / summaries.length).toFixed(1)}   (+${(sumA - sumB) / summaries.length}/deck avg)`);
console.log(`  Mean visual blocks      BEFORE: ${(sumBV / summaries.length).toFixed(1)}   AFTER: ${(sumAV / summaries.length).toFixed(1)}   (+${((sumAV - sumBV) / summaries.length).toFixed(1)}/deck avg)`);

require('fs').writeFileSync('/tmp/phase28-validation.json', JSON.stringify(summaries, null, 2));
console.log(`\nFull JSON report: /tmp/phase28-validation.json`);
