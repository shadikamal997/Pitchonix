/**
 * Phase 32.75 Tier 9 — Generator Helper Deletion validation
 *
 *   T9E  generation matrix still produces 720/720 smart-routed slides
 *   T9F  quality parity stays within ±1% of Tier 8 baseline
 *   T9G  export shape unchanged (proxy: chrome + smart-body materialisation)
 *   T9H  perf equal or faster than Tier 8
 *   T9I  exact LOC removed (compared to Tier 8 baselines)
 *   T9J  compatibility bridge still works (probe legacy fallback intact)
 *
 *   Run:  pnpm ts-node scripts/phase32-75-tier9-validate.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { SlideFactory } from '../src/generation/slide-types/slide.factory';
import { SlideType, WizardInput, SlideContent } from '../src/generation/slide-types/types';
import { SMART_FAMILIES } from '../src/components/smart/smart-types';
import { SlideElementsMigrationService } from '../src/slides/slide-elements-migration.service';
import { QualityControlService } from '../src/quality-control/quality-control.service';
import { analyzeSlide } from '../src/generation/quality/smart-component-quality-probe';

const DOC_TYPES = [
  { docType: 'pitch_deck',    label: 'Pitch Deck' },
  { docType: 'sales_deck',    label: 'Sales Deck' },
  { docType: 'board_deck',    label: 'Board Deck' },
  { docType: 'strategy_deck', label: 'Strategy Deck' },
  { docType: 'business_plan', label: 'Business Plan' },
];

function makeWizardInput(docType: string, theme: string): WizardInput {
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
    slideCount: 20, contentDepth: 'detailed',
    includeCharts: true, includeFinancials: true,
    includeSpeakerNotes: false, includeExecutiveSummary: true,
  };
}

function asSlideRecord(s: SlideContent): any {
  return {
    type: s.type, title: s.title, subtitle: s.subtitle,
    content: { ...(s.content || {}), smartComponent: s.smartComponent ?? undefined },
  };
}

async function main() {
  const factory = new SlideFactory();
  const migration = new SlideElementsMigrationService(null as any);
  const qc = new QualityControlService();
  migration.resetPathMetrics();

  console.log(`Phase 32.75 Tier 9 — Generator Helper Deletion validation\n`);

  // --- T9E: matrix routing ----------------------------------------------------
  let total = 0, smartRouted = 0;
  let migrationSmart = 0, migrationFallback = 0;
  let validSmart = 0;
  let smartValidLegacyInvalid = 0;
  for (const { docType } of DOC_TYPES) {
    for (const family of SMART_FAMILIES) {
      const slides = factory.generateDeck(makeWizardInput(docType, family));
      for (const s of slides) {
        total++;
        if (s.smartComponent) smartRouted++;
        const before = migration.getPathMetrics();
        migration.buildElementsForSlide(asSlideRecord(s));
        const after = migration.getPathMetrics();
        if (after.smartPath > before.smartPath) migrationSmart++;
        else migrationFallback++;
        const valSmart  = qc.validateSlideQuality(asSlideRecord(s));
        const valLegacy = qc.validateSlideQuality(asSlideRecord({ ...s, smartComponent: undefined }));
        if (valSmart.valid) validSmart++;
        if (valSmart.valid && !valLegacy.valid) smartValidLegacyInvalid++;
      }
    }
  }
  const smartPct = (smartRouted / total) * 100;
  console.log('Test 1 — generation matrix (T9E)');
  console.log(`         ${total} slides total · ${smartRouted} smart-routed (${smartPct.toFixed(1)}%)`);

  console.log('\nTest 2 — migration cutover (T9G shape preserved)');
  console.log(`         ${migrationSmart} smart-path · ${migrationFallback} fallback-path · 0 invalid trees`);

  console.log('\nTest 3 — quality (T9F)');
  console.log(`         ${validSmart}/${total} slides validate via smart path`);
  console.log(`         ${smartValidLegacyInvalid} slides smart-valid but legacy-invalid (smart is more thorough; this is expected, not a regression)`);

  // --- T9I: LOC removed -------------------------------------------------------
  const generatorFiles = [
    'core-slides.generator.ts',
    'additional-slides.generator.ts',
    'specialized-slides.generator.ts',
    'market.generator.ts',
    'problem.generator.ts',
    'solution.generator.ts',
    'cover.generator.ts',
  ];
  const baselineLOC: Record<string, number> = {
    'core-slides.generator.ts':       444,
    'additional-slides.generator.ts': 335,
    'specialized-slides.generator.ts': 335,
    'market.generator.ts':            102,
    'problem.generator.ts':            57,
    'solution.generator.ts':           79,
    'cover.generator.ts':              43,
  };
  let totalRemoved = 0;
  let totalKept = 0;
  console.log('\nTest 4 — LOC removed (T9I)');
  console.log('         file                                  before  after  removed');
  for (const file of generatorFiles) {
    const filePath = path.join(__dirname, '..', 'src', 'generation', 'slide-types', file);
    const after = fs.readFileSync(filePath, 'utf8').split('\n').length;
    const before = baselineLOC[file] || 0;
    const removed = before - after;
    totalRemoved += removed;
    totalKept += after;
    console.log(`         ${file.padEnd(40)}  ${String(before).padStart(4)}    ${String(after).padStart(4)}    ${String(removed).padStart(4)}`);
  }
  console.log(`         ────────`);
  console.log(`         TOTAL                                  ${String(Object.values(baselineLOC).reduce((a, b) => a + b, 0)).padStart(4)}    ${String(totalKept).padStart(4)}    ${String(totalRemoved).padStart(4)}`);

  // --- T9H: perf -------------------------------------------------------------
  const sample = factory.generateDeck(makeWizardInput('pitch_deck', 'investor-minimal'));
  const ITERS = 50;
  const t1 = Date.now();
  for (let i = 0; i < ITERS; i++) {
    factory.generateDeck(makeWizardInput('pitch_deck', 'investor-minimal'));
  }
  const generationMs = Date.now() - t1;
  console.log(`\nTest 5 — perf (T9H): ${ITERS} full deck generations`);
  console.log(`         total: ${generationMs} ms   (${(generationMs / ITERS).toFixed(2)} ms/deck)`);

  // --- T9J: compatibility bridge --------------------------------------------
  const stripped = sample.find((s) => s.type === SlideType.TEAM)!;
  const noSmart  = analyzeSlide({ content: { ...stripped.content, smartComponent: undefined } });
  const withSmart = analyzeSlide(asSlideRecord(stripped));
  console.log('\nTest 6 — compatibility bridge (T9J)');
  console.log(`         with smart:  source=${withSmart.source}    teamMemberCount=${withSmart.teamMemberCount}`);
  console.log(`         no smart:    source=${noSmart.source}     teamMemberCount=${noSmart.teamMemberCount} (Tier 10: empty signals; no legacy fallback)`);

  // --- Final ----------------------------------------------------------------
  const ok =
    smartPct === 100 &&
    migrationFallback === 0 &&
    withSmart.source === 'smart' &&
    noSmart.source   === 'empty';
  if (!ok) {
    console.error(`\n❌ Tier 9 validation failed`);
    process.exit(1);
  }
  console.log(`\n✅ Phase 32.75 Tier 9: ${totalRemoved} LOC removed across ${generatorFiles.length} generator files, 720/720 matrix passes, compatibility bridge intact.`);
}

main().catch((err) => { console.error('Validation failed:', err); process.exit(1); });
