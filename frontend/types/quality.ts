/**
 * Quality Control Type Definitions
 * Matches backend DTOs from Phase 8
 */

// Quality Score Interfaces
export interface QualityDimensions {
  content: number;
  visual: number;
  aiEnhancement: number;
  exportReadiness: number;
}

export interface QualityScore {
  overall: number;
  grade: string;
  dimensions: QualityDimensions;
}

// Validation Interfaces
export type ValidationSeverity = 'ERROR' | 'WARNING' | 'INFO';

export interface ValidationIssue {
  rule: string;
  severity: ValidationSeverity;
  message: string;
  slideIndex?: number;
  suggestion?: string;
}

export interface ValidationSummary {
  isValid: boolean;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  totalIssues: number;
}

export interface ValidationResult {
  deckId: string;
  isValid: boolean;
  issues: ValidationIssue[];
  summary: ValidationSummary;
  validatedAt: Date;
}

// Generation Progress Interfaces
export type GenerationStage =
  | 'PENDING'
  | 'BASE_GENERATION'
  | 'AI_ENHANCEMENT'
  | 'VISUAL_GENERATION'
  | 'QUALITY_CHECK'
  | 'EXPORT'
  | 'COMPLETE'
  | 'FAILED';

export interface GenerationProgress {
  stage: GenerationStage;
  percentage: number;
  message: string;
  currentSlide: number;
  totalSlides: number;
  estimatedTimeRemaining?: number;
}

export interface GenerationError {
  stage: string;
  error: string;
  timestamp: Date;
}

export interface GenerationStatus {
  deckId: string;
  status: string;
  completed: boolean;
  progress: GenerationProgress;
  errors?: GenerationError[];
  startTime: Date;
  endTime?: Date;
}

// Quality Report Interface
export interface QualityReport {
  deckId: string;
  overall: number;
  grade: string;
  dimensions: QualityDimensions;
  validation: ValidationSummary;
  recommendations: string[];
  exportReady: boolean;
  lastQualityCheck: Date;
}

// Export Readiness Interface
export interface ExportReadiness {
  deckId: string;
  ready: boolean;
  blockers: string[];
  qualityScore: number;
  validationPassed: boolean;
}

// Aggregate Metrics Interface (Admin)
export interface CommonError {
  error: string;
  count: number;
  lastOccurrence: Date;
}

export interface AggregateMetrics {
  activeGenerations: number;
  averageDuration: number;
  successRate: number;
  totalCompleted: number;
  totalFailed: number;
  commonErrors: CommonError[];
  averageQualityScore: number;
  exportReadinessRate: number;
}

// Grade color mapping
export const GRADE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'A+': { bg: 'bg-emerald-500', text: 'text-white', border: 'border-emerald-600' },
  'A': { bg: 'bg-emerald-600', text: 'text-white', border: 'border-emerald-700' },
  'A-': { bg: 'bg-green-500', text: 'text-white', border: 'border-green-600' },
  'B+': { bg: 'bg-lime-500', text: 'text-white', border: 'border-lime-600' },
  'B': { bg: 'bg-yellow-400', text: 'text-gray-900', border: 'border-yellow-500' },
  'B-': { bg: 'bg-yellow-500', text: 'text-gray-900', border: 'border-yellow-600' },
  'C+': { bg: 'bg-orange-400', text: 'text-white', border: 'border-orange-500' },
  'C': { bg: 'bg-orange-500', text: 'text-white', border: 'border-orange-600' },
  'C-': { bg: 'bg-red-400', text: 'text-white', border: 'border-red-500' },
  'D': { bg: 'bg-red-500', text: 'text-white', border: 'border-red-600' },
  'F': { bg: 'bg-red-600', text: 'text-white', border: 'border-red-700' },
};

// Severity color mapping
export const SEVERITY_COLORS: Record<ValidationSeverity, { bg: string; text: string; icon: string }> = {
  ERROR: { bg: 'bg-red-50', text: 'text-red-700', icon: 'text-red-500' },
  WARNING: { bg: 'bg-yellow-50', text: 'text-yellow-700', icon: 'text-yellow-500' },
  INFO: { bg: 'bg-blue-50', text: 'text-blue-700', icon: 'text-blue-500' },
};

// Stage display names
export const STAGE_NAMES: Record<GenerationStage, string> = {
  PENDING: 'Queued',
  BASE_GENERATION: 'Generating Content',
  AI_ENHANCEMENT: 'AI Enhancement',
  VISUAL_GENERATION: 'Creating Visuals',
  QUALITY_CHECK: 'Quality Check',
  EXPORT: 'Preparing Export',
  COMPLETE: 'Complete',
  FAILED: 'Failed',
};

// Helper function to determine grade from score
export function getGradeFromScore(score: number): string {
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

// Helper function to format duration
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
  return `${(ms / 3600000).toFixed(1)}h`;
}
