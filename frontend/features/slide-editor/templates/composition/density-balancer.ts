// =============================================================================
//  Phase 26E — DensityBalancer
//
//  Tracks deck-wide density signals and prescribes per-slide density targets.
//  The goal is to prevent runs of Dense / Dense / Dense and create cadenced
//  Dense → Medium → Light patterns.
//
//  Outputs DensityAdjustment[] — used by the scorer to push slides toward
//  lighter or denser variants than their content alone would suggest.
// =============================================================================

import type { SlideNarrativeNode } from './deck-analyzer';

export type DensityTier = 'light' | 'medium' | 'dense';

export interface DensityAdjustment {
  index:           number;
  /** Where the analyzer would have placed it on its own. */
  currentTier:    DensityTier;
  /** Where the deck-level balancer wants it to go. */
  targetTier:     DensityTier;
  /** Bias applied to the layout scorer; positive prefers lighter variants. */
  bias:           number;
  reason:         string;
}

export interface DensityBalanceReport {
  adjustments: DensityAdjustment[];
  /** Per-slide tier after rebalancing. */
  finalTiers:  DensityTier[];
  /** Run-length runs detected (consecutive same-tier > 2). */
  hotspots:    Array<{ start: number; end: number; tier: DensityTier; len: number }>;
}

function tierOf(node: SlideNarrativeNode): DensityTier {
  if (node.density >= 55) return 'dense';
  if (node.density >= 28) return 'medium';
  return 'light';
}

export function balanceDensity(nodes: SlideNarrativeNode[]): DensityBalanceReport {
  const initial: DensityTier[] = nodes.map(tierOf);
  const final = [...initial];
  const adjustments: DensityAdjustment[] = nodes.map((n, i) => ({
    index:       i,
    currentTier: initial[i],
    targetTier:  initial[i],
    bias:        0,
    reason:      '',
  }));

  // 1. Run-length encoding pass to find hotspots
  const hotspots: DensityBalanceReport['hotspots'] = [];
  let runStart = 0;
  for (let i = 1; i <= initial.length; i++) {
    if (i === initial.length || initial[i] !== initial[runStart]) {
      const len = i - runStart;
      if (len >= 3) hotspots.push({ start: runStart, end: i - 1, tier: initial[runStart], len });
      runStart = i;
    }
  }

  // 2. For each hotspot, force the third+ slide toward a different tier
  for (const h of hotspots) {
    for (let i = h.start + 2; i <= h.end; i++) {
      const target: DensityTier =
        h.tier === 'dense'  ? 'light'  :
        h.tier === 'light'  ? 'medium' :
        'light';
      adjustments[i].targetTier = target;
      adjustments[i].bias = target === 'light' ? +25 : 0;
      adjustments[i].reason = `density rebalance: was ${initial[i]} run #${i - h.start + 1} → ${target}`;
      final[i] = target;
    }
  }

  // 3. Smooth: alternate Dense → Light → Medium → Strong → Light when adjacent slides match
  for (let i = 2; i < initial.length; i++) {
    if (final[i] === final[i - 1] && final[i] === final[i - 2]) {
      if (final[i] === 'dense') {
        adjustments[i].targetTier = 'light';
        adjustments[i].bias = +20;
        adjustments[i].reason = (adjustments[i].reason ? adjustments[i].reason + '; ' : '') +
          'rhythm: lighten after 2× dense neighbours';
        final[i] = 'light';
      }
    }
  }

  return { adjustments, finalTiers: final, hotspots };
}
