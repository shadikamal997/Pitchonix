import { FeasibilityTemplateDefinition } from './feasibility-studio.types';

export const FEASIBILITY_TEMPLATES: FeasibilityTemplateDefinition[] = [
  {
    id: 'investor-feasibility-report',
    name: 'Investor Feasibility Report',
    description:
      'Board-ready feasibility narrative with investment logic, risks, and go-forward recommendation.',
    studyTypes: ['investor_feasibility', 'general_feasibility'],
    pdfTemplateType: 'business_plan_pro',
    proTemplateId: 'investor-diligence-pack',
    scorecardStyle: 'investor',
    sections: [
      'Executive Summary',
      'Project Overview',
      'Market Opportunity',
      'Business Model',
      'Financial Assumptions',
      'Risk Assessment',
      'Implementation Plan',
      'Investment Recommendation',
    ],
  },
  {
    id: 'market-feasibility-study',
    name: 'Market Feasibility Study',
    description:
      'Demand, customer, competitor, and market-entry feasibility focused for launch decisions.',
    studyTypes: ['market_feasibility'],
    pdfTemplateType: 'market_research_report',
    proTemplateId: 'analytics-performance-report',
    scorecardStyle: 'market',
    sections: [
      'Executive Summary',
      'Target Customers',
      'Market Demand',
      'Competitive Landscape',
      'Positioning',
      'Revenue Potential',
      'Market Risks',
      'Recommendation',
    ],
  },
  {
    id: 'financial-viability-study',
    name: 'Financial Viability Study',
    description: 'Cost, revenue, margin, funding, and break-even oriented feasibility report.',
    studyTypes: ['financial_viability'],
    pdfTemplateType: 'financial_report',
    proTemplateId: 'fintech-operating-plan',
    scorecardStyle: 'financial',
    sections: [
      'Executive Summary',
      'Revenue Assumptions',
      'Cost Assumptions',
      'Capital Requirements',
      'Break-even View',
      'Sensitivity Risks',
      'Financial Recommendation',
    ],
  },
  {
    id: 'go-no-go-assessment',
    name: 'Go / No-Go Assessment',
    description:
      'Decision memo with feasibility scorecard, constraints, risk matrix, and action plan.',
    studyTypes: [
      'risk_go_no_go',
      'technical_feasibility',
      'operational_feasibility',
      'general_feasibility',
    ],
    pdfTemplateType: 'board_meeting_report',
    proTemplateId: 'executive-board-brief',
    scorecardStyle: 'decision',
    sections: [
      'Decision Summary',
      'Feasibility Scorecard',
      'Technical Readiness',
      'Operational Readiness',
      'Risk Matrix',
      'Required Fixes',
      'Go / No-Go Recommendation',
    ],
  },
];

export function getFeasibilityTemplate(id?: string | null): FeasibilityTemplateDefinition {
  return FEASIBILITY_TEMPLATES.find((template) => template.id === id) || FEASIBILITY_TEMPLATES[0];
}
