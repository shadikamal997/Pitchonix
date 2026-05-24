/**
 * Phase 27 — Real generation validation
 *
 * Constructs realistic WizardInput payloads for the 6 document types the
 * user asked us to test. For each one:
 *   1. Run SlideFactory.generateDeck()                              ← BEFORE
 *   2. Build the same deck through the full Phase 27 pipeline       ← AFTER
 *   3. Count visual blocks, element types, paragraph ratio, etc.
 *   4. Compute StructureQualityScore for the AFTER deck
 *   5. Print a side-by-side table
 *
 * NO LLM. Pure rule-based pipeline end-to-end.
 */

import { SlideFactory } from '../src/generation/slide-types/slide.factory';
import { WizardInput } from '../src/generation/slide-types/types';
import { ContentStructureAnalyzer } from '../src/generation/content-structure/content-analyzer.service';
import { VisualBlockDetector } from '../src/generation/content-structure/visual-block-detector.service';
import { ContentBlockMapper } from '../src/generation/content-structure/content-block-mapper.service';
import { SlideBlueprintGenerator } from '../src/generation/content-structure/slide-blueprint.service';
import { StructureScorer } from '../src/generation/content-structure/structure-scorer.service';
import { StructureValidator } from '../src/generation/content-structure/structure-validator.service';

// -----------------------------------------------------------------------------
// Test inputs: 6 document types × realistic content
// -----------------------------------------------------------------------------

