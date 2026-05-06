import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

export enum DocumentType {
  PDF = 'pdf',
  DOCX = 'docx',
  PPTX = 'pptx',
}

export class DocumentUploadDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Document file (PDF, DOCX, or PPTX)',
  })
  file: Express.Multer.File;

  @ApiProperty({
    enum: DocumentType,
    description: 'Type of document',
    required: false,
  })
  @IsEnum(DocumentType)
  @IsOptional()
  documentType?: DocumentType;
}

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

  // Additional extracted data
  rawText?: string;
  confidence?: number; // 0-100
  extractedSections?: {
    section: string;
    content: string;
    confidence: number;
  }[];
}

export class ParsedDocumentDto {
  @ApiProperty({ description: 'Extracted structured data' })
  data: ExtractedData;

  @ApiProperty({ description: 'Raw text extracted from document' })
  rawText: string;

  @ApiProperty({ description: 'Confidence score (0-100)' })
  confidence: number;

  @ApiProperty({ description: 'Document metadata' })
  metadata: {
    filename: string;
    pages?: number;
    words?: number;
    documentType: string;
  };
}
