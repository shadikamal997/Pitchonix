import { IsString, IsOptional, IsEnum, IsInt, Min, Max, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum DocumentType {
  PITCH_DECK = 'pitch_deck',
  BUSINESS_PLAN = 'business_plan',
  PROPOSAL = 'proposal',
  SALES_DECK = 'sales_deck',
  COMPANY_PROFILE = 'company_profile',
  MARKETING_PLAN = 'marketing_plan',
  ONE_PAGER = 'one_pager',
  EXECUTIVE_SUMMARY = 'executive_summary',
  FINANCIAL_PROJECTION = 'financial_projection',
  PRODUCT_LAUNCH = 'product_launch',
  STRATEGY_PRESENTATION = 'strategy_presentation',
  PARTNERSHIP_PROPOSAL = 'partnership_proposal',
  INTERNAL_REPORT = 'internal_report',
  BOARD_MEETING = 'board_meeting',
  CASE_STUDY = 'case_study',
  TRAINING_PRESENTATION = 'training_presentation',
}

export enum ProjectStatus {
  DRAFT = 'draft',
  GENERATED = 'generated',
  REVIEWED = 'reviewed',
  EXPORTED = 'exported',
}

export class CreateProjectDto {
  @ApiProperty({ example: 'TechStartup Inc. Pitch Deck' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'Investor pitch deck for Series A funding', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: DocumentType, example: DocumentType.PITCH_DECK })
  @IsEnum(DocumentType)
  documentType: DocumentType;

  @ApiProperty({ example: 'Technology', required: false })
  @IsOptional()
  @IsString()
  industry?: string;

  @ApiProperty({ example: 'investors', required: false })
  @IsOptional()
  @IsString()
  audience?: string;

  @ApiProperty({ example: 'investor-focused', required: false })
  @IsOptional()
  @IsString()
  tone?: string;

  @ApiProperty({ example: {}, required: false })
  @IsOptional()
  @IsObject()
  businessInfo?: any;
}

export class UpdateProjectDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: DocumentType, required: false })
  @IsOptional()
  @IsEnum(DocumentType)
  documentType?: DocumentType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  industry?: string;

  @ApiProperty({ enum: ProjectStatus, required: false })
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  audience?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  tone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  businessInfo?: any;

  @ApiProperty({ required: false, minimum: 0, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  qualityScore?: number;
}

export class QueryProjectsDto {
  @ApiProperty({ required: false, example: 'My Project' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ enum: DocumentType, required: false })
  @IsOptional()
  @IsEnum(DocumentType)
  documentType?: DocumentType;

  @ApiProperty({ enum: ProjectStatus, required: false })
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ required: false, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
