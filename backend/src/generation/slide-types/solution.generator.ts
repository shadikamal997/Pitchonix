import { SlideType, WizardInput } from './types';
import { BaseSlideGenerator } from './base-slide.generator';

// =============================================================================
//  Solution Generator — Phase 32.75 Tier 9 cleanup
//  Visual layout supplied by solutionStatement smart component (Tier 6).
//  Feature extraction / benefit keyword matching / differentiator parsing
//  deleted (~50 LOC).
// =============================================================================
export class SolutionSlideGenerator extends BaseSlideGenerator {
  type = SlideType.SOLUTION;
  defaultPriority = 3;
  protected usesSmartComponent() { return true; }

  isApplicable(input: WizardInput): boolean {
    return !!input.solution && input.solution.trim().length > 0;
  }
  getTitle(_input: WizardInput): string    { return 'Our Solution'; }
  getSubtitle(input: WizardInput): string  { return input.productService || 'How we solve it'; }

  generateContent(input: WizardInput): any {
    return {
      description: input.solution || '',
      productName: input.productService || input.companyName,
    };
  }

  getSpeakerNotes(input: WizardInput): string {
    return `Present the solution clearly and emphasize the unique value proposition. ` +
           `Focus on benefits over features. Highlight what makes you different: ${input.differentiation?.substring(0, 80) || 'your unique approach'}. ` +
           `Be ready to demo if appropriate.`;
  }
}
