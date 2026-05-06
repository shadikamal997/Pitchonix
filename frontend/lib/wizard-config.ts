/**
 * Dynamic Wizard Configuration
 * Maps each document type to its specific wizard flow with tailored steps
 */

export interface WizardStep {
  id: string;
  title: string;
  description: string;
  component: string; // Component name to render
  required: boolean;
}

export interface DocumentTypeConfig {
  id: string;
  steps: WizardStep[];
  defaultSettings: {
    slideCount?: number;
    contentDepth?: string;
    includeCharts?: boolean;
    includeFinancials?: boolean;
  };
}

export const WIZARD_CONFIGS: Record<string, DocumentTypeConfig> = {
  pitch_deck: {
    id: 'pitch_deck',
    steps: [
      { id: 'type', title: 'Document Type', description: 'Choose what to create', component: 'Step1DocumentType', required: true },
      { id: 'business', title: 'Business Info', description: 'Company details', component: 'Step2BusinessInfo', required: true },
      { id: 'audience', title: 'Audience & Goal', description: 'Investors & purpose', component: 'Step3AudienceGoal', required: true },
      { id: 'pitch', title: 'Pitch Details', description: 'Problem & solution', component: 'Step4PitchDetails', required: true },
      { id: 'financials', title: 'Financials & Traction', description: 'Numbers & metrics', component: 'Step5Financials', required: false },
      { id: 'design', title: 'Design', description: 'Visual preferences', component: 'Step6Design', required: true },
      { id: 'settings', title: 'Settings', description: 'Generation options', component: 'Step7Settings', required: true },
    ],
    defaultSettings: {
      slideCount: 12,
      contentDepth: 'detailed',
      includeCharts: true,
      includeFinancials: true,
    },
  },

  business_plan: {
    id: 'business_plan',
    steps: [
      { id: 'type', title: 'Document Type', description: 'Choose what to create', component: 'Step1DocumentType', required: true },
      { id: 'business', title: 'Business Info', description: 'Company details', component: 'Step2BusinessInfo', required: true },
      { id: 'executive', title: 'Executive Summary', description: 'High-level overview', component: 'Step3ExecutiveSummary', required: true },
      { id: 'market', title: 'Market Analysis', description: 'Industry & competition', component: 'Step4MarketAnalysis', required: true },
      { id: 'operations', title: 'Operations', description: 'Business model', component: 'Step5Operations', required: true },
      { id: 'financials', title: 'Financial Plan', description: 'Projections & funding', component: 'Step6FinancialPlan', required: true },
      { id: 'design', title: 'Design', description: 'Visual preferences', component: 'Step7Design', required: true },
      { id: 'settings', title: 'Settings', description: 'Generation options', component: 'Step8Settings', required: true },
    ],
    defaultSettings: {
      slideCount: 25,
      contentDepth: 'comprehensive',
      includeCharts: true,
      includeFinancials: true,
    },
  },

  proposal: {
    id: 'proposal',
    steps: [
      { id: 'type', title: 'Document Type', description: 'Choose what to create', component: 'Step1DocumentType', required: true },
      { id: 'business', title: 'Your Company', description: 'Company details', component: 'Step2BusinessInfo', required: true },
      { id: 'client', title: 'Client Info', description: 'About the client', component: 'Step3ClientInfo', required: true },
      { id: 'proposal_details', title: 'Proposal Details', description: 'Their problem & your solution', component: 'Step4ProposalDetails', required: true },
      { id: 'scope', title: 'Scope & Timeline', description: 'Deliverables & schedule', component: 'Step5ScopeTimeline', required: true },
      { id: 'pricing', title: 'Pricing', description: 'Cost breakdown', component: 'Step6Pricing', required: true },
      { id: 'design', title: 'Design', description: 'Visual preferences', component: 'Step7Design', required: true },
      { id: 'settings', title: 'Settings', description: 'Generation options', component: 'Step8Settings', required: true },
    ],
    defaultSettings: {
      slideCount: 15,
      contentDepth: 'detailed',
      includeCharts: false,
      includeFinancials: false,
    },
  },

  sales_deck: {
    id: 'sales_deck',
    steps: [
      { id: 'type', title: 'Document Type', description: 'Choose what to create', component: 'Step1DocumentType', required: true },
      { id: 'business', title: 'Company Info', description: 'Company details', component: 'Step2BusinessInfo', required: true },
      { id: 'product', title: 'Product/Service', description: 'What you sell', component: 'Step3ProductInfo', required: true },
      { id: 'value', title: 'Value Proposition', description: 'Benefits & ROI', component: 'Step4ValueProposition', required: true },
      { id: 'customers', title: 'Target Customers', description: 'Who & why', component: 'Step5TargetCustomers', required: true },
      { id: 'pricing', title: 'Pricing & Packages', description: 'Cost & options', component: 'Step6Pricing', required: true },
      { id: 'design', title: 'Design', description: 'Visual preferences', component: 'Step7Design', required: true },
      { id: 'settings', title: 'Settings', description: 'Generation options', component: 'Step8Settings', required: true },
    ],
    defaultSettings: {
      slideCount: 10,
      contentDepth: 'balanced',
      includeCharts: true,
      includeFinancials: false,
    },
  },

  company_profile: {
    id: 'company_profile',
    steps: [
      { id: 'type', title: 'Document Type', description: 'Choose what to create', component: 'Step1DocumentType', required: true },
      { id: 'business', title: 'Company Info', description: 'Company details', component: 'Step2BusinessInfo', required: true },
      { id: 'story', title: 'Company Story', description: 'History & mission', component: 'Step3CompanyStory', required: true },
      { id: 'capabilities', title: 'Capabilities', description: 'What you do', component: 'Step4Capabilities', required: true },
      { id: 'portfolio', title: 'Portfolio & Clients', description: 'Past work', component: 'Step5Portfolio', required: false },
      { id: 'team', title: 'Team', description: 'Key people', component: 'Step6Team', required: false },
      { id: 'design', title: 'Design', description: 'Visual preferences', component: 'Step7Design', required: true },
      { id: 'settings', title: 'Settings', description: 'Generation options', component: 'Step8Settings', required: true },
    ],
    defaultSettings: {
      slideCount: 15,
      contentDepth: 'balanced',
      includeCharts: false,
      includeFinancials: false,
    },
  },

  marketing_plan: {
    id: 'marketing_plan',
    steps: [
      { id: 'type', title: 'Document Type', description: 'Choose what to create', component: 'Step1DocumentType', required: true },
      { id: 'business', title: 'Business Info', description: 'Company details', component: 'Step2BusinessInfo', required: true },
      { id: 'goals', title: 'Marketing Goals', description: 'Objectives & KPIs', component: 'Step3MarketingGoals', required: true },
      { id: 'target', title: 'Target Market', description: 'Audience personas', component: 'Step4TargetMarket', required: true },
      { id: 'strategy', title: 'Strategy', description: 'Channels & tactics', component: 'Step5MarketingStrategy', required: true },
      { id: 'budget', title: 'Budget & Timeline', description: 'Resources & schedule', component: 'Step6BudgetTimeline', required: true },
      { id: 'design', title: 'Design', description: 'Visual preferences', component: 'Step7Design', required: true },
      { id: 'settings', title: 'Settings', description: 'Generation options', component: 'Step8Settings', required: true },
    ],
    defaultSettings: {
      slideCount: 20,
      contentDepth: 'detailed',
      includeCharts: true,
      includeFinancials: false,
    },
  },

  one_pager: {
    id: 'one_pager',
    steps: [
      { id: 'type', title: 'Document Type', description: 'Choose what to create', component: 'Step1DocumentType', required: true },
      { id: 'business', title: 'Company Info', description: 'Company details', component: 'Step2BusinessInfo', required: true },
      { id: 'message', title: 'Key Message', description: 'Core value prop', component: 'Step3KeyMessage', required: true },
      { id: 'design', title: 'Design', description: 'Visual preferences', component: 'Step4Design', required: true },
      { id: 'settings', title: 'Settings', description: 'Generation options', component: 'Step5Settings', required: true },
    ],
    defaultSettings: {
      slideCount: 1,
      contentDepth: 'concise',
      includeCharts: false,
      includeFinancials: false,
    },
  },

  executive_summary: {
    id: 'executive_summary',
    steps: [
      { id: 'type', title: 'Document Type', description: 'Choose what to create', component: 'Step1DocumentType', required: true },
      { id: 'business', title: 'Business Info', description: 'Company details', component: 'Step2BusinessInfo', required: true },
      { id: 'opportunity', title: 'Opportunity', description: 'Market & problem', component: 'Step3Opportunity', required: true },
      { id: 'highlights', title: 'Key Highlights', description: 'Metrics & achievements', component: 'Step4Highlights', required: true },
      { id: 'ask', title: 'The Ask', description: 'What you need', component: 'Step5TheAsk', required: false },
      { id: 'design', title: 'Design', description: 'Visual preferences', component: 'Step6Design', required: true },
      { id: 'settings', title: 'Settings', description: 'Generation options', component: 'Step7Settings', required: true },
    ],
    defaultSettings: {
      slideCount: 5,
      contentDepth: 'concise',
      includeCharts: false,
      includeFinancials: true,
    },
  },

  financial_projection: {
    id: 'financial_projection',
    steps: [
      { id: 'type', title: 'Document Type', description: 'Choose what to create', component: 'Step1DocumentType', required: true },
      { id: 'business', title: 'Business Info', description: 'Company details', component: 'Step2BusinessInfo', required: true },
      { id: 'financials', title: 'Financial Data', description: 'Historical & current', component: 'Step3FinancialData', required: true },
      { id: 'projections', title: 'Projections', description: 'Future forecasts', component: 'Step4Projections', required: true },
      { id: 'assumptions', title: 'Assumptions', description: 'Key assumptions', component: 'Step5Assumptions', required: true },
      { id: 'design', title: 'Design', description: 'Visual preferences', component: 'Step6Design', required: true },
      { id: 'settings', title: 'Settings', description: 'Generation options', component: 'Step7Settings', required: true },
    ],
    defaultSettings: {
      slideCount: 8,
      contentDepth: 'detailed',
      includeCharts: true,
      includeFinancials: true,
    },
  },

  product_launch: {
    id: 'product_launch',
    steps: [
      { id: 'type', title: 'Document Type', description: 'Choose what to create', component: 'Step1DocumentType', required: true },
      { id: 'business', title: 'Company Info', description: 'Company details', component: 'Step2BusinessInfo', required: true },
      { id: 'product', title: 'Product Details', description: 'What you\'re launching', component: 'Step3ProductDetails', required: true },
      { id: 'market', title: 'Target Market', description: 'Who & why', component: 'Step4TargetMarket', required: true },
      { id: 'gtm', title: 'Go-to-Market', description: 'Launch strategy', component: 'Step5GoToMarket', required: true },
      { id: 'timeline', title: 'Timeline & Milestones', description: 'Launch roadmap', component: 'Step6LaunchTimeline', required: true },
      { id: 'design', title: 'Design', description: 'Visual preferences', component: 'Step7Design', required: true },
      { id: 'settings', title: 'Settings', description: 'Generation options', component: 'Step8Settings', required: true },
    ],
    defaultSettings: {
      slideCount: 15,
      contentDepth: 'detailed',
      includeCharts: true,
      includeFinancials: false,
    },
  },

  strategy_presentation: {
    id: 'strategy_presentation',
    steps: [
      { id: 'type', title: 'Document Type', description: 'Choose what to create', component: 'Step1DocumentType', required: true },
      { id: 'context', title: 'Context', description: 'Current situation', component: 'Step2Context', required: true },
      { id: 'goals', title: 'Strategic Goals', description: 'Objectives', component: 'Step3StrategicGoals', required: true },
      { id: 'initiatives', title: 'Initiatives', description: 'Key projects', component: 'Step4Initiatives', required: true },
      { id: 'roadmap', title: 'Roadmap', description: 'Timeline & phases', component: 'Step5Roadmap', required: true },
      { id: 'metrics', title: 'Success Metrics', description: 'How to measure', component: 'Step6Metrics', required: false },
      { id: 'design', title: 'Design', description: 'Visual preferences', component: 'Step7Design', required: true },
      { id: 'settings', title: 'Settings', description: 'Generation options', component: 'Step8Settings', required: true },
    ],
    defaultSettings: {
      slideCount: 18,
      contentDepth: 'detailed',
      includeCharts: true,
      includeFinancials: false,
    },
  },

  partnership_proposal: {
    id: 'partnership_proposal',
    steps: [
      { id: 'type', title: 'Document Type', description: 'Choose what to create', component: 'Step1DocumentType', required: true },
      { id: 'your_company', title: 'Your Company', description: 'Your details', component: 'Step2YourCompany', required: true },
      { id: 'partner', title: 'Partner Info', description: 'About the partner', component: 'Step3PartnerInfo', required: true },
      { id: 'opportunity', title: 'Partnership Opportunity', description: 'The collaboration', component: 'Step4PartnershipOpportunity', required: true },
      { id: 'benefits', title: 'Mutual Benefits', description: 'Win-win value', component: 'Step5MutualBenefits', required: true },
      { id: 'terms', title: 'Terms', description: 'Structure & timeline', component: 'Step6Terms', required: false },
      { id: 'design', title: 'Design', description: 'Visual preferences', component: 'Step7Design', required: true },
      { id: 'settings', title: 'Settings', description: 'Generation options', component: 'Step8Settings', required: true },
    ],
    defaultSettings: {
      slideCount: 12,
      contentDepth: 'balanced',
      includeCharts: false,
      includeFinancials: false,
    },
  },

  internal_report: {
    id: 'internal_report',
    steps: [
      { id: 'type', title: 'Document Type', description: 'Choose what to create', component: 'Step1DocumentType', required: true },
      { id: 'report_info', title: 'Report Info', description: 'Report details', component: 'Step2ReportInfo', required: true },
      { id: 'metrics', title: 'Metrics & Data', description: 'Key numbers', component: 'Step3ReportMetrics', required: true },
      { id: 'insights', title: 'Insights', description: 'Analysis & findings', component: 'Step4Insights', required: true },
      { id: 'recommendations', title: 'Recommendations', description: 'Next steps', component: 'Step5Recommendations', required: false },
      { id: 'design', title: 'Design', description: 'Visual preferences', component: 'Step6Design', required: true },
      { id: 'settings', title: 'Settings', description: 'Generation options', component: 'Step7Settings', required: true },
    ],
    defaultSettings: {
      slideCount: 10,
      contentDepth: 'balanced',
      includeCharts: true,
      includeFinancials: false,
    },
  },

  board_meeting_deck: {
    id: 'board_meeting_deck',
    steps: [
      { id: 'type', title: 'Document Type', description: 'Choose what to create', component: 'Step1DocumentType', required: true },
      { id: 'business', title: 'Company Info', description: 'Company details', component: 'Step2BusinessInfo', required: true },
      { id: 'performance', title: 'Performance', description: 'Metrics & KPIs', component: 'Step3Performance', required: true },
      { id: 'financial', title: 'Financial Update', description: 'Revenue & expenses', component: 'Step4FinancialUpdate', required: true },
      { id: 'decisions', title: 'Key Decisions', description: 'Board approvals needed', component: 'Step5KeyDecisions', required: false },
      { id: 'risks', title: 'Risks & Challenges', description: 'Issues to address', component: 'Step6Risks', required: false },
      { id: 'design', title: 'Design', description: 'Visual preferences', component: 'Step7Design', required: true },
      { id: 'settings', title: 'Settings', description: 'Generation options', component: 'Step8Settings', required: true },
    ],
    defaultSettings: {
      slideCount: 20,
      contentDepth: 'comprehensive',
      includeCharts: true,
      includeFinancials: true,
    },
  },

  case_study: {
    id: 'case_study',
    steps: [
      { id: 'type', title: 'Document Type', description: 'Choose what to create', component: 'Step1DocumentType', required: true },
      { id: 'business', title: 'Your Company', description: 'Your details', component: 'Step2BusinessInfo', required: true },
      { id: 'customer', title: 'Customer Info', description: 'About the customer', component: 'Step3CustomerInfo', required: true },
      { id: 'challenge', title: 'Challenge', description: 'Their problem', component: 'Step4Challenge', required: true },
      { id: 'solution_implemented', title: 'Solution', description: 'What you did', component: 'Step5SolutionImplemented', required: true },
      { id: 'results', title: 'Results', description: 'Outcomes & metrics', component: 'Step6Results', required: true },
      { id: 'design', title: 'Design', description: 'Visual preferences', component: 'Step7Design', required: true },
      { id: 'settings', title: 'Settings', description: 'Generation options', component: 'Step8Settings', required: true },
    ],
    defaultSettings: {
      slideCount: 8,
      contentDepth: 'balanced',
      includeCharts: true,
      includeFinancials: false,
    },
  },

  training_presentation: {
    id: 'training_presentation',
    steps: [
      { id: 'type', title: 'Document Type', description: 'Choose what to create', component: 'Step1DocumentType', required: true },
      { id: 'training_info', title: 'Training Info', description: 'Topic & audience', component: 'Step2TrainingInfo', required: true },
      { id: 'objectives', title: 'Learning Objectives', description: 'What they\'ll learn', component: 'Step3LearningObjectives', required: true },
      { id: 'content', title: 'Content Structure', description: 'Topics & modules', component: 'Step4ContentStructure', required: true },
      { id: 'activities', title: 'Activities', description: 'Exercises & assessments', component: 'Step5Activities', required: false },
      { id: 'design', title: 'Design', description: 'Visual preferences', component: 'Step6Design', required: true },
      { id: 'settings', title: 'Settings', description: 'Generation options', component: 'Step7Settings', required: true },
    ],
    defaultSettings: {
      slideCount: 30,
      contentDepth: 'detailed',
      includeCharts: false,
      includeFinancials: false,
    },
  },
};

/**
 * Get wizard configuration for a specific document type
 */
export function getWizardConfig(documentType: string): DocumentTypeConfig {
  return WIZARD_CONFIGS[documentType] || WIZARD_CONFIGS.pitch_deck;
}

/**
 * Get all available document types
 */
export function getAllDocumentTypes(): string[] {
  return Object.keys(WIZARD_CONFIGS);
}
