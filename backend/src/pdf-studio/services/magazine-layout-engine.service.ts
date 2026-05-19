import { Injectable } from '@nestjs/common';
import { PageComposition } from './document-composition.service';
import { EditorialGridPlan, MagazineCompositionPlan } from './publishing-intelligence.types';

@Injectable()
export class MagazineLayoutEngineService {
  compose(page: PageComposition, grid: EditorialGridPlan): { page: PageComposition; magazine: MagazineCompositionPlan } {
    const magazine = this.planMagazineComposition(page, grid);
    const composed = this.applyMagazineDirection(page, magazine);
    return { page: composed, magazine };
  }

  private planMagazineComposition(page: PageComposition, grid: EditorialGridPlan): MagazineCompositionPlan {
    const title = page.sections.find(section => section.type === 'heading')?.content || '';
    const text = page.sections.map(section => section.content).join(' ');
    const quote = page.sections.find(section => section.type === 'quote')?.content || this.extractPullQuote(text);
    const metric = this.extractMetric(text);
    const hasTimeline = /roadmap|timeline|milestone|phase|launch|quarter/i.test(`${title} ${text}`);
    const hasCaseStudy = /challenge|solution|result|customer|case study/i.test(`${title} ${text}`);
    const hasProduct = /product|feature|platform|capability|showcase/i.test(`${title} ${text}`);
    const hasAnalytics = !!metric || page.sections.some(section => section.type === 'metric' || section.type === 'chart');

    let archetype: MagazineCompositionPlan['archetype'] = 'standard';
    if (page.layout === 'cover') archetype = 'cover';
    else if (hasTimeline) archetype = 'roadmap';
    else if (hasCaseStudy) archetype = 'case-study';
    else if (hasAnalytics) archetype = 'analytics';
    else if (hasProduct) archetype = 'product-showcase';
    else if (quote) archetype = 'quote-spread';
    else if (grid.gridType === 'asymmetric' || grid.gridType === 'sidebar') archetype = 'editorial-article';
    else if (grid.gridType === 'image-heavy') archetype = 'feature-callout';

    return {
      archetype,
      visualTone: hasAnalytics ? 'data-rich' : archetype === 'cover' || archetype === 'quote-spread' ? 'cinematic' : grid.columns > 1 ? 'editorial' : 'structured',
      pullQuote: quote,
      highlightedMetric: metric,
      sidebarSections: this.pickSidebarSections(page),
      qualityScore: this.score(archetype, grid, page),
    };
  }

  private applyMagazineDirection(page: PageComposition, magazine: MagazineCompositionPlan): PageComposition {
    return {
      ...page,
      sections: page.sections.map((section, index) => {
        if (section.type === 'heading') {
          return {
            ...section,
            visualWeight: Math.max(section.visualWeight, magazine.archetype === 'editorial-article' ? 92 : 86),
            fontSize: magazine.archetype === 'cover' ? 2.8 : magazine.archetype === 'quote-spread' ? 2.15 : 1.95,
            lineHeight: 1.08,
            spaceBefore: index === 0 ? 0 : 32,
            spaceAfter: 24,
          };
        }
        if (section.type === 'quote') {
          return { ...section, visualWeight: 88, fontSize: 1.45, lineHeight: 1.25, spaceBefore: 24, spaceAfter: 28 };
        }
        if (section.type === 'metric') {
          return { ...section, visualWeight: 82, fontSize: 1.35, lineHeight: 1.18, spaceBefore: 16, spaceAfter: 20 };
        }
        if (section.type === 'paragraph' && index === 1 && magazine.archetype === 'editorial-article') {
          return { ...section, visualWeight: 70, fontSize: 1.08, lineHeight: 1.58, spaceBefore: 8, spaceAfter: 24 };
        }
        return section;
      }),
      metrics: {
        ...page.metrics,
        visualBalanceScore: Math.round((page.metrics.visualBalanceScore + magazine.qualityScore) / 2),
        overallQuality: Math.round((page.metrics.overallQuality + magazine.qualityScore) / 2),
      },
    };
  }

  private extractPullQuote(text: string): string | undefined {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
    const candidate = sentences.find(sentence => sentence.length >= 80 && sentence.length <= 180);
    return candidate?.trim();
  }

  private extractMetric(text: string): string | undefined {
    return text.match(/\b\d+(?:\.\d+)?\s?(?:%|x|k|m|b|million|billion|users|customers|revenue)\b/i)?.[0];
  }

  private pickSidebarSections(page: PageComposition): string[] {
    return page.sections
      .filter(section => ['quote', 'metric', 'list'].includes(section.type) || section.visualWeight > 72)
      .slice(0, 3)
      .map(section => section.id);
  }

  private score(archetype: MagazineCompositionPlan['archetype'], grid: EditorialGridPlan, page: PageComposition): number {
    let score = 72;
    if (archetype !== 'standard') score += 10;
    if (grid.rhythmScore > 85) score += 8;
    if (page.sections.some(section => section.type === 'heading')) score += 5;
    if (page.sections.some(section => ['quote', 'metric', 'chart', 'image'].includes(section.type))) score += 5;
    return Math.min(100, score);
  }
}
