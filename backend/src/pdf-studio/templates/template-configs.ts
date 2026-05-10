import {
  TemplateType,
  TemplateCategory,
  LayoutComponentType,
  TemplateConfig,
  Template,
} from './template-types';

// Re-export for convenience
export { TemplateType, TemplateCategory, LayoutComponentType, TemplateConfig, Template };

/**
 * 20 Premium Templates Configuration
 * Modern, professional, production-ready designs
 */

export const TEMPLATE_CONFIGS: Record<TemplateType, TemplateConfig> = {
  // ========== BUSINESS CORE (5 Templates) ==========

  [TemplateType.MODERN_ONE_PAGER]: {
    type: TemplateType.MODERN_ONE_PAGER,
    name: 'Modern One Pager',
    description: 'Clean, modern single-page document perfect for overviews and pitches',
    category: TemplateCategory.BUSINESS_CORE,
    layouts: [
      LayoutComponentType.HERO_HEADER,
      LayoutComponentType.METRICS_STRIP,
      LayoutComponentType.SECTION_CARD,
      LayoutComponentType.PROCESS_STEPS_BLOCK,
      LayoutComponentType.FOOTER_BLOCK,
    ],
    defaultSections: ['Overview', 'Problem', 'Solution', 'Key Features', 'Next Steps'],
    style: {
      colorScheme: 'blue',
      headerStyle: 'gradient',
      cardStyle: 'rounded',
      spacing: 'normal',
    },
    pages: {
      includeCoverPage: false,
      includeTableOfContents: false,
      includeFooter: true,
      includePageNumbers: true,
    },
  },

  [TemplateType.EXECUTIVE_ONE_PAGER]: {
    type: TemplateType.EXECUTIVE_ONE_PAGER,
    name: 'Executive One Pager',
    description: 'Professional executive summary with premium layout',
    category: TemplateCategory.BUSINESS_CORE,
    layouts: [
      LayoutComponentType.COVER_PAGE,
      LayoutComponentType.METRICS_STRIP,
      LayoutComponentType.TWO_COLUMN_LAYOUT,
      LayoutComponentType.CONCLUSION_BLOCK,
      LayoutComponentType.FOOTER_BLOCK,
    ],
    defaultSections: ['Executive Summary', 'Key Highlights', 'Strategic Priorities', 'Recommendations'],
    style: {
      colorScheme: 'navy',
      headerStyle: 'solid',
      cardStyle: 'sharp',
      spacing: 'spacious',
    },
    pages: {
      includeCoverPage: true,
      includeTableOfContents: false,
      includeFooter: true,
      includePageNumbers: true,
    },
  },

  [TemplateType.BUSINESS_PLAN_PRO]: {
    type: TemplateType.BUSINESS_PLAN_PRO,
    name: 'Business Plan Pro',
    description: 'Comprehensive business plan with structured sections',
    category: TemplateCategory.BUSINESS_CORE,
    layouts: [
      LayoutComponentType.COVER_PAGE,
      LayoutComponentType.HERO_HEADER,
      LayoutComponentType.SECTION_CARD,
      LayoutComponentType.TABLE_BLOCK,
      LayoutComponentType.CHART_BLOCK,
      LayoutComponentType.CONCLUSION_BLOCK,
      LayoutComponentType.FOOTER_BLOCK,
    ],
    defaultSections: [
      'Executive Summary',
      'Company Overview',
      'Market Analysis',
      'Products & Services',
      'Marketing Strategy',
      'Financial Projections',
      'Conclusion',
    ],
    style: {
      colorScheme: 'blue',
      headerStyle: 'minimal',
      cardStyle: 'rounded',
      spacing: 'normal',
    },
    pages: {
      includeCoverPage: true,
      includeTableOfContents: true,
      includeFooter: true,
      includePageNumbers: true,
    },
  },

  [TemplateType.CLEAN_BUSINESS_REPORT]: {
    type: TemplateType.CLEAN_BUSINESS_REPORT,
    name: 'Clean Business Report',
    description: 'Minimalist business report with focus on clarity',
    category: TemplateCategory.BUSINESS_CORE,
    layouts: [
      LayoutComponentType.HERO_HEADER,
      LayoutComponentType.TEXT_BLOCK,
      LayoutComponentType.SECTION_CARD,
      LayoutComponentType.TABLE_BLOCK,
      LayoutComponentType.CONCLUSION_BLOCK,
      LayoutComponentType.FOOTER_BLOCK,
    ],
    defaultSections: ['Summary', 'Background', 'Analysis', 'Findings', 'Recommendations', 'Conclusion'],
    style: {
      colorScheme: 'gray',
      headerStyle: 'minimal',
      cardStyle: 'soft',
      spacing: 'spacious',
    },
    pages: {
      includeCoverPage: false,
      includeTableOfContents: false,
      includeFooter: true,
      includePageNumbers: true,
    },
  },

  [TemplateType.CORPORATE_OVERVIEW]: {
    type: TemplateType.CORPORATE_OVERVIEW,
    name: 'Corporate Overview',
    description: 'Professional corporate document with brand-focused design',
    category: TemplateCategory.BUSINESS_CORE,
    layouts: [
      LayoutComponentType.COVER_PAGE,
      LayoutComponentType.HERO_HEADER,
      LayoutComponentType.METRICS_STRIP,
      LayoutComponentType.TWO_COLUMN_LAYOUT,
      LayoutComponentType.CASE_STUDY_BLOCK,
      LayoutComponentType.FOOTER_BLOCK,
    ],
    defaultSections: ['Company Overview', 'Mission & Vision', 'Services', 'Track Record', 'Contact'],
    style: {
      colorScheme: 'navy',
      headerStyle: 'solid',
      cardStyle: 'rounded',
      spacing: 'normal',
    },
    pages: {
      includeCoverPage: true,
      includeTableOfContents: false,
      includeFooter: true,
      includePageNumbers: true,
    },
  },

  // ========== ANALYTICS & DATA (4 Templates) ==========

  [TemplateType.FINANCIAL_REPORT]: {
    type: TemplateType.FINANCIAL_REPORT,
    name: 'Financial Report',
    description: 'Data-driven financial report with charts and tables',
    category: TemplateCategory.ANALYTICS,
    layouts: [
      LayoutComponentType.COVER_PAGE,
      LayoutComponentType.METRICS_STRIP,
      LayoutComponentType.CHART_BLOCK,
      LayoutComponentType.TABLE_BLOCK,
      LayoutComponentType.TEXT_BLOCK,
      LayoutComponentType.CONCLUSION_BLOCK,
      LayoutComponentType.FOOTER_BLOCK,
    ],
    defaultSections: ['Executive Summary', 'Revenue Analysis', 'Expense Breakdown', 'Financial Highlights', 'Outlook'],
    style: {
      colorScheme: 'green',
      headerStyle: 'solid',
      cardStyle: 'sharp',
      spacing: 'compact',
    },
    pages: {
      includeCoverPage: true,
      includeTableOfContents: true,
      includeFooter: true,
      includePageNumbers: true,
    },
  },

  [TemplateType.KPI_DASHBOARD_REPORT]: {
    type: TemplateType.KPI_DASHBOARD_REPORT,
    name: 'KPI Dashboard Report',
    description: 'Metrics-focused report with dashboard-style layout',
    category: TemplateCategory.ANALYTICS,
    layouts: [
      LayoutComponentType.HERO_HEADER,
      LayoutComponentType.METRICS_STRIP,
      LayoutComponentType.CHART_BLOCK,
      LayoutComponentType.SECTION_CARD,
      LayoutComponentType.FOOTER_BLOCK,
    ],
    defaultSections: ['Overview', 'Key Metrics', 'Performance', 'Trends', 'Insights'],
    style: {
      colorScheme: 'blue',
      headerStyle: 'gradient',
      cardStyle: 'rounded',
      spacing: 'compact',
    },
    pages: {
      includeCoverPage: false,
      includeTableOfContents: false,
      includeFooter: true,
      includePageNumbers: true,
    },
  },

  [TemplateType.BUDGET_PLAN_REPORT]: {
    type: TemplateType.BUDGET_PLAN_REPORT,
    name: 'Budget Plan Report',
    description: 'Detailed budget planning document with financial breakdowns',
    category: TemplateCategory.ANALYTICS,
    layouts: [
      LayoutComponentType.HERO_HEADER,
      LayoutComponentType.TABLE_BLOCK,
      LayoutComponentType.CHART_BLOCK,
      LayoutComponentType.TEXT_BLOCK,
      LayoutComponentType.CONCLUSION_BLOCK,
      LayoutComponentType.FOOTER_BLOCK,
    ],
    defaultSections: ['Budget Overview', 'Revenue Projections', 'Expense Allocation', 'Variance Analysis', 'Summary'],
    style: {
      colorScheme: 'green',
      headerStyle: 'minimal',
      cardStyle: 'soft',
      spacing: 'normal',
    },
    pages: {
      includeCoverPage: false,
      includeTableOfContents: false,
      includeFooter: true,
      includePageNumbers: true,
    },
  },

  [TemplateType.DATA_INSIGHTS_REPORT]: {
    type: TemplateType.DATA_INSIGHTS_REPORT,
    name: 'Data Insights Report',
    description: 'Analytics report with visual data storytelling',
    category: TemplateCategory.ANALYTICS,
    layouts: [
      LayoutComponentType.COVER_PAGE,
      LayoutComponentType.HERO_HEADER,
      LayoutComponentType.CHART_BLOCK,
      LayoutComponentType.SECTION_CARD,
      LayoutComponentType.TABLE_BLOCK,
      LayoutComponentType.CONCLUSION_BLOCK,
      LayoutComponentType.FOOTER_BLOCK,
    ],
    defaultSections: ['Executive Summary', 'Data Analysis', 'Key Insights', 'Recommendations', 'Next Steps'],
    style: {
      colorScheme: 'purple',
      headerStyle: 'gradient',
      cardStyle: 'rounded',
      spacing: 'normal',
    },
    pages: {
      includeCoverPage: true,
      includeTableOfContents: true,
      includeFooter: true,
      includePageNumbers: true,
    },
  },

  // ========== SALES & CLIENT (4 Templates) ==========

  [TemplateType.CLIENT_PROPOSAL_PRO]: {
    type: TemplateType.CLIENT_PROPOSAL_PRO,
    name: 'Client Proposal Pro',
    description: 'Professional client proposal with persuasive layout',
    category: TemplateCategory.SALES_CLIENT,
    layouts: [
      LayoutComponentType.COVER_PAGE,
      LayoutComponentType.HERO_HEADER,
      LayoutComponentType.SECTION_CARD,
      LayoutComponentType.CASE_STUDY_BLOCK,
      LayoutComponentType.TABLE_BLOCK,
      LayoutComponentType.CONCLUSION_BLOCK,
      LayoutComponentType.FOOTER_BLOCK,
    ],
    defaultSections: ['Introduction', 'Understanding Your Needs', 'Our Solution', 'Case Studies', 'Pricing', 'Next Steps'],
    style: {
      colorScheme: 'blue',
      headerStyle: 'gradient',
      cardStyle: 'rounded',
      spacing: 'normal',
    },
    pages: {
      includeCoverPage: true,
      includeTableOfContents: false,
      includeFooter: true,
      includePageNumbers: true,
    },
  },

  [TemplateType.SALES_PROPOSAL_ADVANCED]: {
    type: TemplateType.SALES_PROPOSAL_ADVANCED,
    name: 'Sales Proposal Advanced',
    description: 'Advanced sales proposal with compelling structure',
    category: TemplateCategory.SALES_CLIENT,
    layouts: [
      LayoutComponentType.COVER_PAGE,
      LayoutComponentType.HERO_HEADER,
      LayoutComponentType.METRICS_STRIP,
      LayoutComponentType.TWO_COLUMN_LAYOUT,
      LayoutComponentType.CASE_STUDY_BLOCK,
      LayoutComponentType.TABLE_BLOCK,
      LayoutComponentType.QUOTE_BLOCK,
      LayoutComponentType.CONCLUSION_BLOCK,
      LayoutComponentType.FOOTER_BLOCK,
    ],
    defaultSections: ['Executive Summary', 'Value Proposition', 'Solution Overview', 'Success Stories', 'Investment', 'Conclusion'],
    style: {
      colorScheme: 'purple',
      headerStyle: 'solid',
      cardStyle: 'rounded',
      spacing: 'spacious',
    },
    pages: {
      includeCoverPage: true,
      includeTableOfContents: true,
      includeFooter: true,
      includePageNumbers: true,
    },
  },

  [TemplateType.CLIENT_PERFORMANCE_REPORT]: {
    type: TemplateType.CLIENT_PERFORMANCE_REPORT,
    name: 'Client Performance Report',
    description: 'Client-facing performance report with metrics and insights',
    category: TemplateCategory.SALES_CLIENT,
    layouts: [
      LayoutComponentType.HERO_HEADER,
      LayoutComponentType.METRICS_STRIP,
      LayoutComponentType.CHART_BLOCK,
      LayoutComponentType.SECTION_CARD,
      LayoutComponentType.TABLE_BLOCK,
      LayoutComponentType.CONCLUSION_BLOCK,
      LayoutComponentType.FOOTER_BLOCK,
    ],
    defaultSections: ['Overview', 'Performance Metrics', 'Achievements', 'Areas for Growth', 'Recommendations'],
    style: {
      colorScheme: 'blue',
      headerStyle: 'gradient',
      cardStyle: 'rounded',
      spacing: 'normal',
    },
    pages: {
      includeCoverPage: false,
      includeTableOfContents: false,
      includeFooter: true,
      includePageNumbers: true,
    },
  },

  [TemplateType.PARTNERSHIP_PROPOSAL]: {
    type: TemplateType.PARTNERSHIP_PROPOSAL,
    name: 'Partnership Proposal',
    description: 'Strategic partnership proposal with mutual benefits focus',
    category: TemplateCategory.SALES_CLIENT,
    layouts: [
      LayoutComponentType.COVER_PAGE,
      LayoutComponentType.HERO_HEADER,
      LayoutComponentType.TWO_COLUMN_LAYOUT,
      LayoutComponentType.SECTION_CARD,
      LayoutComponentType.PROCESS_STEPS_BLOCK,
      LayoutComponentType.CONCLUSION_BLOCK,
      LayoutComponentType.FOOTER_BLOCK,
    ],
    defaultSections: ['Introduction', 'Partnership Vision', 'Mutual Benefits', 'Collaboration Model', 'Next Steps'],
    style: {
      colorScheme: 'navy',
      headerStyle: 'solid',
      cardStyle: 'rounded',
      spacing: 'normal',
    },
    pages: {
      includeCoverPage: true,
      includeTableOfContents: false,
      includeFooter: true,
      includePageNumbers: true,
    },
  },

  // ========== STRATEGY & INTERNAL (4 Templates) ==========

  [TemplateType.STRATEGY_DOCUMENT]: {
    type: TemplateType.STRATEGY_DOCUMENT,
    name: 'Strategy Document',
    description: 'Comprehensive strategy document for internal planning',
    category: TemplateCategory.STRATEGY,
    layouts: [
      LayoutComponentType.COVER_PAGE,
      LayoutComponentType.HERO_HEADER,
      LayoutComponentType.SECTION_CARD,
      LayoutComponentType.TABLE_BLOCK,
      LayoutComponentType.TIMELINE_BLOCK,
      LayoutComponentType.CONCLUSION_BLOCK,
      LayoutComponentType.FOOTER_BLOCK,
    ],
    defaultSections: ['Executive Summary', 'Strategic Context', 'Goals & Objectives', 'Initiatives', 'Timeline', 'Success Metrics'],
    style: {
      colorScheme: 'blue',
      headerStyle: 'minimal',
      cardStyle: 'soft',
      spacing: 'spacious',
    },
    pages: {
      includeCoverPage: true,
      includeTableOfContents: true,
      includeFooter: true,
      includePageNumbers: true,
    },
  },

  [TemplateType.ROADMAP_TIMELINE]: {
    type: TemplateType.ROADMAP_TIMELINE,
    name: 'Roadmap Timeline',
    description: 'Visual roadmap with timeline and milestones',
    category: TemplateCategory.STRATEGY,
    layouts: [
      LayoutComponentType.HERO_HEADER,
      LayoutComponentType.TIMELINE_BLOCK,
      LayoutComponentType.SECTION_CARD,
      LayoutComponentType.FOOTER_BLOCK,
    ],
    defaultSections: ['Vision', 'Q1 Milestones', 'Q2 Milestones', 'Q3 Milestones', 'Q4 Milestones', 'Summary'],
    style: {
      colorScheme: 'purple',
      headerStyle: 'gradient',
      cardStyle: 'rounded',
      spacing: 'normal',
    },
    pages: {
      includeCoverPage: false,
      includeTableOfContents: false,
      includeFooter: true,
      includePageNumbers: true,
    },
  },

  [TemplateType.OKR_GOALS_REPORT]: {
    type: TemplateType.OKR_GOALS_REPORT,
    name: 'OKR Goals Report',
    description: 'Objectives and Key Results tracking document',
    category: TemplateCategory.STRATEGY,
    layouts: [
      LayoutComponentType.HERO_HEADER,
      LayoutComponentType.SECTION_CARD,
      LayoutComponentType.TABLE_BLOCK,
      LayoutComponentType.METRICS_STRIP,
      LayoutComponentType.FOOTER_BLOCK,
    ],
    defaultSections: ['Overview', 'Objectives', 'Key Results', 'Progress', 'Achievements', 'Next Quarter'],
    style: {
      colorScheme: 'green',
      headerStyle: 'minimal',
      cardStyle: 'rounded',
      spacing: 'compact',
    },
    pages: {
      includeCoverPage: false,
      includeTableOfContents: false,
      includeFooter: true,
      includePageNumbers: true,
    },
  },

  [TemplateType.INTERNAL_TEAM_REPORT]: {
    type: TemplateType.INTERNAL_TEAM_REPORT,
    name: 'Internal Team Report',
    description: 'Team performance and updates report',
    category: TemplateCategory.STRATEGY,
    layouts: [
      LayoutComponentType.HERO_HEADER,
      LayoutComponentType.METRICS_STRIP,
      LayoutComponentType.SECTION_CARD,
      LayoutComponentType.TABLE_BLOCK,
      LayoutComponentType.CONCLUSION_BLOCK,
      LayoutComponentType.FOOTER_BLOCK,
    ],
    defaultSections: ['Team Overview', 'Accomplishments', 'Challenges', 'Metrics', 'Plans', 'Summary'],
    style: {
      colorScheme: 'gray',
      headerStyle: 'minimal',
      cardStyle: 'soft',
      spacing: 'normal',
    },
    pages: {
      includeCoverPage: false,
      includeTableOfContents: false,
      includeFooter: true,
      includePageNumbers: true,
    },
  },

  // ========== PRODUCT & TECH (2 Templates) ==========

  [TemplateType.PRODUCT_REQUIREMENTS]: {
    type: TemplateType.PRODUCT_REQUIREMENTS,
    name: 'Product Requirements (PRD)',
    description: 'Structured product requirements document',
    category: TemplateCategory.PRODUCT_TECH,
    layouts: [
      LayoutComponentType.COVER_PAGE,
      LayoutComponentType.HERO_HEADER,
      LayoutComponentType.SECTION_CARD,
      LayoutComponentType.TABLE_BLOCK,
      LayoutComponentType.PROCESS_STEPS_BLOCK,
      LayoutComponentType.FOOTER_BLOCK,
    ],
    defaultSections: ['Overview', 'Problem Statement', 'User Stories', 'Requirements', 'Success Criteria', 'Timeline'],
    style: {
      colorScheme: 'blue',
      headerStyle: 'minimal',
      cardStyle: 'sharp',
      spacing: 'compact',
    },
    pages: {
      includeCoverPage: true,
      includeTableOfContents: true,
      includeFooter: true,
      includePageNumbers: true,
    },
  },

  [TemplateType.TECHNICAL_DOCUMENTATION]: {
    type: TemplateType.TECHNICAL_DOCUMENTATION,
    name: 'Technical Documentation',
    description: 'Comprehensive technical documentation with code-friendly layout',
    category: TemplateCategory.PRODUCT_TECH,
    layouts: [
      LayoutComponentType.HERO_HEADER,
      LayoutComponentType.SECTION_CARD,
      LayoutComponentType.TEXT_BLOCK,
      LayoutComponentType.TABLE_BLOCK,
      LayoutComponentType.FOOTER_BLOCK,
    ],
    defaultSections: ['Introduction', 'Architecture', 'API Reference', 'Usage Examples', 'Configuration', 'Troubleshooting'],
    style: {
      colorScheme: 'gray',
      headerStyle: 'minimal',
      cardStyle: 'sharp',
      spacing: 'compact',
    },
    pages: {
      includeCoverPage: false,
      includeTableOfContents: true,
      includeFooter: true,
      includePageNumbers: true,
    },
  },

  // ========== BRAND & CONTENT (1 Template) ==========

  [TemplateType.BRAND_GUIDELINES]: {
    type: TemplateType.BRAND_GUIDELINES,
    name: 'Brand Guidelines',
    description: 'Professional brand guidelines with visual examples',
    category: TemplateCategory.BRAND_CONTENT,
    layouts: [
      LayoutComponentType.COVER_PAGE,
      LayoutComponentType.HERO_HEADER,
      LayoutComponentType.SECTION_CARD,
      LayoutComponentType.IMAGE_BLOCK,
      LayoutComponentType.TWO_COLUMN_LAYOUT,
      LayoutComponentType.FOOTER_BLOCK,
    ],
    defaultSections: ['Brand Overview', 'Logo Usage', 'Color Palette', 'Typography', 'Visual Style', 'Examples'],
    style: {
      colorScheme: 'purple',
      headerStyle: 'gradient',
      cardStyle: 'rounded',
      spacing: 'spacious',
    },
    pages: {
      includeCoverPage: true,
      includeTableOfContents: true,
      includeFooter: true,
      includePageNumbers: true,
    },
  },

  // ========== HR & OPERATIONS (3 Templates) ==========

  [TemplateType.EMPLOYEE_HANDBOOK]: {
    type: TemplateType.EMPLOYEE_HANDBOOK,
    name: 'Employee Handbook',
    description: 'Comprehensive employee handbook and policies',
    category: TemplateCategory.HR_OPERATIONS,
    layouts: [
      LayoutComponentType.COVER_PAGE,
      LayoutComponentType.HERO_HEADER,
      LayoutComponentType.SECTION_CARD,
      LayoutComponentType.TEXT_BLOCK,
      LayoutComponentType.TABLE_BLOCK,
      LayoutComponentType.FOOTER_BLOCK,
    ],
    defaultSections: ['Welcome', 'Company Culture', 'Employment Policies', 'Benefits', 'Code of Conduct', 'Resources'],
    style: {
      colorScheme: 'blue',
      headerStyle: 'minimal',
      cardStyle: 'rounded',
      spacing: 'spacious',
    },
    pages: {
      includeCoverPage: true,
      includeTableOfContents: true,
      includeFooter: true,
      includePageNumbers: true,
    },
  },

  [TemplateType.QUARTERLY_BUSINESS_REVIEW]: {
    type: TemplateType.QUARTERLY_BUSINESS_REVIEW,
    name: 'Quarterly Business Review (QBR)',
    description: 'Executive quarterly business review presentation',
    category: TemplateCategory.HR_OPERATIONS,
    layouts: [
      LayoutComponentType.COVER_PAGE,
      LayoutComponentType.HERO_HEADER,
      LayoutComponentType.METRICS_STRIP,
      LayoutComponentType.CHART_BLOCK,
      LayoutComponentType.SECTION_CARD,
      LayoutComponentType.TABLE_BLOCK,
      LayoutComponentType.CONCLUSION_BLOCK,
      LayoutComponentType.FOOTER_BLOCK,
    ],
    defaultSections: ['Executive Summary', 'Q Performance', 'Key Wins', 'Challenges', 'Next Quarter Goals', 'Action Items'],
    style: {
      colorScheme: 'navy',
      headerStyle: 'solid',
      cardStyle: 'rounded',
      spacing: 'normal',
    },
    pages: {
      includeCoverPage: true,
      includeTableOfContents: false,
      includeFooter: true,
      includePageNumbers: true,
    },
  },

  [TemplateType.BOARD_MEETING_REPORT]: {
    type: TemplateType.BOARD_MEETING_REPORT,
    name: 'Board Meeting Report',
    description: 'Executive board meeting report and updates',
    category: TemplateCategory.HR_OPERATIONS,
    layouts: [
      LayoutComponentType.COVER_PAGE,
      LayoutComponentType.HERO_HEADER,
      LayoutComponentType.METRICS_STRIP,
      LayoutComponentType.SECTION_CARD,
      LayoutComponentType.TABLE_BLOCK,
      LayoutComponentType.CHART_BLOCK,
      LayoutComponentType.CONCLUSION_BLOCK,
      LayoutComponentType.FOOTER_BLOCK,
    ],
    defaultSections: ['Board Summary', 'Financial Performance', 'Strategic Initiatives', 'Risk Management', 'Governance', 'Resolutions'],
    style: {
      colorScheme: 'dark',
      headerStyle: 'minimal',
      cardStyle: 'sharp',
      spacing: 'spacious',
    },
    pages: {
      includeCoverPage: true,
      includeTableOfContents: true,
      includeFooter: true,
      includePageNumbers: true,
    },
  },

  // ========== MARKETING (4 Templates) ==========

  [TemplateType.INVESTOR_PITCH_DECK]: {
    type: TemplateType.INVESTOR_PITCH_DECK,
    name: 'Investor Pitch Deck',
    description: 'Professional investor pitch deck for fundraising',
    category: TemplateCategory.MARKETING,
    layouts: [
      LayoutComponentType.COVER_PAGE,
      LayoutComponentType.HERO_HEADER,
      LayoutComponentType.METRICS_STRIP,
      LayoutComponentType.SECTION_CARD,
      LayoutComponentType.CHART_BLOCK,
      LayoutComponentType.TABLE_BLOCK,
      LayoutComponentType.PROCESS_STEPS_BLOCK,
      LayoutComponentType.TIMELINE_BLOCK,
      LayoutComponentType.CONCLUSION_BLOCK,
      LayoutComponentType.FOOTER_BLOCK,
    ],
    defaultSections: ['Problem', 'Solution', 'Market Opportunity', 'Business Model', 'Traction', 'Team', 'Financials', 'Ask'],
    style: {
      colorScheme: 'purple',
      headerStyle: 'gradient',
      cardStyle: 'rounded',
      spacing: 'spacious',
    },
    pages: {
      includeCoverPage: true,
      includeTableOfContents: false,
      includeFooter: true,
      includePageNumbers: true,
    },
  },

  [TemplateType.WHITEPAPER]: {
    type: TemplateType.WHITEPAPER,
    name: 'Whitepaper',
    description: 'In-depth whitepaper for thought leadership',
    category: TemplateCategory.MARKETING,
    layouts: [
      LayoutComponentType.COVER_PAGE,
      LayoutComponentType.HERO_HEADER,
      LayoutComponentType.TEXT_BLOCK,
      LayoutComponentType.SECTION_CARD,
      LayoutComponentType.CHART_BLOCK,
      LayoutComponentType.QUOTE_BLOCK,
      LayoutComponentType.CONCLUSION_BLOCK,
      LayoutComponentType.FOOTER_BLOCK,
    ],
    defaultSections: ['Executive Summary', 'Introduction', 'Problem Analysis', 'Solution Overview', 'Benefits', 'Implementation', 'Conclusion'],
    style: {
      colorScheme: 'slate',
      headerStyle: 'minimal',
      cardStyle: 'soft',
      spacing: 'spacious',
    },
    pages: {
      includeCoverPage: true,
      includeTableOfContents: true,
      includeFooter: true,
      includePageNumbers: true,
    },
  },

  [TemplateType.CASE_STUDY_DOCUMENT]: {
    type: TemplateType.CASE_STUDY_DOCUMENT,
    name: 'Case Study',
    description: 'Customer success case study document',
    category: TemplateCategory.MARKETING,
    layouts: [
      LayoutComponentType.COVER_PAGE,
      LayoutComponentType.HERO_HEADER,
      LayoutComponentType.SECTION_CARD,
      LayoutComponentType.METRICS_STRIP,
      LayoutComponentType.QUOTE_BLOCK,
      LayoutComponentType.CASE_STUDY_BLOCK,
      LayoutComponentType.CONCLUSION_BLOCK,
      LayoutComponentType.FOOTER_BLOCK,
    ],
    defaultSections: ['Customer Overview', 'Challenge', 'Solution', 'Implementation', 'Results', 'Testimonial'],
    style: {
      colorScheme: 'teal',
      headerStyle: 'gradient',
      cardStyle: 'rounded',
      spacing: 'normal',
    },
    pages: {
      includeCoverPage: true,
      includeTableOfContents: false,
      includeFooter: true,
      includePageNumbers: true,
    },
  },

  [TemplateType.PRODUCT_LAUNCH_PLAN]: {
    type: TemplateType.PRODUCT_LAUNCH_PLAN,
    name: 'Product Launch Plan',
    description: 'Comprehensive product launch and go-to-market plan',
    category: TemplateCategory.MARKETING,
    layouts: [
      LayoutComponentType.COVER_PAGE,
      LayoutComponentType.HERO_HEADER,
      LayoutComponentType.SECTION_CARD,
      LayoutComponentType.TIMELINE_BLOCK,
      LayoutComponentType.PROCESS_STEPS_BLOCK,
      LayoutComponentType.TABLE_BLOCK,
      LayoutComponentType.CONCLUSION_BLOCK,
      LayoutComponentType.FOOTER_BLOCK,
    ],
    defaultSections: ['Product Overview', 'Market Analysis', 'Launch Strategy', 'Timeline', 'Marketing Channels', 'Success Metrics'],
    style: {
      colorScheme: 'indigo',
      headerStyle: 'gradient',
      cardStyle: 'rounded',
      spacing: 'normal',
    },
    pages: {
      includeCoverPage: true,
      includeTableOfContents: true,
      includeFooter: true,
      includePageNumbers: true,
    },
  },

  // ========== EXTENDED SALES & STRATEGY (3 Templates) ==========

  [TemplateType.MARKET_RESEARCH_REPORT]: {
    type: TemplateType.MARKET_RESEARCH_REPORT,
    name: 'Market Research Report',
    description: 'Detailed market research and analysis report',
    category: TemplateCategory.ANALYTICS,
    layouts: [
      LayoutComponentType.COVER_PAGE,
      LayoutComponentType.HERO_HEADER,
      LayoutComponentType.SECTION_CARD,
      LayoutComponentType.CHART_BLOCK,
      LayoutComponentType.TABLE_BLOCK,
      LayoutComponentType.TEXT_BLOCK,
      LayoutComponentType.CONCLUSION_BLOCK,
      LayoutComponentType.FOOTER_BLOCK,
    ],
    defaultSections: ['Executive Summary', 'Market Overview', 'Industry Trends', 'Competitor Analysis', 'Target Segments', 'Recommendations'],
    style: {
      colorScheme: 'emerald',
      headerStyle: 'minimal',
      cardStyle: 'rounded',
      spacing: 'normal',
    },
    pages: {
      includeCoverPage: true,
      includeTableOfContents: true,
      includeFooter: true,
      includePageNumbers: true,
    },
  },

  [TemplateType.PROJECT_PROPOSAL]: {
    type: TemplateType.PROJECT_PROPOSAL,
    name: 'Project Proposal',
    description: 'Professional project proposal document',
    category: TemplateCategory.STRATEGY,
    layouts: [
      LayoutComponentType.COVER_PAGE,
      LayoutComponentType.HERO_HEADER,
      LayoutComponentType.SECTION_CARD,
      LayoutComponentType.TIMELINE_BLOCK,
      LayoutComponentType.TABLE_BLOCK,
      LayoutComponentType.PROCESS_STEPS_BLOCK,
      LayoutComponentType.CONCLUSION_BLOCK,
      LayoutComponentType.FOOTER_BLOCK,
    ],
    defaultSections: ['Project Overview', 'Objectives', 'Scope', 'Timeline', 'Resources', 'Budget', 'Success Criteria'],
    style: {
      colorScheme: 'blue',
      headerStyle: 'solid',
      cardStyle: 'rounded',
      spacing: 'normal',
    },
    pages: {
      includeCoverPage: true,
      includeTableOfContents: true,
      includeFooter: true,
      includePageNumbers: true,
    },
  },

  [TemplateType.SALES_PLAYBOOK]: {
    type: TemplateType.SALES_PLAYBOOK,
    name: 'Sales Playbook',
    description: 'Sales enablement and playbook guide',
    category: TemplateCategory.SALES_CLIENT,
    layouts: [
      LayoutComponentType.COVER_PAGE,
      LayoutComponentType.HERO_HEADER,
      LayoutComponentType.SECTION_CARD,
      LayoutComponentType.PROCESS_STEPS_BLOCK,
      LayoutComponentType.TABLE_BLOCK,
      LayoutComponentType.TEXT_BLOCK,
      LayoutComponentType.FOOTER_BLOCK,
    ],
    defaultSections: ['Sales Process', 'Qualification Criteria', 'Objection Handling', 'Competitive Positioning', 'Closing Strategies', 'Resources'],
    style: {
      colorScheme: 'orange',
      headerStyle: 'gradient',
      cardStyle: 'rounded',
      spacing: 'compact',
    },
    pages: {
      includeCoverPage: true,
      includeTableOfContents: true,
      includeFooter: true,
      includePageNumbers: true,
    },
  },

  // ========== SPECIAL (Smart PDF Builder) ==========

  [TemplateType.SMART_PDF_BUILDER]: {
    type: TemplateType.SMART_PDF_BUILDER,
    name: 'Smart PDF Builder',
    description: 'AI-powered document generation with automatic template selection',
    category: TemplateCategory.BUSINESS_CORE,
    layouts: [], // Dynamically determined
    defaultSections: [], // Dynamically determined
    style: {
      colorScheme: 'blue',
      headerStyle: 'gradient',
      cardStyle: 'rounded',
      spacing: 'normal',
    },
    pages: {
      includeCoverPage: true,
      includeTableOfContents: true,
      includeFooter: true,
      includePageNumbers: true,
    },
  },
};

