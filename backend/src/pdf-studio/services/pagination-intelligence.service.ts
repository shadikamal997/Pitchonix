import { Injectable } from '@nestjs/common';
import { ComposedSection, PageComposition } from './document-composition.service';
import { PlannedPage } from './rule-based-page-planner.service';
import { PublishingIssue, VisualEstimate, pageWords, sectionWords } from './publishing-intelligence.types';

@Injectable()
export class PaginationIntelligenceService {
  private readonly pageContentHeight = 930;
  private readonly minOccupancy = 0.32;
  private readonly maxOccupancy = 0.9;
  private readonly idealOccupancy = 0.72;

  estimatePage(page: PageComposition): VisualEstimate {
    const sectionHeights = page.sections.map(section => this.estimateSectionHeight(section));
    const contentHeight = sectionHeights.reduce((sum, height) => sum + height, 0);
    const occupancy = Math.max(0, Math.min(1.2, contentHeight / this.pageContentHeight));
    const wordCount = pageWords(page);
    const isCover = page.layout === 'cover';

    return {
      sectionHeights,
      contentHeight,
      occupancy,
      wordCount,
      hasOverflow: occupancy > this.maxOccupancy,
      isUnderfilled: !isCover && occupancy < this.minOccupancy && wordCount < 160,
      isHeadingOnly: !isCover && page.sections.length > 0 && page.sections.every(section => section.type === 'heading' || sectionWords(section) < 4),
      hasOrphanHeading: !isCover && this.hasOrphanHeading(page.sections),
    };
  }

  paginate(
    pages: PageComposition[],
    metadata: Array<PlannedPage | null>,
  ): { pages: PageComposition[]; metadata: Array<PlannedPage | null>; issues: PublishingIssue[] } {
    const issues: PublishingIssue[] = [];
    const expandedPages: PageComposition[] = [];
    const expandedMeta: Array<PlannedPage | null> = [];

    pages.forEach((page, index) => {
      if (this.isSpecial(page, metadata[index])) {
        expandedPages.push(page);
        expandedMeta.push(metadata[index]);
        return;
      }

      const splitPages = this.splitOverflowPage(page);
      splitPages.forEach((splitPage, splitIndex) => {
        expandedPages.push(splitPage);
        expandedMeta.push(this.metaForSplit(metadata[index], splitPage, splitIndex));
      });

      if (splitPages.length > 1) {
        issues.push({
          code: 'AUTO_SPLIT_OVERFLOW',
          severity: 'info',
          pageNumber: index + 1,
          message: `Page ${index + 1} was split to prevent overflow.`,
          autoFix: 'Split content at semantic block boundary',
        });
      }
    });

    const merged = this.mergeUnderfilledPages(expandedPages, expandedMeta, issues);
    const repaired = this.removeTrailingOrphanHeadings(merged.pages, merged.metadata, issues);

    const normalizedPages = repaired.pages.map((page, index) => ({
      ...page,
      pageNumber: index + 1,
      metrics: {
        ...page.metrics,
        densityScore: Math.round(this.estimatePage(page).occupancy * 100),
        whitespaceScore: Math.round((1 - Math.abs(this.idealOccupancy - this.estimatePage(page).occupancy)) * 100),
        overallQuality: Math.round((page.metrics.overallQuality + this.scorePage(page)) / 2),
      },
    }));

    return { pages: normalizedPages, metadata: repaired.metadata, issues };
  }

  scoreContinuity(pages: PageComposition[], metadata: Array<PlannedPage | null>): number {
    if (pages.length <= 1) return 100;
    let penalties = 0;
    for (let i = 1; i < pages.length; i++) {
      const prev = metadata[i - 1];
      const current = metadata[i];
      if (prev?.sectionId && current?.sectionId && prev.sectionId === current.sectionId && !current.isContinuation) penalties += 8;
      if (this.estimatePage(pages[i]).hasOrphanHeading) penalties += 12;
    }
    return Math.max(0, 100 - penalties);
  }

