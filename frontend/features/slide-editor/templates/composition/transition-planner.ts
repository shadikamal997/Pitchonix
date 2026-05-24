// =============================================================================
//  Phase 26G — SectionTransitionPlanner
//
//  Identifies where one narrative "section" ends and another begins (Problem
//  → Solution, Solution → Market, etc.) and decides what kind of visual
//  treatment the first slide of each new section should receive.
//
//  Output: TransitionHint[] (one per slide). The layout scorer can use this
//  to prefer hero/whitespace-reset variants at section boundaries.
// =============================================================================

import type { SlideNarrativeNode, NarrativeRole } from './deck-analyzer';

export type TransitionStyle =
  | 'none'              // no transition needed
  | 'section-reset'     // gentle reset — different layout family
  | 'whitespace-reset'  // open up — high-whitespace variant
  | 'hero-reset'        // dramatic — hero/statement variant
  | 'divider'           // dedicated divider slide (not auto-inserted, just hinted);

export interface TransitionHint {
  index:                  number;
  isSectionBoundary:      boolean;
  fromSection:            string | null;
  toSection:              string | null;
  recommendedStyle:       TransitionStyle;
  /** Layout intents to prefer at this slide. */
  preferIntents:          string[];
  /** Layout intents to avoid. */
  avoidIntents:           string[];
  reason:                 string;
}

// Roles grouped into "sections"
const SECTION_OF: Record<NarrativeRole, string> = {
  'intro':           'intro',
  'setup':           'setup',
  'problem':         'problem',
  'urgency':         'problem',
  'solution':        'solution',
  'proof':           'evidence',
  'market':          'market',
  'business-model':  'business',
  'traction':        'evidence',
  'differentiation': 'differentiation',
  'credibility':     'team',
  'roadmap':         'roadmap',
  'ask':             'ask',
  'closing':         'closing',
};

// Transitions worth a hero reset (high-impact narrative boundaries)
const HERO_RESET_BOUNDARIES = new Set([
  'problem→solution',
  'market→traction',
  'differentiation→roadmap',
  'team→ask',
  'evidence→ask',
  'roadmap→ask',
]);

// Transitions worth a whitespace reset (calming)
const WHITESPACE_BOUNDARIES = new Set([
  'business→evidence',
  'solution→market',
  'ask→closing',
]);

export function planTransitions(nodes: SlideNarrativeNode[]): TransitionHint[] {
  return nodes.map((n, i) => {
    const prev = i > 0 ? nodes[i - 1] : null;
    const curSection = SECTION_OF[n.role] ?? 'misc';
    const prevSection = prev ? SECTION_OF[prev.role] ?? 'misc' : null;

    if (!prev) {
      return {
        index: i,
        isSectionBoundary: true,
        fromSection: null,
        toSection: curSection,
        recommendedStyle: 'hero-reset',
        preferIntents: ['hero-statement', 'metric-hero', 'vision-statement', 'split-image-cover'],
        avoidIntents: ['editorial', 'dense-bullets'],
        reason: 'deck opening — make a strong first impression',
      };
    }

    if (prevSection === curSection) {
      return {
        index: i,
        isSectionBoundary: false,
        fromSection: prevSection,
        toSection: curSection,
        recommendedStyle: 'none',
        preferIntents: [],
        avoidIntents: [],
        reason: '',
      };
    }

    const key = `${prevSection}→${curSection}`;
    if (HERO_RESET_BOUNDARIES.has(key)) {
      return {
        index: i,
        isSectionBoundary: true,
        fromSection: prevSection,
        toSection: curSection,
        recommendedStyle: 'hero-reset',
        preferIntents: ['hero-statement', 'metric-hero', 'vision-statement', 'pull-quote', 'funding-hero'],
        avoidIntents: ['editorial', 'dense-bullets'],
        reason: `section boundary ${key} — hero reset`,
      };
    }
    if (WHITESPACE_BOUNDARIES.has(key)) {
      return {
        index: i,
        isSectionBoundary: true,
        fromSection: prevSection,
        toSection: curSection,
        recommendedStyle: 'whitespace-reset',
        preferIntents: ['statement-focused', 'hero-statement', 'pull-quote'],
        avoidIntents: ['editorial', 'dense-bullets', 'chart-focus'],
        reason: `section boundary ${key} — whitespace reset`,
      };
    }

    // Generic section reset
    return {
      index: i,
      isSectionBoundary: true,
      fromSection: prevSection,
      toSection: curSection,
      recommendedStyle: 'section-reset',
      preferIntents: ['hero-statement', 'statement-focused'],
      avoidIntents: [],
      reason: `section boundary ${key}`,
    };
  });
}
