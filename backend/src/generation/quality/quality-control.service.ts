import { Injectable, Logger } from '@nestjs/common';
import { ScoringService } from './scoring.service';
import { ValidationService } from './validation.service';
import { MonitoringService } from './monitoring.service';
import {
  QualityReport,
  QualityScore,
  ValidationResult,
  GenerationStatus,
} from './types';
import { VisualSlideContent } from '../visual/types';
import { WizardInput } from '../slide-types/types';

/**
 * Quality Control Service
 * Main orchestrator for quality checks, validation, and monitoring
 */
@Injectable()
export class QualityControlService {
  private readonly logger = new Logger(QualityControlService.name);

  constructor(
    private scoringService: ScoringService,
    private validationService: ValidationService,
    private monitoringService: MonitoringService,
  ) {}

  /**
   * Generate comprehensive quality report
   */
  async generateQualityReport(
    deckId: string,
    projectId: string,
    slides: VisualSlideContent[],
    input: WizardInput,
    options?: {
      aiUsed?: boolean;
    },
  ): Promise<QualityReport> {
    this.logger.log(`Generating quality report for deck ${deckId}`);

    try {
      // Calculate quality score
      const qualityScore = this.scoringService.calculateQualityScore(
        slides,
        input,
        { aiUsed: options?.aiUsed },
      );

      // Run validation
      const validation = this.validationService.validate(slides, input);

      // Get generation status
      const generationStatus = this.monitoringService.getStatus(deckId) || {
        deckId,
        projectId,
        status: 'complete' as any,
        progress: {
          stage: 'complete' as any,
          currentSlide: slides.length,
          totalSlides: slides.length,
          percentage: 100,
        },
        metrics: {
          startTime: new Date(),
          endTime: new Date(),
          totalDuration: 0,
          stageMetrics: [],
        },
        errors: [],
        lastUpdated: new Date(),
      };

      // Generate recommendations
      const recommendations = this.generateRecommendations(
        qualityScore,
        validation,
        slides,
      );

      const report: QualityReport = {
        deckId,
        projectId,
        qualityScore,
        validation,
        generationStatus,
        recommendations,
        generatedAt: new Date(),
      };

      this.logger.log(
        `Quality report generated: Score ${qualityScore.overall}/100 (${qualityScore.grade}), ` +
        `${validation.summary.errorCount} errors, ${validation.summary.warningCount} warnings`,
      );

      return report;
    } catch (error) {
      this.logger.error(`Failed to generate quality report: ${error.message}`, error.stack);
      throw new Error(`Quality report generation failed: ${error.message}`);
    }
  }

  /**
   * Quick quality check (score only, no detailed report)
   */
  quickQualityCheck(
    slides: VisualSlideContent[],
    input: WizardInput,
    options?: { aiUsed?: boolean },
  ): QualityScore {
    return this.scoringService.calculateQualityScore(slides, input, options);
  }

  /**
   * Quick validation check (validation only, no score)
   */
  quickValidation(
    slides: VisualSlideContent[],
    input?: WizardInput,
  ): ValidationResult {
    return this.validationService.validate(slides, input);
  }

  /**
   * Check if deck is export-ready
   */
  isExportReady(
    slides: VisualSlideContent[],
    input?: WizardInput,
  ): {
    ready: boolean;
    reason?: string;
    issues: string[];
  } {
    const validation = this.validationService.validate(slides, input);

    if (!validation.isValid) {
      return {
        ready: false,
        reason: 'Validation errors must be fixed before export',
        issues: validation.errors.map(e => e.message),
      };
    }

    // Check quality score
    const qualityScore = this.scoringService.calculateQualityScore(slides, input);
    if (qualityScore.overall < 50) {
      return {
        ready: false,
        reason: 'Quality score is too low for export',
        issues: [`Quality score: ${qualityScore.overall}/100 (Grade: ${qualityScore.grade})`],
      };
    }

    // Check for critical issues
    const criticalIssues: string[] = [];
    
    if (slides.length === 0) {
      criticalIssues.push('No slides to export');
    }

    if (!slides.some(s => s.type === 'title')) {
      criticalIssues.push('No title slide found');
    }

    if (criticalIssues.length > 0) {
      return {
        ready: false,
        reason: 'Critical issues prevent export',
        issues: criticalIssues,
      };
    }

    return {
      ready: true,
      issues: [],
    };
  }

