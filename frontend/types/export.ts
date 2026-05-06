/**
 * Export Template Types
 * Phase 10: Advanced Export Features
 */

export interface ExportTemplate {
  id: string;
  name: string;
  description?: string;
  type: 'system' | 'custom';
  format: 'pptx' | 'pdf' | 'html';
  config: Record<string, any>;
  logoUrl?: string;
  watermark?: string;
  colors?: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  fonts?: {
    heading: string;
    body: string;
    sizes?: {
      title: number;
      heading: number;
      body: number;
    };
  };
  isDefault: boolean;
  isPublic: boolean;
  userId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTemplateDto {
  name: string;
  description?: string;
  format: 'pptx' | 'pdf' | 'html';
  config: Record<string, any>;
  logoUrl?: string;
  watermark?: string;
  colors?: Record<string, string>;
  fonts?: Record<string, any>;
  isPublic?: boolean;
}

export interface UpdateTemplateDto {
  name?: string;
  description?: string;
  config?: Record<string, any>;
  logoUrl?: string;
  watermark?: string;
  colors?: Record<string, string>;
  fonts?: Record<string, any>;
  isPublic?: boolean;
}

export interface ExportOptions {
  layout?: 'slide-based' | 'document' | 'handout' | 'notes';
  pageSize?: 'A4' | 'Letter' | 'Legal';
  orientation?: 'landscape' | 'portrait';
  margins?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  watermark?: string;
  headerFooter?: boolean;
  compression?: boolean;
  merge?: boolean;
}

export interface ExportJob {
  id: string;
  deckIds: string[];
  format: 'pptx' | 'pdf' | 'html';
  templateId?: string;
  template?: ExportTemplate;
  options: ExportOptions;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  currentDeck?: string;
  outputUrls: string[];
  errors?: Array<{ deckId?: string; error: string }>;
  userId: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export interface BatchExportStatus {
  id: string;
  status: string;
  progress: number;
  currentDeck: string | null;
  completedDecks: number;
  totalDecks: number;
  outputUrls: string[];
  errors: any;
  startedAt: Date | null;
  estimatedCompletion: Date | null;
}

export interface QualityHistoryEntry {
  id: string;
  deckId: string;
  overallScore: number;
  grade: string;
  contentScore: number;
  visualScore: number;
  aiScore: number;
  exportScore: number;
  validationPassed: boolean;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  trigger: 'generation' | 'manual' | 'scheduled';
  version: number;
  changes?: Record<string, any>;
  createdAt: string;
}

export interface QualityStatistics {
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  totalChecks: number;
  passRate: number;
  improvementRate: number;
  currentStreak: number;
}

export interface TrendData {
  date: string;
  score: number;
  grade: string;
}

export interface DimensionTrends {
  content: TrendData[];
  visual: TrendData[];
  ai: TrendData[];
  export: TrendData[];
}

export interface QualityComparison {
  current: QualityHistoryEntry;
  previous: QualityHistoryEntry;
  scoreDelta: number;
  gradeDelta: string;
  improvements: string[];
  regressions: string[];
}

export const TEMPLATE_LAYOUTS = [
  { value: 'slide-based', label: 'Slide-Based', description: 'One slide per page' },
  { value: 'document', label: 'Document', description: 'Continuous document format' },
  { value: 'handout', label: 'Handout', description: 'Multiple slides per page' },
  { value: 'notes', label: 'Notes', description: 'Slides with speaker notes' },
] as const;

export const PAGE_SIZES = [
  { value: 'A4', label: 'A4 (210 × 297 mm)' },
  { value: 'Letter', label: 'Letter (8.5 × 11 in)' },
  { value: 'Legal', label: 'Legal (8.5 × 14 in)' },
] as const;

export const ORIENTATIONS = [
  { value: 'landscape', label: 'Landscape' },
  { value: 'portrait', label: 'Portrait' },
] as const;
