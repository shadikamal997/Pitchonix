/**
 * Quality Control Type Definitions
 * Phase 7: Quality Control & Validation System
 */

/**
 * Quality score dimensions
 */
export enum QualityDimension {
  CONTENT = 'content',
  VISUAL = 'visual',
  AI_ENHANCEMENT = 'aiEnhancement',
  EXPORT_READINESS = 'exportReadiness',
}

/**
 * Quality grade letters
 */
export type QualityGrade = 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-' | 'D' | 'F';

/**
 * Overall quality score result
 */
export interface QualityScore {
  overall: number; // 0-100
  grade: QualityGrade;
  dimensions: {
    content: number; // 0-100
    visual: number; // 0-100
    aiEnhancement?: number; // 0-100 (only if AI was used)
    exportReadiness: number; // 0-100
  };
  breakdown: QualityBreakdown[];
  suggestions: string[];
  timestamp: Date;
}

/**
 * Detailed breakdown of quality dimension
 */
export interface QualityBreakdown {
  dimension: QualityDimension;
  score: number; // 0-100
  weight: number; // 0-1
  details: string;
  subScores?: {
    name: string;
    score: number;
    maxScore: number;
  }[];
}

/**
 * Validation severity levels
 */
export enum ValidationSeverity {
  ERROR = 'error', // Must be fixed
  WARNING = 'warning', // Should be fixed
  INFO = 'info', // Nice to have
}

/**
 * Validation issue
 */
export interface ValidationIssue {
  severity: ValidationSeverity;
  rule: string;
  message: string;
  slideIndex?: number;
  slideType?: string;
  field?: string;
  suggestion?: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
  isValid: boolean; // True if no errors
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  info: ValidationIssue[];
  summary: {
    totalIssues: number;
    errorCount: number;
    warningCount: number;
    infoCount: number;
  };
  timestamp: Date;
}

/**
 * Generation stages
 */
export enum GenerationStage {
  PENDING = 'pending',
  BASE_GENERATION = 'base_generation',
  AI_ENHANCEMENT = 'ai_enhancement',
  VISUAL_GENERATION = 'visual_generation',
  QUALITY_CHECK = 'quality_check',
  EXPORT = 'export',
  COMPLETE = 'complete',
  FAILED = 'failed',
}

/**
 * Generation progress
 */
export interface GenerationProgress {
  stage: GenerationStage;
  currentSlide: number;
  totalSlides: number;
  percentage: number; // 0-100
  estimatedTimeRemaining?: number; // milliseconds
  message?: string;
}

/**
 * Stage performance metrics
 */
export interface StageMetrics {
  stage: GenerationStage;
  startTime: Date;
  endTime?: Date;
  duration?: number; // milliseconds
  slidesProcessed: number;
  success: boolean;
  error?: string;
}

/**
 * Generation error
 */
export interface GenerationError {
  stage: GenerationStage;
  error: string;
  stack?: string;
  timestamp: Date;
  retryable: boolean;
  slideIndex?: number;
}

/**
 * Generation status
 */
export interface GenerationStatus {
  deckId: string;
  projectId: string;
  status: GenerationStage;
  progress: GenerationProgress;
  metrics: {
    startTime: Date;
    endTime?: Date;
    totalDuration?: number;
    stageMetrics: StageMetrics[];
  };
  errors: GenerationError[];
  lastUpdated: Date;
}

/**
 * Comprehensive quality report
 */
export interface QualityReport {
  deckId: string;
  projectId: string;
  qualityScore: QualityScore;
  validation: ValidationResult;
  generationStatus: GenerationStatus;
  recommendations: string[];
  generatedAt: Date;
}

/**
 * Validation rule definition
 */
export interface ValidationRule {
  id: string;
  name: string;
  description: string;
  severity: ValidationSeverity;
  category: 'content' | 'visual' | 'chart' | 'theme' | 'best-practice';
  validate: (slides: any[], input?: any) => ValidationIssue[];
}

/**
 * Quality scoring weights configuration
 */
export interface QualityScoringWeights {
  content: number; // 0-1
  visual: number; // 0-1
  aiEnhancement?: number; // 0-1
  exportReadiness: number; // 0-1
}

/**
 * Default weights by document type
 */
export const DEFAULT_QUALITY_WEIGHTS: Record<string, QualityScoringWeights> = {
  pitch_deck: {
    content: 0.35,
    visual: 0.30,
    aiEnhancement: 0.15,
    exportReadiness: 0.20,
  },
  business_plan: {
    content: 0.45,
    visual: 0.20,
    aiEnhancement: 0.15,
    exportReadiness: 0.20,
  },
  sales_deck: {
    content: 0.30,
    visual: 0.35,
    aiEnhancement: 0.15,
    exportReadiness: 0.20,
  },
  default: {
    content: 0.35,
    visual: 0.30,
    aiEnhancement: 0.15,
    exportReadiness: 0.20,
  },
};

/**
 * Quality metrics aggregation
 */
export interface QualityMetrics {
  totalDecks: number;
  averageQualityScore: number;
  scoreDistribution: {
    grade: QualityGrade;
    count: number;
    percentage: number;
  }[];
  commonIssues: {
    rule: string;
    severity: ValidationSeverity;
    count: number;
    percentage: number;
  }[];
  generationMetrics: {
    averageDuration: number;
    successRate: number;
    errorRate: number;
    averageSlidesPerDeck: number;
  };
  trends: {
    date: Date;
    averageScore: number;
    deckCount: number;
  }[];
}

/**
 * Content quality sub-scores
 */
export interface ContentQualityScores {
  completeness: number; // 0-100
  clarity: number; // 0-100
  relevance: number; // 0-100
  depth: number; // 0-100
}

/**
 * Visual quality sub-scores
 */
export interface VisualQualityScores {
  layoutConsistency: number; // 0-100
  chartQuality: number; // 0-100
  themeApplication: number; // 0-100
  imageQuality: number; // 0-100
}

/**
 * AI enhancement quality sub-scores
 */
export interface AIQualityScores {
  enhancementSuccessRate: number; // 0-100
  contentImprovement: number; // 0-100
  grammarCorrections: number; // 0-100
  toneConsistency: number; // 0-100
}

/**
 * Export readiness sub-scores
 */
export interface ExportReadinessScores {
  requiredSlidesPresent: number; // 0-100
  noValidationErrors: number; // 0-100
  chartsRenderable: number; // 0-100
  properFormatting: number; // 0-100
}
