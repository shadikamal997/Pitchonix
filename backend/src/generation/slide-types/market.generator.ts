import { SlideType, WizardInput } from './types';
import { BaseSlideGenerator } from './base-slide.generator';

/**
 * Market Opportunity Slide Generator
 * Shows TAM/SAM/SOM and market trends
 */
export class MarketOpportunitySlideGenerator extends BaseSlideGenerator {
  type = SlideType.MARKET_OPPORTUNITY;
  defaultPriority = 4;

  isApplicable(input: WizardInput): boolean {
    return !!input.marketOpportunity && input.marketOpportunity.trim().length > 0;
  }

  getTitle(input: WizardInput): string {
    return 'Market Opportunity';
  }

  getSubtitle(input: WizardInput): string {
    return 'TAM • SAM • SOM';
  }

  generateContent(input: WizardInput): any {
    const numbers = this.extractNumbers(input.marketOpportunity);
    const trends = this.formatBulletPoints(input.marketOpportunity, 4);

    // Try to extract TAM/SAM/SOM from text
    const marketSizes = this.extractMarketSizes(input.marketOpportunity || '');

    return {
      description: input.marketOpportunity,
      industry: input.industry,
      tam: marketSizes.tam,
      sam: marketSizes.sam,
      som: marketSizes.som,
      growth: this.extractGrowth(input.marketOpportunity || ''),
      trends,
      geographicMarkets: this.extractMarkets(input.country),
      visualType: input.includeCharts ? 'market_chart' : 'bullet_list',
    };
  }

  getSpeakerNotes(input: WizardInput): string {
    return `Emphasize the market size and growth potential. Explain TAM/SAM/SOM clearly. ` +
           `Connect market trends to your solution. Reference industry: ${input.industry}. ` +
           `Show confidence in addressable market opportunity.`;
  }

  private extractMarketSizes(text: string): { tam: any; sam: any; som: any } {
    const numbers = this.extractNumbers(text);
    
    // If we found market size numbers, use them
    if (numbers.length >= 3) {
      return {
        tam: { value: numbers[0].value, label: 'Total Addressable Market' },
        sam: { value: numbers[1].value, label: 'Serviceable Available Market' },
        som: { value: numbers[2].value, label: 'Serviceable Obtainable Market' },
      };
    } else if (numbers.length === 1) {
      const value = numbers[0].value;
      return {
        tam: { value: value, label: 'Total Addressable Market' },
        sam: { value: this.estimatePercentage(value, 20), label: 'Serviceable Available Market' },
        som: { value: this.estimatePercentage(value, 2), label: 'Serviceable Obtainable Market' },
      };
    }
    
    // Default values
    return {
      tam: { value: '$50B', label: 'Total Addressable Market' },
      sam: { value: '$10B', label: 'Serviceable Available Market' },
      som: { value: '$1B', label: 'Serviceable Obtainable Market' },
    };
  }

  private extractGrowth(text: string): string {
    const growthMatch = text.match(/(\d+)%\s*(CAGR|growth|annually|per year)/i);
    return growthMatch ? `${growthMatch[1]}% CAGR` : '20% CAGR';
  }

  private extractMarkets(country?: string): string[] {
    const markets: string[] = [];
    if (country) markets.push(country);
    return markets.length > 0 ? markets : ['North America', 'Europe', 'Asia Pacific'];
  }

  private estimatePercentage(value: string, percentage: number): string {
    const numMatch = value.match(/[\d.]+/);
    if (!numMatch) return value;
    
    const num = parseFloat(numMatch[0]);
    const estimated = (num * percentage / 100).toFixed(1);
    const unit = value.match(/[BMK]/i)?.[0] || 'B';
    return `$${estimated}${unit}`;
  }
}
