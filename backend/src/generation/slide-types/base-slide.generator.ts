import { SlideType, SlideContent, WizardInput, ISlideGenerator } from './types';
import { generationAdapter } from '../smart-adapter';

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

  /**
   * Phase 32.75 Tier 4 hook. Generators that map to a Tier 3 smart component
   * override this and return `true`; the base class then asks the adapter
   * for the family's element tree and attaches it to `SlideContent.smartComponent`.
   *
   * Default `false` keeps every other generator unchanged.
   */
  protected usesSmartComponent(): boolean {
    return false;
  }

  getDefaultPriority(): number {
    return this.defaultPriority;
  }

  generate(input: WizardInput, order: number): SlideContent {
    const out: SlideContent = {
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

    // Phase 32.75 Tier 4 — request smart component if the generator opts in.
    // Failures are non-fatal (Part I — fallback rules): a null request just
    // means downstream uses the legacy manual layout.
    if (this.usesSmartComponent()) {
      const req = generationAdapter.requestFor(this.type, input);
      if (req) {
        out.smartComponent = { family: req.family, type: req.type, elementTree: req.elementTree };
      }
    }
    return out;
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

  // Phase 32.75 Tier 10 — `formatBulletPoints`, `extractNumbers`, and
  // `getContextAroundMatch` were utilities used only by the legacy generator
  // helpers deleted in Tier 9. After Tier 10, no slide generator imports
  // them, so they were removed (~45 LOC). PDF-studio and content-structure
  // services have their own copies and are unaffected.
}