const TEST_INPUTS: Array<Partial<WizardInput>> = [
  // 1. Pitch Deck
  {
    documentType: 'pitch_deck', companyName: 'CYKEL', industry: 'Mobility',
    audience: 'investors', tone: 'professional',
    problem: 'Urban commuters waste $4.2B annually on inefficient transport. Average commute is 47 minutes with 60% dissatisfaction.',
    solution: 'Smart e-bike sharing platform with AI-optimized routing. Reduces commute time by 35% and saves users $1,200/year. Includes mobile app, secure bike racks, and predictive maintenance.',
    targetCustomers: 'Urban professionals aged 22-45 in tier-1 cities',
    marketOpportunity: 'TAM: $185B global mobility market. SAM: $12B urban e-bike segment. SOM: $850M in our first 5 target cities.',
    competitors: 'Lime, Bird, Spin. We differentiate on dedicated racks, AI routing, and lower per-mile cost.',
    differentiation: 'Unique: smart racks reduce theft 95%. AI saves 8 minutes per trip. Subscription model with 80% gross margins.',
    revenueModel: 'Subscription tiers: Starter $9/mo, Pro $29/mo, Enterprise custom. LTV: $480, CAC: $48, 10:1 ratio.',
    pricing:      'Starter $9/mo includes 60 min daily. Pro $29/mo unlimited rides. Enterprise custom for fleets.',
    traction: 'Launched Q2 2025 in Seattle. 15,000 active users (+250% YoY). $50K MRR (+180% MoM). NPS 72. Featured in TechCrunch.',
    team: 'Sarah Chen, CEO, ex-Lyft VP Mobility. Marcus Wong, CTO, MIT PhD ML. Aisha Patel, COO, former Bird operations director.',
    fundingAsk: 'Seeking $2M seed. 50% engineering, 30% operations expansion, 20% marketing. 18-month runway.',
    roadmap: 'Q1 2026 launch in 3 new cities. Q2 2026 enterprise partnerships. Q3 2026 international expansion. Q4 2026 Series A.',
  },
  // 2. Sales Deck
  {
    documentType: 'sales_deck', companyName: 'Helix Analytics', industry: 'SaaS',
    audience: 'enterprise CTOs', tone: 'professional',
    problem: 'Enterprises lose 40% of analytics ROI to fragmented data tools. Avg implementation time: 9 months.',
    solution: 'Unified analytics platform with 50+ connectors. Deploy in 2 weeks. Self-serve. 99.99% SLA. Auto-scaling.',
    differentiation: '3x faster deployment than Looker. 50% lower TCO than Tableau. Native LLM integration. SOC 2 Type II.',
    pricing: 'Starter $499/mo: 10 users, basic dashboards. Pro $2,499/mo: 100 users, advanced features. Enterprise custom.',
    traction: 'Used by 250+ enterprises. $12M ARR. 95% retention. Average customer saves $800K/year.',
    targetCustomers: 'Enterprise data teams at companies with $100M+ revenue',
  },
  // 3. Board Meeting
  {
    documentType: 'board_meeting', companyName: 'Acme Corp', industry: 'Fintech',
    audience: 'board members', tone: 'executive',
    problem: 'Q4 customer acquisition costs rose 35% while LTV stagnated.',
    solution: 'Re-aligning go-to-market: shifting 40% of paid budget to content-led growth. Hiring 3 SDRs.',
    traction: 'Q4 revenue: $18M (+22% QoQ). Active customers: 12,500 (+15%). MRR: $1.5M. Churn: 2.1% monthly. CAC: $1,800. LTV: $9,000.',
    roadmap: 'Q1 product launches: AI risk module, mobile app v3. Q2 international expansion. Q3 IPO preparation.',
    revenueModel: 'SaaS subscription with usage-based add-ons. 75% gross margin. EBITDA positive Q3 2026.',
    fundingAsk: 'No new ask this quarter. Cash runway: 22 months at current burn.',
  },
  // 4. Product Launch
  {
    documentType: 'product_launch', companyName: 'Pulse', industry: 'Health Tech',
    audience: 'press and customers', tone: 'energetic',
    problem: 'Wearables capture data but don\'t deliver actionable insights. 80% of users abandon devices in 6 months.',
    solution: 'Pulse Vital: AI-coached health wearable. Sleep tracking, HRV analysis, personalized workouts, nutrition guidance, mental health insights, social challenges.',
    differentiation: '40% more accurate than Fitbit. 14-day battery. $99 vs Apple Watch $399.',
    pricing: 'Device $199 one-time. Pulse Premium $9.99/mo. Pulse Pro $19.99/mo with coaching.',
    traction: '50,000 pre-orders in 14 days. Featured in Wired, The Verge, GQ. 4.8★ average rating from beta testers.',
    roadmap: 'Q1 2026 launch in US. Q2 expand to EU/UK. Q3 enterprise wellness programs. Q4 Pulse 2.0 with ECG.',
  },
  // 5. Training Presentation
  {
    documentType: 'training', companyName: 'Acme', industry: 'SaaS',
    audience: 'new hires', tone: 'instructive',
    problem: 'New engineers need 6 weeks to ship first PR. We want 2 weeks.',
    solution: 'Onboarding bootcamp: week 1 fundamentals, week 2 paired programming with senior, week 3 first project, week 4 review and feedback. Modules include git workflow, code review, testing, deployment, monitoring, and incident response.',
    roadmap: 'Day 1 environment setup. Day 2 codebase tour. Day 3 first commit. Week 2 paired work. Week 3 solo project. Week 4 retro.',
  },
  // 6. Strategy Presentation
  {
    documentType: 'strategy', companyName: 'Acme', industry: 'Enterprise SaaS',
    audience: 'leadership team', tone: 'strategic',
    problem: 'We are losing 15% of enterprise deals to bigger competitors with deeper integrations.',
    solution: 'Three-pillar strategy: build 25+ premium integrations, hire 5 enterprise account executives, launch partner program.',
    differentiation: 'Our strengths: best UX, fastest deployment, strongest SOC 2 posture. Weaknesses: limited integrations, smaller sales team. Opportunities: emerging AI vertical, EU regulation. Threats: large incumbents, pricing pressure.',
    competitors: 'Salesforce, HubSpot, Microsoft Dynamics. They have scale but slower innovation.',
    roadmap: 'H1 2026: integration sprint. H2 2026: enterprise team buildout. Q1 2027: partner channel launch.',
  },
];

function fillDefaults(input: Partial<WizardInput>): WizardInput {
  return {
    documentType: 'pitch_deck',
    companyName:  'TestCo',
    industry:     'Tech',
    audience:     'investors',
    tone:         'professional',
    problem:      '',
    solution:     '',
    theme:        'modern',
    brandColors:  { primary: '#000', secondary: '#666', accent: '#0f0' },
    fontStyle:    'sans-serif',
    visualStyle:  'minimal',
    slideCount:   10,
    contentDepth: 'balanced',
    includeCharts:        true,
    includeFinancials:    false,
    includeSpeakerNotes:  true,
    includeExecutiveSummary: false,
    ...input,
  } as WizardInput;
}

