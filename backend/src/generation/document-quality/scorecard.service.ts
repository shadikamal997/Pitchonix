/**
 * Phase 30H — Document Scorecard
 *
 * Aggregates all Phase 30 engines + Phase 27 structure score into a single
 * board-ready scorecard:
 *
 *   - Overall Document Quality
 *   - Framework Completeness
 *   - Business Readiness
 *   - Visual Readiness   (← Phase 27)
 *   - Narrative Readiness
 *   - Presentation Readiness
 *
 * The doc-specific readiness engine (investor / sales / board / strategy) is
 * attached when applicable.
 */

import { Injectable, Logger } from '@nestjs/common';
import { SlideContent, WizardInput } from '../slide-types/types';
import { DocumentFrameworkEngine } from './framework-engine.service';
import { BusinessLogicValidator } from './business-logic-validator.service';
import { ExecutiveQualityEngine } from './executive-quality.service';
import { InvestorReadinessEngine } from './readiness/investor.service';
import { SalesReadinessEngine }    from './readiness/sales.service';
import { BoardReadinessEngine }    from './readiness/board.service';
import { StrategyReadinessEngine } from './readiness/strategy.service';
import { DocumentScorecard, ReadinessReport } from './types';

@Injectable()
export class DocumentScorecardService {
  private readonly logger = new Logger(DocumentScorecardService.name);

  constructor(
    private framework:    DocumentFrameworkEngine,
    private business:     BusinessLogicValidator,
    private executive:    ExecutiveQualityEngine,
    private investor:     InvestorReadinessEngine,
    private sales:        SalesReadinessEngine,
    private board:        BoardReadinessEngine,
    private strategy:     StrategyReadinessEngine,
  ) {}

  /**
   * Build the full scorecard for a generated deck.
   *
   * @param structureScore  Optional Phase 27 score (0..100). Used for "Visual Readiness".
   */
  build(
    input:           WizardInput,
    slides:          SlideContent[],
    structureScore?: number,
  ): DocumentScorecard {
    const frameworkReport  = this.framework.validate(input.documentType, slides);
    const businessReport   = this.business.validate(input, slides);
    const executiveReport  = this.executive.score(input, slides, frameworkReport.completeness);

    const readiness = this.runReadinessFor(input, slides);

    // Business readiness combines: framework completeness + (100 − warningRate).
    const totalWarnings = businessReport.warnCount + businessReport.errorCount * 2;
    const businessReadiness = Math.max(0,
      Math.round(frameworkReport.completeness * 0.6 + (100 - Math.min(100, totalWarnings * 12)) * 0.4),
    );

    // Visual readiness — Phase 27 if available, else executive visual balance.
    const visualReadiness = structureScore !== undefined
      ? Math.round(structureScore)
      : executiveReport.visualBalance;

    // Narrative readiness — blend executive narrative + framework arc.
    const narrativeReadiness = Math.round(
      executiveReport.narrativeStrength * 0.6 + frameworkReport.completeness * 0.4,
    );

    // Presentation readiness — visual balance + slide count.
    const presentationReadiness = Math.round(
      executiveReport.visualBalance * 0.5 + executiveReport.slideCount * 0.5,
    );

    // Overall — weighted blend.
    const overall = Math.round(
      frameworkReport.completeness * 0.20 +
      businessReadiness            * 0.15 +
      visualReadiness              * 0.20 +
      narrativeReadiness           * 0.15 +
      presentationReadiness        * 0.10 +
      (readiness?.total ?? executiveReport.total) * 0.20,
    );

    const scorecard: DocumentScorecard = {
      documentType: input.documentType,
      overall,
      frameworkCompleteness: frameworkReport.completeness,
      businessReadiness,
      visualReadiness,
      narrativeReadiness,
      presentationReadiness,
      readiness,
      reports: {
        framework: frameworkReport,
        business:  businessReport,
        executive: executiveReport,
      },
      band: band(overall),
    };

    this.logger.log(
      `Phase 30 scorecard [${input.documentType}]: overall=${overall} ` +
      `framework=${frameworkReport.completeness} business=${businessReadiness} ` +
      `visual=${visualReadiness} narrative=${narrativeReadiness} ` +
      `presentation=${presentationReadiness}` +
      (readiness ? ` readiness(${readiness.engine})=${readiness.total}` : '') +
      ` | ${businessReport.errorCount}err/${businessReport.warnCount}warn ` +
      `missing=[${frameworkReport.missing.map((m) => m.label).join(',')}]`,
    );

    return scorecard;
  }

  /**
   * Pick the doc-specific readiness engine — returns `undefined` for
   * document types that don't have a dedicated one.
   */
  private runReadinessFor(input: WizardInput, slides: SlideContent[]): ReadinessReport | undefined {
    switch (input.documentType) {
      case 'pitch_deck':            return this.investor.score(input, slides);
      case 'sales_deck':            return this.sales.score(input, slides);
      case 'board_meeting':
      case 'board_meeting_deck':    return this.board.score(input, slides);
      case 'strategy_presentation': return this.strategy.score(input, slides);
      default:                      return undefined;
    }
  }
}

function band(score: number): DocumentScorecard['band'] {
  if (score >= 85) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 50) return 'fair';
  return 'poor';
}
