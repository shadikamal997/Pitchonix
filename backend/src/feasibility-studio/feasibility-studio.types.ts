export type FeasibilityStudyType =
  | 'investor_feasibility'
  | 'market_feasibility'
  | 'financial_viability'
  | 'technical_feasibility'
  | 'operational_feasibility'
  | 'risk_go_no_go'
  | 'real_estate_feasibility'
  | 'healthcare_feasibility'
  | 'manufacturing_feasibility'
  | 'energy_feasibility'
  | 'general_feasibility';

export type SectionStatus = 'present' | 'weak' | 'missing' | 'needs_improvement';

export interface FeasibilitySectionCheck {
  key: string;
  title: string;
  status: SectionStatus;
  confidence: number;
  evidence: string[];
  guidance: string;
}

export interface FeasibilityScores {
  marketScore: number;
  financialScore: number;
  technicalScore: number;
  operationalScore: number;
  riskScore: number;
  overallScore: number;
}

export interface FeasibilityAnalysis {
  projectName: string;
  businessObjective: string;
  studyType: FeasibilityStudyType;
  industry?: string;
  detectedSignals: Record<string, string[]>;
  sections: FeasibilitySectionCheck[];
  scores: FeasibilityScores;
  warnings: string[];
  recommendations: string[];
  recommendation:
    | 'Proceed'
    | 'Proceed With Caution'
    | 'Revise Before Proceeding'
    | 'Do Not Proceed Yet';
  preservation: {
    originalCharacters: number;
    originalWords: number;
    preservedCharacters: number;
    preservationRate: number;
  };
}

export interface FeasibilityTemplateDefinition {
  id: string;
  name: string;
  description: string;
  studyTypes: FeasibilityStudyType[];
  pdfTemplateType: string;
  proTemplateId?: string;
  sections: string[];
  scorecardStyle: 'investor' | 'market' | 'financial' | 'decision';
}
