import { PageComposition, ComposedSection } from './document-composition.service';
import { PlannedPage } from './rule-based-page-planner.service';

export type PublishingSeverity = 'info' | 'warning' | 'error' | 'blocking';

export interface VisualEstimate {
  sectionHeights: number[];
  contentHeight: number;
  occupancy: number;
  wordCount: number;
  hasOverflow: boolean;
  isUnderfilled: boolean;
  isHeadingOnly: boolean;
  hasOrphanHeading: boolean;
}

export interface EditorialGridPlan {
  gridType: 'single-column' | 'two-column' | 'three-column' | 'asymmetric' | 'sidebar' | 'feature' | 'image-heavy';
  columns: number;
  baseline: number;
  margins: { top: number; right: number; bottom: number; left: number };
  zones: Array<{ id: string; role: string; columnSpan: number; priority: number }>;
  rhythmScore: number;
}

export interface MagazineCompositionPlan {
  archetype:
    | 'cover'
    | 'editorial-article'
    | 'analytics'
    | 'quote-spread'
    | 'product-showcase'
    | 'feature-callout'
    | 'infographic'
    | 'roadmap'
    | 'case-study'
    | 'standard';
  visualTone: 'quiet' | 'editorial' | 'data-rich' | 'cinematic' | 'structured';
  pullQuote?: string;
  highlightedMetric?: string;
  sidebarSections: string[];
  qualityScore: number;
}

export interface PublishingIssue {
  code: string;
  severity: PublishingSeverity;
  message: string;
  pageNumber?: number;
  sectionId?: string;
  autoFix?: string;
}

export interface PublishingPage {
  composition: PageComposition;
  plannedPage: PlannedPage | null;
  visualEstimate: VisualEstimate;
  grid: EditorialGridPlan;
  magazine: MagazineCompositionPlan;
}

export interface PublishingOptimizationResult {
  pages: PageComposition[];
  metadata: Array<PlannedPage | null>;
  issues: PublishingIssue[];
  report: {
    pagesBefore: number;
    pagesAfter: number;
    averageOccupancy: number;
    visualRhythmScore: number;
    semanticContinuityScore: number;
    exportReadinessScore: number;
  };
}

export function sectionWords(section: ComposedSection): number {
  return String(section.content || '').split(/\s+/).filter(Boolean).length;
}

export function pageWords(page: PageComposition): number {
  return page.sections.reduce((sum, section) => sum + sectionWords(section), 0);
}
