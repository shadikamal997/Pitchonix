import { BasePageGenerator, PageContent } from './base-page.generator';
import { WizardInput } from '../../generation/slide-types/types';

export class ConclusionPageGenerator extends BasePageGenerator {
  readonly type = 'CONCLUSION';
  readonly layout = 'content' as const;

  generate(input: WizardInput, pageNumber: number): PageContent {
    const page = this.createBasePage(pageNumber, this.type, this.layout);

    page.title = 'Conclusion & Next Steps';
    page.subtitle = 'Moving Forward Together';
    page.content = {
      summary: this.generateSummary(input),
      keyTakeaways: this.generateKeyTakeaways(input),
      callToAction: this.generateCallToAction(input),
      contactInfo: this.generateContactInfo(input),
    };

    return page;
  }

  private generateSummary(input: WizardInput): string {
    const parts: string[] = [];

    if (input.companyName) {
      parts.push(`${input.companyName} represents a compelling opportunity`);
    } else {
      parts.push('This document presents a compelling opportunity');
    }

    if (input.marketOpportunity) {
      parts.push(`in the ${input.marketOpportunity} market.`);
    } else {
      parts.push('in a growing market.');
    }

    if (input.solution) {
      parts.push(`Our innovative solution addresses critical market needs and positions us for significant growth.`);
    }

    return parts.join(' ');
  }

  private generateKeyTakeaways(input: WizardInput): string[] {
    const takeaways: string[] = [];

    if (input.problem) {
      takeaways.push('Addressing a significant market problem with clear customer pain points');
    }

    if (input.solution) {
      takeaways.push('Proven solution with strong value proposition');
    }

    if (input.marketOpportunity) {
      takeaways.push('Large addressable market with substantial growth potential');
    }

    if (input.revenueModel) {
      takeaways.push('Sustainable and scalable business model');
    }

    if (input.traction) {
      takeaways.push('Strong traction and validated market demand');
    }

    if (input.team) {
      takeaways.push('Experienced team with proven track record');
    }

    // Ensure we have at least 3 takeaways
    if (takeaways.length < 3) {
      takeaways.push(
        'Strong competitive positioning',
        'Clear path to profitability',
        'Strategic execution plan'
      );
    }

    return takeaways.slice(0, 5);
  }

  private generateCallToAction(input: WizardInput): string {
    if (input.documentType === 'proposal' || input.documentType === 'partnership_proposal') {
      return 'We look forward to discussing how we can work together to achieve mutual success. Please contact us to schedule a meeting and explore this opportunity further.';
    }

    if (input.fundingAsk) {
      return `We are seeking ${input.fundingAsk} in funding to accelerate our growth and achieve our strategic milestones. Let's discuss how we can create value together.`;
    }

    return 'We invite you to join us on this journey. Contact us to learn more and discuss next steps.';
  }

  private generateContactInfo(input: WizardInput): {
    companyName?: string;
    email?: string;
    phone?: string;
    website?: string;
  } {
    return {
      companyName: input.companyName || '',
      email: 'info@company.com',
      phone: '',
      website: input.website || '',
    };
  }
}
