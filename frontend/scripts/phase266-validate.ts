/**
 * Phase 26.6 — Real-deck narrative validation
 *
 * Loads JSON dumps produced by psql in /tmp/decks/ and runs the deck-level
 * analyzers against them. Outputs a console summary + a JSON report.
 *
 * Each input file has shape:
 *   { deck: { id, title, ... }, slides: [{ id, type, title, subtitle, order, elements: [...] }] }
 */

import * as fs from 'fs';
import * as path from 'path';
import { analyzeDeck, type DeckSlideInput } from '../features/slide-editor/templates/composition/deck-context';
import { analyzeContent } from '../features/slide-editor/templates/composition/content-analyzer';
import { selectBestVariant } from '../features/slide-editor/templates/composition/layout-scorer';
import { findAllVariants } from '../features/slide-editor/templates/composition/types';
import { findCompositionFamily } from '../features/slide-editor/templates/composition/registry';

const FAMILIES = [
  'crimson-dark-business',
  'investor-minimal',
  'editorial-report',
  'startup-gradient',
  'luxury-dark',
  'corporate-monochrome',
  'light-blue-business-marketing',
  'soft-geometric-blue',
];

const DECKS_DIR = '/tmp/decks';

function pad(n: number, width = 4): string { return String(n).padStart(width); }

function dominantIntent(plan: any): string {
  const counts: Record<string, number> = plan.fatigue.intentCount;
  let best = ''; let bestN = -1;
  for (const [k, v] of Object.entries(counts)) {
    if ((v as number) > bestN) { best = k; bestN = v as number; }
  }
  return `${best || '?'} (${bestN})`;
}

