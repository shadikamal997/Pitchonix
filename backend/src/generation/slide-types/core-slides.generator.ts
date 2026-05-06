import { SlideType, WizardInput } from './types';
import { BaseSlideGenerator } from './base-slide.generator';

/**
 * Business Model Slide Generator
 * Explains revenue model and pricing
 */
export class BusinessModelSlideGenerator extends BaseSlideGenerator {
  type = SlideType.BUSINESS_MODEL;
  defaultPriority = 5;

  isApplicable(input: WizardInput): boolean {
    return !!(input.revenueModel || input.pricing);
  }

  getTitle(input: WizardInput): string {
    return 'Business Model';
  }

  getSubtitle(input: WizardInput): string {
    return 'How we make money';
  }

  generateContent(input: WizardInput): any {
    const pricingTiers = this.extractPricingTiers(input.pricing || '');
    const metrics = this.extractUnitEconomics(input.revenueModel || '', input.pricing || '');

    return {
      description: input.revenueModel || 'Revenue model',
      model: this.determineModel(input.revenueModel || ''),
      pricing: pricingTiers,
      metrics,
      monetization: this.extractMonetizationStreams(input.revenueModel || ''),
      visualType: input.includeCharts ? 'pricing_table' : 'text',
    };
  }

  getSpeakerNotes(input: WizardInput): string {
    return `Explain the business model clearly and demonstrate unit economics. ` +
           `Walk through pricing tiers if applicable. Show path to profitability. ` +
           `Emphasize scalability and margins.`;
  }

  private determineModel(revenueModel: string): string {
    const models = {
      saas: /SaaS|subscription|recurring|monthly|annually/i,
      marketplace: /marketplace|commission|transaction|fee/i,
      licensing: /license|licensing|royalty/i,
      freemium: /freemium|free tier|premium/i,
      ecommerce: /e-commerce|retail|product sales/i,
    };

    for (const [model, pattern] of Object.entries(models)) {
      if (pattern.test(revenueModel)) {
        return model.charAt(0).toUpperCase() + model.slice(1);
      }
    }

    return 'Subscription-based';
  }

  private extractPricingTiers(pricing: string): any[] {
    if (!pricing) {
      return [
        { tier: 'Basic', price: '$99/mo', features: ['Core features', 'Email support'] },
        { tier: 'Pro', price: '$299/mo', features: ['Advanced features', 'Priority support', 'Analytics'] },
        { tier: 'Enterprise', price: 'Custom', features: ['Custom features', 'Dedicated support', 'SLA'] },
      ];
    }

    const numbers = this.extractNumbers(pricing);
    const tiers: any[] = [];

    // Try to parse pricing info
    if (numbers.length > 0) {
      numbers.forEach((num, i) => {
        tiers.push({
          tier: this.getTierName(i),
          price: num.value,
          features: [num.context],
        });
      });
    }

    return tiers.length > 0 ? tiers : this.extractPricingTiers('');
  }

  private getTierName(index: number): string {
    const names = ['Starter', 'Pro', 'Enterprise', 'Premium'];
    return names[index] || `Tier ${index + 1}`;
  }

  private extractUnitEconomics(revenueModel: string, pricing: string): any {
    const text = revenueModel + ' ' + pricing;
    const numbers = this.extractNumbers(text);

    return {
      ltv: numbers[0]?.value || '$12,000',
      cac: numbers[1]?.value || '$1,200',
      ratio: '10:1',
      grossMargin: '80%',
    };
  }

  private extractMonetizationStreams(revenueModel: string): string[] {
    const streams = this.formatBulletPoints(revenueModel, 3);
    return streams.length > 0 
      ? streams
      : ['Subscription fees', 'Premium features', 'Enterprise plans'];
  }
}

/**
 * Traction Slide Generator
 * Shows metrics, growth, and milestones
 */
export class TractionSlideGenerator extends BaseSlideGenerator {
  type = SlideType.TRACTION;
  defaultPriority = 6;

  isApplicable(input: WizardInput): boolean {
    return !!input.traction && input.traction.trim().length > 0;
  }

  getTitle(input: WizardInput): string {
    return 'Traction & Metrics';
  }

  getSubtitle(input: WizardInput): string {
    return 'Our progress so far';
  }

  generateContent(input: WizardInput): any {
    const numbers = this.extractNumbers(input.traction || '');
    const milestones = this.extractMilestones(input.traction || '');

    return {
      description: input.traction,
      metrics: this.formatMetrics(numbers),
      milestones,
      growth: this.extractGrowthRate(input.traction || ''),
      validation: this.extractValidation(input.traction || ''),
      visualType: input.includeCharts ? 'growth_chart' : 'metrics_grid',
    };
  }

