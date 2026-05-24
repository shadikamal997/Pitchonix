/**
 * Phase 27I — Structure Quality Score
 * Phase 27G — Content distribution check is embedded here too.
 *
 * Computes a 0–100 score for a deck's structure quality based on:
 *   - visual diversity (distinct block kinds / total blocks)
 *   - block diversity (no single kind dominates)
 *   - paragraph ratio (penalise paragraph-heavy decks)
 *   - information density (more structured data → higher score)
 *   - investor readiness (presence of key blocks: metrics, team, roadmap, etc.)
 *   - presentation quality (presence of strong visual primitives)
 */

import { Injectable } from '@nestjs/common';
import { BlockKind, SlideBlueprint, StructureQualityScore } from './types';
import { DiversityTracker } from './diversity-tracker';
import { getDocumentRule } from './document-rules';

const VISUAL_KINDS: BlockKind[] = [
  'metric', 'metricGrid', 'kpi', 'pricing', 'roadmap', 'timeline', 'team',
  'featureGrid', 'comparison', 'swot', 'marketSizing', 'fundingAllocation',
  'processSteps', 'testimonial', 'chart',
];

@Injectable()
export class StructureScorer {
  score(blueprints: SlideBlueprint[], documentType: string): StructureQualityScore {
    const notes: string[] = [];
    if (blueprints.length === 0) {
      return {
        total: 0, visualDiversityScore: 0, blockDiversityScore: 0,
        paragraphRatioScore: 0, informationDensityScore: 0,
        investorReadinessScore: 0, presentationQualityScore: 0,
        notes: ['No blueprints provided'],
      };
    }

    // Histogram
    const counts: Record<string, number> = {};
    let totalBlocks = 0;
    let visualBlocks = 0;
    let paragraphBlocks = 0;
    for (const bp of blueprints) {
      for (const b of bp.blocks) {
        counts[b.kind] = (counts[b.kind] ?? 0) + 1;
        totalBlocks++;
        if (VISUAL_KINDS.includes(b.kind)) visualBlocks++;
        if (b.kind === 'paragraph' || b.kind === 'bulletList') paragraphBlocks++;
      }
    }
    // The migration service always materialises title + body paragraph from
    // slide.title/subtitle/description, so count one implicit paragraph per slide:
    const implicitParagraphs = blueprints.length;
    paragraphBlocks += implicitParagraphs;
    totalBlocks     += implicitParagraphs;

    // 1. Visual diversity: distinct kinds / total kinds
    const distinctKinds = Object.keys(counts).length;
    const visualDiversityScore = clamp(distinctKinds * 8, 0, 100);
    if (distinctKinds < 4) notes.push(`Only ${distinctKinds} distinct block kinds in deck — increase variety`);

    // 2. Block diversity: no single kind > 30% of all blocks
    const maxCount = Math.max(0, ...Object.values(counts));
    const dominance = totalBlocks > 0 ? maxCount / totalBlocks : 0;
    const blockDiversityScore = clamp(95 - dominance * 100, 0, 100);
    if (dominance > 0.4) notes.push(`Dominant block kind appears in ${Math.round(dominance * 100)}% of blocks`);

    // 3. Paragraph ratio: penalise if > 30% of all blocks
    const paragraphRatio = totalBlocks > 0 ? paragraphBlocks / totalBlocks : 1;
    const paragraphRatioScore = clamp(100 - Math.max(0, paragraphRatio - 0.25) * 200, 0, 100);
    if (paragraphRatio > 0.40) notes.push(`Deck is paragraph-heavy (${Math.round(paragraphRatio * 100)}%)`);

    // 4. Information density: avg dataDensity across slides
    const avgDensity = blueprints.reduce((s, bp) => s + bp.profile.dataDensity, 0) / blueprints.length;
    const informationDensityScore = clamp(avgDensity, 0, 100);
    if (avgDensity < 30) notes.push(`Low information density (avg ${Math.round(avgDensity)}) — add structured data`);

    // 5. Investor readiness: presence of key block kinds (document-specific)
    const rule = getDocumentRule(documentType);
    const preferredPresent = rule.prefer.filter((k) => counts[k] > 0).length;
    const investorReadinessScore = clamp((preferredPresent / Math.max(1, rule.prefer.length)) * 100, 0, 100);
    if (preferredPresent < rule.prefer.length / 2) {
      notes.push(`Missing ${rule.prefer.length - preferredPresent} preferred block kinds for ${documentType}`);
    }

    // 6. Presentation quality: visualBlocks per slide
    const visualPerSlide = visualBlocks / blueprints.length;
    const presentationQualityScore = clamp(visualPerSlide * 50, 0, 100);
    if (visualPerSlide < 0.5) notes.push(`Only ${visualPerSlide.toFixed(1)} visual blocks per slide on average`);

    // Weighted total
    const total = clamp(
      visualDiversityScore       * 0.15 +
      blockDiversityScore        * 0.15 +
      paragraphRatioScore        * 0.20 +
      informationDensityScore    * 0.15 +
      investorReadinessScore     * 0.20 +
      presentationQualityScore   * 0.15,
      0, 100,
    );

    return {
      total,
      visualDiversityScore,
      blockDiversityScore,
      paragraphRatioScore,
      informationDensityScore,
      investorReadinessScore,
      presentationQualityScore,
      notes,
    };
  }
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
