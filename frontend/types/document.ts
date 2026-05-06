// Document parser types
export interface ExtractedData {
  // Business Info
  companyName?: string;
  industry?: string;
  businessStage?: string;
  country?: string;
  website?: string;

  // Business Details
  problem?: string;
  solution?: string;
  targetCustomers?: string;
  differentiation?: string;
  marketSize?: string;
  competitors?: string;
  revenueModel?: string;
  pricingStrategy?: string;
  traction?: string;
  teamInfo?: string;
  fundingStatus?: string;
  roadmap?: string;

  // Additional
  rawText?: string;
  confidence?: number;
  extractedSections?: {
    section: string;
    content: string;
    confidence: number;
  }[];
}

export interface ParsedDocument {
  data: ExtractedData;
  rawText: string;
  confidence: number;
  metadata: {
    filename: string;
    pages?: number;
    words?: number;
    documentType: string;
  };
}
