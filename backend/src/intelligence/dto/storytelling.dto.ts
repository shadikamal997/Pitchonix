import { AnalysisType } from './analyze-content.dto';

export enum StoryFramework {
  HERO_JOURNEY = 'hero_journey', // Hero's Journey (Ordinary → Challenge → Transformation → Victory)
  PAS = 'pas', // Problem → Agitate → Solution
  BEFORE_AFTER = 'before_after', // Before/After Bridge
  THREE_ACT = 'three_act', // Setup → Conflict → Resolution
  CUSTOMER_STORY = 'customer_story', // Customer success story
  FOUNDER_JOURNEY = 'founder_journey', // Founder's personal journey
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
  element: string; // Hook, Setup, Conflict, Climax, Resolution
  content: string;
  purpose: string; // What this element achieves
}

export class TransformToStoryDto {
  content: string;
  framework: StoryFramework;
  tone?: ToneStyle;
  contentType?: AnalysisType;
  context?: {
    companyName?: string;
    industry?: string;
    targetAudience?: string;
    emotionalGoal?: string; // excitement, trust, urgency, inspiration
  };
}

export interface StoryTransformation {
  originalContent: string;
  transformedStory: string;
  framework: StoryFramework;
  elements: StoryElement[];
  emotionalArc: string; // Description of emotional journey
  hooks: string[]; // Attention-grabbing opening lines
  metaphors: string[]; // Generated metaphors/analogies
  tensionPoints: string[]; // Where tension is created
  improvements: {
    before: string;
    after: string;
    reason: string;
  }[];
}

export class GenerateMetaphorDto {
  concept: string; // Abstract concept to make tangible
  industry?: string;
  targetAudience?: string;
}

export interface MetaphorSuggestion {
  metaphor: string;
  explanation: string;
  example: string; // How to use it in a sentence
  effectiveness: number; // 1-10 rating
}

export class CreateTensionDto {
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
  tensionTechniques: string[]; // Techniques used (statistics, questions, contrast, stakes)
  emotionalWords: string[]; // Added words that create emotion
  beforeAfter: {
    tension: number; // 1-10 scale
    engagement: number; // 1-10 scale
  };
}
