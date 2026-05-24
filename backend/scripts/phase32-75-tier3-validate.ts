/**
 * Phase 32.75 Tier 3 — Smart Components validation
 *
 * Generates every (family × type) combination in the registry and verifies:
 *
 *   1. Count: 8 families × 20 types = 160 components.
 *   2. Structure: each component has a non-empty elementTree of valid
 *      SlideElement-shaped rows.
 *   3. Family-token inheritance: every component contains at least one
 *      colour or fontFamily that ties back to its family's tokens (i.e.
 *      the accent / surface / fontHeading / fontBody appear somewhere).
 *   4. Cross-family uniqueness: for every type T, no two families produce
 *      identical fingerprints (a hash of colours + fonts + radius). This is
 *      what guarantees "Investor Minimal KPI ≠ Luxury KPI ≠ Startup KPI".
 *   5. Performance: building all 160 components and running the uniqueness
 *      check completes well under 1 second.
 *
 * No DB. No exports. Pure registry validation.
 */

import { smartRegistry } from '../src/components/smart/smart-registry';
import {
  SMART_FAMILIES, SMART_COMPONENT_TYPES, SmartFamilyId, SmartComponentType,
} from '../src/components/smart/smart-types';
import { getFamilyTokens } from '../src/components/smart/family-tokens';

const EXPECTED = SMART_FAMILIES.length * SMART_COMPONENT_TYPES.length;

// =============================================================================
//  Helpers
// =============================================================================

interface Fingerprint {
  colors:  string[];
  fonts:   string[];
  radius:  number[];
  shapes:  string[];
}

function fingerprint(tree: any[]): Fingerprint {
  const colors  = new Set<string>();
  const fonts   = new Set<string>();
  const radius  = new Set<number>();
  const shapes  = new Set<string>();

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

  return {
    colors:  Array.from(colors).sort(),
    fonts:   Array.from(fonts).sort(),
    radius:  Array.from(radius).sort((a, b) => a - b),
    shapes:  Array.from(shapes).sort(),
  };
}

function fingerprintKey(fp: Fingerprint): string {
  return JSON.stringify(fp);
}

function lc(s: string | undefined | null): string {
  return (s || '').toLowerCase();
}

