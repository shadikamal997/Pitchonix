import { SlideType, WizardInput } from './types';
import { BaseSlideGenerator } from './base-slide.generator';

// =============================================================================
//  Problem Generator — Phase 32.75 Tier 9 cleanup
//  Visual layout supplied by problemStatement smart component (Tier 6).
//  Pain-point bullets / stats / impact estimation deleted (~30 LOC).
// =============================================================================
export class ProblemSlideGenerator extends BaseSlideGenerator {
  type = SlideType.PROBLEM;
  defaultPriority = 2;
  protected usesSmartComponent() { return true; }

  isApplicable(input: WizardInput): boolean {
    return !!input.problem && input.problem.trim().length > 0;
  }
  getTitle(_input: WizardInput): string    { return 'The Problem'; }
  getSubtitle(_input: WizardInput): string { return 'What challenge are we addressing?'; }

  generateContent(input: WizardInput): any {
    return {
      description:    input.problem || '',
      targetAudience: input.targetCustomers || `${input.industry} businesses`,
    };
  }

  getSpeakerNotes(input: WizardInput): string {
    return `Describe the problem clearly and paint a vivid picture of the pain point. ` +
           `Emphasize the market gap and why this matters to ${input.audience}. ` +
           `Reference: ${input.problem?.substring(0, 100)}...`;
  }
}
