export interface TemplateDefinition {
  id: string;
  name: string;
  category: string;
  description: string;
  tags: string[];
  colors: {
    header: string;
    accent: string;
    bg: string;
    text: string;
    line: string;
  };
  headerStyle: 'gradient' | 'solid' | 'minimal' | 'split';
  spacing: 'compact' | 'normal' | 'spacious';
}

export const TEMPLATE_REGISTRY: TemplateDefinition[] = [
  // ── Business Core ──────────────────────────────────────────────────
  {
    id: 'modern_one_pager',
    name: 'Modern One Pager',
    category: 'Business',
    description: 'Clean single-page layout for overviews and pitches',
    tags: ['One Pager', 'Modern', 'Concise'],
    colors: { header: '#2563EB', accent: '#60A5FA', bg: '#EFF6FF', text: '#1E3A8A', line: '#BFDBFE' },
    headerStyle: 'gradient',
    spacing: 'normal',
  },
  {
    id: 'executive_one_pager',
    name: 'Executive One Pager',
    category: 'Business',
    description: 'Premium executive summary with structured layout',
    tags: ['Executive', 'Premium', 'Summary'],
    colors: { header: '#1E40AF', accent: '#3B82F6', bg: '#EFF6FF', text: '#1E3A8A', line: '#BFDBFE' },
    headerStyle: 'solid',
    spacing: 'spacious',
  },
  {
    id: 'business_plan_pro',
    name: 'Business Plan Pro',
    category: 'Business',
    description: 'Comprehensive business plan with full section structure',
    tags: ['Business Plan', 'Comprehensive', 'Formal'],
    colors: { header: '#374151', accent: '#9CA3AF', bg: '#F9FAFB', text: '#111827', line: '#E5E7EB' },
    headerStyle: 'solid',
    spacing: 'normal',
  },
  {
    id: 'clean_business_report',
    name: 'Clean Business Report',
    category: 'Business',
    description: 'Minimal, readable report with crisp typography',
    tags: ['Report', 'Minimal', 'Clean'],
    colors: { header: '#475569', accent: '#94A3B8', bg: '#F8FAFC', text: '#0F172A', line: '#E2E8F0' },
    headerStyle: 'minimal',
    spacing: 'normal',
  },
  {
    id: 'corporate_overview',
    name: 'Corporate Overview',
    category: 'Business',
    description: 'Professional corporate profile and company overview',
    tags: ['Corporate', 'Company', 'Profile'],
    colors: { header: '#4F46E5', accent: '#818CF8', bg: '#EEF2FF', text: '#312E81', line: '#C7D2FE' },
    headerStyle: 'gradient',
    spacing: 'spacious',
  },

  // ── Analytics ──────────────────────────────────────────────────────
  {
    id: 'financial_report',
    name: 'Financial Report',
    category: 'Analytics',
    description: 'Structured financial reporting with data clarity',
    tags: ['Finance', 'Numbers', 'Report'],
    colors: { header: '#059669', accent: '#34D399', bg: '#ECFDF5', text: '#064E3B', line: '#A7F3D0' },
    headerStyle: 'solid',
    spacing: 'normal',
  },
  {
    id: 'kpi_dashboard_report',
    name: 'KPI Dashboard',
    category: 'Analytics',
    description: 'Metrics-first dashboard layout for performance reviews',
    tags: ['KPI', 'Dashboard', 'Metrics'],
    colors: { header: '#2563EB', accent: '#60A5FA', bg: '#EFF6FF', text: '#1E3A8A', line: '#BFDBFE' },
    headerStyle: 'gradient',
    spacing: 'compact',
  },
  {
    id: 'budget_plan_report',
    name: 'Budget Plan',
    category: 'Analytics',
    description: 'Clear budget breakdown with allocation tables',
    tags: ['Budget', 'Finance', 'Planning'],
    colors: { header: '#0D9488', accent: '#2DD4BF', bg: '#F0FDFA', text: '#134E4A', line: '#99F6E4' },
    headerStyle: 'solid',
    spacing: 'normal',
  },
  {
    id: 'data_insights_report',
    name: 'Data Insights',
    category: 'Analytics',
    description: 'Research-grade insights with visual data hierarchy',
    tags: ['Data', 'Research', 'Insights'],
    colors: { header: '#7C3AED', accent: '#A78BFA', bg: '#F5F3FF', text: '#4C1D95', line: '#DDD6FE' },
    headerStyle: 'gradient',
    spacing: 'spacious',
  },

  // ── Sales & Client ─────────────────────────────────────────────────
  {
    id: 'client_proposal_pro',
    name: 'Client Proposal Pro',
    category: 'Sales',
    description: 'Persuasive proposal for client-facing deliverables',
    tags: ['Proposal', 'Client', 'Sales'],
    colors: { header: '#EA580C', accent: '#FB923C', bg: '#FFF7ED', text: '#7C2D12', line: '#FED7AA' },
    headerStyle: 'gradient',
    spacing: 'spacious',
  },
  {
    id: 'sales_proposal_advanced',
    name: 'Sales Proposal',
    category: 'Sales',
    description: 'Advanced sales narrative with pricing and proof points',
    tags: ['Sales', 'Pricing', 'Proposal'],
    colors: { header: '#E11D48', accent: '#FB7185', bg: '#FFF1F2', text: '#881337', line: '#FECDD3' },
    headerStyle: 'gradient',
    spacing: 'normal',
  },
  {
    id: 'client_performance_report',
    name: 'Client Performance',
    category: 'Sales',
    description: 'Quarterly client results with clear metrics and next steps',
    tags: ['Client', 'Performance', 'QBR'],
    colors: { header: '#B45309', accent: '#FBBF24', bg: '#FFFBEB', text: '#78350F', line: '#FDE68A' },
    headerStyle: 'solid',
    spacing: 'normal',
  },
  {
    id: 'partnership_proposal',
    name: 'Partnership Proposal',
    category: 'Sales',
    description: 'Collaborative proposal for strategic partnerships',
    tags: ['Partnership', 'Strategy', 'Collaboration'],
    colors: { header: '#4338CA', accent: '#818CF8', bg: '#EEF2FF', text: '#312E81', line: '#C7D2FE' },
    headerStyle: 'solid',
    spacing: 'spacious',
  },

  // ── Strategy ───────────────────────────────────────────────────────
  {
    id: 'strategy_document',
    name: 'Strategy Document',
    category: 'Strategy',
    description: 'Executive strategy with diagnosis and recommendations',
    tags: ['Strategy', 'Executive', 'Planning'],
    colors: { header: '#111827', accent: '#6B7280', bg: '#F3F4F6', text: '#111827', line: '#D1D5DB' },
    headerStyle: 'solid',
    spacing: 'spacious',
  },
  {
    id: 'roadmap_timeline',
    name: 'Roadmap & Timeline',
    category: 'Strategy',
    description: 'Visual roadmap with milestones and delivery phases',
    tags: ['Roadmap', 'Timeline', 'Milestones'],
    colors: { header: '#1D4ED8', accent: '#60A5FA', bg: '#EFF6FF', text: '#1E3A8A', line: '#BFDBFE' },
    headerStyle: 'gradient',
    spacing: 'normal',
  },
  {
    id: 'okr_goals_report',
    name: 'OKR Goals Report',
    category: 'Strategy',
    description: 'Objective-key-result tracking with progress indicators',
    tags: ['OKR', 'Goals', 'Progress'],
    colors: { header: '#0F766E', accent: '#2DD4BF', bg: '#F0FDFA', text: '#134E4A', line: '#99F6E4' },
    headerStyle: 'minimal',
    spacing: 'normal',
  },
  {
    id: 'internal_team_report',
    name: 'Internal Team Report',
    category: 'Strategy',
    description: 'Internal reporting with clean, team-readable layout',
    tags: ['Internal', 'Team', 'Report'],
    colors: { header: '#4B5563', accent: '#9CA3AF', bg: '#F9FAFB', text: '#111827', line: '#E5E7EB' },
    headerStyle: 'minimal',
    spacing: 'compact',
  },

  // ── Product & Tech ─────────────────────────────────────────────────
  {
    id: 'product_requirements',
    name: 'Product Requirements',
    category: 'Product & Tech',
    description: 'PRD-style layout for product specs and user stories',
    tags: ['PRD', 'Product', 'Specs'],
    colors: { header: '#334155', accent: '#94A3B8', bg: '#F8FAFC', text: '#0F172A', line: '#CBD5E1' },
    headerStyle: 'solid',
    spacing: 'compact',
  },
  {
    id: 'technical_documentation',
    name: 'Technical Documentation',
    category: 'Product & Tech',
    description: 'Developer-grade docs with code-friendly typography',
    tags: ['Technical', 'Docs', 'Engineering'],
    colors: { header: '#1F2937', accent: '#6B7280', bg: '#F3F4F6', text: '#111827', line: '#D1D5DB' },
    headerStyle: 'minimal',
    spacing: 'compact',
  },

  // ── Brand & Content ────────────────────────────────────────────────
  {
    id: 'brand_guidelines',
    name: 'Brand Guidelines',
    category: 'Marketing',
    description: 'Visual identity manual with color and type specimens',
    tags: ['Brand', 'Design', 'Identity'],
    colors: { header: '#BE185D', accent: '#FB7185', bg: '#FFF1F2', text: '#881337', line: '#FECDD3' },
    headerStyle: 'gradient',
    spacing: 'spacious',
  },

  // ── HR & Operations ────────────────────────────────────────────────
  {
    id: 'employee_handbook',
    name: 'Employee Handbook',
    category: 'HR & Ops',
    description: 'Approachable people-first handbook with clear sections',
    tags: ['HR', 'Handbook', 'People'],
    colors: { header: '#047857', accent: '#34D399', bg: '#ECFDF5', text: '#064E3B', line: '#A7F3D0' },
    headerStyle: 'solid',
    spacing: 'spacious',
  },
  {
    id: 'quarterly_business_review',
    name: 'Quarterly Review',
    category: 'HR & Ops',
    description: 'QBR layout with performance, pipeline, and outlook',
    tags: ['QBR', 'Quarterly', 'Review'],
    colors: { header: '#1E3A8A', accent: '#3B82F6', bg: '#EFF6FF', text: '#1E3A8A', line: '#BFDBFE' },
    headerStyle: 'gradient',
    spacing: 'normal',
  },
  {
    id: 'board_meeting_report',
    name: 'Board Meeting Report',
    category: 'HR & Ops',
    description: 'Formal board-level reporting with executive hierarchy',
    tags: ['Board', 'Executive', 'Governance'],
    colors: { header: '#0F172A', accent: '#475569', bg: '#F8FAFC', text: '#0F172A', line: '#CBD5E1' },
    headerStyle: 'solid',
    spacing: 'spacious',
  },

  // ── Marketing ──────────────────────────────────────────────────────
  {
    id: 'investor_pitch_deck',
    name: 'Investor Pitch',
    category: 'Marketing',
    description: 'Investor-ready narrative with metrics and team sections',
    tags: ['Investor', 'Pitch', 'Startup'],
    colors: { header: '#6D28D9', accent: '#A78BFA', bg: '#F5F3FF', text: '#4C1D95', line: '#DDD6FE' },
    headerStyle: 'gradient',
    spacing: 'spacious',
  },
  {
    id: 'whitepaper',
    name: 'Whitepaper',
    category: 'Marketing',
    description: 'Long-form thought leadership with academic structure',
    tags: ['Whitepaper', 'Research', 'Long-form'],
    colors: { header: '#374151', accent: '#9CA3AF', bg: '#F9FAFB', text: '#111827', line: '#E5E7EB' },
    headerStyle: 'minimal',
    spacing: 'spacious',
  },
  {
    id: 'case_study_document',
    name: 'Case Study',
    category: 'Marketing',
    description: 'Customer success story from problem through results',
    tags: ['Case Study', 'Story', 'Proof'],
    colors: { header: '#C2410C', accent: '#FB923C', bg: '#FFF7ED', text: '#7C2D12', line: '#FED7AA' },
    headerStyle: 'gradient',
    spacing: 'normal',
  },
  {
    id: 'product_launch_plan',
    name: 'Product Launch Plan',
    category: 'Marketing',
    description: 'Go-to-market launch plan with timeline and channels',
    tags: ['Launch', 'GTM', 'Product'],
    colors: { header: '#DB2777', accent: '#F472B6', bg: '#FDF2F8', text: '#831843', line: '#FBCFE8' },
    headerStyle: 'solid',
    spacing: 'normal',
  },
  {
    id: 'market_research_report',
    name: 'Market Research',
    category: 'Marketing',
    description: 'Competitive analysis and market sizing report',
    tags: ['Research', 'Market', 'Analysis'],
    colors: { header: '#065F46', accent: '#6EE7B7', bg: '#ECFDF5', text: '#064E3B', line: '#A7F3D0' },
    headerStyle: 'minimal',
    spacing: 'normal',
  },
  {
    id: 'project_proposal',
    name: 'Project Proposal',
    category: 'Marketing',
    description: 'Scope-of-work proposal with timeline and deliverables',
    tags: ['Proposal', 'Project', 'SOW'],
    colors: { header: '#1D4ED8', accent: '#93C5FD', bg: '#EFF6FF', text: '#1E3A8A', line: '#BFDBFE' },
    headerStyle: 'minimal',
    spacing: 'normal',
  },
  {
    id: 'sales_playbook',
    name: 'Sales Playbook',
    category: 'Sales',
    description: 'Structured sales process with scripts and objections',
    tags: ['Sales', 'Playbook', 'Process'],
    colors: { header: '#92400E', accent: '#F59E0B', bg: '#FFFBEB', text: '#78350F', line: '#FDE68A' },
    headerStyle: 'gradient',
    spacing: 'normal',
  },
];

export function getTemplate(id: string | null | undefined): TemplateDefinition | undefined {
  return TEMPLATE_REGISTRY.find(t => t.id === id);
}
