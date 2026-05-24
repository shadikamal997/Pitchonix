/**
 * Phase 32.75 Tier 6 — Complete Smart Component Coverage validation
 *
 *   T6L  every family produces every smart-component type (30 × 8 = 240)
 *   T6L  uniqueness fingerprint across families per type
 *   T6L  family-token inheritance for every new component
 *   T6M  5 doc types × 8 families: every generator routes through smart path
 *   T6N  legacy elimination audit + cumulative LOC removable
 *   T6O  performance does not regress vs. Tier 5
 *
 *   Run:  pnpm ts-node scripts/phase32-75-tier6-validate.ts
 */

import { smartRegistry } from '../src/components/smart/smart-registry';
import {
  SMART_FAMILIES, SMART_COMPONENT_TYPES,
  SmartFamilyId, SmartComponentType,
} from '../src/components/smart/smart-types';
import { getFamilyTokens } from '../src/components/smart/family-tokens';
import { SlideFactory } from '../src/generation/slide-types/slide.factory';
import { SlideType, WizardInput, SlideContent } from '../src/generation/slide-types/types';
import { SlideElementsMigrationService } from '../src/slides/slide-elements-migration.service';

const TIER6_TYPES: SmartComponentType[] = [
  'coverCard', 'executiveSummary', 'narrativeBlock', 'visionBlock',
  'financialDashboard', 'caseStudyBlock', 'companyOverviewBlock',
  'heroStatement', 'problemStatement', 'solutionStatement',
];

const DOC_TYPES = [
  { docType: 'pitch_deck',    label: 'Pitch Deck' },
  { docType: 'sales_deck',    label: 'Sales Deck' },
  { docType: 'board_deck',    label: 'Board Deck' },
  { docType: 'strategy_deck', label: 'Strategy Deck' },
  { docType: 'business_plan', label: 'Business Plan' },
];

// =============================================================================
//  Fingerprint helpers (Tier 3 validator pattern)
// =============================================================================
function fingerprint(tree: any[]): string {
  const colors  = new Set<string>(), fonts = new Set<string>();
  const radius  = new Set<number>(), shapes = new Set<string>();
  const visit = (v: any) => {
    if (!v || typeof v !== 'object') return;
    if (typeof v.fill === 'string')        colors.add(v.fill);
    if (typeof v.stroke === 'string')      colors.add(v.stroke);
    if (typeof v.color === 'string')       colors.add(v.color);
    if (typeof v.fontFamily === 'string')  fonts.add(v.fontFamily);
    if (typeof v.borderRadius === 'number') radius.add(v.borderRadius);
    if (typeof v.kind === 'string')        shapes.add(v.kind);
    if (Array.isArray(v)) v.forEach(visit);
    else for (const k of Object.keys(v)) visit(v[k]);
  };
  tree.forEach(visit);
  return JSON.stringify({
    colors: [...colors].sort(), fonts: [...fonts].sort(),
    radius: [...radius].sort((a, b) => a - b), shapes: [...shapes].sort(),
  });
}

function lc(s: string | undefined | null) { return (s || '').toLowerCase(); }

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

function slideShape(s: SlideContent) {
  return {
    type: String(s.type), title: s.title, subtitle: s.subtitle ?? null,
    speakerNotes: s.speakerNotes ?? null,
    content: { ...s.content, smartComponent: s.smartComponent ?? undefined },
  };
}