/**
 * Get all user-selectable templates (excluding Smart PDF Builder)
 */
export function getAllTemplates(): Template[] {
  return Object.values(TEMPLATE_CONFIGS)
    .filter((config) => config.type !== TemplateType.SMART_PDF_BUILDER)
    .map((config) => ({
      config,
      premium: true,
      recommended: [
        TemplateType.MODERN_ONE_PAGER,
        TemplateType.BUSINESS_PLAN_PRO,
        TemplateType.CLIENT_PROPOSAL_PRO,
      ].includes(config.type),
    }));
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(
  category: TemplateCategory,
): Template[] {
  return getAllTemplates().filter((t) => t.config.category === category);
}

/**
 * Get template configuration by type
 */
export function getTemplateConfig(type: TemplateType): TemplateConfig {
  return TEMPLATE_CONFIGS[type];
}

/**
 * Auto-select best template based on detected document type
 */
export function autoSelectTemplate(detectedType: string): TemplateType {
  const typeMapping: Record<string, TemplateType> = {
    startup: TemplateType.MODERN_ONE_PAGER,
    business: TemplateType.CLEAN_BUSINESS_REPORT,
    'business overview': TemplateType.CORPORATE_OVERVIEW,
    report: TemplateType.CLEAN_BUSINESS_REPORT,
    academic: TemplateType.CLEAN_BUSINESS_REPORT,
    technical: TemplateType.TECHNICAL_DOCUMENTATION,
    notes: TemplateType.CLEAN_BUSINESS_REPORT,
    'notes document': TemplateType.CLEAN_BUSINESS_REPORT,
    financial: TemplateType.FINANCIAL_REPORT,
    proposal: TemplateType.CLIENT_PROPOSAL_PRO,
    strategy: TemplateType.STRATEGY_DOCUMENT,
    product: TemplateType.PRODUCT_REQUIREMENTS,
  };

  return typeMapping[detectedType.toLowerCase()] || TemplateType.MODERN_ONE_PAGER;
}
