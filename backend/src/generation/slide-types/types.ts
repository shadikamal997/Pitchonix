/**
 * Slide Types and Interfaces for Content Generation
 */

export enum SlideType {
  // Core Slides
  COVER = 'cover',
  PROBLEM = 'problem',
  SOLUTION = 'solution',
  MARKET_OPPORTUNITY = 'market_opportunity',
  BUSINESS_MODEL = 'business_model',
  TRACTION = 'traction',
  ROADMAP = 'roadmap',
  TEAM = 'team',
  ASK = 'ask',
  
  // Business Details
  COMPETITION = 'competition',
  GO_TO_MARKET = 'go_to_market',
  PRODUCT_FEATURES = 'product_features',
  TECHNOLOGY = 'technology',
  CASE_STUDY = 'case_study',
  PRICING = 'pricing',
  
  // Financial
  FINANCIALS = 'financials',
  UNIT_ECONOMICS = 'unit_economics',
  REVENUE_MODEL = 'revenue_model',
  
  // Supporting
  VISION = 'vision',
  COMPANY_OVERVIEW = 'company_overview',
  EXECUTIVE_SUMMARY = 'executive_summary',
  MARKET_TRENDS = 'market_trends',
  PARTNERSHIP = 'partnership',
  RISKS = 'risks',
  APPENDIX = 'appendix',
}

export interface WizardInput {
  // Step 1: Document Type
  documentType: string;
  
  // Step 2: Business Info
  companyName: string;
  industry: string;
  country?: string;
  businessStage?: string;
  productService?: string;
  website?: string;
  shortDescription?: string;
  
  // Step 3: Audience & Goal
  audience: string;
  purpose?: string;
  desiredAction?: string;
  tone: string;
  
  // Step 4: Business Details
  problem: string;
  solution: string;
  targetCustomers?: string;
  marketOpportunity?: string;
  competitors?: string;
  differentiation?: string;
  revenueModel?: string;
  pricing?: string;
  traction?: string;
  team?: string;
  fundingAsk?: string;
  roadmap?: string;
  
  // Step 5: Design Preferences
  theme: string;
  logo?: string;
  brandColors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  fontStyle: string;
  visualStyle: string;
  
  // Step 6: Generation Settings
  slideCount: number;
  contentDepth: 'short' | 'balanced' | 'detailed';
  includeCharts: boolean;
  includeFinancials: boolean;
  includeSpeakerNotes: boolean;
  includeExecutiveSummary: boolean;
}

export interface SlideContent {
  type: SlideType;
  order: number;
  title: string;
  subtitle?: string;
  content: any; // Dynamic based on slide type
  layoutKey?: string;
  themeKey?: string;
  speakerNotes?: string;
  qualityScore?: number;
}

export interface ISlideGenerator {
  type: SlideType;
  isApplicable(input: WizardInput): boolean;
  generate(input: WizardInput, order: number): SlideContent;
  getDefaultPriority(): number;
}

export interface GenerationConfig {
  documentType: string;
  slideCount: number;
  contentDepth: 'short' | 'balanced' | 'detailed';
  includeCharts: boolean;
  includeFinancials: boolean;
  includeExecutiveSummary: boolean;
}
