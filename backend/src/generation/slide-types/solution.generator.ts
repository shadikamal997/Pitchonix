import { SlideType, WizardInput } from './types';
import { BaseSlideGenerator } from './base-slide.generator';

/**
 * Solution Slide Generator
 * Describes how the product/service solves the problem
 */
export class SolutionSlideGenerator extends BaseSlideGenerator {
  type = SlideType.SOLUTION;
  defaultPriority = 3;

  isApplicable(input: WizardInput): boolean {
    return !!input.solution && input.solution.trim().length > 0;
  }

  getTitle(input: WizardInput): string {
    return 'Our Solution';
  }

  getSubtitle(input: WizardInput): string {
    return input.productService || 'How we solve it';
  }

  generateContent(input: WizardInput): any {
    const features = this.formatBulletPoints(input.solution, 6);
    const differentiators = input.differentiation 
      ? this.formatBulletPoints(input.differentiation, 3)
      : this.extractDifferentiators(input.solution);

    return {
      description: input.solution,
      productName: input.productService || input.companyName,
      features,
      keyBenefits: this.extractBenefits(input.solution),
      differentiators,
      visualCue: input.includeCharts ? 'product_screenshot' : null,
    };
  }

  getSpeakerNotes(input: WizardInput): string {
    return `Present the solution clearly and emphasize the unique value proposition. ` +
           `Focus on benefits over features. Highlight what makes you different: ${input.differentiation?.substring(0, 80) || 'your unique approach'}. ` +
           `Be ready to demo if appropriate.`;
  }

  private extractBenefits(solution: string | undefined): string[] {
    if (!solution) return ['Efficiency', 'Cost savings', 'Ease of use'];
    
    const benefitKeywords = [
      { keyword: 'faster', benefit: 'Speed and efficiency' },
      { keyword: 'cheaper', benefit: 'Cost effective' },
      { keyword: 'easy', benefit: 'Simple to use' },
      { keyword: 'scalable', benefit: 'Grows with you' },
      { keyword: 'secure', benefit: 'Enterprise-grade security' },
      { keyword: 'automat', benefit: 'Automation' },
    ];

    const benefits = benefitKeywords
      .filter(({ keyword }) => solution.toLowerCase().includes(keyword))
      .map(({ benefit }) => benefit);

    return benefits.length > 0 
      ? benefits.slice(0, 4)
      : ['Efficiency gains', 'Cost reduction', 'Better outcomes'];
  }

  private extractDifferentiators(solution: string | undefined): string[] {
    if (!solution) return ['Unique approach', 'Innovative technology', 'Best-in-class'];
    
    const numbers = this.extractNumbers(solution);
    if (numbers.length > 0) {
      return numbers.map(n => `${n.value} ${n.context}`).slice(0, 3);
    }

    return this.formatBulletPoints(solution, 3);
  }
}
