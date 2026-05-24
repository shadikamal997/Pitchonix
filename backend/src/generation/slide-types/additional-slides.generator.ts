import { SlideType, WizardInput } from './types';
import { BaseSlideGenerator } from './base-slide.generator';

// =============================================================================
//  Additional Slide Generators — Phase 32.75 Tier 9 cleanup
//
//  Visual layout for every generator below is supplied by the Tier 3/6 smart
//  components (executiveSummary, comparisonMatrix, roadmapBlock,
//  pricingTable, featureGrid, visionBlock). Layout/extraction helpers were
//  removed in Tier 9 — see core-slides.generator.ts for the same pattern.
//
//  Preserved: title / subtitle / description text / speaker notes / search
//  metadata. The "tagline"/"company" fields are kept on ExecutiveSummary
//  because some downstream AI prompts seed from them.
// =============================================================================

/** Executive Summary — uses executiveSummary smart component. */
export class ExecutiveSummarySlideGenerator extends BaseSlideGenerator {
  type = SlideType.EXECUTIVE_SUMMARY;
  defaultPriority = 2;
  protected usesSmartComponent() { return true; }

  isApplicable(input: WizardInput): boolean { return input.includeExecutiveSummary === true; }
  getTitle(_input: WizardInput): string     { return 'Executive Summary'; }
  getSubtitle(_input: WizardInput): string  { return 'Key highlights'; }

  generateContent(input: WizardInput): any {
    return {
      company: input.companyName,
      tagline: input.shortDescription,
      description: input.shortDescription || `Executive summary for ${input.companyName}`,
    };
  }

  getSpeakerNotes(_input: WizardInput): string {
    return `Quick overview of the business in 60 seconds. Hit the key points: problem, solution, market, traction. ` +
           `This slide gives context before diving into details.`;
  }
}

/** Competition — uses comparisonMatrix smart component. */
export class CompetitionSlideGenerator extends BaseSlideGenerator {
  type = SlideType.COMPETITION;
  defaultPriority = 8;
  protected usesSmartComponent() { return true; }

  isApplicable(input: WizardInput): boolean {
    return (!!input.competitors && input.competitors.trim().length > 0) ||
           (input.structured?.competitors?.length ?? 0) > 0;
  }
  getTitle(_input: WizardInput): string    { return 'Competitive Landscape'; }
  getSubtitle(_input: WizardInput): string { return 'How we compare'; }

  generateContent(input: WizardInput): any {
    return {
      description: input.competitors || '',
      competitiveAdvantage: input.differentiation || 'Unique positioning',
    };
  }

  getSpeakerNotes(input: WizardInput): string {
    return `Acknowledge competition but emphasize your unique value. Show awareness of landscape. ` +
           `Highlight defensible advantages: ${input.differentiation?.substring(0, 80)}.`;
  }
}

/** Roadmap — uses roadmapBlock smart component. */
export class RoadmapSlideGenerator extends BaseSlideGenerator {
  type = SlideType.ROADMAP;
  defaultPriority = 9;
  protected usesSmartComponent() { return true; }

  isApplicable(input: WizardInput): boolean {
    return (!!input.roadmap && input.roadmap.trim().length > 0) ||
           (input.structured?.roadmapPhases?.length ?? 0) > 0;
  }
  getTitle(_input: WizardInput): string    { return 'Product Roadmap'; }
  getSubtitle(_input: WizardInput): string { return 'Where we\'re going'; }

  generateContent(input: WizardInput): any {
    return { description: input.roadmap || '' };
  }

  getSpeakerNotes(_input: WizardInput): string {
    return `Show clear execution plan and vision for the future. Demonstrate thoughtful planning. ` +
           `Connect roadmap to market opportunities and customer needs.`;
  }
}

/** Pricing — uses pricingTable smart component. */
export class PricingSlideGenerator extends BaseSlideGenerator {
  type = SlideType.PRICING;
  defaultPriority = 10;
  protected usesSmartComponent() { return true; }

  isApplicable(input: WizardInput): boolean {
    return (!!input.pricing && input.pricing.trim().length > 20) ||
           (input.structured?.pricingTiers?.length ?? 0) > 0;
  }
  getTitle(_input: WizardInput): string    { return 'Pricing'; }
  getSubtitle(_input: WizardInput): string { return 'Simple, transparent pricing'; }

  generateContent(input: WizardInput): any {
    return { description: input.pricing || '' };
  }

  getSpeakerNotes(_input: WizardInput): string {
    return `Walk through pricing clearly. Justify value at each tier. ` +
           `Address potential pricing objections. Show flexibility for enterprise.`;
  }
}

/** Product Features — uses featureGrid smart component. */
export class ProductFeaturesSlideGenerator extends BaseSlideGenerator {
  type = SlideType.PRODUCT_FEATURES;
  defaultPriority = 6;
  protected usesSmartComponent() { return true; }

  isApplicable(input: WizardInput): boolean {
    return !!input.solution && input.contentDepth === 'detailed';
  }
  getTitle(_input: WizardInput): string    { return 'Key Features'; }
  getSubtitle(input: WizardInput): string  { return input.productService || 'What makes us powerful'; }

  generateContent(input: WizardInput): any {
    return {
      productName: input.productService || input.companyName,
      description: input.solution || '',
    };
  }

  getSpeakerNotes(_input: WizardInput): string {
    return `Deep dive into key features. Focus on benefits and use cases. ` +
           `Be ready to demo if appropriate. Highlight technical innovation.`;
  }
}

/** Vision — uses visionBlock smart component. */
export class VisionSlideGenerator extends BaseSlideGenerator {
  type = SlideType.VISION;
  defaultPriority = 3;
  protected usesSmartComponent() { return true; }

  isApplicable(input: WizardInput): boolean {
    return input.contentDepth === 'detailed' || input.documentType === 'company_profile';
  }
  getTitle(_input: WizardInput): string    { return 'Our Vision'; }
  getSubtitle(_input: WizardInput): string { return 'Building the future'; }

  generateContent(input: WizardInput): any {
    return {
      mission: `Transforming ${input.industry} with ${input.productService || 'innovative solutions'}`,
      description: input.shortDescription || 'Building the future',
    };
  }

  getSpeakerNotes(_input: WizardInput): string {
    return `Inspire with your vision. Show long-term thinking. Connect mission to impact. ` +
           `Make it aspirational but believable.`;
  }
}
