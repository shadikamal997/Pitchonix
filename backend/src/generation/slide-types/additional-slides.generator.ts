import { SlideType, WizardInput } from './types';
import { BaseSlideGenerator } from './base-slide.generator';

/**
 * Executive Summary Slide Generator
 * High-level overview of the business
 */
export class ExecutiveSummarySlideGenerator extends BaseSlideGenerator {
  type = SlideType.EXECUTIVE_SUMMARY;
  defaultPriority = 2; // Early in deck if included

  isApplicable(input: WizardInput): boolean {
    return input.includeExecutiveSummary === true;
  }

  getTitle(input: WizardInput): string {
    return 'Executive Summary';
  }

  getSubtitle(input: WizardInput): string {
    return 'Key highlights';
  }

  generateContent(input: WizardInput): any {
    return {
      company: input.companyName,
      tagline: input.shortDescription,
      keyPoints: [
        `Problem: ${input.problem?.substring(0, 80)}...`,
        `Solution: ${input.solution?.substring(0, 80)}...`,
        `Market: ${input.marketOpportunity?.substring(0, 80) || 'Large and growing'}`,
        `Traction: ${input.traction?.substring(0, 80) || 'Strong early momentum'}`,
      ],
      opportunity: this.extractNumbers(input.marketOpportunity || '')[0]?.value || 'Large market',
      ask: this.extractNumbers(input.fundingAsk || '')[0]?.value || '',
    };
  }

  getSpeakerNotes(input: WizardInput): string {
    return `Quick overview of the business in 60 seconds. Hit the key points: problem, solution, market, traction. ` +
           `This slide gives context before diving into details.`;
  }
}

/**
 * Competition Slide Generator
 * Competitive analysis and positioning
 */
export class CompetitionSlideGenerator extends BaseSlideGenerator {
  type = SlideType.COMPETITION;
  defaultPriority = 8;

  isApplicable(input: WizardInput): boolean {
    return !!input.competitors && input.competitors.trim().length > 0;
  }

  getTitle(input: WizardInput): string {
    return 'Competitive Landscape';
  }

  getSubtitle(input: WizardInput): string {
    return 'How we compare';
  }

  generateContent(input: WizardInput): any {
    const competitors = this.parseCompetitors(input.competitors || '');
    
    return {
      description: input.competitors,
      competitors,
      competitiveAdvantage: input.differentiation || 'Unique positioning',
      positioning: this.extractPositioning(input.differentiation || ''),
      marketGap: this.extractMarketGap(input.competitors || '', input.differentiation || ''),
      visualType: input.includeCharts ? 'competitive_matrix' : 'comparison_table',
    };
  }

  getSpeakerNotes(input: WizardInput): string {
    return `Acknowledge competition but emphasize your unique value. Show awareness of landscape. ` +
           `Highlight defensible advantages: ${input.differentiation?.substring(0, 80)}.`;
  }

  private parseCompetitors(competitors: string): any[] {
    const names = competitors.split(/[,;]/).map(c => c.trim()).filter(c => c.length > 2);
    
    return names.slice(0, 5).map(name => ({
      name: name.substring(0, 30),
      strengths: ['Established', 'Market presence'],
      weaknesses: ['Legacy technology', 'Complex'],
    }));
  }

  private extractPositioning(differentiation: string): string {
    return differentiation?.substring(0, 150) || 'Best-in-class solution';
  }

  private extractMarketGap(competitors: string, differentiation: string): string {
    return `Gap in market that we uniquely address: ${differentiation?.substring(0, 100)}`;
  }
}

/**
 * Roadmap Slide Generator
 * Product and business roadmap
 */
export class RoadmapSlideGenerator extends BaseSlideGenerator {
  type = SlideType.ROADMAP;
  defaultPriority = 9;

  isApplicable(input: WizardInput): boolean {
    return !!input.roadmap && input.roadmap.trim().length > 0;
  }

  getTitle(input: WizardInput): string {
    return 'Product Roadmap';
  }

  getSubtitle(input: WizardInput): string {
    return 'Where we\'re going';
  }

  generateContent(input: WizardInput): any {
    const phases = this.parseRoadmapPhases(input.roadmap || '');
    
    return {
      description: input.roadmap,
      phases,
      vision: this.extractVision(input.roadmap || ''),
      timeline: this.extractTimeline(input.roadmap || ''),
    };
  }

  getSpeakerNotes(input: WizardInput): string {
    return `Show clear execution plan and vision for the future. Demonstrate thoughtful planning. ` +
           `Connect roadmap to market opportunities and customer needs.`;
  }

  private parseRoadmapPhases(roadmap: string): any[] {
    const items = this.formatBulletPoints(roadmap, 12);
    
    // Group into quarters
    const phases: any[] = [];
    const itemsPerPhase = Math.ceil(items.length / 3);
    
    for (let i = 0; i < 3; i++) {
      phases.push({
        quarter: this.getQuarter(i),
        items: items.slice(i * itemsPerPhase, (i + 1) * itemsPerPhase),
      });
    }
    
    return phases.filter(p => p.items.length > 0);
  }

