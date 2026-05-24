import { SlideType, WizardInput } from './types';
import { BaseSlideGenerator } from './base-slide.generator';

// =============================================================================
//  Market Opportunity Generator — Phase 32.75 Tier 9 cleanup
//
//  Visual layout supplied by the marketOpportunity smart component (Tier 4).
//  Market sizing data flows through wizard `input.structured.marketSizing`,
//  not through generator-side text extraction — Tier 9 deleted ~50 LOC of
//  helpers that were synthesising TAM/SAM/SOM placeholder values.
// =============================================================================
export class MarketOpportunitySlideGenerator extends BaseSlideGenerator {
  type = SlideType.MARKET_OPPORTUNITY;
  defaultPriority = 4;
  protected usesSmartComponent() { return true; }

  isApplicable(input: WizardInput): boolean {
    return (!!input.marketOpportunity && input.marketOpportunity.trim().length > 0) ||
           !!(input.structured?.marketSizing?.tam ||
              input.structured?.marketSizing?.sam ||
              input.structured?.marketSizing?.som);
  }
  getTitle(_input: WizardInput): string    { return 'Market Opportunity'; }
  getSubtitle(_input: WizardInput): string { return 'TAM • SAM • SOM'; }

  generateContent(input: WizardInput): any {
    return {
      description: input.marketOpportunity || '',
      industry:    input.industry,
    };
  }

  getSpeakerNotes(input: WizardInput): string {
    return `Emphasize the market size and growth potential. Explain TAM/SAM/SOM clearly. ` +
           `Connect market trends to your solution. Reference industry: ${input.industry}. ` +
           `Show confidence in addressable market opportunity.`;
  }
}
