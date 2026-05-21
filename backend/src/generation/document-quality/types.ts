/**
 * Phase 30 — Professional Document Systems
 *
 * Shared types for the document-quality module. All scoring is deterministic
 * and rule-based — no LLMs.
 */

import { SlideType, SlideContent, WizardInput } from '../slide-types/types';

// =============================================================================
//  Frameworks (30A)
// =============================================================================

/** One required section within a document framework. */
export interface FrameworkSection {
  /** Slide type that satisfies this section. */
  slideType:    SlideType;
  /** Human label (used in reports / UI). */
  label:        string;
  /** True = framework is incomplete without it. */
  required:     boolean;
  /** Lower = earlier in the deck. */
  order:        number;
  /** Optional secondary slide types that *also* satisfy this section. */
  alternates?:  SlideType[];
}

export interface DocumentFramework {
  /** Document type id (matches `WizardInput.documentType`). */
  documentType: string;
  /** Display name of the framework. */
  name:         string;
  /** Sections in the order they should appear. */
  sections:     FrameworkSection[];
  /** Targets used by the executive quality scorer. */
  targets: {
    minSlides:           number;
    maxSlides:           number;
    minVisualBlocks:     number;
    minKpis:             number;
  };
}

export interface FrameworkCompletenessReport {
  documentType:   string;
  framework:      string;
  /** 0..100 — share of required sections satisfied. */
  completeness:   number;
  satisfied:      FrameworkSection[];
  missing:        FrameworkSection[];
  /** Sections present in the deck that aren't in the framework. */
  extra:          SlideType[];
  /** Sections satisfied via the `alternates` list (not the primary type). */
  satisfiedByAlternate: FrameworkSection[];
}

// =============================================================================
//  Business logic validator (30B)
// =============================================================================

export type BusinessLogicCode =
  | 'missing-market-size'
  | 'missing-business-model'
  | 'missing-pricing'
  | 'missing-competitors'
  | 'missing-roadmap'
  | 'missing-kpis'
  | 'missing-team'
  | 'missing-ask'
  | 'missing-financials'
  | 'missing-swot'
  | 'missing-risks'
  | 'missing-decisions'
  | 'missing-roi';

export interface BusinessLogicWarning {
  code:     BusinessLogicCode;
  severity: 'info' | 'warn' | 'error';
  message:  string;
  hint?:    string;
}

export interface BusinessLogicReport {
  warnings:    BusinessLogicWarning[];
  errorCount:  number;
  warnCount:   number;
}

// =============================================================================
//  Executive quality (30C)
// =============================================================================

export interface ExecutiveQualityReport {
  total:                  number;       // 0..100
  slideCount:             number;       // 0..100
  informationBalance:     number;       // 0..100
  visualBalance:          number;       // 0..100
  frameworkCompleteness:  number;       // 0..100 (re-projected here for convenience)
  kpiCoverage:            number;       // 0..100
  financialCoverage:      number;       // 0..100
  narrativeStrength:      number;       // 0..100
  notes:                  string[];
}

// =============================================================================
//  Readiness engines (30D–30G)
// =============================================================================

export interface ReadinessCriterion {
  key:     string;
  label:   string;
  /** 0..100 — score for this criterion. */
  score:   number;
  /** What was missing or weak. */
  reason?: string;
}

export interface ReadinessReport {
  documentType:  string;
  engine:        'investor' | 'sales' | 'board' | 'strategy';
  /** 0..100 — weighted average of criteria. */
  total:         number;
  criteria:      ReadinessCriterion[];
  /** band — coarse label for UI surfaces. */
  band:          'poor' | 'fair' | 'good' | 'excellent';
}

// =============================================================================
//  Document scorecard (30H)
// =============================================================================

export interface DocumentScorecard {
  documentType:           string;
  overall:                number;     // 0..100
  frameworkCompleteness:  number;
  businessReadiness:      number;
  visualReadiness:        number;     // hooks into Phase 27 structure score
  narrativeReadiness:     number;     // proxied from executive quality + structure
  presentationReadiness:  number;     // proxied from visual + slide count
  /** Optional readiness reports for doc-specific dimensions. */
  readiness?:             ReadinessReport;
  /** Underlying reports for debugging (30J). */
  reports: {
    framework:    FrameworkCompletenessReport;
    business:     BusinessLogicReport;
    executive:    ExecutiveQualityReport;
  };
  band: 'poor' | 'fair' | 'good' | 'excellent';
}

// =============================================================================
//  Auto-expansion (30I)
// =============================================================================

export interface AutoExpansionResult {
  /** Slide types that should be added based on framework + available data. */
  promotions: SlideType[];
  /** Slide types skipped because data is missing. */
  skipped:    Array<{ slideType: SlideType; reason: string }>;
}

// =============================================================================
//  Inputs shared across services
// =============================================================================

export interface QualityInput {
  input:  WizardInput;
  slides: SlideContent[];
  /** Optional — Phase 27 structure score, if available. */
  structureScore?: number;
  /** Optional — Phase 27 visual block count. */
  visualBlockCount?: number;
}