function main() {
  const files = fs.readdirSync(DECKS_DIR).filter((f) => f.endsWith('.json'));
  console.log(`\nFound ${files.length} deck dumps in ${DECKS_DIR}\n`);

  const reportRows: any[] = [];

  for (const f of files) {
    const blob   = JSON.parse(fs.readFileSync(path.join(DECKS_DIR, f), 'utf8'));
    const deck   = blob.deck;
    const slides = blob.slides as any[];

    const slideInputs: DeckSlideInput[] = slides.map((s) => ({
      slideType: s.type,
      title:     s.title,
      elements:  (s.elements || []) as any,
    }));

    console.log(`\n▌ ${deck.title}  (${deck.id.slice(0, 8)})  ·  ${slides.length} slides`);
    console.log(`  Types: ${slideInputs.map((s) => s.slideType).join(' → ')}`);
    console.log(`  ${'family'.padEnd(32)}  score  pace  dens  div   prog  rep   flow  inv   err warn fatHi denseHot  topIntent`);

    for (const familyId of FAMILIES) {
      const plan = analyzeDeck(slideInputs, familyId);
      const row = {
        deckId:        deck.id,
        deckTitle:     deck.title,
        slideCount:    slides.length,
        family:        familyId,
        narrativeType: plan.profile.narrativeType,
        storyStructure: plan.profile.storyStructure,
        score:         Math.round(plan.quality.total),
        pacing:        Math.round(plan.quality.pacingScore),
        density:       Math.round(plan.quality.densityBalanceScore),
        diversity:     Math.round(plan.quality.visualDiversityScore),
        progression:   Math.round(plan.quality.progressionScore),
        repetition:    Math.round(plan.quality.repetitionScore),
        flow:          Math.round(plan.quality.informationFlowScore),
        investor:      Math.round(plan.quality.investorReadinessScore),
        avgDensity:    Math.round(plan.profile.avgDensity),
        avgIntensity:  Math.round(plan.profile.avgIntensity),
        issuesErr:     plan.validation.summary.error,
        issuesWarn:    plan.validation.summary.warn,
        fatigueHigh:   plan.fatigue.highFatigueIndices.length,
        densityRuns:   plan.density.hotspots.length,
        topIntent:     dominantIntent(plan),
        roleSequence:  plan.profile.nodes.map((n) => n.role).join(' → '),
        intentSequence: plan.profile.nodes.map((n) => n.profile.recommendedLayoutIntent).join(' / '),
        strengths:     plan.quality.strengths,
        weaknesses:    plan.quality.weaknesses,
        issues:        plan.validation.issues.slice(0, 8).map((i) => `${i.severity}:${i.code}:${i.message}`),
      };
      reportRows.push(row);
      console.log(`  ${familyId.padEnd(32)}  ${pad(row.score, 5)}  ${pad(row.pacing)}  ${pad(row.density)}  ${pad(row.diversity)}  ${pad(row.progression)}  ${pad(row.repetition)}  ${pad(row.flow)}  ${pad(row.investor)}  ${pad(row.issuesErr)}  ${pad(row.issuesWarn)}  ${pad(row.fatigueHigh, 5)}  ${pad(row.densityRuns, 8)}  ${row.topIntent}`);
    }

    const sample = reportRows[reportRows.length - FAMILIES.length];
    console.log(`  Roles  : ${sample.roleSequence}`);
    console.log(`  Type   : ${sample.narrativeType} · Structure: ${sample.storyStructure}`);
  }

  // Aggregate stats
  console.log('\n\n══════════════════════════════════════════════════════════════════════');
  console.log('  AGGREGATE: avg narrative score per family across all real decks');
  console.log('══════════════════════════════════════════════════════════════════════\n');

  const byFamily: Record<string, number[]> = {};
  for (const r of reportRows) {
    (byFamily[r.family] ??= []).push(r.score);
  }
  console.log(`  ${'family'.padEnd(32)}  avg  min  max  decks`);
  for (const [fam, scores] of Object.entries(byFamily)) {
    const avg = Math.round(scores.reduce((s, v) => s + v, 0) / scores.length);
    const min = Math.min(...scores);
    const max = Math.max(...scores);
    console.log(`  ${fam.padEnd(32)}  ${pad(avg, 3)}  ${pad(min, 3)}  ${pad(max, 3)}  ${pad(scores.length, 4)}`);
  }

  // Issue distribution
  const issueCounts: Record<string, number> = {};
  for (const r of reportRows) {
    for (const iss of r.issues as string[]) {
      const parts = iss.split(':');
      const code = parts[1] || parts[0];
      issueCounts[code] = (issueCounts[code] ?? 0) + 1;
    }
  }
  console.log('\n  Validation issue codes:');
  for (const [code, count] of Object.entries(issueCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${code.padEnd(36)}  ${count}`);
  }

  // Demonstrate layout-decision change due to deck-level context (Phase 26D)
  console.log('\n══════════════════════════════════════════════════════════════════════');
  console.log('  LAYOUT-DECISION CHANGE EXAMPLE (Phase 26D narrativeBias in action)');
  console.log('══════════════════════════════════════════════════════════════════════\n');
  if (files.length > 0) runLayoutDecisionExample(files[0]);

  fs.writeFileSync('/tmp/phase266-validation.json', JSON.stringify(reportRows, null, 2));
  console.log(`\nFull JSON report: /tmp/phase266-validation.json (${reportRows.length} rows)\n`);
}

function runLayoutDecisionExample(firstFile: string) {
  const family = findCompositionFamily('crimson-dark-business');
  if (!family) {
    console.log('  (skipped — crimson-dark-business family not in registry)');
    return;
  }

  const blob = JSON.parse(fs.readFileSync(path.join(DECKS_DIR, firstFile), 'utf8'));
  const slides = blob.slides;
  const slideInputs: DeckSlideInput[] = slides.map((s: any) => ({
    slideType: s.type, title: s.title, elements: s.elements || [],
  }));
  const plan = analyzeDeck(slideInputs, family.id);

  let foundFlip = false;
  for (let i = 0; i < slides.length; i++) {
    const slideType = slides[i].type;
    const candidates = findAllVariants(family, slideType);
    if (candidates.length < 2) continue;

    const profile = analyzeContent(slides[i].elements || []);
    const withoutCtx = selectBestVariant(candidates, profile, family.id);
    const withCtx    = selectBestVariant(candidates, profile, family.id, plan.slides[i]);

    const flipped = withoutCtx.chosen.layoutIntent !== withCtx.chosen.layoutIntent;
    const anyNarrativeBias = withCtx.scores.some((s) => s.breakdown.narrativeBias !== 0);

    if (!flipped && !anyNarrativeBias) continue;
    foundFlip = foundFlip || flipped;

    console.log(`  Slide ${i + 1} (${slideType}) — ${candidates.length} candidates`);
    console.log(`    Without deckContext → ${withoutCtx.chosen.layoutIntent}`);
    console.log(`    With deckContext    → ${withCtx.chosen.layoutIntent}${flipped ? '    ← FLIPPED by narrativeBias' : ''}`);
    console.log(`    Per-variant scores: (intent | base→ctx | narrativeBias)`);
    for (let k = 0; k < withoutCtx.scores.length; k++) {
      const a = withoutCtx.scores[k];
      const b = withCtx.scores[k];
      console.log(`      ${(a.layoutIntent ?? '?').padEnd(24)}  ${pad(a.score, 5)} → ${pad(b.score, 5)}  bias=${b.breakdown.narrativeBias > 0 ? '+' : ''}${b.breakdown.narrativeBias}`);
    }
    console.log();
    if (foundFlip) return;
  }

  if (!foundFlip) console.log('  (no slide had a ranking flip — but narrativeBias is non-zero on several slides)');
}

main();