  private splitOverflowPage(page: PageComposition): PageComposition[] {
    page = {
      ...page,
      sections: this.splitOversizedSections(page.sections),
    };

    let estimate = this.estimatePage(page);
    if (!estimate.hasOverflow || page.sections.length <= 1) return [page];

    const pages: PageComposition[] = [];
    let current: ComposedSection[] = [];
    let currentHeight = 0;

    page.sections.forEach(section => {
      const height = this.estimateSectionHeight(section);
      const wouldOverflow = currentHeight + height > this.pageContentHeight * this.maxOccupancy;
      const canSplit = current.length > 0 && !this.endsWithOrphanHeading(current);

      if (wouldOverflow && current.length > 0) {
        if (!canSplit && current.length > 1) {
          const trailingHeading = current.pop()!;
          pages.push(this.cloneWithSections(page, current, pages.length));
          current = [trailingHeading];
          currentHeight = this.estimateSectionHeight(trailingHeading);
        } else if (canSplit) {
          pages.push(this.cloneWithSections(page, current, pages.length));
          current = [];
          currentHeight = 0;
        }
      }

      if (currentHeight + height > this.pageContentHeight * this.maxOccupancy && current.length > 0 && !this.endsWithOrphanHeading(current)) {
        pages.push(this.cloneWithSections(page, current, pages.length));
        current = [];
        currentHeight = 0;
      }

      current.push(section);
      currentHeight += height;
    });

    if (current.length) pages.push(this.cloneWithSections(page, current, pages.length));
    if (pages.length === 0) return [page];

    estimate = this.estimatePage(pages[pages.length - 1]);
    if (estimate.isHeadingOnly && pages.length > 1) {
      const orphan = pages.pop();
      pages[pages.length - 1] = this.cloneWithSections(
        pages[pages.length - 1],
        [...pages[pages.length - 1].sections, ...(orphan?.sections || [])],
        pages.length - 1,
      );
    }

    return pages;
  }

  private splitOversizedSections(sections: ComposedSection[]): ComposedSection[] {
    const maxSectionHeight = this.pageContentHeight * 0.62;
    const result: ComposedSection[] = [];

    sections.forEach(section => {
      const height = this.estimateSectionHeight(section);
      const words = String(section.content || '').split(/\s+/).filter(Boolean);
      const canSplit = ['paragraph', 'list', 'quote'].includes(section.type) && height > maxSectionHeight && words.length > 120;

      if (!canSplit) {
        result.push(section);
        return;
      }

      const targetWords = section.type === 'quote' ? 70 : section.type === 'list' ? 110 : 145;
      for (let i = 0; i < words.length; i += targetWords) {
        const chunk = words.slice(i, i + targetWords).join(' ');
        result.push({
          ...section,
          id: `${section.id}-flow-${Math.floor(i / targetWords)}`,
          content: i === 0 ? chunk : `${chunk}`,
          type: section.type === 'quote' && i > 0 ? 'paragraph' : section.type,
          spaceBefore: i === 0 ? section.spaceBefore : 8,
          spaceAfter: section.spaceAfter,
          visualWeight: i === 0 ? section.visualWeight : Math.max(35, section.visualWeight - 8),
        });
      }
    });

    return result;
  }

  private mergeUnderfilledPages(
    pages: PageComposition[],
    metadata: Array<PlannedPage | null>,
    issues: PublishingIssue[],
  ): { pages: PageComposition[]; metadata: Array<PlannedPage | null> } {
    const resultPages: PageComposition[] = [];
    const resultMeta: Array<PlannedPage | null> = [];

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const meta = metadata[i];
      const estimate = this.estimatePage(page);
      const previous = resultPages[resultPages.length - 1];
      const previousMeta = resultMeta[resultMeta.length - 1];

      if (!this.isSpecial(page, meta) && previous && !this.isSpecial(previous, previousMeta)) {
        const merged = this.cloneWithSections(previous, [...previous.sections, ...page.sections], resultPages.length - 1);
        const mergedEstimate = this.estimatePage(merged);
        if ((estimate.isUnderfilled || estimate.isHeadingOnly || estimate.hasOrphanHeading) && mergedEstimate.occupancy <= this.maxOccupancy) {
          resultPages[resultPages.length - 1] = merged;
          resultMeta[resultMeta.length - 1] = this.mergeMeta(previousMeta, meta, merged);
          issues.push({
            code: 'AUTO_MERGE_UNDERFILLED',
            severity: 'info',
            pageNumber: i + 1,
            message: `Page ${i + 1} was merged to remove weak underfilled pagination.`,
            autoFix: 'Merged with previous related page',
          });
          continue;
        }
      }

      if (!this.isSpecial(page, meta) && estimate.isHeadingOnly) {
        issues.push({
          code: 'AUTO_DROP_EMPTY_HEADING_PAGE',
          severity: 'warning',
          pageNumber: i + 1,
          message: `Page ${i + 1} only contained an isolated heading and was removed from the flow.`,
          autoFix: 'Removed heading-only page because no body content followed it',
        });
        continue;
      }

      resultPages.push(page);
      resultMeta.push(meta);
    }

