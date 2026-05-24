/**
 * Phase 27H — Block Diversity tracker
 *
 * Stateful counter that the blueprint engine uses while walking the deck.
 * Caps repetition so we don't end up with 5 pricing slides in a row.
 */

import { BlockKind } from './types';

const HARD_CAP: Partial<Record<BlockKind, number>> = {
  pricing:           1,
  marketSizing:      1,
  swot:              1,
  fundingAllocation: 1,
  team:              1,
  comparison:        2,
  roadmap:           1,
  timeline:          2,
  testimonial:       2,
  metricGrid:        3,
  featureGrid:       3,
  processSteps:      2,
  chart:             3,
  paragraph:         100,
  bulletList:        100,
  metric:            6,
  kpi:               3,
  quote:             2,
};

export class DiversityTracker {
  private count: Map<BlockKind, number> = new Map();

  used(kind: BlockKind): number {
    return this.count.get(kind) ?? 0;
  }

  isSaturated(kind: BlockKind): boolean {
    const cap = HARD_CAP[kind] ?? 100;
    return this.used(kind) >= cap;
  }

  record(kind: BlockKind): void {
    this.count.set(kind, this.used(kind) + 1);
  }

  /** Total visual (non-text) block uses across the deck so far. */
  totalVisuals(): number {
    let total = 0;
    for (const [k, v] of this.count.entries()) {
      if (k !== 'paragraph' && k !== 'bulletList') total += v;
    }
    return total;
  }

  /** Full counts (for reporting). */
  asObject(): Record<string, number> {
    return Object.fromEntries(this.count);
  }
}
