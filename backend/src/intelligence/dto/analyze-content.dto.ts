import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum } from 'class-validator';

export enum AnalysisType {
  PROBLEM = 'problem',
  SOLUTION = 'solution',
  MARKET = 'market',
  DIFFERENTIATION = 'differentiation',
  VALUE_PROPOSITION = 'value_proposition',
  PITCH = 'pitch',
  GENERAL = 'general',
}

export class AnalyzeContentDto {
  @ApiProperty({ description: 'Content to analyze' })
  @IsString()
  content: string;

  @ApiProperty({ enum: AnalysisType, description: 'Type of analysis to perform' })
  @IsEnum(AnalysisType)
  type: AnalysisType;

  @ApiProperty({ description: 'Additional context (company info, industry, etc.)', required: false })
  @IsOptional()
  context?: {
    companyName?: string;
    industry?: string;
    targetAudience?: string;
    businessStage?: string;
  };
}

export interface ContentScore {
  overall: number; // 0-100
  clarity: number; // 0-100
  impact: number; // 0-100
  specificity: number; // 0-100
  professionalism: number; // 0-100
}

export interface Suggestion {
  type: 'improvement' | 'warning' | 'tip';
  title: string;
  description: string;
  example?: string;
  priority: 'high' | 'medium' | 'low';
}

export class ContentAnalysisDto {
  @ApiProperty({ description: 'Content scores' })
  scores: ContentScore;

  @ApiProperty({ description: 'Improvement suggestions' })
  suggestions: Suggestion[];

  @ApiProperty({ description: 'Enhanced version of the content', required: false })
  enhancedContent?: string;

  @ApiProperty({ description: 'Key insights about the content' })
  insights: string[];

  @ApiProperty({ description: 'Detected issues or red flags' })
  issues: string[];
}
