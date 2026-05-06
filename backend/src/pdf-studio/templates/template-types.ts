/**
 * Template System for PDF Studio
 * 20 Premium Templates + Smart PDF Builder
 */

export enum TemplateCategory {
  BUSINESS_CORE = 'business_core',
  ANALYTICS = 'analytics',
  SALES_CLIENT = 'sales_client',
  STRATEGY = 'strategy',
  PRODUCT_TECH = 'product_tech',
  BRAND_CONTENT = 'brand_content',
}

export enum TemplateType {
  // Business Core (5)
  MODERN_ONE_PAGER = 'modern_one_pager',
  EXECUTIVE_ONE_PAGER = 'executive_one_pager',
  BUSINESS_PLAN_PRO = 'business_plan_pro',
  CLEAN_BUSINESS_REPORT = 'clean_business_report',
  CORPORATE_OVERVIEW = 'corporate_overview',

  // Analytics & Data (4)
  FINANCIAL_REPORT = 'financial_report',
  KPI_DASHBOARD_REPORT = 'kpi_dashboard_report',
  BUDGET_PLAN_REPORT = 'budget_plan_report',
  DATA_INSIGHTS_REPORT = 'data_insights_report',

  // Sales & Client (4)
  CLIENT_PROPOSAL_PRO = 'client_proposal_pro',
  SALES_PROPOSAL_ADVANCED = 'sales_proposal_advanced',
  CLIENT_PERFORMANCE_REPORT = 'client_performance_report',
  PARTNERSHIP_PROPOSAL = 'partnership_proposal',

  // Strategy & Internal (4)
  STRATEGY_DOCUMENT = 'strategy_document',
  ROADMAP_TIMELINE = 'roadmap_timeline',
  OKR_GOALS_REPORT = 'okr_goals_report',
  INTERNAL_TEAM_REPORT = 'internal_team_report',

  // Product & Tech (2)
  PRODUCT_REQUIREMENTS = 'product_requirements',
  TECHNICAL_DOCUMENTATION = 'technical_documentation',

  // Brand & Content (1)
  BRAND_GUIDELINES = 'brand_guidelines',

  // Special (not user-selectable)
  SMART_PDF_BUILDER = 'smart_pdf_builder',
}

export enum LayoutComponentType {
  COVER_PAGE = 'cover_page',
  HERO_HEADER = 'hero_header',
  METRICS_STRIP = 'metrics_strip',
  SECTION_CARD = 'section_card',
  TWO_COLUMN_LAYOUT = 'two_column_layout',
  TEXT_BLOCK = 'text_block',
  TABLE_BLOCK = 'table_block',
  CHART_BLOCK = 'chart_block',
  TIMELINE_BLOCK = 'timeline_block',
  PROCESS_STEPS_BLOCK = 'process_steps_block',
  CASE_STUDY_BLOCK = 'case_study_block',
  IMAGE_BLOCK = 'image_block',
  QUOTE_BLOCK = 'quote_block',
  CONCLUSION_BLOCK = 'conclusion_block',
  FOOTER_BLOCK = 'footer_block',
}

export interface LayoutComponent {
  type: LayoutComponentType;
  title?: string;
  content?: any;
  style?: {
    backgroundColor?: string;
    padding?: string;
    borderRadius?: string;
    shadow?: boolean;
  };
  columns?: number;
  order: number;
}

export interface TemplateConfig {
  type: TemplateType;
  name: string;
  description: string;
  category: TemplateCategory;
  layouts: LayoutComponentType[];
  defaultSections: string[];
  style: {
    colorScheme: 'blue' | 'navy' | 'gray' | 'purple' | 'green' | 'red';
    headerStyle: 'gradient' | 'solid' | 'minimal';
    cardStyle: 'rounded' | 'sharp' | 'soft';
    spacing: 'compact' | 'normal' | 'spacious';
  };
  pages: {
    includeCoverPage: boolean;
    includeTableOfContents: boolean;
    includeFooter: boolean;
    includePageNumbers: boolean;
  };
}

export interface Template {
  config: TemplateConfig;
  thumbnail?: string;
  premium?: boolean;
  recommended?: boolean;
}