// =============================================================================
//  Main
// =============================================================================
async function main() {
  console.log(`Phase 32.75 Tier 6 — Complete Smart Component Coverage validation\n`);

  // --- T6L (a): count + structure for the registry --------------------------
  const all = smartRegistry.listAll();
  const expectedCount = SMART_FAMILIES.length * SMART_COMPONENT_TYPES.length;
  console.log(`Test 1 — registry count: ${all.length}/${expectedCount} (${SMART_FAMILIES.length} families × ${SMART_COMPONENT_TYPES.length} types)`);
  if (all.length !== expectedCount) { console.error('❌ count mismatch'); process.exit(1); }

  let badStruct = 0;
  for (const c of all) {
    if (!c.elementTree || !Array.isArray(c.elementTree) || c.elementTree.length === 0) badStruct++;
    for (const e of c.elementTree) {
      if (!e.type || !Number.isFinite(e.x) || !Number.isFinite(e.y) ||
          !Number.isFinite(e.width) || !Number.isFinite(e.height)) badStruct++;
    }
  }
  console.log(`Test 2 — structural integrity: ${badStruct === 0 ? 'OK' : `${badStruct} issues`}`);
  if (badStruct !== 0) { console.error('❌ structural validation failed'); process.exit(1); }

  // --- T6L (b): family-token inheritance for ALL 30 types -------------------
  const TOKEN_KEYS: (keyof ReturnType<typeof getFamilyTokens>)[] = [
    'accent', 'accent2', 'surface', 'border', 'text', 'muted', 'fontHeading', 'fontBody',
  ];
  let inhFail = 0;
  for (const c of all) {
    const tokens = getFamilyTokens(c.family);
    const blob = lc(JSON.stringify(c.elementTree));
    const hit = TOKEN_KEYS.some((k) => {
      const v = lc(tokens[k] as any);
      if (!v || v === '#ffffff' || v === '#fff' || v === 'transparent') return false;
      return blob.includes(v);
    });
    if (!hit) { inhFail++; if (inhFail <= 3) console.error(`   ! ${c.family} / ${c.type} doesn't reference any family token`); }
  }
  console.log(`Test 3 — family-token inheritance: ${expectedCount - inhFail}/${expectedCount}`);
  if (inhFail > 0) { console.error('❌ inheritance failed'); process.exit(1); }

  // --- T6L (c): cross-family uniqueness across ALL types --------------------
  const dups: string[] = [];
  for (const type of SMART_COMPONENT_TYPES) {
    const seen = new Map<string, SmartFamilyId>();
    for (const family of SMART_FAMILIES) {
      const dto = smartRegistry.getOne(family, type);
      const key = fingerprint(dto.elementTree);
      const prev = seen.get(key);
      if (prev) dups.push(`${type}: ${prev} ≡ ${family}`);
      seen.set(key, family);
    }
  }
  console.log(`Test 4 — cross-family uniqueness: ${dups.length === 0 ? 'OK' : `${dups.length} duplicate pairs`}`);
  if (dups.length > 0) { dups.slice(0, 10).forEach((d) => console.error(`   ! ${d}`)); process.exit(1); }

  // --- T6M: every generator routes through the smart path -------------------
  const factory = new SlideFactory();
  const migration = new SlideElementsMigrationService(null as any);
  migration.resetPathMetrics();

  let totalGeneratorSlides = 0;
  let smartRouted = 0;
  const generatorTypesSeen = new Set<string>();
  const generatorTypesRouted = new Set<string>();
  const familyHits = new Map<string, number>();

  console.log(`\nTest 5 — generation routing (T6M)`);
  console.log('────────────────────────────────────────────────────────────────────');
  console.log('  doc type            family                       slides  smart');

  for (const { docType, label } of DOC_TYPES) {
    for (const family of SMART_FAMILIES) {
      const input = makeWizardInput(docType, family);
      const slides = factory.generateDeck(input);
      let routed = 0;
      for (const s of slides) {
        generatorTypesSeen.add(String(s.type));
        if (s.smartComponent) {
          generatorTypesRouted.add(String(s.type));
          familyHits.set(s.smartComponent.family, (familyHits.get(s.smartComponent.family) || 0) + 1);
          routed++;
        }
      }
      totalGeneratorSlides += slides.length;
      smartRouted += routed;
      console.log(`  ${label.padEnd(18)}  ${family.padEnd(24)}  ${String(slides.length).padStart(6)}  ${String(routed).padStart(6)}`);
    }
  }
  console.log('────────────────────────────────────────────────────────────────────');
  const coverage = totalGeneratorSlides === 0 ? 0 : (smartRouted / totalGeneratorSlides) * 100;
  console.log(`  TOTAL slides:    ${totalGeneratorSlides}   smart-routed: ${smartRouted}   coverage: ${coverage.toFixed(1)}%`);
  console.log(`  generator types seen:    ${generatorTypesSeen.size}`);
  console.log(`  generator types routed:  ${generatorTypesRouted.size}`);

  // --- T6M (b): migration service runs every slide through smart path -----
  let migrationSmart = 0, migrationFallback = 0;
  const tier4plus6Types = new Set([
    SlideType.ROADMAP, SlideType.PRICING, SlideType.BUSINESS_MODEL,
    SlideType.TEAM, SlideType.MARKET_OPPORTUNITY, SlideType.ASK,
    SlideType.COMPETITION, SlideType.TRACTION,
    SlideType.COVER, SlideType.PROBLEM, SlideType.SOLUTION,
    SlideType.EXECUTIVE_SUMMARY, SlideType.PRODUCT_FEATURES, SlideType.VISION,
    SlideType.GO_TO_MARKET, SlideType.FINANCIALS, SlideType.CASE_STUDY,
    SlideType.COMPANY_OVERVIEW,
  ]);
  for (const { docType } of DOC_TYPES) {
    for (const family of SMART_FAMILIES) {
      const slides = factory.generateDeck(makeWizardInput(docType, family));
      for (const s of slides) {
        if (!tier4plus6Types.has(s.type as SlideType)) continue;
        const elements = migration.buildElementsForSlide(slideShape(s));
        const used = elements.some((e) => (e.order ?? 0) >= 100); // smart path uses high order
        if (used) migrationSmart++; else migrationFallback++;
      }
    }
  }
  const cutoverPct = (migrationSmart / (migrationSmart + migrationFallback)) * 100;
  console.log(`\nTest 6 — migration cutover (T6M b): ${migrationSmart} smart / ${migrationFallback} fallback  ⇒  ${cutoverPct.toFixed(1)}% smart`);

  // --- T6O — perf (vs. Tier 5) -------------------------------------------
  const sample = factory.generateDeck(makeWizardInput('pitch_deck', 'investor-minimal')).map(slideShape);
  const ITERS = 200;
  const t1 = Date.now();
  for (let i = 0; i < ITERS; i++) for (const s of sample) migration.buildElementsForSlide(s);
  const smartMs = Date.now() - t1;

  const stripped = sample.map((s) => ({ ...s, content: { ...s.content, smartComponent: undefined } }));
  const t2 = Date.now();
  for (let i = 0; i < ITERS; i++) for (const s of stripped) migration.buildElementsForSlide(s);
  const legacyMs = Date.now() - t2;
  console.log(`\nTest 7 — perf (T6O): smart-path ${smartMs} ms / legacy ${legacyMs} ms over ${ITERS} iters`);
  const perfOk = smartMs <= legacyMs * 1.15;
  console.log(`         result: ${perfOk ? 'OK (within 15%)' : 'REGRESSION'}`);

  // --- T6N — legacy elimination audit ------------------------------------
  console.log(`\nTest 8 — legacy elimination audit (T6N)`);
  const removable: Array<[string, string, number]> = [
    // (file, item, est LOC)
    // Tier 5 already accounted for
    ['core-slides.generator.ts',        'TIER 4 + 6 helper graveyard',          290],
    ['additional-slides.generator.ts',  'TIER 4 + 6 helper graveyard',          150],
    ['market.generator.ts',             'extractMarketSizes + helpers',          50],
    ['specialized-slides.generator.ts', 'GTM / Financials / CaseStudy / Company helpers (Tier 6)', 320],
    ['cover.generator.ts',              'manual cover layout',                   20],
    ['problem.generator.ts',            'pain-point extraction',                 30],
    ['solution.generator.ts',           'value-prop extraction',                 50],
    ['slide-elements-migration.service.ts', 'legacy reconstruction (fallback only)', 200],
  ];
  let totalRemovable = 0;
  for (const [file, item, loc] of removable) {
    console.log(`         ${String(loc).padStart(4)} LOC  ${file} :: ${item}`);
    totalRemovable += loc;
  }
  console.log(`         ────────`);
  console.log(`         ${String(totalRemovable).padStart(4)} LOC  estimated total removable after Tier 7 cleanup`);

  // --- Family-by-family stats -----------------------------------------------
  console.log(`\nFamily distribution (smart-routed slides):`);
  for (const [fam, hits] of Array.from(familyHits.entries()).sort()) {
    console.log(`  · ${fam.padEnd(24)} ${hits} slides`);
  }

  // --- Final --------------------------------------------------------------
  const ok = coverage === 100 && inhFail === 0 && dups.length === 0 && badStruct === 0 && perfOk && cutoverPct === 100;
  if (!ok) {
    console.error(`\n❌ Tier 6 validation failed (coverage=${coverage.toFixed(1)}%, cutover=${cutoverPct.toFixed(1)}%, perfOk=${perfOk})`);
    process.exit(1);
  }
  console.log(`\n✅ Phase 32.75 Tier 6: ${all.length} smart components, 100% generator coverage (${smartRouted}/${totalGeneratorSlides} slides), 100% migration cutover, perf within budget.`);
}

main().catch((err) => { console.error('Validation failed:', err); process.exit(1); });
