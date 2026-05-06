import { SlideType, SlideContent, WizardInput, ISlideGenerator } from './types';

/**
 * Base abstract class for all slide generators
 */
export abstract class BaseSlideGenerator implements ISlideGenerator {
  abstract type: SlideType;
  abstract defaultPriority: number;

  abstract isApplicable(input: WizardInput): boolean;
  abstract generateContent(input: WizardInput): any;
  abstract getTitle(input: WizardInput): string;
  abstract getSubtitle(input: WizardInput): string;
  abstract getSpeakerNotes(input: WizardInput): string;

  getDefaultPriority(): number {
    return this.defaultPriority;
  }

  generate(input: WizardInput, order: number): SlideContent {
    return {
      type: this.type,
      order,
      title: this.getTitle(input),
      subtitle: this.getSubtitle(input),
      content: this.generateContent(input),
      layoutKey: this.getLayoutKey(input),
      themeKey: input.theme,
      speakerNotes: input.includeSpeakerNotes ? this.getSpeakerNotes(input) : undefined,
      qualityScore: this.calculateQualityScore(input),
    };
  }

  protected getLayoutKey(input: WizardInput): string {
    // Map visual style to layout keys
    const layoutMap: Record<string, string> = {
      minimal: 'minimal_layout',
      data_heavy: 'data_layout',
      visual_rich: 'visual_layout',
      text_focused: 'text_layout',
    };
    return layoutMap[input.visualStyle] || 'default_layout';
  }

  protected calculateQualityScore(input: WizardInput): number {
    // Basic quality score calculation
    // Can be enhanced with more sophisticated logic
    let score = 50; // Base score

    const content = this.generateContent(input);
    
    // Check for completeness
    if (content && typeof content === 'object') {
      const fields = Object.keys(content);
      const nonEmptyFields = fields.filter(key => {
        const value = content[key];
        return value !== null && value !== undefined && value !== '';
      });
      
      score += (nonEmptyFields.length / fields.length) * 30;
    }

    // Check for depth
    if (input.contentDepth === 'detailed') score += 10;
    else if (input.contentDepth === 'balanced') score += 5;

    // Ensure score is between 0 and 100
    return Math.min(100, Math.max(0, Math.round(score)));
  }

  protected formatBulletPoints(text: string | undefined, maxPoints: number = 5): string[] {
    if (!text) return [];
    
    // Split by common delimiters
    const points = text
      .split(/[.\n,;]/)
      .map(p => p.trim())
      .filter(p => p.length > 10 && p.length < 200)
      .slice(0, maxPoints);

    return points.length > 0 ? points : [text.substring(0, 150)];
  }

  protected extractNumbers(text: string | undefined): { value: string; context: string }[] {
    if (!text) return [];
    
    const numbers: { value: string; context: string }[] = [];
    
    // Match patterns like "$10M", "50%", "1,000 users"
    const patterns = [
      /\$[\d,.]+[MBK]?/gi,
      /\d+%/g,
      /[\d,]+\s+(users|customers|clients|companies)/gi,
    ];

    patterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const context = this.getContextAroundMatch(text, match);
          numbers.push({ value: match, context });
        });
      }
    });

    return numbers.slice(0, 3);
  }

  private getContextAroundMatch(text: string, match: string): string {
    const index = text.indexOf(match);
    const start = Math.max(0, index - 30);
    const end = Math.min(text.length, index + match.length + 30);
    return text.substring(start, end).trim();
  }
}
