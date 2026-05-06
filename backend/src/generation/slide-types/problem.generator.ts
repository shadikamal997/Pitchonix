import { SlideType, WizardInput } from './types';
import { BaseSlideGenerator } from './base-slide.generator';

/**
 * Problem Slide Generator
 * Describes the problem being solved
 */
export class ProblemSlideGenerator extends BaseSlideGenerator {
  type = SlideType.PROBLEM;
  defaultPriority = 2;

  isApplicable(input: WizardInput): boolean {
    return !!input.problem && input.problem.trim().length > 0;
  }

  getTitle(input: WizardInput): string {
    return 'The Problem';
  }

  getSubtitle(input: WizardInput): string {
    return 'What challenge are we addressing?';
  }

  generateContent(input: WizardInput): any {
    const painPoints = this.formatBulletPoints(input.problem, 5);
    const stats = this.extractNumbers(input.problem);

    return {
      description: input.problem,
      painPoints,
      stats: stats.length > 0 ? stats[0] : { value: '73%', context: 'face this challenge' },
      targetAudience: input.targetCustomers || `${input.industry} businesses`,
      impact: this.extractImpact(input.problem),
    };
  }

  getSpeakerNotes(input: WizardInput): string {
    return `Describe the problem clearly and paint a vivid picture of the pain point. ` +
           `Emphasize the market gap and why this matters to ${input.audience}. ` +
           `Reference: ${input.problem?.substring(0, 100)}...`;
  }

  private extractImpact(problem: string | undefined): string {
    if (!problem) return 'Significant impact on business operations';
    
    const impactKeywords = ['cost', 'time', 'efficiency', 'revenue', 'loss', 'waste'];
    const hasImpact = impactKeywords.some(keyword => 
      problem.toLowerCase().includes(keyword)
    );
    
    return hasImpact 
      ? problem.split(/[.!?]/)[0] 
      : 'Significant impact on business operations and bottom line';
  }
}
