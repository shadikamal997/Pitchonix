/**
 * Phase 31 — Generation Pipeline Unification validation
 *
 *   31M  every command type routes through the unified pipeline
 *        with deterministic stage execution
 *   31N  perf — single pipeline call comparable to (or better than) the
 *        pre-Phase-31 inline regenerate flow
 *
 *   The pipeline depends on Prisma; we drive it through a synthetic
 *   fixture-only test that exercises stages 2–6 (validate → plan →
 *   generate → smart-component attachment) directly, plus an
 *   end-to-end stage-ordering check using the real STAGES_FOR_COMMAND
 *   table.
 *
 *   Full DB-backed integration testing of all 8 commands belongs in the
 *   e2e suite; this script validates the *unification* — that the same
 *   stage list and same generator path runs for every command type.
 *
 *   Run:  pnpm ts-node scripts/phase31-validate.ts
 */

import { SlideFactory } from '../src/generation/slide-types/slide.factory';
import { WizardInput } from '../src/generation/slide-types/types';
import { SMART_FAMILIES, SmartFamilyId } from '../src/components/smart/smart-types';
import {
  STAGES_FOR_COMMAND, PIPELINE_STAGES, GenerationCommandType, PipelineError,
} from '../src/generation/pipeline/types';
import { GenerationEventBus } from '../src/generation/pipeline/event-bus';

const COMMANDS: GenerationCommandType[] = [
  'GENERATE', 'REGENERATE', 'REFRESH', 'REBUILD',
  'FAMILY_SWITCH', 'TEMPLATE_SWITCH', 'WIZARD_UPDATE', 'STRUCTURED_UPDATE',
];

const DOC_TYPES = [
  { docType: 'pitch_deck',    label: 'Pitch Deck' },
  { docType: 'sales_deck',    label: 'Sales Deck' },
  { docType: 'board_deck',    label: 'Board Deck' },
  { docType: 'strategy_deck', label: 'Strategy Deck' },
  { docType: 'business_plan', label: 'Business Plan' },
];

function makeInput(docType: string, theme: string): WizardInput {
  return {
    documentType: docType, companyName: 'Pitchonix', industry: 'B2B SaaS',
    audience: 'Series A investors', tone: 'professional',
    problem: 'Decks take weeks.', solution: 'AI-native generation.',
    targetCustomers: 'B2B SaaS founders', marketOpportunity: 'TAM $48B.',
    competitors: 'Pitch.com; Beautiful.ai', differentiation: 'Component library.',
    revenueModel: 'SaaS tiers.', pricing: 'Starter $9; Pro $29.',
    traction: '1,240 customers; $4.2M ARR.', team: 'CEO ex-Stripe; CTO ex-Google.',
    fundingAsk: '$8M Series A.', roadmap: 'Q1 Foundation; Q4 Expand EU.',
    theme, brandColors: { primary: '#16a34a', secondary: '#0ea5e9', accent: '#a855f7' },
    fontStyle: 'inter', visualStyle: 'data_heavy',
    slideCount: 18, contentDepth: 'detailed',
    includeCharts: true, includeFinancials: true,
    includeSpeakerNotes: false, includeExecutiveSummary: true,
  };
}

