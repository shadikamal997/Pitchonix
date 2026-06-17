import { SlideType, WizardInput } from './types';
import { BaseSlideGenerator } from './base-slide.generator';

/**
 * Risks Slide Generator
 *
 * Required by the Board Meeting Deck framework (order 4).
 * Also applicable to strategy_presentation and any deck with SWOT threat data.
 *
 * Supports risk categories: Strategic, Operational, Financial, Technical,
 * Market, Compliance. Overflow handled by the presentation overflow
 * materializer — never truncate.
 */
export class RisksSlideGenerator extends BaseSlideGenerator {
  type = SlideType.RISKS;
  defaultPriority = 7;

  protected usesSmartComponent(): boolean {
    return true;
  }

  isApplicable(input: WizardInput): boolean {
    const boardMeeting =
      input.documentType === 'board_meeting_deck' || input.documentType === 'board_meeting';
    if (boardMeeting) return true;
    if (input.documentType === 'strategy_presentation') return true;
    if ((input.structured?.swot?.threats?.length ?? 0) > 0) return true;
    return false;
  }

  getTitle(_input: WizardInput): string {
    return 'Risk Assessment';
  }

  getSubtitle(input: WizardInput): string {
    const threats = input.structured?.swot?.threats;
    if (threats && threats.length > 0) {
      return `${threats.length} risks identified`;
    }
    return 'Key risks, mitigations & owners';
  }

  generateContent(input: WizardInput): any {
    const threats = input.structured?.swot?.threats ?? [];
    return {
      description:
        threats.length > 0
          ? threats.join('; ')
          : `Risk assessment for ${input.companyName || 'the business'}`,
      categories: [
        'Strategic Risks',
        'Operational Risks',
        'Financial Risks',
        'Technical Risks',
        'Market Risks',
        'Compliance Risks',
      ],
    };
  }

  getSpeakerNotes(_input: WizardInput): string {
    return (
      `Walk through each risk category. For each risk: state the risk clearly, ` +
      `explain severity and likelihood, describe the mitigation plan, and identify the owner. ` +
      `Show the board that risks are actively managed, not ignored.`
    );
  }
}
