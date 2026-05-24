/**
 * Phase 27 — Content Structure Service
 *
 * Top-level orchestrator. Given the SlideContent[] produced by the existing
 * SlideFactory + generators, runs:
 *
 *   1. ContentStructureAnalyzer  (27A)
 *   2. VisualBlockDetector       (27B)
 *   3. ContentBlockMapper        (27C)
 *   4. SlideBlueprintGenerator   (27D)
 *   5. Apply blueprints back onto slide.content
 *   6. StructureScorer           (27I)
 *   7. StructureValidator        (27J)
 *
 * Then returns the enriched slides. No LLM calls anywhere.
 */

import { Injectable, Logger } from '@nestjs/common';
import { SlideContent, WizardInput } from '../slide-types/types';
import { SlideBlueprintGenerator } from './slide-blueprint.service';
import { StructureScorer } from './structure-scorer.service';
import { StructureValidator, ValidationReport } from './structure-validator.service';
import { SlideBlueprint, StructureQualityScore } from './types';

export interface EnrichmentResult {
  slides:     SlideContent[];
  blueprints: SlideBlueprint[];
  score:      StructureQualityScore;
  validation: ValidationReport;
}

@Injectable()
export class ContentStructureService {
  private readonly logger = new Logger(ContentStructureService.name);

  constructor(
    private blueprintEngine: SlideBlueprintGenerator,
    private scorer:          StructureScorer,
    private validator:       StructureValidator,
  ) {}

  /**
   * Enrich a generated deck by mapping each slide to its visual blueprint and
   * merging canonical block content (`metrics`, `pricingTiers`, `team`, ...)
   * into the slide's content blob. The migration service downstream will then
   * materialise these into typed SlideElement rows.
   */
  enrich(slides: SlideContent[], input: WizardInput): EnrichmentResult {
    const blueprints = this.blueprintEngine.generateBlueprints(slides, input);
    const enriched = slides.map((s, i) =>
      this.blueprintEngine.applyBlueprint(s, blueprints[i]),
    );
    const score      = this.scorer.score(blueprints, input.documentType);
    const validation = this.validator.validate(blueprints);

    this.logger.log(
      `Content-structure enrichment: ${slides.length} slides, score=${score.total.toFixed(0)}/100, ` +
      `validation=${validation.summary.error}err/${validation.summary.warn}warn/${validation.summary.info}info, ` +
      `visual blocks=${blueprints.reduce((s, b) => s + b.blocks.length, 0)}`,
    );

    return { slides: enriched, blueprints, score, validation };
  }
}
