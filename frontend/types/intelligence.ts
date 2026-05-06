// Intelligence types
export enum AnalysisType {
  PROBLEM = 'problem',
  SOLUTION = 'solution',
  MARKET = 'market',
  DIFFERENTIATION = 'differentiation',
  VALUE_PROPOSITION = 'value_proposition',
  PITCH = 'pitch',
  GENERAL = 'general',
}

export interface ContentScore {
  overall: number; // 0-100
  clarity: number;
  impact: number;
  specificity: number;
  professionalism: number;
}

export interface Suggestion {
  type: 'improvement' | 'warning' | 'tip';
  title: string;
  description: string;
  example?: string;
  priority: 'high' | 'medium' | 'low';
}

export interface ContentAnalysis {
  scores: ContentScore;
  suggestions: Suggestion[];
  enhancedContent?: string;
  insights: string[];
  issues: string[];
}

export interface QuickCheck {
  score: number;
  issues: string[];
}
