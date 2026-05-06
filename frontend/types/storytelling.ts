import { AnalysisType } from './intelligence';

export enum StoryFramework {
  HERO_JOURNEY = 'hero_journey',
  PAS = 'pas',
  BEFORE_AFTER = 'before_after',
  THREE_ACT = 'three_act',
  CUSTOMER_STORY = 'customer_story',
  FOUNDER_JOURNEY = 'founder_journey',
}

export enum ToneStyle {
  INSPIRATIONAL = 'inspirational',
  PROFESSIONAL = 'professional',
  CONVERSATIONAL = 'conversational',
  URGENT = 'urgent',
  CONFIDENT = 'confident',
  EMPATHETIC = 'empathetic',
}

export interface StoryElement {
  element: string;
  content: string;
  purpose: string;
}

export interface TransformToStoryRequest {
  content: string;
  framework: StoryFramework;
  tone?: ToneStyle;
  contentType?: AnalysisType;
  context?: {
    companyName?: string;
    industry?: string;
    targetAudience?: string;
    emotionalGoal?: string;
  };
}

export interface StoryTransformation {
  originalContent: string;
  transformedStory: string;
  framework: StoryFramework;
  elements: StoryElement[];
  emotionalArc: string;
  hooks: string[];
  metaphors: string[];
  tensionPoints: string[];
  improvements: {
    before: string;
    after: string;
    reason: string;
  }[];
}

export interface GenerateMetaphorRequest {
  concept: string;
  industry?: string;
  targetAudience?: string;
}

export interface MetaphorSuggestion {
  metaphor: string;
  explanation: string;
  example: string;
  effectiveness: number;
}

export interface CreateTensionRequest {
  content: string;
  contentType?: AnalysisType;
  context?: {
    problemIntensity?: 'low' | 'medium' | 'high';
    targetAudience?: string;
  };
}

export interface TensionEnhancement {
  originalContent: string;
  enhancedContent: string;
  tensionTechniques: string[];
  emotionalWords: string[];
  beforeAfter: {
    tension: number;
    engagement: number;
  };
}

// UI-friendly labels
export const STORY_FRAMEWORK_LABELS: Record<StoryFramework, string> = {
  [StoryFramework.HERO_JOURNEY]: "Hero's Journey",
  [StoryFramework.PAS]: 'Problem-Agitate-Solution',
  [StoryFramework.BEFORE_AFTER]: 'Before-After Bridge',
  [StoryFramework.THREE_ACT]: 'Three Act Structure',
  [StoryFramework.CUSTOMER_STORY]: 'Customer Success Story',
  [StoryFramework.FOUNDER_JOURNEY]: "Founder's Journey",
};

export const STORY_FRAMEWORK_DESCRIPTIONS: Record<StoryFramework, string> = {
  [StoryFramework.HERO_JOURNEY]:
    'Classic transformation story: Ordinary → Challenge → Victory',
  [StoryFramework.PAS]: 'Create urgency: Problem → Make it worse → Present solution',
  [StoryFramework.BEFORE_AFTER]: 'Show contrast: Paint current pain → Show ideal future → Bridge the gap',
  [StoryFramework.THREE_ACT]: 'Drama structure: Setup → Conflict → Resolution',
  [StoryFramework.CUSTOMER_STORY]: 'Relatable case study: Real customer, real results',
  [StoryFramework.FOUNDER_JOURNEY]: 'Personal story: Why you started and where you are going',
};

export const TONE_STYLE_LABELS: Record<ToneStyle, string> = {
  [ToneStyle.INSPIRATIONAL]: 'Inspirational',
  [ToneStyle.PROFESSIONAL]: 'Professional',
  [ToneStyle.CONVERSATIONAL]: 'Conversational',
  [ToneStyle.URGENT]: 'Urgent',
  [ToneStyle.CONFIDENT]: 'Confident',
  [ToneStyle.EMPATHETIC]: 'Empathetic',
};

export const TONE_STYLE_DESCRIPTIONS: Record<ToneStyle, string> = {
  [ToneStyle.INSPIRATIONAL]: 'Uplifting and visionary - creates hope and excitement',
  [ToneStyle.PROFESSIONAL]: 'Credible and sophisticated - balances data with story',
  [ToneStyle.CONVERSATIONAL]: 'Casual and relatable - writes like you speak',
  [ToneStyle.URGENT]: 'Time-sensitive - creates FOMO and immediate action',
  [ToneStyle.CONFIDENT]: 'Bold and declarative - shows certainty and leadership',
  [ToneStyle.EMPATHETIC]: 'Understanding and validating - connects emotionally',
};