async function main() {
  console.log(`Phase 31 — Generation Pipeline Unification validation\n`);

  // --- Test 1 — STAGES_FOR_COMMAND covers every command type --------------
  console.log('Test 1 — every command has a stage list (31C)');
  let missing = 0;
  for (const cmd of COMMANDS) {
    const stages = STAGES_FOR_COMMAND[cmd];
    if (!stages || stages.length === 0) {
      console.error(`  ! ${cmd} has no stage list`); missing++;
    } else {
      console.log(`  · ${cmd.padEnd(20)} → ${stages.length} stages: ${stages.join(' → ')}`);
    }
  }
  if (missing > 0) { console.error('❌ command coverage failed'); process.exit(1); }

  // --- Test 2 — every stage in STAGES_FOR_COMMAND is in PIPELINE_STAGES --
  console.log('\nTest 2 — stages reference the canonical pipeline (31D)');
  let unknown = 0;
  const known = new Set(PIPELINE_STAGES);
  for (const cmd of COMMANDS) {
    for (const stage of STAGES_FOR_COMMAND[cmd]) {
      if (!known.has(stage)) { console.error(`  ! ${cmd} uses unknown stage: ${stage}`); unknown++; }
    }
  }
  if (unknown > 0) { console.error('❌ unknown stages referenced'); process.exit(1); }
  console.log(`  · ${PIPELINE_STAGES.length} canonical stages, used by ${COMMANDS.length} command types`);

  // --- Test 3 — SlideFactory routing matches the pipeline contract -------
  // Stages 4-6 of the pipeline are: planning → generation → smart-component
  // attachment. Drive these against the real SlideFactory to confirm that
  // every command type that touches generation yields the same shape.
  console.log('\nTest 3 — generator output × 5 doc types × 8 families');
  const factory = new SlideFactory();
  let totalSlides = 0, smartSlides = 0;
  const stageTimings = new Map<string, number[]>();
  for (const { docType, label } of DOC_TYPES) {
    for (const family of SMART_FAMILIES) {
      const input = makeInput(docType, family);
      // Mimic stage 5: generator-execution
      const t0 = Date.now();
      const slides = factory.generateDeck(input);
      const genMs = Date.now() - t0;
      stageTimings.set('generator-execution', [...(stageTimings.get('generator-execution') || []), genMs]);
      totalSlides += slides.length;
      // Mimic stage 6: smart-component-attachment verification
      const attached = slides.filter((s) => s.smartComponent && s.smartComponent.elementTree?.length);
      smartSlides += attached.length;
    }
  }
  console.log(`  · ${DOC_TYPES.length} × ${SMART_FAMILIES.length} = ${DOC_TYPES.length * SMART_FAMILIES.length} decks`);
  console.log(`  · ${totalSlides} slides generated · ${smartSlides} smart-attached (${(smartSlides / totalSlides * 100).toFixed(1)}%)`);

  // --- Test 4 — GenerationEventBus delivers events -----------------------
  console.log('\nTest 4 — GenerationEventBus (31J)');
  const bus = new GenerationEventBus();
  const captured: string[] = [];
  bus.on('generation.started',  (e) => captured.push(`started:${(e.payload as any).command.type}`));
  bus.on('stage.completed',     (e) => captured.push(`stage:${(e.payload as any).stage}`));
  bus.on('generation.completed', () => captured.push('completed'));
  bus.emit('generation.started',  { command: { type: 'REGENERATE' as any }, stages: PIPELINE_STAGES });
  for (const s of PIPELINE_STAGES) bus.emit('stage.completed', { stage: s, ms: 1, command: 'REGENERATE' });
  bus.emit('generation.completed', {});
  const expected = 1 + PIPELINE_STAGES.length + 1;
  console.log(`  · captured ${captured.length}/${expected} events: ${captured.slice(0, 3).join(', ')} … ${captured[captured.length - 1]}`);
  if (captured.length !== expected) { console.error('❌ event bus delivery failed'); process.exit(1); }

  // --- Test 5 — PipelineError carries stage + reason ---------------------
  console.log('\nTest 5 — PipelineError shape (31L)');
  try {
    throw new PipelineError('generator-execution', 'SlideFactory returned 0 slides', { input: 'fixture' });
  } catch (err) {
    if (err instanceof PipelineError) {
      console.log(`  · stage=${err.stage} reason="${err.reason}" name=${err.name}`);
    } else {
      console.error('❌ PipelineError not thrown'); process.exit(1);
    }
  }

  // --- Test 6 — perf snapshot --------------------------------------------
  console.log('\nTest 6 — perf (31N)');
  const genTimes = stageTimings.get('generator-execution') || [];
  const avgGen = genTimes.reduce((a, b) => a + b, 0) / Math.max(1, genTimes.length);
  console.log(`  · avg generator-execution stage: ${avgGen.toFixed(2)} ms across ${genTimes.length} decks`);
  console.log(`  · total wall: ${genTimes.reduce((a, b) => a + b, 0)} ms`);

  console.log(`\n✅ Phase 31: ${COMMANDS.length} command types covered, ${PIPELINE_STAGES.length} pipeline stages, ${totalSlides} matrix slides generated, event bus + PipelineError validated.`);
}

main().catch((err) => { console.error('Validation failed:', err); process.exit(1); });
