import { SlideType, WizardInput } from './types';
import { BaseSlideGenerator } from './base-slide.generator';

/**
 * Go-to-Market Strategy Slide Generator
 * Marketing and sales strategy
 */
export class GoToMarketSlideGenerator extends BaseSlideGenerator {
  type = SlideType.GO_TO_MARKET;
  defaultPriority = 11;

  isApplicable(input: WizardInput): boolean {
    return (
      input.documentType === 'business_plan' ||
      (input.contentDepth === 'detailed' && !!input.targetCustomers)
    );
  }

  getTitle(input: WizardInput): string {
    return 'Go-to-Market Strategy';
  }

  getSubtitle(input: WizardInput): string {
    return 'How we acquire customers';
  }

  generateContent(input: WizardInput): any {
    return {
      targetCustomers: input.targetCustomers || 'B2B SaaS companies',
      channels: this.extractChannels(input),
      salesStrategy: this.extractSalesStrategy(input),
      marketingStrategy: this.extractMarketingStrategy(input),
      customerAcquisition: {
        cac: this.extractNumbers(input.revenueModel || '')[0]?.value || '$1,200',
        ltv: this.extractNumbers(input.revenueModel || '')[1]?.value || '$12,000',
        paybackPeriod: '10 months',
      },
      timeline: this.extractTimeline(input.roadmap || ''),
    };
  }

  getSpeakerNotes(input: WizardInput): string {
    return `Explain customer acquisition strategy. Show understanding of target market. ` +
           `Detail specific channels and tactics. Demonstrate realistic CAC and LTV assumptions.`;
  }

  private extractChannels(input: WizardInput): string[] {
    const defaultChannels = [
      'Content marketing & SEO',
      'LinkedIn & social media',
      'Partnerships',
      'Direct sales outreach',
    ];

    // Could extract from various input fields
    return defaultChannels;
  }

  private extractSalesStrategy(input: WizardInput): string {
    if (input.targetCustomers?.toLowerCase().includes('enterprise')) {
      return 'Enterprise sales with dedicated account executives';
    } else if (input.targetCustomers?.toLowerCase().includes('b2b')) {
      return 'Inside sales with product-led growth';
    }
    return 'Self-serve with sales-assist for larger deals';
  }

  private extractMarketingStrategy(input: WizardInput): string {
    return `Targeting ${input.targetCustomers || 'key customer segments'} through multiple channels`;
  }

  private extractTimeline(roadmap: string): string {
    return '12-month ramp to full execution';
  }
}

/**
 * Financials Slide Generator
 * P&L and financial projections
 */
export class FinancialsSlideGenerator extends BaseSlideGenerator {
  type = SlideType.FINANCIALS;
  defaultPriority = 12;

  isApplicable(input: WizardInput): boolean {
    return input.includeFinancials === true;
  }

  getTitle(input: WizardInput): string {
    return 'Financial Projections';
  }

  getSubtitle(input: WizardInput): string {
    return '3-year outlook';
  }

  generateContent(input: WizardInput): any {
    const currentYear = new Date().getFullYear();
    
    return {
      projections: this.generateProjections(input, currentYear),
      assumptions: this.extractAssumptions(input),
      breakeven: this.calculateBreakeven(input),
      keyMetrics: {
        grossMargin: '80%',
        operatingMargin: 'Break-even Year 3',
        burnRate: '$200K/month',
      },
      visualType: input.includeCharts ? 'financial_chart' : 'table',
    };
  }

  getSpeakerNotes(input: WizardInput): string {
    return `Walk through financial model and key assumptions. Show path to profitability. ` +
           `Be prepared to discuss revenue drivers and cost structure. Emphasize unit economics.`;
  }

  private generateProjections(input: WizardInput, startYear: number): any[] {
    // Simple projection model
    return [
      {
        year: startYear,
        revenue: '$500K',
        expenses: '$800K',
        ebitda: '-$300K',
        customers: 50,
      },
      {
        year: startYear + 1,
        revenue: '$2.5M',
        expenses: '$3M',
        ebitda: '-$500K',
        customers: 250,
      },
      {
        year: startYear + 2,
        revenue: '$8M',
        expenses: '$7.5M',
        ebitda: '+$500K',
        customers: 800,
      },
    ];
  }

  private extractAssumptions(input: WizardInput): string[] {
    return [
      'Average deal size from pricing tiers',
      '20% monthly growth in customer acquisition',
      '80% gross margins on SaaS revenue',
      '5% monthly churn rate',
    ];
  }

  private calculateBreakeven(input: WizardInput): string {
    return 'Month 24-30 based on growth trajectory';
  }
}

/**
 * Case Study Slide Generator
 * Customer success story
 */
export class CaseStudySlideGenerator extends BaseSlideGenerator {
  type = SlideType.CASE_STUDY;
  defaultPriority = 13;

  isApplicable(input: WizardInput): boolean {
    return (
      input.documentType === 'sales_deck' ||
      (!!input.traction && input.traction.toLowerCase().includes('customer'))
    );
  }

