import { Injectable, Logger } from '@nestjs/common';
import { PageComposition } from './document-composition.service';
import { PlannedPage } from './rule-based-page-planner.service';
import { SmartAutoFlowEngineService } from './smart-auto-flow-engine.service';
import { EditorialGridEngineService } from './editorial-grid-engine.service';
import { MagazineLayoutEngineService } from './magazine-layout-engine.service';
import { PaginationIntelligenceService } from './pagination-intelligence.service';
import {
  PublishingIssue,
  PublishingOptimizationResult,
} from './publishing-intelligence.types';

@Injectable()
export class PublishingIntelligenceService {
  private readonly logger = new Logger(PublishingIntelligenceService.name);

  constructor(
    private readonly autoFlow: SmartAutoFlowEngineService,
    private readonly gridEngine: EditorialGridEngineService,
    private readonly magazineEngine: MagazineLayoutEngineService,
    private readonly pagination: PaginationIntelligenceService,
  ) {}

  optimize(
    composedPages: Array<{ plannedPage: PlannedPage; composition: PageComposition }>,
    options: { documentType?: string; visualStyle?: string; templateType?: string } = {},
  ): PublishingOptimizationResult {
    this.logger.log(`Publishing intelligence optimizing ${composedPages.length} pages`);

    const initialPages = composedPages.map(item => item.composition);
    const initialMeta = composedPages.map(item => item.plannedPage);

    const autoFlow = this.autoFlow.flow(initialPages, initialMeta);
    const issues: PublishingIssue[] = [...autoFlow.issues];

    const artDirected = autoFlow.pages.map((page, index) => {
      const visualEstimate = this.pagination.estimatePage(page);
      const grid = this.gridEngine.planGrid(page, visualEstimate.occupancy);
      const griddedPage = this.gridEngine.applyGrid(page, grid);
      const magazine = this.magazineEngine.compose(griddedPage, grid);
      const finalEstimate = this.pagination.estimatePage(magazine.page);

      if (finalEstimate.hasOverflow) {
        issues.push({
          code: 'VISUAL_OVERFLOW_RISK',
          severity: 'warning',
          pageNumber: index + 1,
          message: `Page ${index + 1} may overflow after magazine composition.`,
          autoFix: 'Pagination pass will attempt split',
        });
      }

      return {
        composition: {
          ...magazine.page,
          contentIntelligence: {
            grid,
            magazine: magazine.magazine,
            visualEstimate: finalEstimate,
            options,
          },
        } as PageComposition,
        plannedPage: autoFlow.metadata[index],
        visualEstimate: finalEstimate,
        grid,
        magazine: magazine.magazine,
      };
    });

    const secondPass = this.autoFlow.flow(
      artDirected.map(page => page.composition),
      artDirected.map(page => page.plannedPage),
    );
    issues.push(...secondPass.issues);

    const finalPages = secondPass.pages.map((page, index) => ({
      ...page,
      pageNumber: index + 1,
      sections: page.sections.map((section, sectionIndex) => ({
        ...section,
        id: `pub-page-${index + 1}-section-${sectionIndex}`,
      })),
    }));

    const estimates = finalPages.map(page => this.pagination.estimatePage(page));
    const averageOccupancy = estimates.length
      ? estimates.reduce((sum, estimate) => sum + estimate.occupancy, 0) / estimates.length
      : 0;
    const visualRhythmScore = artDirected.length
      ? artDirected.reduce((sum, page) => sum + page.grid.rhythmScore, 0) / artDirected.length
      : 100;
    const semanticContinuityScore = this.pagination.scoreContinuity(finalPages, secondPass.metadata);
    const exportReadinessScore = this.scoreExportReadiness(estimates, issues);

    this.logger.log(
      `Publishing intelligence complete: ${initialPages.length} → ${finalPages.length} pages, readiness ${exportReadinessScore}/100`,
    );

    return {
      pages: finalPages,
      metadata: secondPass.metadata,
      issues,
      report: {
        pagesBefore: initialPages.length,
        pagesAfter: finalPages.length,
        averageOccupancy: Math.round(averageOccupancy * 100),
        visualRhythmScore: Math.round(visualRhythmScore),
        semanticContinuityScore,
        exportReadinessScore,
      },
    };
  }

  private scoreExportReadiness(estimates: ReturnType<PaginationIntelligenceService['estimatePage']>[], issues: PublishingIssue[]): number {
    let score = 100;
    score -= estimates.filter(estimate => estimate.hasOverflow).length * 18;
    score -= estimates.filter(estimate => estimate.isUnderfilled).length * 10;
    score -= estimates.filter(estimate => estimate.hasOrphanHeading).length * 14;
    score -= issues.filter(issue => issue.severity === 'warning').length * 3;
    score -= issues.filter(issue => issue.severity === 'error').length * 10;
    score -= issues.filter(issue => issue.severity === 'blocking').length * 25;
    return Math.max(0, Math.min(100, Math.round(score)));
  }
}
