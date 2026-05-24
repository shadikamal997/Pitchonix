import { SlideType, WizardInput } from './types';
import { BaseSlideGenerator } from './base-slide.generator';

// =============================================================================
//  Specialized Slide Generators — Phase 32.75 Tier 9 cleanup
//
//  Visual layout for every generator below is supplied by the Tier 6 smart
//  components (processFlow, financialDashboard, caseStudyBlock,
//  companyOverviewBlock). The synthetic channel / projection / customer
//  data the helpers used to fabricate has been deleted — smart components
//  carry the layout, and any user-supplied data flows through the wizard's
//  `input.structured.X` path which is unaffected.
// =============================================================================

/** Go-to-Market — uses processFlow smart component. */
export class GoToMarketSlideGenerator extends BaseSlideGenerator {
  type = SlideType.GO_TO_MARKET;
  defaultPriority = 11;
  protected usesSmartComponent() { return true; }

  isApplicable(input: WizardInput): boolean {
    return (
      input.documentType === 'business_plan' ||
      (input.contentDepth === 'detailed' && !!input.targetCustomers)
    );
  }
  getTitle(_input: WizardInput): string    { return 'Go-to-Market Strategy'; }
  getSubtitle(_input: WizardInput): string { return 'How we acquire customers'; }

  generateContent(input: WizardInput): any {
    return {
      targetCustomers: input.targetCustomers || 'B2B SaaS companies',
      description: input.targetCustomers || '',
    };
  }

  getSpeakerNotes(_input: WizardInput): string {
    return `Explain customer acquisition strategy. Show understanding of target market. ` +
           `Detail specific channels and tactics. Demonstrate realistic CAC and LTV assumptions.`;
  }
}

/** Financials — uses financialDashboard smart component. */
export class FinancialsSlideGenerator extends BaseSlideGenerator {
  type = SlideType.FINANCIALS;
  defaultPriority = 12;
  protected usesSmartComponent() { return true; }

  isApplicable(input: WizardInput): boolean { return input.includeFinancials === true; }
  getTitle(_input: WizardInput): string    { return 'Financial Projections'; }
  getSubtitle(_input: WizardInput): string { return '3-year outlook'; }

  generateContent(input: WizardInput): any {
    return {
      description: input.revenueModel || '3-year financial outlook',
    };
  }

  getSpeakerNotes(_input: WizardInput): string {
    return `Walk through financial model and key assumptions. Show path to profitability. ` +
           `Be prepared to discuss revenue drivers and cost structure. Emphasize unit economics.`;
  }
}

/** Case Study — uses caseStudyBlock smart component. */
export class CaseStudySlideGenerator extends BaseSlideGenerator {
  type = SlideType.CASE_STUDY;
  defaultPriority = 13;
  protected usesSmartComponent() { return true; }

  isApplicable(input: WizardInput): boolean {
    return (
      input.documentType === 'sales_deck' ||
      (!!input.traction && input.traction.toLowerCase().includes('customer'))
    );
  }
  getTitle(_input: WizardInput): string    { return 'Customer Success Story'; }
  getSubtitle(_input: WizardInput): string { return 'Real results, real impact'; }

  generateContent(input: WizardInput): any {
    return {
      industry: input.industry,
      description: input.traction || input.problem || '',
    };
  }

  getSpeakerNotes(_input: WizardInput): string {
    return `Tell a compelling customer story. Emphasize tangible results and ROI. ` +
           `Make it relatable to the audience. Use specific numbers and outcomes.`;
  }
}

/** Company Overview — uses companyOverviewBlock smart component. */
export class CompanyOverviewSlideGenerator extends BaseSlideGenerator {
  type = SlideType.COMPANY_OVERVIEW;
  defaultPriority = 2;
  protected usesSmartComponent() { return true; }

  isApplicable(input: WizardInput): boolean {
    return input.documentType === 'company_profile' || input.contentDepth === 'detailed';
  }
  getTitle(_input: WizardInput): string    { return 'About Us'; }
  getSubtitle(input: WizardInput): string  { return input.companyName; }

  generateContent(input: WizardInput): any {
    return {
      company:     input.companyName,
      industry:    input.industry,
      location:    input.country || 'United States',
      description: input.shortDescription || input.solution || '',
    };
  }

  getSpeakerNotes(_input: WizardInput): string {
    return `Provide company context and credibility. Keep it concise but compelling. ` +
           `Highlight key milestones and what makes the company unique.`;
  }
}
