import { SlideType, WizardInput } from './types';
import { BaseSlideGenerator } from './base-slide.generator';

// =============================================================================
//  Cover Generator — Phase 32.75 Tier 9 cleanup
//  Visual layout supplied by coverCard smart component (Tier 6). Logical
//  fields (companyName, tagline, logo, industry, website, date) preserved
//  for AI enhancement + search metadata; layout fields removed (~20 LOC).
// =============================================================================
export class CoverSlideGenerator extends BaseSlideGenerator {
  type = SlideType.COVER;
  defaultPriority = 1;
  protected usesSmartComponent() { return true; }

  isApplicable(_input: WizardInput): boolean { return true; }
  getTitle(input: WizardInput): string       { return input.companyName || 'Company Presentation'; }
  getSubtitle(input: WizardInput): string    { return input.shortDescription || input.productService || 'Building the future'; }

  generateContent(input: WizardInput): any {
    return {
      companyName: input.companyName,
      tagline:     input.shortDescription,
      logo:        input.logo || null,
      industry:    input.industry,
      website:     input.website,
      date:        new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      documentType: input.documentType,
    };
  }

  getSpeakerNotes(input: WizardInput): string {
    return `Welcome and introduction. Start with a strong opening statement about ${input.companyName}. ` +
           `Briefly mention: ${input.shortDescription || 'what you do'}. ` +
           `Keep it under 30 seconds. Audience: ${input.audience}.`;
  }
}
