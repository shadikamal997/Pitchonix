import { Logger } from '@nestjs/common';
import { WizardInput } from '../generation/slide-types/types';
import { PageContent } from './generators/base-page.generator';
import { CoverPageGenerator } from './generators/cover-page.generator';
import { TableOfContentsGenerator } from './generators/toc-page.generator';
import { ExecutiveSummaryPageGenerator } from './generators/executive-summary-page.generator';
import { ContentPageGenerator } from './generators/content-page.generator';
import { FinancialTablePageGenerator } from './generators/financial-table-page.generator';
import { TimelinePageGenerator } from './generators/timeline-page.generator';
import { CaseStudyPageGenerator } from './generators/case-study-page.generator';
import { ConclusionPageGenerator } from './generators/conclusion-page.generator';

export type PageType =
  | 'COVER'
  | 'TABLE_OF_CONTENTS'
  | 'EXECUTIVE_SUMMARY'
  | 'COMPANY_OVERVIEW'
  | 'PROBLEM'
  | 'SOLUTION'
  | 'MARKET_ANALYSIS'
  | 'COMPETITION'
  | 'BUSINESS_MODEL'
  | 'MARKETING_STRATEGY'
  | 'FINANCIAL_PROJECTIONS'
  | 'TIMELINE'
  | 'CASE_STUDY'
  | 'TEAM'
  | 'CONCLUSION';

export interface PageGenerationPlan {
  documentType: string;
  pages: PageType[];
}

export class PageFactory {
  private readonly logger = new Logger(PageFactory.name);
  private coverGenerator = new CoverPageGenerator();
  private tocGenerator = new TableOfContentsGenerator();
  private executiveSummaryGenerator = new ExecutiveSummaryPageGenerator();
  private contentGenerator = new ContentPageGenerator();
  private financialTableGenerator = new FinancialTablePageGenerator();
  private timelineGenerator = new TimelinePageGenerator();
  private caseStudyGenerator = new CaseStudyPageGenerator();
  private conclusionGenerator = new ConclusionPageGenerator();

  /**
   * Generate all pages for a PDF document based on document type
   */
  async generatePages(documentType: string, input: WizardInput): Promise<PageContent[]> {
    const pageTypes = this.getPageTypesForDocument(documentType);
    const pages: PageContent[] = [];

    let pageNumber = 1;

    for (const pageType of pageTypes) {
      const page = await this.generatePage(pageType, input, pageNumber);
      if (page) {
        pages.push(page);
        pageNumber++;
      }
    }

    return pages;
  }

  /**
   * Generate a single page
   */
  private async generatePage(
    pageType: PageType,
    input: WizardInput,
    pageNumber: number,
  ): Promise<PageContent | null> {
    try {
      switch (pageType) {
        case 'COVER':
          return this.coverGenerator.generate(input, pageNumber);

        case 'TABLE_OF_CONTENTS':
          return this.tocGenerator.generate(input, pageNumber);

        case 'EXECUTIVE_SUMMARY':
          return this.executiveSummaryGenerator.generate(input, pageNumber);

        case 'COMPANY_OVERVIEW':
          return this.contentGenerator.generateCompanyOverviewPage(input, pageNumber);

        case 'PROBLEM':
          return this.contentGenerator.generateProblemPage(input, pageNumber);

        case 'SOLUTION':
          return this.contentGenerator.generateSolutionPage(input, pageNumber);

        case 'MARKET_ANALYSIS':
          return this.contentGenerator.generateMarketAnalysisPage(input, pageNumber);

        case 'COMPETITION':
          return this.generateCompetitionPage(input, pageNumber);

        case 'BUSINESS_MODEL':
          return this.generateBusinessModelPage(input, pageNumber);

        case 'MARKETING_STRATEGY':
          return this.generateMarketingStrategyPage(input, pageNumber);

        case 'FINANCIAL_PROJECTIONS':
          return this.financialTableGenerator.generate(input, pageNumber);

        case 'TIMELINE':
          return this.timelineGenerator.generate(input, pageNumber);

        case 'CASE_STUDY':
          return this.caseStudyGenerator.generate(input, pageNumber);

        case 'TEAM':
          return this.generateTeamPage(input, pageNumber);

        case 'CONCLUSION':
          return this.conclusionGenerator.generate(input, pageNumber);

        default:
          this.logger.warn(`Unknown page type: ${pageType}`);
          return null;
      }
    } catch (error) {
      this.logger.error(`Error generating page ${pageType}:`, error);
      return null;
    }
  }

