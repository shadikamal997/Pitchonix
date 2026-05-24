import { SlideType, WizardInput } from './types';
import { BaseSlideGenerator } from './base-slide.generator';

// =============================================================================
//  Core Slide Generators — Phase 32.75 Tier 9 cleanup
//
//  Visual layout for every generator below is delivered by the Tier 3/6
//  smart components (pricingTable, statBlock, teamGrid, fundingBlock) via
//  the GenerationComponentAdapter (Tier 4). The migration service consumes
//  that smart tree directly; the legacy `content.metrics`, `content.team`,
//  `content.pricingTiers`, etc. extraction was removed in Tier 9 because
//  the only consumers (quality + scorecard services) now read via the
//  SmartComponentQualityProbe (Tier 8).
//
//  What's preserved:
//    - title / subtitle (deck outline, search, sidebar)
//    - description (AI enhancement seed + speaker notes hint)
//    - speaker notes
//    - isApplicable() gate
//
//  What's gone:
//    - extractPricingTiers / extractUnitEconomics / determineModel /
//      extractMonetizationStreams
//    - formatMetrics / inferMetricLabel / extractMilestones /
//      estimateDate / extractGrowthRate / extractValidation
//    - parseTeamMembers / extractName / extractRole / extractHighlights /
//      extractCulture / extractAdvisors
//    - extractAmount / extractRoundType / extractUseOfFunds /
//      extractMilestones / extractTimeline
//  ~308 LOC deleted.
// =============================================================================

/** Business Model — uses pricingTable smart component. */
export class BusinessModelSlideGenerator extends BaseSlideGenerator {
  type = SlideType.BUSINESS_MODEL;
  defaultPriority = 5;
  protected usesSmartComponent() { return true; }

  isApplicable(input: WizardInput): boolean {
    return !!(input.revenueModel || input.pricing) ||
           (input.structured?.pricingTiers?.length ?? 0) > 0;
  }
  getTitle(_input: WizardInput): string    { return 'Business Model'; }
  getSubtitle(_input: WizardInput): string { return 'How we make money'; }

  generateContent(input: WizardInput): any {
    return { description: input.revenueModel || 'Revenue model' };
  }

  getSpeakerNotes(_input: WizardInput): string {
    return `Explain the business model clearly and demonstrate unit economics. ` +
           `Walk through pricing tiers if applicable. Show path to profitability. ` +
           `Emphasize scalability and margins.`;
  }
}

/** Traction — uses statBlock smart component. */
export class TractionSlideGenerator extends BaseSlideGenerator {
  type = SlideType.TRACTION;
  defaultPriority = 6;
  protected usesSmartComponent() { return true; }

  isApplicable(input: WizardInput): boolean {
    return (!!input.traction && input.traction.trim().length > 0) ||
           (input.structured?.kpis?.length ?? 0) > 0;
  }
  getTitle(_input: WizardInput): string    { return 'Traction & Metrics'; }
  getSubtitle(_input: WizardInput): string { return 'Our progress so far'; }

  generateContent(input: WizardInput): any {
    return { description: input.traction || '' };
  }

  getSpeakerNotes(_input: WizardInput): string {
    return `Highlight key metrics and show momentum. Emphasize growth trajectory. ` +
           `Reference specific numbers and milestones. Show product-market fit validation.`;
  }
}

/** Team — uses teamGrid smart component. */
export class TeamSlideGenerator extends BaseSlideGenerator {
  type = SlideType.TEAM;
  defaultPriority = 7;
  protected usesSmartComponent() { return true; }

  isApplicable(input: WizardInput): boolean {
    return (!!input.team && input.team.trim().length > 0) ||
           (input.structured?.teamMembers?.length ?? 0) > 0;
  }
  getTitle(_input: WizardInput): string    { return 'The Team'; }
  getSubtitle(_input: WizardInput): string { return 'Who we are'; }

  generateContent(input: WizardInput): any {
    return { description: input.team || '' };
  }

  getSpeakerNotes(_input: WizardInput): string {
    return `Introduce key team members and highlight relevant experience. ` +
           `Emphasize why this team is uniquely positioned to execute. ` +
           `Mention advisors and notable backgrounds.`;
  }
}

/** Ask / Funding — uses fundingBlock smart component. */
export class AskSlideGenerator extends BaseSlideGenerator {
  type = SlideType.ASK;
  defaultPriority = 100; // Usually last slide
  protected usesSmartComponent() { return true; }

  isApplicable(input: WizardInput): boolean {
    return input.documentType === 'pitch_deck' ||
           !!input.fundingAsk ||
           !!input.structured?.funding?.amount ||
           (input.structured?.funding?.allocations?.length ?? 0) > 0;
  }
  getTitle(input: WizardInput): string    { return input.fundingAsk ? 'The Ask' : 'Next Steps'; }
  getSubtitle(input: WizardInput): string { return input.desiredAction || 'Join us on this journey'; }

  generateContent(input: WizardInput): any {
    return {
      description: input.fundingAsk || input.desiredAction || '',
      // Preserve contact strip — used by the AI-enhancement layer to suggest
      // a closing CTA. The structured payload (not generator helpers)
      // remains the source of truth for the actual funding amount/round.
      contact: { company: input.companyName, website: input.website },
    };
  }

  getSpeakerNotes(input: WizardInput): string {
    return `Clear call to action: ${input.desiredAction || 'investment ask'}. ` +
           `Reiterate key investment thesis. Be specific about amount and use of funds. ` +
           `End with confidence and open for questions.`;
  }
}