  getSpeakerNotes(input: WizardInput): string {
    return `Highlight key metrics and show momentum. Emphasize growth trajectory. ` +
           `Reference specific numbers and milestones. Show product-market fit validation.`;
  }

  private formatMetrics(numbers: { value: string; context: string }[]): any[] {
    if (numbers.length === 0) {
      return [
        { label: 'Active Users', value: '1,000+', trend: '+150%' },
        { label: 'MRR', value: '$50K', trend: '+200%' },
        { label: 'NPS Score', value: '72', trend: '+5' },
      ];
    }

    return numbers.slice(0, 6).map((num, i) => ({
      label: this.inferMetricLabel(num.context, i),
      value: num.value,
      trend: '+' + (100 + i * 20) + '%',
    }));
  }

  private inferMetricLabel(context: string, index: number): string {
    const labels: Record<string, string> = {
      user: 'Active Users',
      customer: 'Customers',
      revenue: 'Revenue',
      mrr: 'MRR',
      arr: 'ARR',
      growth: 'Growth Rate',
    };

    for (const [key, label] of Object.entries(labels)) {
      if (context.toLowerCase().includes(key)) {
        return label;
      }
    }

    return ['Users', 'Revenue', 'Growth', 'Retention', 'NPS', 'Engagement'][index] || 'Metric';
  }

  private extractMilestones(traction: string): any[] {
    const sentences = traction.split(/[.!?]/).filter(s => s.trim().length > 10);
    return sentences.slice(0, 4).map((event, i) => ({
      date: this.estimateDate(i),
      event: event.trim(),
    }));
  }

  private estimateDate(index: number): string {
    const date = new Date();
    date.setMonth(date.getMonth() - (3 - index) * 3);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }

  private extractGrowthRate(traction: string): string {
    const match = traction.match(/(\d+)%\s*(growth|increase|up|MoM|YoY)/i);
    return match ? `${match[1]}% ${match[2]}` : '150% YoY growth';
  }

  private extractValidation(traction: string): string[] {
    const validations: string[] = [];
    const keywords = ['customer', 'user', 'revenue', 'partner', 'investor', 'award'];
    
    keywords.forEach(keyword => {
      if (traction.toLowerCase().includes(keyword)) {
        validations.push(`${keyword.charAt(0).toUpperCase() + keyword.slice(1)} validation`);
      }
    });

    return validations.length > 0 
      ? validations.slice(0, 3)
      : ['Market validation', 'Product-market fit', 'Strong retention'];
  }
}

/**
 * Team Slide Generator
 * Showcases the team and advisors
 */
export class TeamSlideGenerator extends BaseSlideGenerator {
  type = SlideType.TEAM;
  defaultPriority = 7;

  isApplicable(input: WizardInput): boolean {
    return !!input.team && input.team.trim().length > 0;
  }

  getTitle(input: WizardInput): string {
    return 'The Team';
  }

  getSubtitle(input: WizardInput): string {
    return 'Who we are';
  }

  generateContent(input: WizardInput): any {
    const members = this.parseTeamMembers(input.team || '');

    return {
      description: input.team,
      members,
      highlights: this.extractHighlights(input.team || ''),
      culture: this.extractCulture(input.team || ''),
      advisors: this.extractAdvisors(input.team || ''),
    };
  }

  getSpeakerNotes(input: WizardInput): string {
    return `Introduce key team members and highlight relevant experience. ` +
           `Emphasize why this team is uniquely positioned to execute. ` +
           `Mention advisors and notable backgrounds.`;
  }

  private parseTeamMembers(team: string): any[] {
    // Try to parse team member info
    const sentences = team.split(/[.;]/).filter(s => s.trim().length > 10);
    
    return sentences.slice(0, 5).map((member, i) => ({
      name: this.extractName(member) || `Team Member ${i + 1}`,
      role: this.extractRole(member, i),
      background: member.trim().substring(0, 100),
    }));
  }

  private extractName(text: string): string | null {
    // Simple name extraction - looks for capitalized words at start
    const match = text.match(/^([A-Z][a-z]+ [A-Z][a-z]+)/);
    return match ? match[1] : null;
  }

  private extractRole(text: string, index: number): string {
    const roles = ['CEO', 'CTO', 'CFO', 'COO', 'VP Product', 'VP Engineering'];
    const roleKeywords: Record<string, string> = {
      ceo: 'CEO',
      founder: 'Founder',
      cto: 'CTO',
      technology: 'CTO',
      cfo: 'CFO',
      finance: 'CFO',
      engineer: 'VP Engineering',
      product: 'VP Product',
      marketing: 'CMO',
      sales: 'VP Sales',
    };

    for (const [keyword, role] of Object.entries(roleKeywords)) {
      if (text.toLowerCase().includes(keyword)) {
        return role;
      }
    }

    return roles[index] || 'Team Member';
  }

