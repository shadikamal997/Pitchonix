/**
 * Phase 27 — Content Structure Generation Engine
 * Shared types.
 *
 * IMPORTANT: This entire engine is rule-based and deterministic. It does NOT
 * use any LLM, prompt construction, or AI agent. Every output is derived from
 * the wizard input via regex/string parsing and lookup tables.
 */

import { SlideType } from '../slide-types/types';

// =============================================================================
//  Names of the visual block kinds the engine can produce.
// =============================================================================

export type BlockKind =
  | 'metric'           // single KPI metric
  | 'metricGrid'       // 2–4 metrics arranged in a row/grid
  | 'kpi'              // KPI with trend
  | 'pricing'          // pricingTiers[]
  | 'roadmap'          // roadmap phases[]
  | 'timeline'         // timeline items[]
  | 'team'             // team members[]
  | 'featureGrid'      // featureGrid items[]
  | 'comparison'       // comparison columns+rows
  | 'swot'             // SWOT 4 quadrants
  | 'marketSizing'     // TAM/SAM/SOM (3 metrics)
  | 'fundingAllocation'// use-of-funds allocations
  | 'processSteps'     // process steps[]
  | 'testimonial'      // testimonial block
  | 'quote'            // quote block
  | 'bulletList'       // bulleted list
  | 'paragraph'        // paragraph
  | 'chart'            // chart
  ;

// =============================================================================
//  Phase 27A — Content Structure Analyzer outputs
// =============================================================================

export interface ExtractedNumber {
  value:        string;         // raw match e.g. "$10M", "150%"
  numeric:      number;          // parsed magnitude (e.g. 10 from "$10M")
  unit?:        string;          // '%', '$', 'M', 'K', 'B', 'users', ...
  isPercent:    boolean;
  isCurrency:   boolean;
  isMultiplier: boolean;         // 'x' (e.g. "3x faster")
  context:      string;           // surrounding text
}

export interface ExtractedPerson {
  name:       string;
  role?:      string;
  background?:string;
}

export interface ExtractedPricingTier {
  name:       string;
  price:      string;
  features:   string[];
  highlight?: boolean;
}

export interface ExtractedRoadmapPhase {
  phase:    string;
  period?:  string;
  bullets:  string[];
}

export interface ExtractedAllocation {
  category:    string;
  percentage?: number;
  amount?:     string;
}

export interface ExtractedFeature {
  title:       string;
  description?:string;
}

export interface ExtractedCompetitor {
  name:     string;
  strengths?: string[];
  weaknesses?: string[];
}

export interface ExtractedSwot {
  strengths:     string[];
  weaknesses:    string[];
  opportunities: string[];
  threats:       string[];
}

export interface ExtractedMarketSizing {
  tam?: { value: string; label: string };
  sam?: { value: string; label: string };
  som?: { value: string; label: string };
}

export interface ContentStructureProfile {
  slideType:        SlideType | string;
  /** Loose category derived from slide type (e.g. 'metrics-heavy', 'narrative', ...). */
  contentCategory:  string;
  /** Block kinds this slide is a good candidate for, in priority order. */
  visualCandidates: BlockKind[];
  /** 0–100. Rough estimate of how much structured data we extracted. */
  dataDensity:      number;
  /** 0–100. Confidence that the extracted structure is well-formed. */
  structureScore:   number;
  /** Extracted facts grouped by kind (one filled, the rest empty). */
  extracted: {
    numbers:       ExtractedNumber[];
    people:        ExtractedPerson[];
    pricingTiers:  ExtractedPricingTier[];
    phases:        ExtractedRoadmapPhase[];
    allocations:   ExtractedAllocation[];
    features:      ExtractedFeature[];
    competitors:   ExtractedCompetitor[];
    swot?:         ExtractedSwot;
    marketSizing?: ExtractedMarketSizing;
  };
}

// =============================================================================
//  Phase 27D — Blueprint
// =============================================================================

export interface SlideBlock {
  kind:      BlockKind;
  /** Optional caption / heading for the block. */
  title?:    string;
  /** Canonical block payload — shape matches the element-content type. */
  content:   any;
  /** Visual metadata: hint for the renderer / scorer. */
  meta?: {
    role?:    string;
    layout?:  string;
    priority?: number;
  };
}

export interface SlideBlueprint {
  slideType: SlideType | string;
  /** Layout hint for the canvas engine ('metric-strip', 'split', etc.). */
  layoutType?: string;
  /** Ordered list of blocks to render on this slide. */
  blocks:    SlideBlock[];
  /** Aggregate of what the analyzer extracted. */
  profile:   ContentStructureProfile;
}

// =============================================================================
//  Phase 27I — Quality score
// =============================================================================

export interface StructureQualityScore {
  total:                number;
  visualDiversityScore: number;
  blockDiversityScore:  number;
  paragraphRatioScore:  number;
  informationDensityScore: number;
  investorReadinessScore: number;
  presentationQualityScore: number;
  /** Recommendations / weaknesses. */
  notes: string[];
}
