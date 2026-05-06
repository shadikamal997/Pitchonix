import { Injectable, Logger } from '@nestjs/common';
import {
  QualityScore,
  QualityGrade,
  QualityBreakdown,
  QualityDimension,
  QualityScoringWeights,
  DEFAULT_QUALITY_WEIGHTS,
  ContentQualityScores,
  VisualQualityScores,
  AIQualityScores,
  ExportReadinessScores,
} from './types';
import { VisualSlideContent } from '../visual/types';
import { SlideContent, WizardInput } from '../slide-types/types';

/**
 * Quality Scoring Service
 * Evaluates presentation quality across multiple dimensions
 */
@Injectable()
export class ScoringService {
  private readonly logger = new Logger(ScoringService.name);

  /**
   * Calculate overall quality score for a deck
   */
  calculateQualityScore(
    slides: VisualSlideContent[],
    input: WizardInput,
    options?: {
      aiUsed?: boolean;
      weights?: QualityScoringWeights;
    },
  ): QualityScore {
    this.logger.log(`Calculating quality score for ${slides.length} slides`);

    // Get weights for document type
    const weights = options?.weights || 
      DEFAULT_QUALITY_WEIGHTS[input.documentType] || 
      DEFAULT_QUALITY_WEIGHTS.default;

    // Calculate dimension scores
    const contentScore = this.scoreContent(slides, input);
    const visualScore = this.scoreVisual(slides);
    const exportScore = this.scoreExportReadiness(slides);
    
    // AI enhancement score (only if AI was used)
    const aiScore = options?.aiUsed ? this.scoreAIEnhancement(slides) : undefined;

    // Build breakdown
    const breakdown: QualityBreakdown[] = [
      {
        dimension: QualityDimension.CONTENT,
        score: contentScore.overall,
        weight: weights.content,
        details: this.getContentDetails(contentScore),
        subScores: [
          { name: 'Completeness', score: contentScore.completeness, maxScore: 100 },
          { name: 'Clarity', score: contentScore.clarity, maxScore: 100 },
          { name: 'Relevance', score: contentScore.relevance, maxScore: 100 },
          { name: 'Depth', score: contentScore.depth, maxScore: 100 },
        ],
      },
      {
        dimension: QualityDimension.VISUAL,
        score: visualScore.overall,
        weight: weights.visual,
        details: this.getVisualDetails(visualScore),
        subScores: [
          { name: 'Layout Consistency', score: visualScore.layoutConsistency, maxScore: 100 },
          { name: 'Chart Quality', score: visualScore.chartQuality, maxScore: 100 },
          { name: 'Theme Application', score: visualScore.themeApplication, maxScore: 100 },
          { name: 'Image Quality', score: visualScore.imageQuality, maxScore: 100 },
        ],
      },
      {
        dimension: QualityDimension.EXPORT_READINESS,
        score: exportScore.overall,
        weight: weights.exportReadiness,
        details: this.getExportDetails(exportScore),
        subScores: [
          { name: 'Required Slides', score: exportScore.requiredSlidesPresent, maxScore: 100 },
          { name: 'No Errors', score: exportScore.noValidationErrors, maxScore: 100 },
          { name: 'Charts Renderable', score: exportScore.chartsRenderable, maxScore: 100 },
          { name: 'Formatting', score: exportScore.properFormatting, maxScore: 100 },
        ],
      },
    ];

    if (aiScore) {
      breakdown.push({
        dimension: QualityDimension.AI_ENHANCEMENT,
        score: aiScore.overall,
        weight: weights.aiEnhancement || 0,
        details: this.getAIDetails(aiScore),
        subScores: [
          { name: 'Success Rate', score: aiScore.enhancementSuccessRate, maxScore: 100 },
          { name: 'Improvement', score: aiScore.contentImprovement, maxScore: 100 },
          { name: 'Grammar', score: aiScore.grammarCorrections, maxScore: 100 },
          { name: 'Tone', score: aiScore.toneConsistency, maxScore: 100 },
        ],
      });
    }

    // Calculate weighted overall score
    const overall = this.calculateWeightedScore(breakdown);
    const grade = this.scoreToGrade(overall);

    // Generate suggestions
    const suggestions = this.generateSuggestions(breakdown, slides);

    const result: QualityScore = {
      overall,
      grade,
      dimensions: {
        content: contentScore.overall,
        visual: visualScore.overall,
        aiEnhancement: aiScore?.overall,
        exportReadiness: exportScore.overall,
      },
      breakdown,
      suggestions,
      timestamp: new Date(),
    };

    this.logger.log(`Quality score calculated: ${overall}/100 (${grade})`);
    return result;
  }

