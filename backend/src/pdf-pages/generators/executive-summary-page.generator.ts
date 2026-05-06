import { BasePageGenerator, PageContent } from './base-page.generator';
import { WizardInput } from '../../generation/slide-types/types';

export class ExecutiveSummaryPageGenerator extends BasePageGenerator {
  readonly type = 'EXECUTIVE_SUMMARY';
  readonly layout = 'content' as const;

  generate(input: WizardInput, pageNumber: number): PageContent {
    const page = this.createBasePage(pageNumber, this.type, this.layout);

    page.title = 'Executive Summary';
    page.content = {
      overview: this.generateOverview(input),
      keyPoints: this.generateKeyPoints(input),
      highlights: this.generateHighlights(input),
    };

    return page;
  }

  private generateOverview(input: WizardInput): string {
    const parts: string[] = [];

    if (input.companyName) {
      parts.push(`${input.companyName} is`);
    } else {
      parts.push('This document presents');
    }

    if (input.problem) {
      parts.push(`addressing ${input.problem.toLowerCase()}`);
    }

    if (input.solution) {
      parts.push(`through ${input.solution.toLowerCase()}.`);
    }

    if (input.marketOpportunity) {
      parts.push(`Our target market is ${input.marketOpportunity.toLowerCase()}.`);
    }

    if (input.traction) {
      parts.push(`We have achieved significant traction: ${input.traction}.`);
    }

    return parts.join(' ') || 'Executive summary of the business opportunity and strategic approach.';
  }

  private generateKeyPoints(input: WizardInput): string[] {
    const points: string[] = [];

    if (input.problem) {
      points.push(`Problem: ${input.problem}`);
    }

    if (input.solution) {
      points.push(`Solution: ${input.solution}`);
    }

    if (input.marketOpportunity) {
      points.push(`Market: ${input.marketOpportunity}`);
    }

    if (input.revenueModel) {
      points.push(`Business Model: ${input.revenueModel}`);
    }

    if (input.fundingAsk) {
      points.push(`Funding Requirement: ${input.fundingAsk}`);
    }

    return points.length > 0 ? points : [
      'Comprehensive business opportunity',
      'Strong market potential',
      'Proven execution capability',
      'Clear path to profitability'
    ];
  }

  private generateHighlights(input: WizardInput): string[] {
    const highlights: string[] = [];

    if (input.traction) {
      const tractionLines = input.traction.split('\n').filter(l => l.trim());
      highlights.push(...tractionLines.slice(0, 3));
    }

    if (input.differentiation) {
      highlights.push(`Competitive Advantage: ${input.differentiation}`);
    }

    if (input.team) {
      highlights.push(`Experienced team: ${input.team}`);
    }

    return highlights.length > 0 ? highlights : [
      'Strong value proposition',
      'Scalable business model',
      'Proven market demand'
    ];
  }
}
