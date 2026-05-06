import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class QualityControlService {
  private readonly logger = new Logger(QualityControlService.name);

  /**
   * Validate slide content quality
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

    // Type-specific validation
    switch (slide.type) {
      case 'cover':
        if (!slide.content.tagline) {
          issues.push('Cover slide should have a tagline');
        }
        break;

      case 'problem':
      case 'solution':
        if (!slide.content.description) {
          issues.push(`${slide.type} slide should have a description`);
        }
        break;

      case 'market':
        if (!slide.content.tam || !slide.content.sam || !slide.content.som) {
          issues.push('Market slide should have TAM, SAM, and SOM data');
        }
        break;

      case 'traction':
        if (!slide.content.metrics || slide.content.metrics.length === 0) {
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
   * Suggest improvements for a slide
   */
  suggestImprovements(slide: any): string[] {
    const suggestions: string[] = [];

    // Title suggestions
    if (slide.title && slide.title.length < 20) {
      suggestions.push('Consider making the title more descriptive');
    }

    // Content suggestions based on type
    switch (slide.type) {
      case 'problem':
        if (!slide.content.stats) {
          suggestions.push('Add statistics to strengthen the problem statement');
        }
        break;

      case 'solution':
        if (!slide.content.differentiators) {
          suggestions.push('Highlight what makes your solution unique');
        }
        break;

      case 'market':
        if (!slide.content.growth) {
          suggestions.push('Include market growth rate (CAGR)');
        }
        break;

      case 'traction':
        if (!slide.content.milestones) {
          suggestions.push('Add key milestones to show progress');
        }
        break;
    }

    return suggestions;
  }
}