  /**
   * Get page types for a specific document type
   */
  getPageTypesForDocument(documentType: string): PageType[] {
    const templates: Record<string, PageType[]> = {
      business_plan: [
        'COVER',
        'TABLE_OF_CONTENTS',
        'EXECUTIVE_SUMMARY',
        'COMPANY_OVERVIEW',
        'PROBLEM',
        'SOLUTION',
        'MARKET_ANALYSIS',
        'COMPETITION',
        'BUSINESS_MODEL',
        'MARKETING_STRATEGY',
        'FINANCIAL_PROJECTIONS',
        'TIMELINE',
        'TEAM',
        'CONCLUSION',
      ],
      proposal: [
        'COVER',
        'EXECUTIVE_SUMMARY',
        'PROBLEM',
        'SOLUTION',
        'BUSINESS_MODEL',
        'TIMELINE',
        'FINANCIAL_PROJECTIONS',
        'CONCLUSION',
      ],
      company_profile: [
        'COVER',
        'COMPANY_OVERVIEW',
        'PROBLEM',
        'SOLUTION',
        'MARKET_ANALYSIS',
        'TEAM',
        'CASE_STUDY',
        'CONCLUSION',
      ],
      executive_summary: [
        'COVER',
        'EXECUTIVE_SUMMARY',
        'MARKET_ANALYSIS',
        'BUSINESS_MODEL',
        'FINANCIAL_PROJECTIONS',
        'CONCLUSION',
      ],
      marketing_plan: [
        'COVER',
        'TABLE_OF_CONTENTS',
        'EXECUTIVE_SUMMARY',
        'MARKET_ANALYSIS',
        'COMPETITION',
        'MARKETING_STRATEGY',
        'TIMELINE',
        'FINANCIAL_PROJECTIONS',
        'CONCLUSION',
      ],
      financial_projection: [
        'COVER',
        'EXECUTIVE_SUMMARY',
        'BUSINESS_MODEL',
        'FINANCIAL_PROJECTIONS',
        'TIMELINE',
        'CONCLUSION',
      ],
      case_study: [
        'COVER',
        'EXECUTIVE_SUMMARY',
        'PROBLEM',
        'SOLUTION',
        'CASE_STUDY',
        'CONCLUSION',
      ],
      internal_report: [
        'COVER',
        'TABLE_OF_CONTENTS',
        'EXECUTIVE_SUMMARY',
        'MARKET_ANALYSIS',
        'FINANCIAL_PROJECTIONS',
        'TIMELINE',
        'CONCLUSION',
      ],
      partnership_proposal: [
        'COVER',
        'EXECUTIVE_SUMMARY',
        'COMPANY_OVERVIEW',
        'MARKET_ANALYSIS',
        'BUSINESS_MODEL',
        'CASE_STUDY',
        'CONCLUSION',
      ],
      one_pager: [
        'COVER',
        'PROBLEM',
        'SOLUTION',
        'MARKET_ANALYSIS',
      ],
    };

    return templates[documentType] || templates.business_plan;
  }

  /**
   * Helper page generators
   */
  private generateCompetitionPage(input: WizardInput, pageNumber: number): PageContent {
    // Parse competitors string into array
    const competitorsList = input.competitors 
      ? input.competitors.split(/[,\n]/).map(c => c.trim()).filter(c => c)
      : ['Competitor 1', 'Competitor 2', 'Competitor 3'];

    return this.contentGenerator.generate(input, pageNumber, {
      title: 'Competitive Analysis',
      subtitle: 'Market Position & Differentiation',
      sections: [
        {
          heading: 'Key Competitors',
          content: 'Analysis of the competitive landscape',
          bullets: competitorsList,
        },
        {
          heading: 'Our Competitive Advantage',
          content: input.differentiation || 'Unique positioning in the market',
          bullets: [],
        },
      ],
    });
  }

  private generateBusinessModelPage(input: WizardInput, pageNumber: number): PageContent {
    return this.contentGenerator.generate(input, pageNumber, {
      title: 'Business Model',
      subtitle: 'How We Create Value',
      sections: [
        {
          heading: 'Revenue Model',
          content: input.revenueModel || 'Description of revenue generation strategy',
          bullets: [],
        },
        {
          heading: 'Pricing Strategy',
          content: input.pricing || 'Competitive and value-based pricing',
          bullets: [],
        },
        {
          heading: 'Business Model Overview',
          content: input.revenueModel || 'Sustainable and scalable business approach',
          bullets: [],
        },
      ],
    });
  }

  private generateMarketingStrategyPage(input: WizardInput, pageNumber: number): PageContent {
    return this.contentGenerator.generate(input, pageNumber, {
      title: 'Marketing Strategy',
      subtitle: 'Go-to-Market Approach',
      sections: [
        {
          heading: 'Target Audience',
          content: input.targetCustomers || 'Defined customer segments',
          bullets: [],
        },
        {
          heading: 'Marketing Channels',
          content: input.roadmap || 'Multi-channel marketing approach',
          bullets: [
            'Digital marketing',
            'Content marketing',
            'Strategic partnerships',
            'Direct sales'
          ],
        },
        {
          heading: 'Customer Acquisition',
          content: 'Strategy for acquiring and retaining customers',
          bullets: [],
        },
      ],
    });
  }

  private generateTeamPage(input: WizardInput, pageNumber: number): PageContent {
    // Parse team string into sections
    const teamText = input.team || 'Experienced leadership team with proven track record';
    const teamLines = teamText.split('\n').filter(line => line.trim());
    
    return this.contentGenerator.generate(input, pageNumber, {
      title: 'Our Team',
      subtitle: 'Leadership & Expertise',
      sections: [
        {
          heading: 'Team Overview',
          content: teamText,
          bullets: teamLines.length > 1 ? teamLines : [
            'Experienced leadership',
            'Industry expertise',
            'Proven track record'
          ],
        },
      ],
    });
  }
}