  /**
   * Get quality summary (for dashboard)
   */
  getQualitySummary(qualityScore: QualityScore, validation: ValidationResult): {
    overall: number;
    grade: string;
    status: 'excellent' | 'good' | 'fair' | 'poor';
    issuesCount: number;
    exportReady: boolean;
  } {
    let status: 'excellent' | 'good' | 'fair' | 'poor';
    
    if (qualityScore.overall >= 90) status = 'excellent';
    else if (qualityScore.overall >= 75) status = 'good';
    else if (qualityScore.overall >= 60) status = 'fair';
    else status = 'poor';

    return {
      overall: qualityScore.overall,
      grade: qualityScore.grade,
      status,
      issuesCount: validation.summary.errorCount + validation.summary.warningCount,
      exportReady: validation.isValid && qualityScore.overall >= 60,
    };
  }

  /**
   * Generate actionable recommendations
   */
  private generateRecommendations(
    qualityScore: QualityScore,
    validation: ValidationResult,
    slides: VisualSlideContent[],
  ): string[] {
    const recommendations: string[] = [];

    // Add quality score recommendations
    recommendations.push(...qualityScore.suggestions);

    // Add validation recommendations
    if (validation.errors.length > 0) {
      recommendations.push(
        `Fix ${validation.errors.length} validation error(s) before exporting`,
      );
    }

    if (validation.warnings.length > 0) {
      recommendations.push(
        `Address ${validation.warnings.length} warning(s) to improve quality`,
      );
    }

    // Add dimension-specific recommendations
    if (qualityScore.dimensions.content < 75) {
      recommendations.push(
        'Improve content quality by adding more detail to key slides',
      );
    }

    if (qualityScore.dimensions.visual < 75) {
      recommendations.push(
        'Enhance visual presentation with consistent layouts and themes',
      );
    }

    if (qualityScore.dimensions.exportReadiness < 90) {
      recommendations.push(
        'Ensure all required slides are present before exporting',
      );
    }

    // Check for specific issues
    const hasCharts = slides.some(s => s.charts && s.charts.length > 0);
    if (!hasCharts && slides.length > 5) {
      recommendations.push(
        'Consider adding charts or visualizations to make data more engaging',
      );
    }

    const hasContact = slides.some(s => 
      s.type === 'contact' || 
      s.type === 'closing' ||
      JSON.stringify(s.content).match(/@|contact|email/i)
    );
    if (!hasContact) {
      recommendations.push(
        'Add contact information to the closing slide',
      );
    }

    // Deduplicate and limit recommendations
    const uniqueRecommendations = [...new Set(recommendations)];
    return uniqueRecommendations.slice(0, 10); // Max 10 recommendations
  }

  /**
   * Start monitoring for a new generation
   */
  startMonitoring(deckId: string, projectId: string, totalSlides: number): GenerationStatus {
    return this.monitoringService.startMonitoring(deckId, projectId, totalSlides);
  }

  /**
   * Update generation stage
   */
  updateStage(deckId: string, stage: any, message?: string): GenerationStatus | null {
    return this.monitoringService.updateStage(deckId, stage, message);
  }

  /**
   * Update slide progress
   */
  updateSlideProgress(deckId: string, currentSlide: number, message?: string): GenerationStatus | null {
    return this.monitoringService.updateSlideProgress(deckId, currentSlide, message);
  }

  /**
   * Record error
   */
  recordError(
    deckId: string,
    error: string,
    retryable: boolean = false,
    slideIndex?: number,
  ): GenerationStatus | null {
    return this.monitoringService.recordError(deckId, error, retryable, slideIndex);
  }

  /**
   * Complete generation
   */
  completeGeneration(deckId: string, success: boolean = true): GenerationStatus | null {
    return this.monitoringService.completeGeneration(deckId, success);
  }

  /**
   * Get generation status
   */
  getStatus(deckId: string): GenerationStatus | null {
    return this.monitoringService.getStatus(deckId);
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(deckId: string) {
    return this.monitoringService.getPerformanceMetrics(deckId);
  }

  /**
   * Clear status
   */
  clearStatus(deckId: string): void {
    this.monitoringService.clearStatus(deckId);
  }

  /**
   * Get aggregate statistics
   */
  getAggregateStats() {
    return this.monitoringService.getAggregateStats();
  }
}
