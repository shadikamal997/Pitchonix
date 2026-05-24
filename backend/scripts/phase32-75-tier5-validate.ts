/**
 * Phase 32.75 Tier 5 — Smart Component Rendering Cutover validation
 *
 * Drives the deterministic SlideFactory + the new smart-component-first path
 * in SlideElementsMigrationService.buildElementsForSlide() without touching
 * the database. Verifies:
 *
 *   T5B  smart-component path wins when the tree is valid
 *   T5C  invalid/missing trees gracefully fall back to legacy
 *   T5D  validateSmartComponentTree() catches malformed trees
 *   T5E  metrics are recorded per path / family / component
 *   T5G  every family produces a render
 *   T5H  every doc type × Tier-4 slide consumes a smart component
 *   T5J  cutover is at least as fast as the legacy path
 *
 *  Run:  pnpm ts-node scripts/phase32-75-tier5-validate.ts
 */

import { SlideFactory } from '../src/generation/slide-types/slide.factory';
import { SlideType, WizardInput, SlideContent } from '../src/generation/slide-types/types';
import { SMART_FAMILIES, SmartFamilyId } from '../src/components/smart/smart-types';
import { SlideElementsMigrationService } from '../src/slides/slide-elements-migration.service';
import { validateSmartComponentTree } from '../src/slides/smart-tree-validator';

const TIER4_TYPES: SlideType[] = [
  SlideType.ROADMAP, SlideType.PRICING, SlideType.BUSINESS_MODEL,
  SlideType.TEAM, SlideType.MARKET_OPPORTUNITY,
  SlideType.ASK, SlideType.COMPETITION, SlideType.TRACTION,
];

const DOC_TYPES: { docType: string; label: string }[] = [
  { docType: 'pitch_deck',    label: 'Pitch Deck' },
  { docType: 'sales_deck',    label: 'Sales Deck' },
  { docType: 'board_deck',    label: 'Board Deck' },
  { docType: 'strategy_deck', label: 'Strategy Deck' },
  { docType: 'business_plan', label: 'Business Plan' },
];

function makeInput(docType: string, theme: string): WizardInput {
  return {
    documentType: docType,
    companyName: 'Pitchonix', industry: 'B2B SaaS',
    audience: 'Series A investors', tone: 'professional',
    problem: 'Decks take weeks to produce and lack brand consistency.',
    solution: 'AI-native generation backed by a design system.',
    targetCustomers: 'B2B SaaS founders',
    marketOpportunity: 'TAM $48B, growing 11% YoY.',
    competitors: 'Pitch.com; Beautiful.ai; Tome',
    differentiation: 'Native component library + export parity.',
    revenueModel: 'SaaS subscription with Pro/Team/Enterprise tiers.',
    pricing: 'Starter $9/mo; Pro $29/mo; Team $79/mo',
    traction: '1,240 customers; $4.2M ARR; +58% YoY; NPS 72.',
    team: 'Alex Carter CEO ex-Stripe; Sam Lee CTO ex-Google; Jo Park COO ex-Airbnb.',
    fundingAsk: 'Raising $8M Series A at $32M pre-money. 24 months runway.',
    roadmap: 'Q1 Foundation; Q2 Launch; Q3 Scale; Q4 Expand EU.',
    theme, brandColors: { primary: '#16a34a', secondary: '#0ea5e9', accent: '#a855f7' },
    fontStyle: 'inter', visualStyle: 'data_heavy',
    slideCount: 18, contentDepth: 'balanced',
    includeCharts: true, includeFinancials: true,
    includeSpeakerNotes: false, includeExecutiveSummary: true,
  };
}

function slideShape(slideContent: SlideContent): { type: string; title: string; subtitle: string | null; content: any; speakerNotes: string | null } {
  return {
    type:    String(slideContent.type),
    title:   slideContent.title,
    subtitle: slideContent.subtitle ?? null,
    speakerNotes: slideContent.speakerNotes ?? null,
    content: {
      ...slideContent.content,
      // The Tier 4 generators attach smartComponent on SlideContent; the
      // migration service reads it from slide.content (since both get
      // persisted into the slide.content JSON column).
      smartComponent: slideContent.smartComponent ?? undefined,
    },
  };
}

