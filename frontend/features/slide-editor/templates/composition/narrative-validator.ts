// =============================================================================
//  Phase 26J — NarrativeValidator
//
//  Pre-render check that surfaces deck-level warnings. Designed to be called
//  once per deck and to expose actionable issues in the UI / debug overlay.
// =============================================================================

import type { DeckNarrativeProfile }  from './deck-analyzer';
import type { FatigueReport }         from './fatigue-analyzer';
import type { DensityBalanceReport }  from './density-balancer';
import type { PacingPlan }            from './pacing-engine';
import type { TransitionHint }        from './transition-planner';

export type ValidatorSeverity = 'info' | 'warn' | 'error';

export interface ValidatorIssue {
  severity:    ValidatorSeverity;
  slideIndex?: number;          // omit for deck-wide issues
  code:        string;          // stable identifier
  message:     string;
}

export interface NarrativeValidationReport {
  issues:      ValidatorIssue[];
  summary: {
    info:  number;
    warn:  number;
    error: number;
  };
}

export function validateNarrative(args: {
  profile:     DeckNarrativeProfile;
  fatigue:     FatigueReport;
  density:     DensityBalanceReport;
  pacing:      PacingPlan;
  transitions: TransitionHint[];
}): NarrativeValidationReport {
  const issues: ValidatorIssue[] = [];
  const { profile, fatigue, density, pacing, transitions } = args;

  // 1. Per-slide fatigue
  for (const f of fatigue.perSlide) {
    if (f.fatigueScore >= 70) {
      issues.push({
        severity:   'error',
        slideIndex: f.index,
        code:       'fatigue.high',
        message:    `Slide ${f.index + 1} has high visual fatigue (${f.fatigueScore.toFixed(0)}): ${f.reasons.join('; ')}`,
      });
    } else if (f.fatigueScore >= 45) {
      issues.push({
        severity:   'warn',
        slideIndex: f.index,
        code:       'fatigue.medium',
        message:    `Slide ${f.index + 1} fatigue is elevated: ${f.reasons.join('; ')}`,
      });
    }
  }

  // 2. Density hotspots
  for (const h of density.hotspots) {
    issues.push({
      severity:   h.len >= 4 ? 'error' : 'warn',
      slideIndex: h.start,
      code:       'density.run',
      message:    `${h.len} consecutive ${h.tier} slides (${h.start + 1}–${h.end + 1})`,
    });
  }

  // 3. Pacing issues
  for (const p of pacing.issues) {
    issues.push({
      severity:   p.severity,
      slideIndex: p.index,
      code:       'pacing.repeat',
      message:    `Slide ${p.index + 1}: ${p.message}`,
    });
  }

  // 4. Plateau / unstructured narratives
  if (profile.storyStructure === 'plateau') {
    issues.push({
      severity: 'warn',
      code:     'narrative.plateau',
      message:  'Narrative is flat — consider adding a climactic moment (peak intensity slide).',
    });
  }
  if (profile.storyStructure === 'unstructured') {
    issues.push({
      severity: 'info',
      code:     'narrative.unstructured',
      message:  'No clear narrative arc detected. Re-ordering may strengthen the deck.',
    });
  }

  // 5. Missing core sections for pitches
  const roles = new Set(profile.nodes.map((n) => n.role));
  if (profile.narrativeType === 'classic-pitch') {
    const need = ['problem', 'solution', 'traction', 'ask'] as const;
    for (const r of need) {
      if (!roles.has(r)) {
        issues.push({ severity: 'warn', code: 'pitch.missing-section', message: `Pitch deck missing "${r}" section.` });
      }
    }
  }

  // 6. Transition hints with hero-reset but the slide is dense
  for (const t of transitions) {
    if (t.recommendedStyle === 'hero-reset') {
      const node = profile.nodes[t.index];
      if (node && node.density > 60) {
        issues.push({
          severity:   'warn',
          slideIndex: t.index,
          code:       'transition.dense-at-boundary',
          message:    `Slide ${t.index + 1} is at a section boundary but is dense — consider lightening for visual reset.`,
        });
      }
    }
  }

  // 7. Confidence warning
  if (profile.confidenceScore < 0.4) {
    issues.push({
      severity: 'info',
      code:     'narrative.unknown',
      message:  'Could not confidently identify deck narrative type — analysis quality may be reduced.',
    });
  }

  const summary = {
    info:  issues.filter((i) => i.severity === 'info').length,
    warn:  issues.filter((i) => i.severity === 'warn').length,
    error: issues.filter((i) => i.severity === 'error').length,
  };

  return { issues, summary };
}