    return { pages: resultPages, metadata: resultMeta };
  }

  private removeTrailingOrphanHeadings(
    pages: PageComposition[],
    metadata: Array<PlannedPage | null>,
    issues: PublishingIssue[],
  ): { pages: PageComposition[]; metadata: Array<PlannedPage | null> } {
    const resultPages: PageComposition[] = [];
    const resultMeta: Array<PlannedPage | null> = [];

    pages.forEach((page, index) => {
      if (this.isSpecial(page, metadata[index]) || !this.hasOrphanHeading(page.sections)) {
        resultPages.push(page);
        resultMeta.push(metadata[index]);
        return;
      }

      const sections = [...page.sections];
      const orphan = sections.pop();

      if (sections.length === 0) {
        issues.push({
          code: 'AUTO_DROP_EMPTY_HEADING_PAGE',
          severity: 'warning',
          pageNumber: index + 1,
          message: `Page ${index + 1} only contained an isolated heading and was removed from the flow.`,
          autoFix: 'Removed heading-only page because no body content followed it',
        });
        return;
      }

      resultPages.push(this.cloneWithSections(page, sections, index));
      resultMeta.push(this.mergeMeta(metadata[index], null, this.cloneWithSections(page, sections, index)));
      issues.push({
        code: 'AUTO_REMOVE_ORPHAN_HEADING',
        severity: 'warning',
        pageNumber: index + 1,
        message: `Removed isolated trailing heading "${orphan?.content}" from page ${index + 1}.`,
        autoFix: 'Removed a heading that had no following body content',
      });
    });

    return { pages: resultPages, metadata: resultMeta };
  }

  private estimateSectionHeight(section: ComposedSection): number {
    const words = sectionWords(section);
    const baseSpacing = (section.spaceBefore || 0) + (section.spaceAfter || 0);
    const fontPx = Math.max(12, (section.fontSize || 1) * 16);
    const charsPerLine = section.type === 'quote' ? 58 : section.type === 'list' ? 52 : 68;
    const lines = Math.max(1, Math.ceil(String(section.content || '').length / charsPerLine));
    const textHeight = lines * fontPx * (section.lineHeight || 1.45);

    if (section.type === 'heading') return baseSpacing + Math.max(44, textHeight);
    if (section.type === 'image') return baseSpacing + 220;
    if (section.type === 'chart') return baseSpacing + 240;
    if (section.type === 'metric') return baseSpacing + 130;
    if (section.type === 'quote') return baseSpacing + Math.max(92, textHeight + 28);
    if (section.type === 'list') return baseSpacing + Math.max(42, words * 5.4);
    return baseSpacing + textHeight;
  }

  private cloneWithSections(page: PageComposition, sections: ComposedSection[], splitIndex: number): PageComposition {
    return {
      ...page,
      sections: sections.map((section, index) => ({ ...section, id: `${page.pageNumber}-${splitIndex}-section-${index}` })),
      layout: page.layout,
      metrics: { ...page.metrics },
    };
  }

  private hasOrphanHeading(sections: ComposedSection[]): boolean {
    if (!sections.length) return false;
    const last = sections[sections.length - 1];
    return last.type === 'heading';
  }

  private endsWithOrphanHeading(sections: ComposedSection[]): boolean {
    return sections.length > 0 && sections[sections.length - 1].type === 'heading';
  }

  private isSpecial(page: PageComposition, meta?: PlannedPage | null): boolean {
    return page.layout === 'cover' || meta?.sectionType === 'cover' || meta?.sectionType === 'toc';
  }

  private metaForSplit(meta: PlannedPage | null, page: PageComposition, splitIndex: number): PlannedPage | null {
    if (!meta) return null;
    const contentText = page.sections.map(section => section.content).filter(Boolean).join('\n\n');
    return {
      ...meta,
      contentText,
      wordCount: contentText.split(/\s+/).filter(Boolean).length,
      isContinuation: meta.isContinuation || splitIndex > 0,
      pageIndexInSection: meta.pageIndexInSection + splitIndex,
      pageTitle: splitIndex > 0 ? `${meta.sectionTitle} (continued)` : meta.pageTitle,
    };
  }

  private mergeMeta(a: PlannedPage | null, b: PlannedPage | null, page: PageComposition): PlannedPage | null {
    if (!a && !b) return null;
    const base = a || b!;
    const contentText = page.sections.map(section => section.content).filter(Boolean).join('\n\n');
    return {
      ...base,
      contentText,
      wordCount: contentText.split(/\s+/).filter(Boolean).length,
      pageTitle: base.pageTitle || base.sectionTitle,
    };
  }

  private scorePage(page: PageComposition): number {
    const estimate = this.estimatePage(page);
    let score = 100 - Math.abs(this.idealOccupancy - estimate.occupancy) * 80;
    if (estimate.hasOverflow) score -= 25;
    if (estimate.isUnderfilled) score -= 18;
    if (estimate.hasOrphanHeading) score -= 20;
    return Math.max(0, Math.min(100, score));
  }
}