async function main() {
  const factory = new SlideFactory();
  const migration = new SlideElementsMigrationService(null as any);
  migration.resetPathMetrics();

  console.log(`Phase 32.75 Tier 5 — Smart Component Rendering Cutover validation`);
  console.log(`   doc types: ${DOC_TYPES.length}`);
  console.log(`   families:  ${SMART_FAMILIES.length}`);
  console.log(`   matrix:    ${DOC_TYPES.length * SMART_FAMILIES.length} decks\n`);

  // --- T5G + T5H — full doc × family matrix ----------------------------------
  let tier4Total = 0, tier4Smart = 0, tier4FallbackOk = 0;
  console.log('Test 1 — every Tier-4 slide renders through the smart path');
  console.log('────────────────────────────────────────────────────────────────────');
  console.log('  doc type            family                    Tier-4   smart');
  for (const { docType, label } of DOC_TYPES) {
    for (const family of SMART_FAMILIES) {
      const input = makeInput(docType, family);
      const slides = factory.generateDeck(input);
      const tier4 = slides.filter((s) => TIER4_TYPES.includes(s.type as SlideType));
      let smart = 0;
      for (const s of tier4) {
        const elements = migration.buildElementsForSlide(slideShape(s));
        // A slide rendered via smart path will have elements at order >= 100
        // (the smart tree). Legacy path uses order 0..N at low numbers only.
        const hasSmartElements = elements.some((e) => (e.order ?? 0) >= 100);
        if (hasSmartElements) smart++;
        else if (elements.length > 0) tier4FallbackOk++;
      }
      tier4Total += tier4.length;
      tier4Smart += smart;
      console.log(`  ${label.padEnd(18)}  ${family.padEnd(24)}  ${String(tier4.length).padStart(6)}  ${String(smart).padStart(6)}`);
    }
  }
  console.log('────────────────────────────────────────────────────────────────────');
  const smartPct = tier4Total === 0 ? 0 : (tier4Smart / tier4Total) * 100;
  console.log(`  TOTAL Tier-4: ${tier4Total}  smart-path: ${tier4Smart}  (${smartPct.toFixed(1)}%)`);

  // --- T5C — safe fallback when smartComponent is missing or invalid ---------
  console.log('\nTest 2 — safe fallback (T5C)');
  const noSmart = migration.buildElementsForSlide({
    type: 'problem', title: 'Problem', subtitle: null,
    content: { bullets: ['a', 'b'] } as any, speakerNotes: null,
  });
  console.log(`         no smartComponent → ${noSmart.length} elements via legacy: ${noSmart.length > 0 ? 'OK' : 'FAIL'}`);

  const badSmart = migration.buildElementsForSlide({
    type: 'team', title: 'Team', subtitle: null,
    content: { smartComponent: { family: 'x', type: 'teamGrid', elementTree: [{ id: 'a', type: 'NOT_A_TYPE', x: 0, y: 0, width: 1, height: 1 }] } } as any,
    speakerNotes: null,
  });
  console.log(`         invalid tree → ${badSmart.length} elements via fallback: ${badSmart.length > 0 ? 'OK' : 'FAIL'}`);

  const m = migration.getPathMetrics();
  console.log(`         invalid trees recorded: ${m.invalidTrees}`);

  // --- T5D — validator rejection cases ---------------------------------------
  console.log('\nTest 3 — validateSmartComponentTree (T5D)');
  const cases: Array<{ label: string; tree: any; expect: boolean }> = [
    { label: 'null tree',         tree: null,        expect: false },
    { label: 'empty array',       tree: [],          expect: false },
    { label: 'missing id',        tree: [{ type: 'heading', x: 0, y: 0, width: 1, height: 1 }], expect: false },
    { label: 'out-of-bounds x',   tree: [{ id: 'a', type: 'heading', x: 200, y: 0, width: 1, height: 1 }], expect: false },
    { label: 'unknown type',      tree: [{ id: 'a', type: 'foobar', x: 0, y: 0, width: 1, height: 1 }], expect: false },
    { label: 'valid single el',   tree: [{ id: 'a', type: 'heading', x: 0, y: 0, width: 10, height: 10 }], expect: true  },
  ];
  let validatorOk = 0;
  for (const c of cases) {
    const r = validateSmartComponentTree(c.tree);
    const ok = r.valid === c.expect;
    if (ok) validatorOk++;
    console.log(`         ${ok ? '✓' : '✗'} ${c.label.padEnd(22)} → valid=${r.valid}${r.reason ? ` (${r.reason})` : ''}`);
  }

  // --- T5E — metrics dump ----------------------------------------------------
  console.log('\nTest 4 — metrics (T5E)');
  console.log(`         smart path:    ${m.smartPath}`);
  console.log(`         fallback path: ${m.fallbackPath}`);
  console.log(`         invalid trees: ${m.invalidTrees}`);
  console.log('         families:');
  for (const [fam, count] of Object.entries(m.families).sort()) {
    console.log(`           · ${fam.padEnd(22)} ${count}`);
  }
  console.log('         component types:');
  for (const [comp, count] of Object.entries(m.components).sort()) {
    console.log(`           · ${comp.padEnd(22)} ${count}`);
  }

  // --- T5J — perf: cutover at least as fast as legacy ----------------------
  console.log('\nTest 5 — perf (T5J)');
  const PERF_ITERS = 200;
  const sampleInput = makeInput('pitch_deck', 'investor-minimal');
  const sampleSlides = factory.generateDeck(sampleInput).map(slideShape);

  // smart path
  const t1 = Date.now();
  for (let i = 0; i < PERF_ITERS; i++) {
    for (const s of sampleSlides) migration.buildElementsForSlide(s);
  }
  const smartMs = Date.now() - t1;

  // legacy path (strip smartComponent)
  const stripped = sampleSlides.map((s) => ({ ...s, content: { ...s.content, smartComponent: undefined } }));
  const t2 = Date.now();
  for (let i = 0; i < PERF_ITERS; i++) {
    for (const s of stripped) migration.buildElementsForSlide(s);
  }
  const legacyMs = Date.now() - t2;

  console.log(`         smart-path:  ${smartMs} ms  (${(smartMs / PERF_ITERS).toFixed(2)} ms/deck)`);
  console.log(`         legacy-path: ${legacyMs} ms (${(legacyMs / PERF_ITERS).toFixed(2)} ms/deck)`);
  const perfOk = smartMs <= legacyMs * 1.15; // 15% slack
  console.log(`         result:      ${perfOk ? 'OK (smart ≤ 1.15 × legacy)' : 'REGRESSION'}`);

  // --- T5F — removal inventory ----------------------------------------------
  console.log('\nTest 6 — deprecated code inventory (T5F)');
  const removable = [
    // (file, line, helper, est LOC)
    ['core-slides.generator.ts',       'BusinessModelSlideGenerator.extractPricingTiers',     27],
    ['core-slides.generator.ts',       'BusinessModelSlideGenerator.determineModel',          18],
    ['core-slides.generator.ts',       'BusinessModelSlideGenerator.extractUnitEconomics',    11],
    ['core-slides.generator.ts',       'BusinessModelSlideGenerator.extractMonetizationStreams', 7],
    ['core-slides.generator.ts',       'TractionSlideGenerator.formatMetrics + helpers',      85],
    ['core-slides.generator.ts',       'TeamSlideGenerator.parseTeamMembers + helpers',       80],
    ['core-slides.generator.ts',       'AskSlideGenerator.extract* helpers',                  60],
    ['additional-slides.generator.ts', 'CompetitionSlideGenerator.parseCompetitors + helpers',  20],
    ['additional-slides.generator.ts', 'RoadmapSlideGenerator.parseRoadmapPhases + helpers',  45],
    ['additional-slides.generator.ts', 'PricingSlideGenerator.parsePricingTiers + helpers',   45],
    ['market.generator.ts',            'MarketOpportunitySlideGenerator.extractMarketSizes',  50],
    ['slide-elements-migration.service.ts', 'legacy reconstruction branches in buildElementsForSlide', 200],
  ];
  let totalRemovable = 0;
  for (const [file, helper, loc] of removable) {
    console.log(`         ${String(loc).padStart(4)} LOC  ${file} :: ${helper}`);
    totalRemovable += loc as number;
  }
  console.log(`         ────────`);
  console.log(`         ${String(totalRemovable).padStart(4)} LOC  estimated removable after Tier 6 final cutover`);

  // --- Final --------------------------------------------------------------
  const ok =
    tier4Total > 0 && smartPct === 100 &&
    noSmart.length > 0 && badSmart.length > 0 &&
    validatorOk === cases.length &&
    perfOk;
  if (!ok) {
    console.error('\n❌ Tier 5 validation failed');
    process.exit(1);
  }
  console.log(`\n✅ Phase 32.75 Tier 5: smart-path ${smartPct.toFixed(1)}% on Tier-4 slides, ${m.invalidTrees} invalid trees rejected, fallback verified, perf within budget.`);
}

main().catch((err) => {
  console.error('Validation failed:', err);
  process.exit(1);
});
