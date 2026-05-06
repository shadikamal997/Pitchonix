import { BasePageGenerator, PageContent } from './base-page.generator';
import { WizardInput } from '../../generation/slide-types/types';

export interface TableOfContentsEntry {
  section: string;
  pageNumber: number;
}

export class TableOfContentsGenerator extends BasePageGenerator {
  readonly type = 'TABLE_OF_CONTENTS';
  readonly layout = 'content' as const;

  generate(input: WizardInput, pageNumber: number, sections?: TableOfContentsEntry[]): PageContent {
    const page = this.createBasePage(pageNumber, this.type, this.layout);

    page.title = 'Table of Contents';
    page.content = {
      sections: sections || this.generateDefaultSections(input),
    };

    return page;
  }

  private generateDefaultSections(input: WizardInput): TableOfContentsEntry[] {
    const sections: TableOfContentsEntry[] = [
      { section: 'Executive Summary', pageNumber: 3 },
    ];

    if (input.companyName || input.shortDescription) {
      sections.push({ section: 'Company Overview', pageNumber: sections.length + 3 });
    }

    if (input.problem) {
      sections.push({ section: 'Problem Statement', pageNumber: sections.length + 3 });
    }

    if (input.solution) {
      sections.push({ section: 'Solution', pageNumber: sections.length + 3 });
    }

    if (input.marketOpportunity) {
      sections.push({ section: 'Market Analysis', pageNumber: sections.length + 3 });
    }

    if (input.revenueModel || input.pricing) {
      sections.push({ section: 'Business Model', pageNumber: sections.length + 3 });
    }

    if (input.roadmap) {
      sections.push({ section: 'Marketing Strategy', pageNumber: sections.length + 3 });
    }

    if (input.includeFinancials) {
      sections.push({ section: 'Financial Projections', pageNumber: sections.length + 3 });
    }

    if (input.roadmap) {
      sections.push({ section: 'Roadmap', pageNumber: sections.length + 3 });
    }

    sections.push({ section: 'Conclusion', pageNumber: sections.length + 3 });

    return sections;
  }
}
