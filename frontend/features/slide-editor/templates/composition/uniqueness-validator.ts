// =============================================================================
//  Phase 22F — Template Uniqueness Validator
//
//  Compares slot geometries across template families for each slide type.
//  If two families have >80% identical slot coordinates for the same slide
//  type, they are flagged as not structurally unique.
//
//  Usage (Node/ts-node):
//    npx ts-node --project tsconfig.json \
//      frontend/features/slide-editor/templates/composition/uniqueness-validator.ts
//
//  Or call validateAllFamilies() programmatically.
// =============================================================================

import type { TemplateFamily, VariantSlot } from './types';
import { COMPOSITION_FAMILIES } from './registry';

// ---------------------------------------------------------------------------
//  Geometry fingerprint — encodes each slot as a rounded coordinate string
// ---------------------------------------------------------------------------

interface SlotFingerprint {
  id:        string;
  signature: string; // "x:y:w:h" rounded to nearest 5 (tolerance)
}

function round5(n: number): number {
  return Math.round(n / 5) * 5;
}

function slotFingerprint(slot: VariantSlot): SlotFingerprint {
  return {
    id: slot.id,
    signature: `${round5(slot.x)}:${round5(slot.y)}:${round5(slot.w)}:${round5(slot.h)}`,
  };
}

function variantFingerprints(slots: VariantSlot[]): Set<string> {
  return new Set(slots.map((s) => slotFingerprint(s).signature));
}

// ---------------------------------------------------------------------------
//  Similarity score — Jaccard similarity of fingerprint sets
// ---------------------------------------------------------------------------

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  const intersection = new Set([...a].filter((x) => b.has(x)));
  const union = new Set([...a, ...b]);
  return intersection.size / union.size;
}

// ---------------------------------------------------------------------------
//  Slide types to test
// ---------------------------------------------------------------------------

const SLIDE_TYPES = [
  'cover', 'problem', 'solution', 'market', 'business_model',
  'traction', 'team', 'competition', 'roadmap', 'pricing', 'ask',
  'closing', 'default',
] as const;

// ---------------------------------------------------------------------------
//  Find the variant matching a given slide type
// ---------------------------------------------------------------------------

function findVariantForType(family: TemplateFamily, slideType: string): VariantSlot[] | null {
  for (const v of family.variants) {
    if (v.matches.includes(slideType as any)) return v.slots;
  }
  // Fallback to 'default'
  for (const v of family.variants) {
    if (v.matches.includes('default' as any)) return v.slots;
  }
  return family.variants[0]?.slots ?? null;
}

// ---------------------------------------------------------------------------
//  Main validator
// ---------------------------------------------------------------------------

export interface UniquenessIssue {
  familyA:   string;
  familyB:   string;
  slideType: string;
  similarity: number;
}

export interface UniquenessReport {
  issues:         UniquenessIssue[];
  totalPairs:     number;
  flaggedPairs:   number;
  threshold:      number;
  uniquenessPct:  number;
}

export function validateAllFamilies(
  families: TemplateFamily[] = COMPOSITION_FAMILIES,
  threshold = 0.80,
): UniquenessReport {
  const issues: UniquenessIssue[] = [];
  let totalPairs = 0;
  let flaggedPairs = 0;

  for (const slideType of SLIDE_TYPES) {
    for (let i = 0; i < families.length; i++) {
      for (let j = i + 1; j < families.length; j++) {
        const a = families[i];
        const b = families[j];
        const slotsA = findVariantForType(a, slideType);
        const slotsB = findVariantForType(b, slideType);
        if (!slotsA || !slotsB) continue;

        const fpA = variantFingerprints(slotsA);
        const fpB = variantFingerprints(slotsB);
        const similarity = jaccardSimilarity(fpA, fpB);

        totalPairs++;
        if (similarity > threshold) {
          flaggedPairs++;
          issues.push({
            familyA: a.id,
            familyB: b.id,
            slideType,
            similarity: Math.round(similarity * 100) / 100,
          });
        }
      }
    }
  }

  const uniquenessPct = totalPairs > 0
    ? Math.round(((totalPairs - flaggedPairs) / totalPairs) * 100)
    : 100;

  return { issues, totalPairs, flaggedPairs, threshold, uniquenessPct };
}

// ---------------------------------------------------------------------------
//  Detailed per-family report
// ---------------------------------------------------------------------------

export interface FamilySlideTypeMatrix {
  familyId:   string;
  slideType:  string;
  slotCount:  number;
  bodyYStart: number | null; // lowest y among non-footer/pageNumber slots
  xBase:      number | null; // most common x value
}

export function buildFamilyMatrix(
  families: TemplateFamily[] = COMPOSITION_FAMILIES,
): FamilySlideTypeMatrix[] {
  const rows: FamilySlideTypeMatrix[] = [];
  for (const family of families) {
    for (const slideType of SLIDE_TYPES) {
      const slots = findVariantForType(family, slideType);
      if (!slots) continue;
      const contentSlots = slots.filter((s) => !['footer', 'pageNumber'].includes(s.id));
      const ys = contentSlots.map((s) => s.y).sort((a, b) => a - b);
      const bodyY = ys.length > 2 ? ys[2] : ys[0] ?? null; // 3rd slot's y ≈ body start
      const xs = contentSlots.map((s) => s.x);
      const xBase = xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
      rows.push({ familyId: family.id, slideType, slotCount: contentSlots.length, bodyYStart: bodyY, xBase: xBase ? Math.round(xBase) : null });
    }
  }
  return rows;
}

// ---------------------------------------------------------------------------
//  CLI runner
// ---------------------------------------------------------------------------

if (require.main === module) {
  const report = validateAllFamilies();
  console.log('\n========================================');
  console.log('  Phase 22F — Template Uniqueness Report');
  console.log('========================================\n');
  console.log(`Families tested : ${COMPOSITION_FAMILIES.length}`);
  console.log(`Slide types     : ${SLIDE_TYPES.length}`);
  console.log(`Total pairs     : ${report.totalPairs}`);
  console.log(`Flagged (>${Math.round(report.threshold * 100)}%)  : ${report.flaggedPairs}`);
  console.log(`Uniqueness      : ${report.uniquenessPct}%`);

  if (report.issues.length === 0) {
    console.log('\n✓ All template families are structurally unique across all slide types.\n');
  } else {
    console.log('\n⚠ Similarity issues:\n');
    for (const issue of report.issues) {
      console.log(`  ${issue.familyA} ↔ ${issue.familyB}  [${issue.slideType}]  ${Math.round(issue.similarity * 100)}% similar`);
    }
    console.log('');
  }

  const matrix = buildFamilyMatrix();
  console.log('Family × SlideType matrix (body-y-start / x-base):\n');
  const header = ['family', ...SLIDE_TYPES].map((s) => s.padEnd(16)).join(' ');
  console.log('  ' + header);
  for (const family of COMPOSITION_FAMILIES) {
    const row = [family.id.padEnd(16)];
    for (const slideType of SLIDE_TYPES) {
      const cell = matrix.find((r) => r.familyId === family.id && r.slideType === slideType);
      row.push(cell ? `y${cell.bodyYStart ?? '?'}/x${cell.xBase ?? '?'}`.padEnd(16) : '—'.padEnd(16));
    }
    console.log('  ' + row.join(' '));
  }
  console.log('');
}
