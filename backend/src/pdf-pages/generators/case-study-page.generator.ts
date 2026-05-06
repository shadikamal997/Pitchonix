import { BasePageGenerator, PageContent } from './base-page.generator';
import { WizardInput } from '../../generation/slide-types/types';

export interface CaseStudyData {
  customerName: string;
  industry: string;
  challenge: string;
  solution: string;
  results: string[];
  metrics?: {
    label: string;
    value: string;
  }[];
  quote?: string;
  quoteAuthor?: string;
}

export class CaseStudyPageGenerator extends BasePageGenerator {
  readonly type = 'CASE_STUDY';
  readonly layout = 'two-column' as const;

  generate(input: WizardInput, pageNumber: number, caseStudyData?: CaseStudyData): PageContent {
    const page = this.createBasePage(pageNumber, this.type, this.layout);

    page.title = 'Case Study';
    page.subtitle = 'Client Success Story';

    const caseStudy = caseStudyData || this.generateDefaultCaseStudy(input);

    page.content = {
      customerName: caseStudy.customerName,
      industry: caseStudy.industry,
      sections: [
        {
          heading: 'The Challenge',
          content: caseStudy.challenge,
        },
        {
          heading: 'Our Solution',
          content: caseStudy.solution,
        },
        {
          heading: 'Results',
          content: '',
          bullets: caseStudy.results,
        },
      ],
      metrics: caseStudy.metrics || [],
      quote: caseStudy.quote,
      quoteAuthor: caseStudy.quoteAuthor,
    };

    return page;
  }

  private generateDefaultCaseStudy(input: WizardInput): CaseStudyData {
    return {
      customerName: 'Leading Enterprise Client',
      industry: input.industry || 'Technology',
      challenge: input.problem || 'Customer faced significant operational challenges that impacted efficiency and growth.',
      solution: input.solution || 'We implemented our comprehensive solution to address their key pain points.',
      results: [
        '50% improvement in efficiency',
        '$1M+ cost savings annually',
        '95% customer satisfaction rate',
        'ROI achieved in 6 months'
      ],
      metrics: [
        { label: 'Efficiency Gain', value: '50%' },
        { label: 'Cost Savings', value: '$1M+' },
        { label: 'Time to Value', value: '6 months' },
      ],
      quote: 'This solution transformed our business operations and exceeded our expectations.',
      quoteAuthor: 'CEO, Client Company',
    };
  }
}
