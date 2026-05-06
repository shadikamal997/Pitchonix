import { SlideType, WizardInput } from './types';
import { BaseSlideGenerator } from './base-slide.generator';

/**
 * Cover Slide Generator
 * Always included as the first slide
 */
export class CoverSlideGenerator extends BaseSlideGenerator {
  type = SlideType.COVER;
  defaultPriority = 1;

  isApplicable(input: WizardInput): boolean {
    return true; // Always include cover slide
  }

  getTitle(input: WizardInput): string {
    return input.companyName || 'Company Presentation';
  }

  getSubtitle(input: WizardInput): string {
    return input.shortDescription || input.productService || 'Building the future';
  }

  generateContent(input: WizardInput): any {
    return {
      companyName: input.companyName,
      tagline: input.shortDescription,
      logo: input.logo || null,
      industry: input.industry,
      website: input.website,
      date: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      documentType: input.documentType,
    };
  }

  getSpeakerNotes(input: WizardInput): string {
    return `Welcome and introduction. Start with a strong opening statement about ${input.companyName}. ` +
           `Briefly mention: ${input.shortDescription || 'what you do'}. ` +
           `Keep it under 30 seconds. Audience: ${input.audience}.`;
  }
}