  private getQuarter(index: number): string {
    const date = new Date();
    const currentQuarter = Math.floor(date.getMonth() / 3) + 1;
    const year = date.getFullYear();
    
    const quarter = ((currentQuarter + index - 1) % 4) + 1;
    const yearOffset = Math.floor((currentQuarter + index - 1) / 4);
    
    return `Q${quarter} ${year + yearOffset}`;
  }

  private extractVision(roadmap: string): string {
    const sentences = roadmap.split(/[.!?]/);
    return sentences[0]?.trim() || 'Building the future of the industry';
  }

  private extractTimeline(roadmap: string): string {
    const match = roadmap.match(/(\d+)\s*(month|year|quarter)/i);
    return match ? `${match[1]} ${match[2]}s` : '12-18 months';
  }
}

/**
 * Pricing Slide Generator
 * Detailed pricing strategy
 */
export class PricingSlideGenerator extends BaseSlideGenerator {
  type = SlideType.PRICING;
  defaultPriority = 10;

  isApplicable(input: WizardInput): boolean {
    return !!input.pricing && input.pricing.trim().length > 20;
  }

  getTitle(input: WizardInput): string {
    return 'Pricing';
  }

  getSubtitle(input: WizardInput): string {
    return 'Simple, transparent pricing';
  }

  generateContent(input: WizardInput): any {
    const tiers = this.parsePricingTiers(input.pricing || '');
    
    return {
      description: input.pricing,
      tiers,
      strategy: this.extractStrategy(input.pricing || ''),
      comparison: this.extractComparison(input.pricing || ''),
    };
  }

  getSpeakerNotes(input: WizardInput): string {
    return `Walk through pricing clearly. Justify value at each tier. ` +
           `Address potential pricing objections. Show flexibility for enterprise.`;
  }

  private parsePricingTiers(pricing: string): any[] {
    const numbers = this.extractNumbers(pricing);
    
    if (numbers.length === 0) {
      return [
        { name: 'Starter', price: '$99/mo', features: ['Basic features', 'Email support', '10 users'] },
        { name: 'Professional', price: '$299/mo', features: ['Advanced features', 'Priority support', '50 users'] },
        { name: 'Enterprise', price: 'Custom', features: ['All features', '24/7 support', 'Unlimited users'] },
      ];
    }

    return numbers.map((num, i) => ({
      name: this.getTierName(i),
      price: num.value,
      features: [num.context],
    }));
  }

  private getTierName(index: number): string {
    const names = ['Starter', 'Professional', 'Enterprise', 'Ultimate'];
    return names[index] || `Tier ${index + 1}`;
  }

  private extractStrategy(pricing: string): string {
    return 'Value-based pricing aligned with customer ROI';
  }

  private extractComparison(pricing: string): string {
    return 'Competitive pricing with superior value';
  }
}

/**
 * Product Features Slide Generator
 * Detailed product capabilities
 */
export class ProductFeaturesSlideGenerator extends BaseSlideGenerator {
  type = SlideType.PRODUCT_FEATURES;
  defaultPriority = 6;

  isApplicable(input: WizardInput): boolean {
    return !!input.solution && input.contentDepth === 'detailed';
  }

  getTitle(input: WizardInput): string {
    return 'Key Features';
  }

  getSubtitle(input: WizardInput): string {
    return input.productService || 'What makes us powerful';
  }

  generateContent(input: WizardInput): any {
    const features = this.parseFeatures(input.solution || '');
    
    return {
      productName: input.productService || input.companyName,
      features,
      demo: 'Live demo available',
      integration: 'Seamless integration with existing tools',
    };
  }

  getSpeakerNotes(input: WizardInput): string {
    return `Deep dive into key features. Focus on benefits and use cases. ` +
           `Be ready to demo if appropriate. Highlight technical innovation.`;
  }

  private parseFeatures(solution: string): any[] {
    const points = this.formatBulletPoints(solution, 8);
    
    return points.map(feature => ({
      name: feature.substring(0, 40),
      description: feature,
      benefit: 'Drives efficiency and results',
    }));
  }
}

/**
 * Vision Slide Generator
 * Long-term vision and mission
 */
export class VisionSlideGenerator extends BaseSlideGenerator {
  type = SlideType.VISION;
  defaultPriority = 3;

  isApplicable(input: WizardInput): boolean {
    return input.contentDepth === 'detailed' || input.documentType === 'company_profile';
  }

  getTitle(input: WizardInput): string {
    return 'Our Vision';
  }

  getSubtitle(input: WizardInput): string {
    return 'Building the future';
  }

  generateContent(input: WizardInput): any {
    return {
      mission: `Transforming ${input.industry} with ${input.productService || 'innovative solutions'}`,
      vision: input.shortDescription || 'Building the future',
      values: ['Innovation', 'Customer success', 'Excellence'],
      impact: `Making a difference for ${input.targetCustomers || 'businesses worldwide'}`,
    };
  }

  getSpeakerNotes(input: WizardInput): string {
    return `Inspire with your vision. Show long-term thinking. Connect mission to impact. ` +
           `Make it aspirational but believable.`;
  }
}