  private extractHighlights(team: string): string[] {
    const highlights: string[] = [];
    const companies = team.match(/\b(Google|Facebook|Amazon|Microsoft|Apple|Netflix|Tesla|Uber|Airbnb|[A-Z][a-z]+)\b/g);
    
    if (companies && companies.length > 0) {
      highlights.push(`Alumni from ${companies.slice(0, 3).join(', ')}`);
    }

    const degrees = team.match(/\b(PhD|MBA|MS|BS|Stanford|MIT|Harvard|Berkeley)\b/gi);
    if (degrees && degrees.length > 0) {
      highlights.push('Top-tier education');
    }

    return highlights.length > 0 
      ? highlights 
      : ['Experienced team', 'Domain expertise', 'Proven track record'];
  }

  private extractCulture(team: string): string {
    return 'Mission-driven, collaborative, and innovative team culture';
  }

  private extractAdvisors(team: string): any[] {
    if (team.toLowerCase().includes('advisor')) {
      return [{ name: 'Strategic Advisors', background: 'Industry veterans' }];
    }
    return [];
  }
}

/**
 * Ask/Closing Slide Generator
 * The funding ask and call to action
 */
export class AskSlideGenerator extends BaseSlideGenerator {
  type = SlideType.ASK;
  defaultPriority = 100; // Usually last slide

  isApplicable(input: WizardInput): boolean {
    return input.documentType === 'pitch_deck' || !!input.fundingAsk;
  }

  getTitle(input: WizardInput): string {
    return input.fundingAsk ? 'The Ask' : 'Next Steps';
  }

  getSubtitle(input: WizardInput): string {
    return input.desiredAction || 'Join us on this journey';
  }

  generateContent(input: WizardInput): any {
    const amount = this.extractAmount(input.fundingAsk || '');
    const useOfFunds = this.extractUseOfFunds(input.fundingAsk || '');
    
    return {
      description: input.fundingAsk || input.desiredAction,
      amount,
      roundType: this.extractRoundType(input.fundingAsk || '', input.businessStage),
      useOfFunds,
      milestones: this.extractMilestones(input.fundingAsk || '', input.roadmap || ''),
      timeline: this.extractTimeline(input.fundingAsk || ''),
      contact: {
        company: input.companyName,
        website: input.website,
      },
    };
  }

  getSpeakerNotes(input: WizardInput): string {
    return `Clear call to action: ${input.desiredAction || 'investment ask'}. ` +
           `Reiterate key investment thesis. Be specific about amount and use of funds. ` +
           `End with confidence and open for questions.`;
  }

  private extractAmount(fundingAsk: string): string {
    const numbers = this.extractNumbers(fundingAsk);
    return numbers.length > 0 ? numbers[0].value : '$2M';
  }

  private extractRoundType(fundingAsk: string, businessStage?: string): string {
    const roundTypes = ['seed', 'series a', 'series b', 'pre-seed', 'angel'];
    
    for (const round of roundTypes) {
      if (fundingAsk.toLowerCase().includes(round)) {
        return round.charAt(0).toUpperCase() + round.slice(1);
      }
    }

    // Infer from business stage
    if (businessStage) {
      const stageMap: Record<string, string> = {
        pre_seed: 'Pre-Seed',
        seed: 'Seed',
        early_stage: 'Series A',
        growth: 'Series B',
      };
      return stageMap[businessStage] || 'Seed';
    }

    return 'Seed';
  }

  private extractUseOfFunds(fundingAsk: string): any[] {
    if (!fundingAsk || fundingAsk.length < 20) {
      return [
        { category: 'Product Development', percentage: 50, amount: '$1M' },
        { category: 'Sales & Marketing', percentage: 30, amount: '$600K' },
        { category: 'Operations', percentage: 20, amount: '$400K' },
      ];
    }

    const points = this.formatBulletPoints(fundingAsk, 5);
    return points.map((point, i) => ({
      category: point.substring(0, 30),
      percentage: Math.round(100 / points.length),
      amount: this.extractNumbers(point)[0]?.value || '',
    }));
  }

  private extractMilestones(fundingAsk: string, roadmap: string): string[] {
    const text = fundingAsk + ' ' + roadmap;
    const milestones = this.formatBulletPoints(text, 4);
    
    return milestones.length > 0
      ? milestones
      : ['Product launch', 'Scale to 10K users', 'Achieve profitability', 'Expand to new markets'];
  }

  private extractTimeline(fundingAsk: string): string {
    const match = fundingAsk.match(/(\d+)\s*(month|year)/i);
    return match ? `${match[1]} ${match[2]}s` : '18 months';
  }
}