  getTitle(input: WizardInput): string {
    return 'Customer Success Story';
  }

  getSubtitle(input: WizardInput): string {
    return 'Real results, real impact';
  }

  generateContent(input: WizardInput): any {
    return {
      customer: this.extractCustomerName(input.traction || ''),
      industry: input.industry,
      challenge: this.extractChallenge(input),
      solution: this.extractSolutionApplied(input),
      results: this.extractResults(input),
      quote: this.generateQuote(input),
    };
  }

  getSpeakerNotes(input: WizardInput): string {
    return `Tell a compelling customer story. Emphasize tangible results and ROI. ` +
           `Make it relatable to the audience. Use specific numbers and outcomes.`;
  }

  private extractCustomerName(traction: string): string {
    // Try to extract company name from traction text
    const match = traction.match(/\b([A-Z][a-z]+ (?:Inc|Corp|LLC|Ltd)?)\b/);
    return match ? match[1] : 'Leading Enterprise Customer';
  }

  private extractChallenge(input: WizardInput): string {
    return input.problem?.substring(0, 150) || 'Facing operational inefficiencies';
  }

  private extractSolutionApplied(input: WizardInput): string {
    return `Implemented ${input.productService || 'our solution'} to address key pain points`;
  }

  private extractResults(input: WizardInput): any[] {
    const numbers = this.extractNumbers(input.traction || '');
    
    if (numbers.length > 0) {
      return numbers.slice(0, 3).map(num => ({
        metric: this.inferMetricLabel(num.context),
        value: num.value,
        improvement: '+' + this.estimateImprovement(num.value),
      }));
    }

    return [
      { metric: 'Efficiency', value: '3x faster', improvement: '+200%' },
      { metric: 'Cost Savings', value: '$500K/year', improvement: '-50%' },
      { metric: 'User Satisfaction', value: 'NPS 85', improvement: '+25 points' },
    ];
  }

  private inferMetricLabel(context: string): string {
    if (context.toLowerCase().includes('time')) return 'Time Savings';
    if (context.toLowerCase().includes('cost')) return 'Cost Reduction';
    if (context.toLowerCase().includes('revenue')) return 'Revenue Impact';
    if (context.toLowerCase().includes('user')) return 'User Growth';
    return 'Key Metric';
  }

  private estimateImprovement(value: string): string {
    const match = value.match(/(\d+)/);
    if (match) {
      const num = parseInt(match[1]);
      return num > 10 ? `${num}%` : `${num}x`;
    }
    return '2x';
  }

  private generateQuote(input: WizardInput): string {
    return `"${input.productService || 'This solution'} transformed how we work. The results exceeded our expectations."`;
  }
}

/**
 * Company Overview Slide Generator
 * Company background and history
 */
export class CompanyOverviewSlideGenerator extends BaseSlideGenerator {
  type = SlideType.COMPANY_OVERVIEW;
  defaultPriority = 2;

  isApplicable(input: WizardInput): boolean {
    return input.documentType === 'company_profile' || input.contentDepth === 'detailed';
  }

  getTitle(input: WizardInput): string {
    return 'About Us';
  }

  getSubtitle(input: WizardInput): string {
    return input.companyName;
  }

  generateContent(input: WizardInput): any {
    return {
      company: input.companyName,
      founded: this.extractFoundedYear(input),
      location: input.country || 'United States',
      industry: input.industry,
      description: input.shortDescription || input.solution,
      mission: `Transforming ${input.industry} through ${input.productService || 'innovation'}`,
      highlights: this.extractHighlights(input),
    };
  }

  getSpeakerNotes(input: WizardInput): string {
    return `Provide company context and credibility. Keep it concise but compelling. ` +
           `Highlight key milestones and what makes the company unique.`;
  }

  private extractFoundedYear(input: WizardInput): string {
    // Try to extract from traction or roadmap
    const text = (input.traction || '') + ' ' + (input.roadmap || '');
    const yearMatch = text.match(/\b(20\d{2})\b/);
    
    if (yearMatch) {
      return yearMatch[1];
    }

    // Default to recent year based on business stage
    const stageYears: Record<string, number> = {
      pre_seed: 0,
      seed: 1,
      early_stage: 2,
      growth: 3,
    };

    const yearsAgo = stageYears[input.businessStage || 'seed'] || 1;
    return (new Date().getFullYear() - yearsAgo).toString();
  }

  private extractHighlights(input: WizardInput): string[] {
    const highlights: string[] = [];

    if (input.traction) {
      const numbers = this.extractNumbers(input.traction);
      if (numbers.length > 0) {
        highlights.push(`${numbers[0].value} ${numbers[0].context}`);
      }
    }

    if (input.team && input.team.toLowerCase().includes('experienced')) {
      highlights.push('Experienced leadership team');
    }

    if (input.fundingAsk) {
      highlights.push('Backed by leading investors');
    }

    return highlights.length > 0 ? highlights : ['Innovative', 'Fast-growing', 'Customer-focused'];
  }
}
