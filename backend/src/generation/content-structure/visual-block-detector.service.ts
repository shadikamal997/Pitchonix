/**
 * Phase 27B — Visual Block Detector
 *
 * Given the analyser's profile, decides which block kinds are *good enough*
 * to actually appear on this slide (vs. just being theoretical candidates).
 * Applies document-type prefer/avoid rules and diversity caps from a tracker.
 */

import { Injectable } from '@nestjs/common';
import { BlockKind, ContentStructureProfile } from './types';
import { getDocumentRule } from './document-rules';
import { DiversityTracker } from './diversity-tracker';

export interface DetectorContext {
  documentType: string;
  tracker:      DiversityTracker;
}

@Injectable()
export class VisualBlockDetector {
  /**
   * Return block kinds approved for this slide, in priority order.
   * Caps duplicates per the diversity tracker; honours document prefer/avoid lists.
   */
  detect(profile: ContentStructureProfile, ctx: DetectorContext): BlockKind[] {
    const rule = getDocumentRule(ctx.documentType);

    // Start from analyzer-ranked candidates
    let candidates = [...profile.visualCandidates];

    // 1. Filter out avoided kinds
    if (rule.avoid.length > 0) {
      candidates = candidates.filter((k) => !rule.avoid.includes(k));
    }

    // 2. Boost preferred kinds — bring them to the front if they're already candidates
    candidates.sort((a, b) => {
      const ai = rule.prefer.indexOf(a);
      const bi = rule.prefer.indexOf(b);
      const aBoost = ai >= 0 ? -10 + ai : 0;
      const bBoost = bi >= 0 ? -10 + bi : 0;
      return aBoost - bBoost;
    });

    // 3. Diversity cap — skip kinds that are saturated, unless we have no alternative
    const fresh: BlockKind[] = [];
    const saturated: BlockKind[] = [];
    for (const k of candidates) {
      if (ctx.tracker.isSaturated(k)) saturated.push(k);
      else fresh.push(k);
    }
    const final = fresh.length > 0 ? fresh : saturated;

    // 4. Drop empty / not-extractable kinds (defensive — analyzer should already)
    return final.filter((k) => this.hasData(k, profile));
  }

  /** Does the profile contain enough data to actually render this kind? */
  private hasData(kind: BlockKind, profile: ContentStructureProfile): boolean {
    const e = profile.extracted;
    switch (kind) {
      case 'metric':            return e.numbers.length >= 1;
      case 'metricGrid':        return e.numbers.length >= 2;
      case 'kpi':               return e.numbers.length >= 1;
      case 'pricing':           return e.pricingTiers.length >= 1;
      case 'roadmap':           return e.phases.length >= 1;
      case 'timeline':          return e.phases.length >= 1;
      case 'team':              return e.people.length >= 1;
      case 'featureGrid':       return e.features.length >= 2;
      case 'comparison':        return e.competitors.length >= 1;
      case 'swot':              return !!e.swot;
      case 'marketSizing':      return !!e.marketSizing;
      case 'fundingAllocation': return e.allocations.length >= 1;
      case 'processSteps':      return e.features.length >= 2;
      case 'testimonial':       return false; // built only when explicit testimonial input
      case 'quote':             return false;
      case 'bulletList':        return true; // always available
      case 'paragraph':         return true;
      case 'chart':             return e.numbers.length >= 2;
    }
  }
}