function analyzeElementsFromContent(contents: any[]): Record<string, number> {
  // Mirrors the migration service's key→type mapping so we can count what
  // would actually become element rows once persisted.
  const counts: Record<string, number> = {};
  const inc = (k: string) => { counts[k] = (counts[k] ?? 0) + 1; };

  for (const c of contents) {
    // Always-present elements (heading + subtitle + footer + pageNumber)
    inc('heading');
    if (c.__slide?.subtitle) inc('subheading');
    inc('footer'); inc('pageNumber');

    if (typeof c.body === 'string' || typeof c.description === 'string') inc('paragraph');
    if (Array.isArray(c.bullets)    && c.bullets.length    > 0) inc('bulletList');
    if (Array.isArray(c.metrics)    && c.metrics.length    > 0) inc('metric');
    if (Array.isArray(c.kpis)       && c.kpis.length       > 0) inc('kpi');
    if (Array.isArray(c.charts)     && c.charts.length     > 0) inc('chart');
    if (Array.isArray(c.pricingTiers) && c.pricingTiers.length > 0) inc('pricingCard');
    if (Array.isArray(c.phases)     && c.phases.length     > 0) inc('roadmap');
    if (Array.isArray(c.timeline)   && c.timeline.length   > 0) inc('timeline');
    if (Array.isArray(c.team)       && c.team.length       > 0) inc('teamCard');
    if (c.featureGrid && Array.isArray(c.featureGrid.items) && c.featureGrid.items.length > 0) inc('featureGrid');
    if (c.processSteps && Array.isArray(c.processSteps.steps) && c.processSteps.steps.length > 0) inc('processSteps');
    if (c.swot)                                                  inc('swot');
    if (c.comparison)                                            inc('comparison');
    if (typeof c.quote === 'string' && c.quote)                  inc('quote');
    if (c.testimonial && typeof c.testimonial === 'object')      inc('testimonial');
  }
  return counts;
}

function pad(n: number, w = 4): string { return String(n).padStart(w); }

function runOne(label: string, partial: Partial<WizardInput>) {
  const input = fillDefaults(partial);
  const factory = new SlideFactory();
  const before = factory.generateDeck(input);

  // Wire the Phase 27 pipeline without Nest DI
  const analyzer  = new ContentStructureAnalyzer();
  const detector  = new VisualBlockDetector();
  const mapper    = new ContentBlockMapper();
  const engine    = new SlideBlueprintGenerator(analyzer, detector, mapper);
  const scorer    = new StructureScorer();
  const validator = new StructureValidator();

  const blueprints = engine.generateBlueprints(before, input);
  const after = before.map((s, i) => engine.applyBlueprint(s, blueprints[i]));
  const score = scorer.score(blueprints, input.documentType);
  const report = validator.validate(blueprints);

  const beforeContents = before.map((s) => ({ ...s.content, __slide: s }));
  const afterContents  = after.map((s) => ({ ...s.content, __slide: s }));
  const beforeElements = analyzeElementsFromContent(beforeContents);
  const afterElements  = analyzeElementsFromContent(afterContents);

  const totalBefore = sum(beforeElements);
  const totalAfter  = sum(afterElements);

  console.log(`\n══════════════════════════════════════════════════════════════════════════`);
  console.log(`  ${label}  (${input.companyName} · ${input.documentType} · ${before.length} slides)`);
  console.log(`══════════════════════════════════════════════════════════════════════════`);

  // Per-slide blueprint summary
  console.log(`  ${'#'.padStart(2)}  ${'type'.padEnd(22)}  ${'blocks'.padEnd(60)}  visuals  density`);
  blueprints.forEach((bp, i) => {
    const kinds = bp.blocks.map((b) => b.kind).join(', ') || '(none)';
    const visuals = bp.blocks.filter((b) => !['paragraph', 'bulletList'].includes(b.kind)).length;
    console.log(`  ${pad(i + 1, 2)}  ${(bp.slideType as string).padEnd(22)}  ${kinds.padEnd(60).slice(0, 60)}  ${pad(visuals, 7)}  ${pad(Math.round(bp.profile.dataDensity), 7)}`);
  });

  console.log(`\n  Element-type counts (would be created by migration service):`);
  console.log(`    ${'type'.padEnd(16)}  before  after  delta`);
  const allTypes = new Set([...Object.keys(beforeElements), ...Object.keys(afterElements)]);
  for (const t of Array.from(allTypes).sort()) {
    const b = beforeElements[t] ?? 0;
    const a = afterElements[t]  ?? 0;
    const delta = a - b;
    const arrow = delta > 0 ? '+' : '';
    console.log(`    ${t.padEnd(16)}  ${pad(b, 5)}  ${pad(a, 5)}  ${arrow}${delta}`);
  }
  console.log(`    ${'TOTAL'.padEnd(16)}  ${pad(totalBefore, 5)}  ${pad(totalAfter, 5)}  +${totalAfter - totalBefore}`);

  console.log(`\n  StructureQualityScore: ${score.total.toFixed(0)} / 100`);
  console.log(`    visualDiversity     : ${score.visualDiversityScore.toFixed(0)}`);
  console.log(`    blockDiversity      : ${score.blockDiversityScore.toFixed(0)}`);
  console.log(`    paragraphRatio      : ${score.paragraphRatioScore.toFixed(0)}`);
  console.log(`    informationDensity  : ${score.informationDensityScore.toFixed(0)}`);
  console.log(`    investorReadiness   : ${score.investorReadinessScore.toFixed(0)}`);
  console.log(`    presentationQuality : ${score.presentationQualityScore.toFixed(0)}`);
  if (score.notes.length > 0) {
    console.log(`  Notes:`);
    score.notes.forEach((n) => console.log(`    • ${n}`));
  }
  console.log(`  Validator: ${report.summary.error}✕ ${report.summary.warn}⚠ ${report.summary.info}ℹ`);

  return { label, before, after, blueprints, score, report, beforeElements, afterElements };
}

