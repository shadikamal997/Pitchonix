import { Injectable, Logger } from '@nestjs/common';
import { analyzeSlide, QualitySignals } from '../generation/quality/smart-component-quality-probe';

@Injectable()
export class QualityControlService {
  private readonly logger = new Logger(QualityControlService.name);

  /**
   * Validate slide content quality.
   *
   * Phase 32.75 Tier 8 — every type-specific check now reads from the smart
   * component element tree via SmartComponentQualityProbe. The probe
   * transparently falls back to the legacy `slide.content.*` fields when
   * `smartComponent` is absent, so this method's behaviour is unchanged for
   * pre-Tier-4 decks. Once those decks are re-migrated (or expire from the
   * editor), the legacy fallback in the probe becomes the only remaining
   * caller of the generator extract* helpers — clearing the way for their
   * removal.
   */
  validateSlideQuality(slide: any): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    // Check title length
    if (slide.title && slide.title.length > 100) {
      issues.push('Title is too long (max 100 characters)');
    }

    if (!slide.title || slide.title.trim().length === 0) {
      issues.push('Title is required');
    }

    // Check content structure
    if (!slide.content || typeof slide.content !== 'object') {
      issues.push('Content must be a valid object');
    }

    // Type-specific validation — sourced from the quality probe.
    const signals: QualitySignals = analyzeSlide(slide);
    switch (slide.type) {
      case 'cover':
        if (!signals.hasTagline) {
          issues.push('Cover slide should have a tagline');
        }
        break;

      case 'problem':
      case 'solution':
        if (!signals.hasDescription) {
          issues.push(`${slide.type} slide should have a description`);
        }
        break;

      case 'market':
        if (!(signals.hasTam && signals.hasSam && signals.hasSom)) {
          issues.push('Market slide should have TAM, SAM, and SOM data');
        }
        break;

      case 'traction':
        if (!signals.hasMetrics) {
          issues.push('Traction slide should have metrics');
        }
        break;
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  /**
   * Validate entire deck
   */
  validateDeck(slides: any[]): { valid: boolean; issues: any[] } {
    const deckIssues: any[] = [];

    // Check minimum slide count
    if (slides.length < 5) {
      deckIssues.push({
        type: 'deck',
        message: 'Deck should have at least 5 slides',
      });
    }

    // Check for required slide types
    const requiredTypes = ['cover', 'problem', 'solution'];
    const existingTypes = slides.map((s) => s.type);

    requiredTypes.forEach((type) => {
      if (!existingTypes.includes(type)) {
        deckIssues.push({
          type: 'deck',
          message: `Missing required slide type: ${type}`,
        });
      }
    });

    // Validate each slide
    slides.forEach((slide, index) => {
      const validation = this.validateSlideQuality(slide);
      if (!validation.valid) {
        deckIssues.push({
          type: 'slide',
          slideIndex: index,
          slideType: slide.type,
          issues: validation.issues,
        });
      }
    });

    return {
      valid: deckIssues.length === 0,
      issues: deckIssues,
    };
  }

  /**
   * Suggest improvements for a slide. Same probe-driven path as
   * validateSlideQuality — type-specific suggestions read business signals
   * extracted from the smart-component tree.
   */
  suggestImprovements(slide: any): string[] {
    const suggestions: string[] = [];

    // Title suggestions
    if (slide.title && slide.title.length < 20) {
      suggestions.push('Consider making the title more descriptive');
    }

    const signals = analyzeSlide(slide);
    switch (slide.type) {
      case 'problem':
        if (!signals.hasMetrics && !signals.hasDescription) {
          suggestions.push('Add statistics to strengthen the problem statement');
        }
        break;

      case 'solution':
        if (!signals.hasDifferentiators) {
          suggestions.push('Highlight what makes your solution unique');
        }
        break;

      case 'market':
        if (!signals.hasGrowth) {
          suggestions.push('Include market growth rate (CAGR)');
        }
        break;

      case 'traction':
        if (!signals.hasMilestones) {
          suggestions.push('Add key milestones to show progress');
        }
        break;
    }

    return suggestions;
  }
}
