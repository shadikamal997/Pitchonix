import { Injectable, Logger } from '@nestjs/common';
import {
  GenerationStatus,
  GenerationProgress,
  GenerationStage,
  StageMetrics,
  GenerationError,
} from './types';

/**
 * Monitoring Service
 * Tracks generation progress, performance metrics, and errors
 */
@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);
  private statusMap: Map<string, GenerationStatus> = new Map();

  /**
   * Start monitoring a new generation
   */
  startMonitoring(deckId: string, projectId: string, totalSlides: number): GenerationStatus {
    const status: GenerationStatus = {
      deckId,
      projectId,
      status: GenerationStage.PENDING,
      progress: {
        stage: GenerationStage.PENDING,
        currentSlide: 0,
        totalSlides,
        percentage: 0,
        message: 'Initializing generation...',
      },
      metrics: {
        startTime: new Date(),
        stageMetrics: [],
      },
      errors: [],
      lastUpdated: new Date(),
    };

    this.statusMap.set(deckId, status);
    this.logger.log(`Started monitoring deck ${deckId} (${totalSlides} slides)`);
    
    return status;
  }

  /**
   * Update generation stage
   */
  updateStage(
    deckId: string,
    newStage: GenerationStage,
    message?: string,
  ): GenerationStatus | null {
    const status = this.statusMap.get(deckId);
    if (!status) {
      this.logger.warn(`No status found for deck ${deckId}`);
      return null;
    }

    // Complete previous stage metrics
    if (status.metrics.stageMetrics.length > 0) {
      const lastStage = status.metrics.stageMetrics[status.metrics.stageMetrics.length - 1];
      if (!lastStage.endTime) {
        lastStage.endTime = new Date();
        lastStage.duration = lastStage.endTime.getTime() - lastStage.startTime.getTime();
        lastStage.success = true;
      }
    }

    // Start new stage
    const stageMetric: StageMetrics = {
      stage: newStage,
      startTime: new Date(),
      slidesProcessed: 0,
      success: false,
    };
    status.metrics.stageMetrics.push(stageMetric);

    // Update status
    status.status = newStage;
    status.progress.stage = newStage;
    status.progress.message = message || this.getStageMessage(newStage);
    status.lastUpdated = new Date();

    // Update percentage based on stage
    status.progress.percentage = this.calculateStagePercentage(newStage);

    this.statusMap.set(deckId, status);
    this.logger.log(`Deck ${deckId}: Stage ${newStage} (${status.progress.percentage}%)`);

    return status;
  }

  /**
   * Update slide progress within current stage
   */
  updateSlideProgress(
    deckId: string,
    currentSlide: number,
    message?: string,
  ): GenerationStatus | null {
    const status = this.statusMap.get(deckId);
    if (!status) {
      this.logger.warn(`No status found for deck ${deckId}`);
      return null;
    }

    status.progress.currentSlide = currentSlide;
    if (message) {
      status.progress.message = message;
    }

    // Update percentage within stage
    const stageBasePercentage = this.calculateStagePercentage(status.status);
    const stageRange = this.getStagePercentageRange(status.status);
    const slideProgress = (currentSlide / status.progress.totalSlides) * stageRange;
    status.progress.percentage = Math.min(100, stageBasePercentage + slideProgress);

    // Estimate time remaining
    if (status.metrics.stageMetrics.length > 0) {
      const currentStageMetric = status.metrics.stageMetrics[status.metrics.stageMetrics.length - 1];
      const elapsedTime = new Date().getTime() - currentStageMetric.startTime.getTime();
      const avgTimePerSlide = currentSlide > 0 ? elapsedTime / currentSlide : 0;
      const remainingSlides = status.progress.totalSlides - currentSlide;
      status.progress.estimatedTimeRemaining = avgTimePerSlide * remainingSlides;
    }

    // Update slides processed in current stage
    if (status.metrics.stageMetrics.length > 0) {
      status.metrics.stageMetrics[status.metrics.stageMetrics.length - 1].slidesProcessed = currentSlide;
    }

    status.lastUpdated = new Date();
    this.statusMap.set(deckId, status);

    return status;
  }

  /**
   * Record an error during generation
   */
  recordError(
    deckId: string,
    error: string,
    retryable: boolean = false,
    slideIndex?: number,
  ): GenerationStatus | null {
    const status = this.statusMap.get(deckId);
    if (!status) {
      this.logger.warn(`No status found for deck ${deckId}`);
      return null;
    }

    const generationError: GenerationError = {
      stage: status.status,
      error,
      timestamp: new Date(),
      retryable,
      slideIndex,
    };

    status.errors.push(generationError);
    status.lastUpdated = new Date();

    // Mark current stage as failed
    if (status.metrics.stageMetrics.length > 0) {
      const currentStageMetric = status.metrics.stageMetrics[status.metrics.stageMetrics.length - 1];
      currentStageMetric.success = false;
      currentStageMetric.error = error;
      currentStageMetric.endTime = new Date();
      currentStageMetric.duration = currentStageMetric.endTime.getTime() - currentStageMetric.startTime.getTime();
    }

    this.statusMap.set(deckId, status);
    this.logger.error(`Deck ${deckId}: Error in ${status.status} - ${error}`);

    return status;
  }

  /**
   * Complete generation
   */
  completeGeneration(deckId: string, success: boolean = true): GenerationStatus | null {
    const status = this.statusMap.get(deckId);
    if (!status) {
      this.logger.warn(`No status found for deck ${deckId}`);
      return null;
    }

    // Complete final stage
    if (status.metrics.stageMetrics.length > 0) {
      const lastStage = status.metrics.stageMetrics[status.metrics.stageMetrics.length - 1];
      if (!lastStage.endTime) {
        lastStage.endTime = new Date();
        lastStage.duration = lastStage.endTime.getTime() - lastStage.startTime.getTime();
        lastStage.success = success;
      }
    }

    // Update status
    status.status = success ? GenerationStage.COMPLETE : GenerationStage.FAILED;
    status.progress.stage = status.status;
    status.progress.percentage = 100;
    status.progress.message = success ? 'Generation complete!' : 'Generation failed';
    status.progress.estimatedTimeRemaining = 0;
    
    // Calculate total duration
    status.metrics.endTime = new Date();
    status.metrics.totalDuration = status.metrics.endTime.getTime() - status.metrics.startTime.getTime();
    status.lastUpdated = new Date();

    this.statusMap.set(deckId, status);
    this.logger.log(
      `Deck ${deckId}: ${success ? 'Completed' : 'Failed'} in ${status.metrics.totalDuration}ms`,
    );

    return status;
  }

  /**
   * Get current status
   */
  getStatus(deckId: string): GenerationStatus | null {
    return this.statusMap.get(deckId) || null;
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(deckId: string): {
    totalDuration: number;
    stageBreakdown: { stage: string; duration: number; percentage: number }[];
    averageSlideTime: number;
  } | null {
    const status = this.statusMap.get(deckId);
    if (!status || !status.metrics.totalDuration) {
      return null;
    }

    const stageBreakdown = status.metrics.stageMetrics
      .filter(m => m.duration !== undefined)
      .map(m => ({
        stage: m.stage,
        duration: m.duration!,
        percentage: ((m.duration! / status.metrics.totalDuration!) * 100),
      }));

    // Calculate average time per slide across all stages
    const totalSlidesProcessed = status.metrics.stageMetrics.reduce(
      (sum, m) => sum + m.slidesProcessed,
      0,
    );
    const averageSlideTime = totalSlidesProcessed > 0 
      ? status.metrics.totalDuration / totalSlidesProcessed 
      : 0;

    return {
      totalDuration: status.metrics.totalDuration,
      stageBreakdown,
      averageSlideTime,
    };
  }

  /**
   * Clear status (after retrieval)
   */
  clearStatus(deckId: string): void {
    this.statusMap.delete(deckId);
    this.logger.log(`Cleared status for deck ${deckId}`);
  }

  /**
   * Get all active statuses (for debugging/monitoring)
   */
  getAllStatuses(): GenerationStatus[] {
    return Array.from(this.statusMap.values());
  }

  /**
   * Calculate stage percentage (0-100)
   */
  private calculateStagePercentage(stage: GenerationStage): number {
    const stagePercentages: Record<GenerationStage, number> = {
      [GenerationStage.PENDING]: 0,
      [GenerationStage.BASE_GENERATION]: 10,
      [GenerationStage.AI_ENHANCEMENT]: 40,
      [GenerationStage.VISUAL_GENERATION]: 60,
      [GenerationStage.QUALITY_CHECK]: 85,
      [GenerationStage.EXPORT]: 90,
      [GenerationStage.COMPLETE]: 100,
      [GenerationStage.FAILED]: 0,
    };
    return stagePercentages[stage] || 0;
  }

  /**
   * Get percentage range for stage
   */
  private getStagePercentageRange(stage: GenerationStage): number {
    const ranges: Record<GenerationStage, number> = {
      [GenerationStage.PENDING]: 10,
      [GenerationStage.BASE_GENERATION]: 30,
      [GenerationStage.AI_ENHANCEMENT]: 20,
      [GenerationStage.VISUAL_GENERATION]: 25,
      [GenerationStage.QUALITY_CHECK]: 5,
      [GenerationStage.EXPORT]: 10,
      [GenerationStage.COMPLETE]: 0,
      [GenerationStage.FAILED]: 0,
    };
    return ranges[stage] || 0;
  }

  /**
   * Get stage message
   */
  private getStageMessage(stage: GenerationStage): string {
    const messages: Record<GenerationStage, string> = {
      [GenerationStage.PENDING]: 'Initializing generation...',
      [GenerationStage.BASE_GENERATION]: 'Generating slide content...',
      [GenerationStage.AI_ENHANCEMENT]: 'Enhancing content with AI...',
      [GenerationStage.VISUAL_GENERATION]: 'Creating charts and visuals...',
      [GenerationStage.QUALITY_CHECK]: 'Running quality checks...',
      [GenerationStage.EXPORT]: 'Preparing for export...',
      [GenerationStage.COMPLETE]: 'Generation complete!',
      [GenerationStage.FAILED]: 'Generation failed',
    };
    return messages[stage] || 'Processing...';
  }

  /**
   * Get aggregate statistics (for admin dashboard)
   */
  getAggregateStats(): {
    activeGenerations: number;
    averageDuration: number;
    successRate: number;
    commonErrors: { error: string; count: number }[];
  } {
    const allStatuses = this.getAllStatuses();
    const completedStatuses = allStatuses.filter(
      s => s.status === GenerationStage.COMPLETE || s.status === GenerationStage.FAILED,
    );

    const activeGenerations = allStatuses.filter(
      s => s.status !== GenerationStage.COMPLETE && s.status !== GenerationStage.FAILED,
    ).length;

    const durations = completedStatuses
      .filter(s => s.metrics.totalDuration)
      .map(s => s.metrics.totalDuration!);
    const averageDuration = durations.length > 0 
      ? durations.reduce((sum, d) => sum + d, 0) / durations.length 
      : 0;

    const successCount = completedStatuses.filter(s => s.status === GenerationStage.COMPLETE).length;
    const successRate = completedStatuses.length > 0 
      ? (successCount / completedStatuses.length) * 100 
      : 100;

    // Count errors
    const errorCounts = new Map<string, number>();
    allStatuses.forEach(status => {
      status.errors.forEach(error => {
        const count = errorCounts.get(error.error) || 0;
        errorCounts.set(error.error, count + 1);
      });
    });

    const commonErrors = Array.from(errorCounts.entries())
      .map(([error, count]) => ({ error, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      activeGenerations,
      averageDuration,
      successRate,
      commonErrors,
    };
  }
}