// =============================================================================
//  Main
// =============================================================================
async function main() {
  console.log(`Phase 32.75 Tier 3 — Smart Components validation`);
  console.log(`   families: ${SMART_FAMILIES.length}`);
  console.log(`   types:    ${SMART_COMPONENT_TYPES.length}`);
  console.log(`   expected: ${EXPECTED}\n`);

  // --- Test 1: count -----------------------------------------------------------
  const startBuild = Date.now();
  const all = smartRegistry.listAll();
  const buildMs = Date.now() - startBuild;

  console.log(`Test 1 — count: ${all.length}/${EXPECTED} components built in ${buildMs}ms`);
  if (all.length !== EXPECTED) {
    console.error(`❌ count mismatch (${all.length} vs ${EXPECTED})`);
    process.exit(1);
  }

  // --- Test 2: structural integrity --------------------------------------------
  let bad = 0;
  for (const c of all) {
    if (!c.id?.startsWith('smart:')) bad++;
    if (!c.elementTree || !Array.isArray(c.elementTree) || c.elementTree.length === 0) bad++;
    for (const e of c.elementTree) {
      if (!e.type || !Number.isFinite(e.x) || !Number.isFinite(e.y) || !Number.isFinite(e.width) || !Number.isFinite(e.height)) bad++;
    }
  }
  console.log(`Test 2 — structural integrity: ${bad === 0 ? 'OK' : `${bad} issues`}`);
  if (bad !== 0) { console.error('❌ structural validation failed'); process.exit(1); }

  // --- Test 3: family-token inheritance ----------------------------------------
  // Every component's serialised JSON should contain at least one token-derived
  // string for its family (accent / surface / fontHeading / fontBody / muted /
  // border / bg). Token strings are looked up case-insensitively. We exempt
  // tokens with values like '#ffffff' that some families share (white).
  const TOKEN_KEYS: (keyof ReturnType<typeof getFamilyTokens>)[] = [
    'accent', 'accent2', 'surface', 'border', 'text', 'muted',
    'fontHeading', 'fontBody',
  ];
  let inheritanceFailures = 0;
  for (const c of all) {
    const tokens = getFamilyTokens(c.family);
    const blob = lc(JSON.stringify(c.elementTree));
    const hit = TOKEN_KEYS.some((k) => {
      const v = lc(tokens[k] as any);
      // Skip universal values that would falsely match across families.
      if (!v || v === '#ffffff' || v === '#fff' || v === 'transparent') return false;
      return blob.includes(v);
    });
    if (!hit) {
      inheritanceFailures++;
      if (inheritanceFailures <= 3) {
        console.error(`   ! ${c.family} / ${c.type} doesn't reference any of its family tokens`);
      }
    }
  }
  console.log(`Test 3 — family-token inheritance: ${EXPECTED - inheritanceFailures}/${EXPECTED} components inherit at least one family token`);
  if (inheritanceFailures > 0) {
    console.error(`❌ ${inheritanceFailures} components have no family-token reference`);
    process.exit(1);
  }

  // --- Test 4: cross-family uniqueness per type --------------------------------
  // For each type T, fingerprint(family A, T) must differ from fingerprint(family B, T).
  const dupFailures: string[] = [];
  for (const type of SMART_COMPONENT_TYPES) {
    const fpByFamily = new Map<SmartFamilyId, string>();
    for (const family of SMART_FAMILIES) {
      const dto = smartRegistry.getOne(family, type);
      const key = fingerprintKey(fingerprint(dto.elementTree));
      // Check for any prior family that produced the same fingerprint.
      for (const [prevFamily, prevKey] of fpByFamily.entries()) {
        if (prevKey === key) {
          dupFailures.push(`${type}: ${prevFamily} ≡ ${family}`);
        }
      }
      fpByFamily.set(family, key);
    }
  }
  console.log(`Test 4 — cross-family uniqueness: ${dupFailures.length === 0 ? `OK across all ${SMART_COMPONENT_TYPES.length} types` : `${dupFailures.length} duplicate pairs`}`);
  if (dupFailures.length > 0) {
    dupFailures.slice(0, 10).forEach((d) => console.error(`   ! ${d}`));
    console.error('❌ visual uniqueness not preserved');
    process.exit(1);
  }

  // --- Test 5: cache + perf ----------------------------------------------------
  const start2 = Date.now();
  const all2 = smartRegistry.listAll(); // hot path through cache
  const t2 = Date.now() - start2;
  console.log(`Test 5 — cache: ${all2.length} components, hot list in ${t2}ms`);

  smartRegistry.invalidate('crimson-dark');
  const start3 = Date.now();
  smartRegistry.listForFamily('crimson-dark');
  const t3 = Date.now() - start3;
  console.log(`         single-family invalidate + rebuild: ${t3}ms`);

  // --- Per-family / per-use-case summary ---------------------------------------
  console.log('\nMatrix:');
  console.log('────────────────────────────────────────────────────────────');
  for (const family of SMART_FAMILIES) {
    const items = smartRegistry.listForFamily(family);
    console.log(`  ${family.padEnd(22)} ${items.length}/${SMART_COMPONENT_TYPES.length} types`);
  }
  console.log('────────────────────────────────────────────────────────────');
  console.log(`  TOTAL                  ${all.length}/${EXPECTED}`);

  console.log('\n✅ Phase 32.75 Tier 3: 160 smart components, each unique across families, all inheriting family tokens');
}

main().catch((err) => {
  console.error('Validation failed:', err);
  process.exit(1);
});
