import { Injectable } from '@nestjs/common';
import { PageComposition } from './document-composition.service';
import { PlannedPage } from './rule-based-page-planner.service';
import { PaginationIntelligenceService } from './pagination-intelligence.service';
import { PublishingIssue } from './publishing-intelligence.types';

@Injectable()
export class SmartAutoFlowEngineService {
  constructor(private readonly pagination: PaginationIntelligenceService) {}

  flow(
    pages: PageComposition[],
    metadata: Array<PlannedPage | null>,
  ): { pages: PageComposition[]; metadata: Array<PlannedPage | null>; issues: PublishingIssue[] } {
    const normalized = this.normalizeContinuations(pages, metadata);
    const paginated = this.pagination.paginate(normalized.pages, normalized.metadata);
    return {
      pages: paginated.pages,
      metadata: this.normalizeContinuations(paginated.pages, paginated.metadata).metadata,
      issues: [...normalized.issues, ...paginated.issues],
    };
  }

  private normalizeContinuations(
    pages: PageComposition[],
    metadata: Array<PlannedPage | null>,
  ): { pages: PageComposition[]; metadata: Array<PlannedPage | null>; issues: PublishingIssue[] } {
    const issues: PublishingIssue[] = [];
    const nextMeta = metadata.map((meta, index) => {
      if (!meta) return meta;
      const previous = metadata[index - 1];
      const isContinuation = !!previous?.sectionId && previous.sectionId === meta.sectionId;
      if (isContinuation && !meta.isContinuation) {
        issues.push({
          code: 'AUTO_CONTINUATION_MARKED',
          severity: 'info',
          pageNumber: index + 1,
          message: `Page ${index + 1} was marked as a semantic continuation.`,
          autoFix: 'Continuation metadata normalized',
        });
      }
      return {
        ...meta,
        isContinuation: meta.isContinuation || isContinuation,
        pageIndexInSection: isContinuation ? (previous?.pageIndexInSection || 0) + 1 : meta.pageIndexInSection,
      };
    });

    return { pages, metadata: nextMeta, issues };
  }
}