function sum(counts: Record<string, number>): number {
  return Object.values(counts).reduce((s, v) => s + v, 0);
}

console.log('=================================================================');
console.log('  PHASE 27 — Content Structure Generation Engine — Real validation');
console.log('=================================================================');

const labels = ['Pitch Deck', 'Sales Deck', 'Board Meeting', 'Product Launch', 'Training', 'Strategy'];
const results = TEST_INPUTS.map((inp, i) => runOne(labels[i], inp));

// -----------------------------------------------------------------------------
// Aggregate
// -----------------------------------------------------------------------------
console.log('\n\n=================================================================');
console.log('  AGGREGATE SUMMARY');
console.log('=================================================================');
console.log(`  ${'doc type'.padEnd(20)}  before-vis  after-vis  before-tot  after-tot  Δ%      score`);
let scoreSum = 0;
for (const r of results) {
  const beforeVis = visualCount(r.beforeElements);
  const afterVis  = visualCount(r.afterElements);
  const beforeTot = sum(r.beforeElements);
  const afterTot  = sum(r.afterElements);
  const lift      = beforeVis === 0 ? '∞' : Math.round((afterVis - beforeVis) / beforeVis * 100) + '%';
  console.log(`  ${r.label.padEnd(20)}  ${pad(beforeVis, 10)}  ${pad(afterVis, 9)}  ${pad(beforeTot, 10)}  ${pad(afterTot, 9)}  ${pad(parseInt(lift) || 0, 5)}%  ${pad(Math.round(r.score.total), 5)}`);
  scoreSum += r.score.total;
}
console.log(`\n  Mean StructureQualityScore across 6 decks: ${(scoreSum / results.length).toFixed(1)} / 100`);

function visualCount(counts: Record<string, number>): number {
  let n = 0;
  for (const [k, v] of Object.entries(counts)) {
    if (['heading', 'subheading', 'paragraph', 'bulletList', 'footer', 'pageNumber'].includes(k)) continue;
    n += v;
  }
  return n;
}

// Save full JSON report
const fs = require('fs');
fs.writeFileSync('/tmp/phase27-validation.json', JSON.stringify(results, null, 2));
console.log(`\nFull JSON report: /tmp/phase27-validation.json`);