  /**
   * Score content quality
   */
  private scoreContent(slides: VisualSlideContent[], input: WizardInput): ContentQualityScores & { overall: number } {
    // Completeness: Are required fields filled?
    const completeness = this.scoreCompleteness(slides, input);

    // Clarity: Is content clear and concise?
    const clarity = this.scoreClarity(slides);

    // Relevance: Does content match document type?
    const relevance = this.scoreRelevance(slides, input);

    // Depth: Is there sufficient detail?
    const depth = this.scoreDepth(slides);

    const overall = (completeness + clarity + relevance + depth) / 4;

    return { completeness, clarity, relevance, depth, overall };
  }

  /**
   * Score visual quality
   */
  private scoreVisual(slides: VisualSlideContent[]): VisualQualityScores & { overall: number } {
    const layoutConsistency = this.scoreLayoutConsistency(slides);
    const chartQuality = this.scoreChartQuality(slides);
    const themeApplication = this.scoreThemeApplication(slides);
    const imageQuality = this.scoreImageQuality(slides);

    const overall = (layoutConsistency + chartQuality + themeApplication + imageQuality) / 4;

    return { layoutConsistency, chartQuality, themeApplication, imageQuality, overall };
  }

  /**
   * Score AI enhancement quality (if applicable)
   */
  private scoreAIEnhancement(slides: VisualSlideContent[]): AIQualityScores & { overall: number } {
    // For now, use heuristics. Future: track actual AI enhancement metrics
    const enhancementSuccessRate = 90; // Placeholder
    const contentImprovement = 85;
    const grammarCorrections = 95;
    const toneConsistency = 88;

    const overall = (enhancementSuccessRate + contentImprovement + grammarCorrections + toneConsistency) / 4;

    return { enhancementSuccessRate, contentImprovement, grammarCorrections, toneConsistency, overall };
  }

  /**
   * Score export readiness
   */
  private scoreExportReadiness(slides: VisualSlideContent[]): ExportReadinessScores & { overall: number } {
    const requiredSlidesPresent = this.scoreRequiredSlides(slides);
    const noValidationErrors = 100; // Will be updated by validation service
    const chartsRenderable = this.scoreChartsRenderable(slides);
    const properFormatting = this.scoreFormatting(slides);

    const overall = (requiredSlidesPresent + noValidationErrors + chartsRenderable + properFormatting) / 4;

    return { requiredSlidesPresent, noValidationErrors, chartsRenderable, properFormatting, overall };
  }

  /**
   * Score completeness
   */
  private scoreCompleteness(slides: VisualSlideContent[], input: WizardInput): number {
    let score = 100;
    let checks = 0;
    let passed = 0;

    slides.forEach(slide => {
      // Title should be present
      checks++;
      if (slide.title && slide.title.length >= 5) passed++;

      // Content should be present
      if (slide.content) {
        checks++;
        if (Array.isArray(slide.content) && slide.content.length > 0) {
          passed++;
        } else if (typeof slide.content === 'string' && slide.content.length > 20) {
          passed++;
        }
      }
    });

    score = checks > 0 ? (passed / checks) * 100 : 100;
    return Math.round(score);
  }

  /**
   * Score clarity
   */
  private scoreClarity(slides: VisualSlideContent[]): number {
    let score = 100;
    let penalties = 0;

    slides.forEach(slide => {
      // Title too long
      if (slide.title && slide.title.length > 80) penalties += 5;

      // Too many bullet points
      if (Array.isArray(slide.content) && slide.content.length > 7) {
        penalties += 10;
      }

      // Bullet points too long
      if (Array.isArray(slide.content)) {
        slide.content.forEach(bullet => {
          if (typeof bullet === 'string' && bullet.length > 200) {
            penalties += 5;
          }
        });
      }
    });

    score = Math.max(0, 100 - penalties);
    return score;
  }

  /**
   * Score relevance
   */
  private scoreRelevance(slides: VisualSlideContent[], input: WizardInput): number {
    // Check if slide types match document type expectations
    const slideTypes = slides.map(s => s.type);
    let score = 85; // Base score

    // Pitch deck should have problem, solution, market
    if (input.documentType === 'pitch_deck') {
      if (slideTypes.includes('problem')) score += 5;
      if (slideTypes.includes('solution')) score += 5;
      if (slideTypes.includes('market')) score += 5;
    }

    return Math.min(100, score);
  }

