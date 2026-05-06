import { BasePageGenerator, PageContent } from './base-page.generator';
import { WizardInput } from '../../generation/slide-types/types';

export interface ContentPageOptions {
  title: string;
  subtitle?: string;
  sections?: Array<{
    heading: string;
    content: string;
    bullets?: string[];
  }>;
  bullets?: string[];
  text?: string;
}

export class ContentPageGenerator extends BasePageGenerator {
  readonly type = 'CONTENT';
  readonly layout = 'content' as const;

  generate(input: WizardInput, pageNumber: number, options?: ContentPageOptions): PageContent {
    const page = this.createBasePage(pageNumber, this.type, this.layout);

    if (options) {
      page.title = options.title;
      page.subtitle = options.subtitle;
      page.content = {
        sections: options.sections || [],
        bullets: options.bullets || [],
        text: options.text || '',
      };
    } else {
      // Default content page
      page.title = 'Content';
      page.content = {
        sections: [],
        bullets: [],
        text: '',
      };
    }

    return page;
  }

  /**
   * Create a problem statement page
   */
  generateProblemPage(input: WizardInput, pageNumber: number): PageContent {
    return this.generate(input, pageNumber, {
      title: 'Problem Statement',
      subtitle: 'The Challenge We Address',
      text: input.problem || 'Problem statement not provided.',
      bullets: [
        'Market inefficiencies',
        'Customer pain points',
        'Opportunity for innovation'
      ],
    });
  }

  /**
   * Create a solution page
   */
  generateSolutionPage(input: WizardInput, pageNumber: number): PageContent {
    return this.generate(input, pageNumber, {
      title: 'Our Solution',
      subtitle: 'How We Solve the Problem',
      text: input.solution || 'Solution description not provided.',
      bullets: [
        'Innovative approach',
        'Scalable solution',
        'Market-ready product'
      ],
    });
  }

  /**
   * Create a company overview page
   */
  generateCompanyOverviewPage(input: WizardInput, pageNumber: number): PageContent {
    const sections = [];

    if (input.companyName) {
      sections.push({
        heading: 'About ' + input.companyName,
        content: input.shortDescription || 'Leading company in our industry.',
        bullets: [],
      });
    }

    if (input.targetCustomers) {
      sections.push({
        heading: 'Target Audience',
        content: input.targetCustomers,
        bullets: [],
      });
    }

    if (input.differentiation) {
      sections.push({
        heading: 'Competitive Advantage',
        content: input.differentiation,
        bullets: [],
      });
    }

    return this.generate(input, pageNumber, {
      title: 'Company Overview',
      subtitle: input.companyName || 'About Us',
      sections,
    });
  }

  /**
   * Create a market analysis page
   */
  generateMarketAnalysisPage(input: WizardInput, pageNumber: number): PageContent {
    const sections = [];

    if (input.marketOpportunity) {
      sections.push({
        heading: 'Target Market',
        content: input.marketOpportunity,
        bullets: [],
      });
    }

    // Market size would need to be parsed from marketOpportunity string
    if (input.marketOpportunity) {
      sections.push({
        heading: 'Market Size',
        content: `Market Opportunity: ${input.marketOpportunity}`,
        bullets: [
          'Growing market opportunity',
          'Strong demand signals',
          'Expanding customer base',
        ],
      });
    }

    if (input.competitors) {
      const competitorsList = input.competitors.split(/[,\n]/).map(c => c.trim()).filter(c => c);
      sections.push({
        heading: 'Competitive Landscape',
        content: 'Analysis of key competitors in the market.',
        bullets: competitorsList,
      });
    }

    return this.generate(input, pageNumber, {
      title: 'Market Analysis',
      subtitle: 'Market Opportunity & Landscape',
      sections,
    });
  }
}
