export type FeasibilityStatus = 'present' | 'weak' | 'missing' | 'needs_improvement';

export interface FeasibilityTemplate {
  id: string;
  name: string;
  description: string;
  studyTypes: string[];
  pdfTemplateType: string;
  proTemplateId?: string;
  sections: string[];
  scorecardStyle: string;
}

export interface FeasibilitySectionCheck {
  key: string;
  title: string;
  status: FeasibilityStatus;
  confidence: number;
  evidence: string[];
  guidance: string;
}

export interface FeasibilityAnalysis {
  projectName: string;
  businessObjective: string;
  studyType: string;
  industry?: string;
  detectedSignals: Record<string, string[]>;
  sections: FeasibilitySectionCheck[];
  scores: {
    marketScore: number;
    financialScore: number;
    technicalScore: number;
    operationalScore: number;
    riskScore: number;
    overallScore: number;
  };
  warnings: string[];
  recommendations: string[];
  recommendation: string;
  preservation: {
    originalCharacters: number;
    originalWords: number;
    preservedCharacters: number;
    preservationRate: number;
  };
}

export interface FeasibilityProject {
  id: string;
  userId: string;
  projectId: string;
  pdfDocumentId?: string | null;
  title: string;
  description?: string | null;
  industry?: string | null;
  studyType: string;
  score?: number | null;
  status: string;
  analysis?: FeasibilityAnalysis | null;
  recommendations?: string[] | null;
  sourceMetadata?: any;
  createdAt: string;
  updatedAt: string;
  project?: any;
  pdfDocument?: any;
  assessments?: any[];
}