  /**
   * Score depth
   */
  private scoreDepth(slides: VisualSlideContent[]): number {
    let totalWords = 0;
    let slidesWithContent = 0;

    slides.forEach(slide => {
      if (Array.isArray(slide.content)) {
        const words = slide.content.join(' ').split(/\s+/).length;
        if (words > 0) {
          totalWords += words;
          slidesWithContent++;
        }
      } else if (typeof slide.content === 'string') {
        const words = slide.content.split(/\s+/).length;
        if (words > 0) {
          totalWords += words;
          slidesWithContent++;
        }
      }
    });

    const avgWords = slidesWithContent > 0 ? totalWords / slidesWithContent : 0;
    
    // Ideal: 30-80 words per slide
    if (avgWords >= 30 && avgWords <= 80) return 100;
    if (avgWords < 30) return Math.max(60, (avgWords / 30) * 100);
    if (avgWords > 80) return Math.max(60, 100 - ((avgWords - 80) / 2));
    
    return 80;
  }

  /**
   * Score layout consistency
   */
  private scoreLayoutConsistency(slides: VisualSlideContent[]): number {
    const layouts = slides.map(s => s.layout.type);
    const uniqueLayouts = new Set(layouts).size;
    const layoutUsage = uniqueLayouts / slides.length;

    // Good: 3-6 different layouts for variety
    if (uniqueLayouts >= 3 && uniqueLayouts <= 6) return 100;
    if (uniqueLayouts < 3) return 80; // Too repetitive
    if (uniqueLayouts > 6) return 70; // Too inconsistent

    return 85;
  }

  /**
   * Score chart quality
   */
  private scoreChartQuality(slides: VisualSlideContent[]): number {
    const chartsCount = slides.reduce((sum, s) => sum + (s.charts?.length || 0), 0);
    
    if (chartsCount === 0) return 85; // Not all decks need charts

    let score = 100;
    let chartIssues = 0;

    slides.forEach(slide => {
      slide.charts?.forEach(chart => {
        // Check if chart has data
        if (!chart.data || chart.data.length === 0) chartIssues++;
        
        // Check each series
        chart.data?.forEach(series => {
          if (!series.values || series.values.length === 0) chartIssues++;
        });
      });
    });

    score = Math.max(50, 100 - (chartIssues * 10));
    return score;
  }

  /**
   * Score theme application
   */
  private scoreThemeApplication(slides: VisualSlideContent[]): number {
    if (slides.length === 0) return 100;

    // Check if all slides use the same theme
    const firstTheme = slides[0].theme;
    const allSameTheme = slides.every(s => 
      s.theme.name === firstTheme.name &&
      s.theme.colors.primary === firstTheme.colors.primary
    );

    return allSameTheme ? 100 : 70;
  }

  /**
   * Score image quality
   */
  private scoreImageQuality(slides: VisualSlideContent[]): number {
    const imagesCount = slides.reduce((sum, s) => sum + (s.images?.length || 0), 0);
    
    if (imagesCount === 0) return 100; // No images is fine

    let score = 100;
    let imageIssues = 0;

    slides.forEach(slide => {
      slide.images?.forEach(image => {
        // Check if image size is reasonable
        if (image.width > 2000 || image.height > 2000) imageIssues++;
        
        // Check if alt text is provided
        if (!image.altText) imageIssues++;
      });
    });

    score = Math.max(70, 100 - (imageIssues * 5));
    return score;
  }

  /**
   * Score required slides
   */
  private scoreRequiredSlides(slides: VisualSlideContent[]): number {
    const slideTypes = slides.map(s => s.type);
    let required = ['title', 'problem', 'solution'];
    let present = required.filter(type => slideTypes.includes(type));
    
    return (present.length / required.length) * 100;
  }

  /**
   * Score charts renderability
   */
  private scoreChartsRenderable(slides: VisualSlideContent[]): number {
    const chartsCount = slides.reduce((sum, s) => sum + (s.charts?.length || 0), 0);
    
    if (chartsCount === 0) return 100;

    let renderable = 0;
    let total = 0;

    slides.forEach(slide => {
      slide.charts?.forEach(chart => {
        total++;
        // Chart is renderable if it has type, data, and labels
        if (chart.type && chart.data && chart.data.length > 0) {
          renderable++;
        }
      });
    });

    return total > 0 ? (renderable / total) * 100 : 100;
  }

