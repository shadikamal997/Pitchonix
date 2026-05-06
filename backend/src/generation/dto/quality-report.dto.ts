import { ApiProperty } from '@nestjs/swagger';

/**
 * Quality dimensions sub-scores
 */
export class QualityDimensionsDto {
  @ApiProperty({ example: 88.75, description: 'Content quality score (0-100)' })
  content: number;

  @ApiProperty({ example: 96.25, description: 'Visual quality score (0-100)' })
  visual: number;

  @ApiProperty({ example: 89.5, description: 'AI enhancement quality score (0-100)' })
  aiEnhancement: number;

  @ApiProperty({ example: 100, description: 'Export readiness score (0-100)' })
  exportReadiness: number;
}

/**
 * Validation summary
 */
export class ValidationSummaryDto {
  @ApiProperty({ example: true, description: 'Whether validation passed (no errors)' })
  isValid: boolean;

  @ApiProperty({ example: 0, description: 'Number of error-level issues' })
  errorCount: number;

  @ApiProperty({ example: 3, description: 'Number of warning-level issues' })
  warningCount: number;

  @ApiProperty({ example: 2, description: 'Number of info-level suggestions' })
  infoCount: number;

  @ApiProperty({ example: 5, description: 'Total number of issues' })
  totalIssues: number;
}

/**
 * Quality report response DTO
 */
export class QualityReportDto {
  @ApiProperty({ example: 'deck-uuid', description: 'Deck identifier' })
  deckId: string;

  @ApiProperty({ example: 93, description: 'Overall quality score (0-100)' })
  overall: number;

  @ApiProperty({ example: 'A', description: 'Quality grade (A+ through F)' })
  grade: string;

  @ApiProperty({ type: QualityDimensionsDto, description: 'Scores by dimension' })
  dimensions: QualityDimensionsDto;

  @ApiProperty({ type: ValidationSummaryDto, description: 'Validation summary' })
  validation: ValidationSummaryDto;

  @ApiProperty({ 
    type: [String], 
    example: [
      'Add charts or visualizations to make data more engaging',
      'Consider adding more supporting slides'
    ],
    description: 'Actionable recommendations for improvement'
  })
  recommendations: string[];

  @ApiProperty({ example: true, description: 'Whether deck is ready for export' })
  exportReady: boolean;

  @ApiProperty({ example: '2024-05-05T12:34:56.789Z', description: 'When quality check was performed' })
  lastQualityCheck: Date;
}
