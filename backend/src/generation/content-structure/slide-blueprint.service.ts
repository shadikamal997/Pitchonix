/**
 * Phase 27D — Slide Blueprint engine
 *
 * For each slide, runs analyser → detector → mapper to produce a complete
 * SlideBlueprint listing the visual blocks the slide should contain. The
 * orchestrator then applies these blocks to the slide's content blob.
 */

import { Injectable } from '@nestjs/common';
import { ContentStructureAnalyzer } from './content-analyzer.service';
import { VisualBlockDetector } from './visual-block-detector.service';
import { ContentBlockMapper } from './content-block-mapper.service';
import { DiversityTracker } from './diversity-tracker';
import { SlideBlueprint, SlideBlock } from './types';
import { SlideContent, WizardInput } from '../slide-types/types';

@Injectable()
export class SlideBlueprintGenerator {
  constructor(
    private analyzer: ContentStructureAnalyzer,
    private detector: VisualBlockDetector,
    private mapper:   ContentBlockMapper,
  ) {}

  /**
   * Build blueprints for every slide in the deck.
   * The tracker is shared across slides so diversity caps apply deck-wide.
   */
  generateBlueprints(slides: SlideContent[], input: WizardInput): SlideBlueprint[] {
    const tracker = new DiversityTracker();

    return slides.map((slide) => {
      const profile  = this.analyzer.analyze(slide, input);
      const detected = this.detector.detect(profile, { documentType: input.documentType, tracker });
      const blocks   = this.mapper.resolve(profile, detected);

      // Record block usage for diversity cap on subsequent slides
      for (const b of blocks) tracker.record(b.kind);

      return {
        slideType:  slide.type,
        layoutType: blocks[0]?.meta?.role,
        blocks,
        profile,
      } as SlideBlueprint;
    });
  }

  /** Apply a blueprint by enriching the slide's content blob with canonical block payloads. */
  applyBlueprint(slide: SlideContent, blueprint: SlideBlueprint): SlideContent {
    const merged = { ...(slide.content || {}) };
    const blocksApplied: string[] = [];

    for (const block of blueprint.blocks) {
      this.mergeBlockIntoContent(merged, block);
      blocksApplied.push(block.kind);
    }

    // Attach a metadata trail so downstream code / debug can introspect
    (merged as any).__structure = {
      blocks:        blocksApplied,
      layoutType:    blueprint.layoutType,
      visualCount:   blocksApplied.filter((k) => k !== 'paragraph' && k !== 'bulletList').length,
      dataDensity:   blueprint.profile.dataDensity,
      structureScore:blueprint.profile.structureScore,
    };

    return {
      ...slide,
      content: merged,
      layoutKey: blueprint.layoutType || slide.layoutKey,
    };
  }

  /**
   * Merge a single block's payload into the slide content using the canonical
   * keys consumed by SlideElementsMigrationService.
   */
  private mergeBlockIntoContent(content: any, block: SlideBlock): void {
    const c = block.content || {};
    switch (block.kind) {
      case 'metric':
      case 'metricGrid':
      case 'marketSizing':
        // Migration service reads `metrics: [{value, label, ...}]`
        content.metrics = [...(content.metrics || []), ...(c.metrics || [])];
        break;
      case 'kpi':
        content.kpis = [...(content.kpis || []), ...(c.kpis || [])];
        break;
      case 'pricing':
        content.pricingTiers = c.pricingTiers || [];
        break;
      case 'roadmap':
        content.phases = c.phases || [];
        break;
      case 'timeline':
        content.timeline = c.timeline || [];
        break;
      case 'team':
        content.team = c.team || [];
        break;
      case 'featureGrid':
      case 'fundingAllocation':
        content.featureGrid = c.featureGrid || null;
        break;
      case 'processSteps':
        content.processSteps = c.processSteps || null;
        break;
      case 'comparison':
        content.comparison = c.comparison || null;
        break;
      case 'swot':
        content.swot = c.swot || null;
        break;
      case 'chart':
        content.charts = [...(content.charts || []), ...(c.charts || [])];
        break;
      case 'bulletList':
        content.bullets = c.bullets || [];
        break;
    }
  }
}