  /**
   * Score formatting
   */
  private scoreFormatting(slides: VisualSlideContent[]): number {
    // Check if slides have proper structure
    let score = 100;
    
    slides.forEach(slide => {
      // Should have title
      if (!slide.title || slide.title.length === 0) score -= 5;
      
      // Should have layout
      if (!slide.layout) score -= 5;
      
      // Should have theme
      if (!slide.theme) score -= 5;
    });

    return Math.max(0, score);
  }

  /**
   * Calculate weighted overall score
   */
  private calculateWeightedScore(breakdown: QualityBreakdown[]): number {
    let totalWeight = 0;
    let weightedSum = 0;

    breakdown.forEach(item => {
      weightedSum += item.score * item.weight;
      totalWeight += item.weight;
    });

    return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
  }

  /**
   * Convert score to letter grade
   */
  private scoreToGrade(score: number): QualityGrade {
    if (score >= 97) return 'A+';
    if (score >= 93) return 'A';
    if (score >= 90) return 'A-';
    if (score >= 87) return 'B+';
    if (score >= 83) return 'B';
    if (score >= 80) return 'B-';
    if (score >= 77) return 'C+';
    if (score >= 73) return 'C';
    if (score >= 70) return 'C-';
    if (score >= 60) return 'D';
    return 'F';
  }

  /**
   * Generate improvement suggestions
   */
  private generateSuggestions(breakdown: QualityBreakdown[], slides: VisualSlideContent[]): string[] {
    const suggestions: string[] = [];

    breakdown.forEach(item => {
      if (item.score < 70) {
        switch (item.dimension) {
          case QualityDimension.CONTENT:
            suggestions.push('Content quality is below expectations. Add more details to your slides.');
            break;
          case QualityDimension.VISUAL:
            suggestions.push('Visual presentation needs improvement. Ensure consistent layouts and themes.');
            break;
          case QualityDimension.AI_ENHANCEMENT:
            suggestions.push('AI enhancement had limited impact. Consider revising your source content.');
            break;
          case QualityDimension.EXPORT_READINESS:
            suggestions.push('Presentation is not ready for export. Fix validation errors first.');
            break;
        }
      } else if (item.score < 85) {
        // Add specific suggestions for dimensions scoring between 70-85
        if (item.dimension === QualityDimension.CONTENT) {
          suggestions.push('Consider adding more detail to key slides (problem, solution, market).');
        }
      }
    });

    // Slide count suggestion
    if (slides.length < 8) {
      suggestions.push('Presentation is quite short. Consider adding more supporting slides.');
    } else if (slides.length > 20) {
      suggestions.push('Presentation is quite long. Consider condensing to key points.');
    }

    // Chart suggestion
    const chartsCount = slides.reduce((sum, s) => sum + (s.charts?.length || 0), 0);
    if (chartsCount === 0) {
      suggestions.push('Add charts or visualizations to make data more engaging.');
    }

    return suggestions;
  }

  /**
   * Get content details string
   */
  private getContentDetails(scores: ContentQualityScores): string {
    const issues: string[] = [];
    if (scores.completeness < 80) issues.push('incomplete content');
    if (scores.clarity < 80) issues.push('unclear messaging');
    if (scores.relevance < 80) issues.push('content relevance');
    if (scores.depth < 80) issues.push('insufficient detail');
    
    return issues.length > 0 
      ? `Issues: ${issues.join(', ')}` 
      : 'Content is complete, clear, and relevant';
  }

  /**
   * Get visual details string
   */
  private getVisualDetails(scores: VisualQualityScores): string {
    const issues: string[] = [];
    if (scores.layoutConsistency < 80) issues.push('layout consistency');
    if (scores.chartQuality < 80) issues.push('chart quality');
    if (scores.themeApplication < 80) issues.push('theme application');
    if (scores.imageQuality < 80) issues.push('image quality');
    
    return issues.length > 0 
      ? `Issues: ${issues.join(', ')}` 
      : 'Visual presentation is consistent and professional';
  }

  /**
   * Get AI details string
   */
  private getAIDetails(scores: AIQualityScores): string {
    return `AI enhancement applied successfully with ${scores.enhancementSuccessRate}% success rate`;
  }

  /**
   * Get export details string
   */
  private getExportDetails(scores: ExportReadinessScores): string {
    const issues: string[] = [];
    if (scores.requiredSlidesPresent < 100) issues.push('missing required slides');
    if (scores.noValidationErrors < 100) issues.push('validation errors');
    if (scores.chartsRenderable < 100) issues.push('unrenderable charts');
    if (scores.properFormatting < 100) issues.push('formatting issues');
    
    return issues.length > 0 
      ? `Issues: ${issues.join(', ')}` 
      : 'Presentation is ready for export';
  }
}
