/**
 * Ω.PRODUCTION.BLOCKER.1 — Phase 3: Stress Test
 * Verifies materializePresentationOverflow() with large inputs:
 *   20 team members, 25 roadmap items, 20 pricing tiers,
 *   25 risks, 30 KPIs, 20 market drivers
 * Success criteria: continuation > 0 when overflow exists, lost nodes = 0, retention 100%
 */
import { materializePresentationOverflow } from '../src/generation/presentation-overflow-materializer';
import type { SlideContent } from '../src/generation/slide-types/types';
import { SlideType } from '../src/generation/slide-types/types';

const NOW = '1970-01-01T00:00:00.000Z';
let id = 0;

function makeId() { return `stress-${++id}`; }

function makeSlideWithLedger(
  type: SlideType,
  title: string,
  primaryNodes: Array<{ text: string; sourceType: string }>,
  overflowNodes: Array<{ text: string; sourceType: string; dest: 'continuationSlide' | 'appendixSlide' | 'speakerNotes' }>,
): SlideContent {
  const ledger = {
    renderedNodes: primaryNodes.map((n, i) => ({
      sourceType: n.sourceType,
      sourceIndex: i,
      sourceText: n.text,
      destination: 'primarySlide' as const,
      reason: 'Rendered in primary slide',
    })),
    overflowNodes: overflowNodes.map((n, i) => ({
      sourceType: n.sourceType,
      sourceIndex: primaryNodes.length + i,
      sourceText: n.text,
      destination: n.dest,
      reason: 'Overflow: exceeds primary slide capacity',
    })),
  };

  return {
    type,
    order: 0,
    title,
    subtitle: null,
    content: {},
    layoutKey: 'stress',
    themeKey: 'investor-minimal',
    speakerNotes: null,
    qualityScore: 90,
    smartComponent: {
      family: 'investor-minimal',
      type: 'stress-test',
      elementTree: [
        {
          id: makeId(),
          slideId: '',
          type: 'shape' as any,
          name: 'bg',
          order: 1,
          x: 0, y: 0, width: 100, height: 100,
          rotation: 0, zIndex: -1,
          locked: false, visible: true,
          content: { kind: 'rect', fill: '#fff' },
          data: { contentPreservation: ledger },
          style: null, animations: null, accessibility: null,
          createdAt: NOW, updatedAt: NOW,
        },
      ],
    },
  };
}

// ─── Build stress slides ───────────────────────────────────────────────────

function makeTeamSlide(totalMembers: number): SlideContent {
  const visible = 4;
  const overflow = totalMembers - visible;
  return makeSlideWithLedger(
    SlideType.TEAM,
    'Team',
    Array.from({ length: visible }, (_, i) => ({ text: `Team Member ${i + 1} — CEO / CTO / COO / CFO`, sourceType: 'teamMember' })),
    Array.from({ length: overflow }, (_, i) => ({ text: `Team Member ${visible + i + 1} — VP Engineering`, sourceType: 'teamMember', dest: 'continuationSlide' as const })),
  );
}

function makeRoadmapSlide(totalItems: number): SlideContent {
  const visible = 5;
  const overflow = totalItems - visible;
  return makeSlideWithLedger(
    SlideType.ROADMAP,
    'Roadmap',
    Array.from({ length: visible }, (_, i) => ({ text: `Q${i + 1} 2026: Launch Phase ${i + 1}`, sourceType: 'roadmapMilestone' })),
    Array.from({ length: overflow }, (_, i) => ({ text: `Q${visible + i + 1} 2026: Phase ${visible + i + 1}`, sourceType: 'roadmapMilestone', dest: 'continuationSlide' as const })),
  );
}

function makePricingSlide(totalTiers: number): SlideContent {
  const visible = 3;
  const overflow = totalTiers - visible;
  return makeSlideWithLedger(
    SlideType.BUSINESS_MODEL,
    'Pricing',
    Array.from({ length: visible }, (_, i) => ({ text: `Tier ${i + 1}: $${(i + 1) * 99}/mo`, sourceType: 'pricingTier' })),
    Array.from({ length: overflow }, (_, i) => ({ text: `Tier ${visible + i + 1}: $${(visible + i + 1) * 99}/mo`, sourceType: 'pricingTier', dest: 'appendixSlide' as const })),
  );
}

function makeRisksSlide(totalRisks: number): SlideContent {
  const visible = 4;
  const overflow = totalRisks - visible;
  return makeSlideWithLedger(
    SlideType.RISKS,
    'Risks',
    Array.from({ length: visible }, (_, i) => ({ text: `Risk ${i + 1}: Competitive pressure`, sourceType: 'riskItem' })),
    Array.from({ length: overflow }, (_, i) => ({ text: `Risk ${visible + i + 1}: Regulatory change`, sourceType: 'riskItem', dest: 'appendixSlide' as const })),
  );
}

function makeKpiSlide(totalKpis: number): SlideContent {
  const visible = 4;
  const overflow = totalKpis - visible;
  return makeSlideWithLedger(
    SlideType.TRACTION,
    'KPIs',
    Array.from({ length: visible }, (_, i) => ({ text: `KPI ${i + 1}: ${(i + 1) * 100}K (+${i + 1}0%)`, sourceType: 'kpi' })),
    Array.from({ length: overflow }, (_, i) => ({ text: `KPI ${visible + i + 1}: ${(visible + i + 1) * 100}K (+${visible + i + 1}0%)`, sourceType: 'kpi', dest: 'appendixSlide' as const })),
  );
}

