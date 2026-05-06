import { BasePageGenerator, PageContent } from './base-page.generator';
import { WizardInput } from '../../generation/slide-types/types';

export class CoverPageGenerator extends BasePageGenerator {
  readonly type = 'COVER';
  readonly layout = 'cover' as const;

  generate(input: WizardInput, pageNumber: number): PageContent {
    const page = this.createBasePage(pageNumber, this.type, this.layout);

    page.title = input.companyName || 'Business Document';
    page.subtitle = this.getSubtitle(input);
    page.content = {
      companyName: input.companyName || '',
      tagline: input.shortDescription || input.problem?.substring(0, 100) || '',
      logo: input.logo || null,
      date: new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      documentType: this.formatDocumentType(input.documentType),
    };

    return page;
  }

  private getSubtitle(input: WizardInput): string {
    if (input.shortDescription) return input.shortDescription;
    if (input.problem) return input.problem.substring(0, 150);
    return 'Professional Business Document';
  }

  private formatDocumentType(type: string): string {
    const typeMap: Record<string, string> = {
      business_plan: 'Business Plan',
      proposal: 'Business Proposal',
      company_profile: 'Company Profile',
      executive_summary: 'Executive Summary',
      marketing_plan: 'Marketing Plan',
      financial_projection: 'Financial Projections',
      case_study: 'Case Study',
      internal_report: 'Internal Report',
      partnership_proposal: 'Partnership Proposal',
      one_pager: 'One Pager',
    };
    return typeMap[type] || 'Business Document';
  }
}
