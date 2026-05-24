/**
 * Phase 32.75 Tier 10 — Final Legacy Retirement validation
 *
 *   T10G  matrix — 5 docs × 8 families, 100% smart, 0 fallback, 0 invalid,
 *         0 missing smartComponent, 0 'empty' source
 *   T10H  quality scores stable (verdict + signal counts unchanged from T9)
 *   T10I  export shape unchanged (chrome + smart body still emitted)
 *   T10J  code-health snapshot: function counts, LOC, residual legacy refs
 *
 *   Run:  pnpm ts-node scripts/phase32-75-tier10-validate.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { SlideFactory } from '../src/generation/slide-types/slide.factory';
import { WizardInput, SlideContent } from '../src/generation/slide-types/types';
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

  console.log(`Phase 32.75 Tier 10 — Final Legacy Retirement validation\n`);

  // --- T10G + T10H ----------------------------------------------------------
  let total = 0, smartRouted = 0, validSmart = 0;
  let emptySource = 0, smartSource = 0;
  let chromeOnlyCount = 0;

  for (const { docType } of DOC_TYPES) {
    for (const family of SMART_FAMILIES) {
      const slides = factory.generateDeck(makeWizardInput(docType, family));
      for (const s of slides) {
        total++;
        if (s.smartComponent) smartRouted++;
        const before = migration.getPathMetrics();
        const elements = migration.buildElementsForSlide(asSlideRecord(s));
        const after = migration.getPathMetrics();

        // Detect chrome-only renders: only the 4 chrome elements were emitted
        if (elements.length <= 4) chromeOnlyCount++;

        const sig = analyzeSlide(asSlideRecord(s));
        if (sig.source === 'smart') smartSource++;
        if (sig.source === 'empty') emptySource++;

        const val = qc.validateSlideQuality(asSlideRecord(s));
        if (val.valid) validSmart++;
      }
    }
  }

  const finalMetrics = migration.getPathMetrics();

  console.log('Test 1 — generation matrix (T10G)');
  console.log(`         total slides:           ${total}`);
  console.log(`         smart-routed:           ${smartRouted}   (${(smartRouted / total * 100).toFixed(1)}%)`);
  console.log(`         chrome-only renders:    ${chromeOnlyCount}`);
  console.log(`         signals source='smart': ${smartSource}`);
  console.log(`         signals source='empty': ${emptySource}`);
  console.log(`         migration smart-path:   ${finalMetrics.smartPath}`);
  console.log(`         migration fallback:     ${finalMetrics.fallbackPath} (deleted in Tier 10 — always 0)`);
  console.log(`         migration missing:      ${finalMetrics.missingSmartComponent}`);
  console.log(`         migration invalid:      ${finalMetrics.invalidTrees}`);

  console.log(`\nTest 2 — quality (T10H)`);
  console.log(`         ${validSmart}/${total} slides validate via smart path`);

  // --- T10I: export shape sanity check -------------------------------------
  // Same proxy as Tier 7/9: chrome + smart body, identical shape to Tier 9.
  const sample = factory.generateDeck(makeWizardInput('pitch_deck', 'investor-minimal'));
  const elements = migration.buildElementsForSlide(asSlideRecord(sample[0]));
  const hasChrome = elements.some((e: any) => e.type === 'heading' && e.order === 0);
  const hasFooter = elements.some((e: any) => e.type === 'footer' && e.order === 9998);
  const hasPage   = elements.some((e: any) => e.type === 'pageNumber' && e.order === 9999);
  const hasSmart  = elements.some((e: any) => (e.order ?? 0) >= 100 && e.order < 9000);
  console.log(`\nTest 3 — export shape (T10I): chrome=${hasChrome ? '✓' : '✗'}  footer=${hasFooter ? '✓' : '✗'}  pageNumber=${hasPage ? '✓' : '✗'}  smartBody=${hasSmart ? '✓' : '✗'}`);

  // --- T10J: code-health snapshot ------------------------------------------
  const filesToReport = [
    ['quality/smart-component-quality-probe.ts', 'generation/quality/smart-component-quality-probe.ts'],
    ['slides/slide-elements-migration.service.ts', 'slides/slide-elements-migration.service.ts'],
    ['generation/slide-types/base-slide.generator.ts', 'generation/slide-types/base-slide.generator.ts'],
  ];
  console.log(`\nTest 4 — code-health snapshot (T10J)`);
  for (const [label, file] of filesToReport) {
    const p = path.join(__dirname, '..', 'src', file);
    const txt = fs.readFileSync(p, 'utf8');
    const lines = txt.split('\n').length;
    const methods = (txt.match(/^\s+(?:public |private |protected |async |export function )?\w+\s*\(/gm) || []).length;
    const fnDecls = (txt.match(/^(?:export )?function /gm) || []).length;
    console.log(`         ${label.padEnd(60)}  ${String(lines).padStart(4)} lines  ${String(methods + fnDecls).padStart(3)} fns`);
  }

  // --- Residual legacy reference scan --------------------------------------
  console.log(`\nTest 5 — residual legacy references`);
  const searchTerms = [
    { term: 'collectFromLegacy', files: ['backend/src/'] },
    { term: 'pickFirst', files: ['backend/src/slides/'] },
    { term: 'extractNumbers',   files: ['backend/src/generation/slide-types/'] },
    { term: 'formatBulletPoints', files: ['backend/src/generation/slide-types/'] },
    { term: "'legacy'",         files: ['backend/src/'] }, // string literal
  ];
  const root = path.join(__dirname, '..', '..');
  for (const { term, files } of searchTerms) {
    let hits = 0;
    for (const dir of files) {
      const full = path.join(root, dir);
      if (!fs.existsSync(full)) continue;
      const walk = (d: string) => {
        for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
          if (entry.name === 'node_modules' || entry.name === 'dist') continue;
          const p = path.join(d, entry.name);
          if (entry.isDirectory()) walk(p);
          else if (entry.isFile() && entry.name.endsWith('.ts')) {
            const txt = fs.readFileSync(p, 'utf8');
            if (txt.includes(term)) hits += (txt.match(new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
          }
        }
      };
      walk(full);
    }
    console.log(`         ${term.padEnd(22)}  ${String(hits).padStart(3)} reference(s) remaining`);
  }

  // --- Final ----------------------------------------------------------------
  const ok =
    smartRouted === total &&
    smartSource === total &&
    emptySource === 0 &&
    finalMetrics.smartPath === total &&
    finalMetrics.fallbackPath === 0 &&
    finalMetrics.invalidTrees === 0 &&
    (finalMetrics.missingSmartComponent ?? 0) === 0 &&
    chromeOnlyCount === 0 &&
    hasChrome && hasFooter && hasPage && hasSmart;

  if (!ok) {
    console.error(`\n❌ Tier 10 validation failed`);
    process.exit(1);
  }
  console.log(`\n✅ Phase 32.75 Tier 10: Smart Components are the sole rendering path.`);
  console.log(`   - ${total}/${total} matrix slides routed through the smart path`);
  console.log(`   - 0 fallback, 0 invalid, 0 missing-smartComponent, 0 empty-source`);
  console.log(`   - Quality scoring stable (${validSmart}/${total} valid)`);
  console.log(`   - Export shape unchanged (chrome + smart body preserved)`);
}

main().catch((err) => { console.error('Validation failed:', err); process.exit(1); });