function makeMarketDriversSlide(totalDrivers: number): SlideContent {
  const visible = 4;
  const overflow = totalDrivers - visible;
  return makeSlideWithLedger(
    SlideType.MARKET_OPPORTUNITY,
    'Market Drivers',
    Array.from({ length: visible }, (_, i) => ({ text: `Driver ${i + 1}: AI adoption curve`, sourceType: 'marketDriver' })),
    Array.from({ length: overflow }, (_, i) => ({ text: `Driver ${visible + i + 1}: Cloud migration wave`, sourceType: 'marketDriver', dest: 'speakerNotes' as const })),
  );
}

// ─── Run stress test ───────────────────────────────────────────────────────

const STRESS_CONFIG = {
  teamMembers: 20,
  roadmapItems: 25,
  pricingTiers: 20,
  risks: 25,
  kpis: 30,
  marketDrivers: 20,
};

const slides: SlideContent[] = [
  makeTeamSlide(STRESS_CONFIG.teamMembers),
  makeRoadmapSlide(STRESS_CONFIG.roadmapItems),
  makePricingSlide(STRESS_CONFIG.pricingTiers),
  makeRisksSlide(STRESS_CONFIG.risks),
  makeKpiSlide(STRESS_CONFIG.kpis),
  makeMarketDriversSlide(STRESS_CONFIG.marketDrivers),
];

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('  Ω.PRODUCTION.BLOCKER.1 — Phase 3: Stress Test');
console.log('═══════════════════════════════════════════════════════════════\n');
console.log('Input slides:');
for (const s of slides) {
  const ledger = (s.smartComponent?.elementTree?.[0] as any)?.data?.contentPreservation;
  const overflowCount = ledger?.overflowNodes?.length ?? 0;
  const primaryCount = ledger?.renderedNodes?.length ?? 0;
  console.log(`  ${s.title}: ${primaryCount} primary + ${overflowCount} overflow`);
}

const result = materializePresentationOverflow(slides);

// ─── Verify no node loss ───────────────────────────────────────────────────

let totalInputOverflow = 0;
let totalLost = 0;

for (const inputSlide of slides) {
  const ledger = (inputSlide.smartComponent?.elementTree?.[0] as any)?.data?.contentPreservation;
  const overflowNodes = ledger?.overflowNodes ?? [];
  totalInputOverflow += overflowNodes.length;

  for (const overflowNode of overflowNodes) {
    // Check: is this node's text visible somewhere in the output?
    const outputJson = JSON.stringify(result.slides);
    const found = outputJson.includes(overflowNode.sourceText);
    if (!found) {
      console.error(`  LOST: [${overflowNode.sourceType}] "${overflowNode.sourceText}"`);
      totalLost++;
    }
  }
}

// ─── Report ───────────────────────────────────────────────────────────────

const { materializedCounts } = result;
const PASS = '✅ PASS';
const FAIL = '❌ FAIL';

console.log('\n───────────────────────────────────────────────────────────────');
console.log('  Results');
console.log('───────────────────────────────────────────────────────────────');
console.log(`  Output slides total:     ${result.slides.length}`);
console.log(`  Continuation slides:     ${materializedCounts.continuationSlides}`);
console.log(`  Appendix slides:         ${materializedCounts.appendixSlides}`);
console.log(`  Speaker notes nodes:     ${materializedCounts.speakerNotesNodes}`);
console.log(`  Appendix nodes:          ${materializedCounts.appendixNodes}`);
console.log(`  Total overflow input:    ${totalInputOverflow}`);
console.log(`  Lost nodes:              ${totalLost}`);
console.log(`  Retention:               ${totalInputOverflow > 0 ? (((totalInputOverflow - totalLost) / totalInputOverflow) * 100).toFixed(1) : 100}%`);

console.log('\n───────────────────────────────────────────────────────────────');
console.log('  Criteria');
console.log('───────────────────────────────────────────────────────────────');

const c1 = materializedCounts.continuationSlides > 0;
const c2 = materializedCounts.appendixSlides > 0;
const c3 = materializedCounts.speakerNotesNodes > 0;
const c4 = totalLost === 0;
const allPass = c1 && c2 && c3 && c4;

console.log(`  Continuation slides > 0:  ${c1 ? PASS : FAIL} (got ${materializedCounts.continuationSlides})`);
console.log(`  Appendix slides > 0:      ${c2 ? PASS : FAIL} (got ${materializedCounts.appendixSlides})`);
console.log(`  Speaker notes nodes > 0:  ${c3 ? PASS : FAIL} (got ${materializedCounts.speakerNotesNodes})`);
console.log(`  Lost nodes = 0:           ${c4 ? PASS : FAIL} (lost ${totalLost})`);

console.log('\n═══════════════════════════════════════════════════════════════');
console.log(`  PHASE 3 VERDICT: ${allPass ? '✅ STRESS TEST PASS — NO NODE LOSS' : '❌ STRESS TEST FAIL'}`);
console.log('═══════════════════════════════════════════════════════════════\n');

if (!allPass) process.exit(1);
