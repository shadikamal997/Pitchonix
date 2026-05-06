import { ApiProperty } from '@nestjs/swagger';

/**
 * Single validation issue
 */
export class ValidationIssueDto {
  @ApiProperty({ example: 'chart-data', description: 'Rule that triggered this issue' })
  rule: string;

  @ApiProperty({ 
    example: 'ERROR', 
    description: 'Issue severity',
    enum: ['ERROR', 'WARNING', 'INFO']
  })
  severity: 'ERROR' | 'WARNING' | 'INFO';

  @ApiProperty({ example: 'Chart on slide 5 has no data series', description: 'Issue message' })
  message: string;

  @ApiProperty({ example: 5, required: false, description: 'Slide index where issue was found' })
  slideIndex?: number;

  @ApiProperty({ example: 'Add data to the chart or remove it', required: false, description: 'Suggested fix' })
  suggestion?: string;
}

/**
 * Validation result summary
 */
export class ValidationResultSummaryDto {
  @ApiProperty({ example: true, description: 'Whether validation passed (no ERROR-level issues)' })
  isValid: boolean;

  @ApiProperty({ example: 0, description: 'Number of ERROR-level issues' })
  errorCount: number;

  @ApiProperty({ example: 3, description: 'Number of WARNING-level issues' })
  warningCount: number;

  @ApiProperty({ example: 2, description: 'Number of INFO-level suggestions' })
  infoCount: number;

  @ApiProperty({ example: 5, description: 'Total number of issues' })
  totalIssues: number;
}

/**
 * Validation result response DTO
 */
export class ValidationResultDto {
  @ApiProperty({ example: 'deck-uuid', description: 'Deck identifier' })
  deckId: string;

  @ApiProperty({ example: true, description: 'Whether validation passed' })
  isValid: boolean;

  @ApiProperty({ type: [ValidationIssueDto], description: 'List of validation issues found' })
  issues: ValidationIssueDto[];

  @ApiProperty({ type: ValidationResultSummaryDto, description: 'Validation summary' })
  summary: ValidationResultSummaryDto;

  @ApiProperty({ example: '2024-05-05T12:34:56.789Z', description: 'When validation was performed' })
  validatedAt: Date;
}

/**
 * Export readiness check response DTO
 */
export class ExportReadinessDto {
  @ApiProperty({ example: 'deck-uuid', description: 'Deck identifier' })
  deckId: string;

  @ApiProperty({ example: true, description: 'Whether deck is ready for export' })
  ready: boolean;

  @ApiProperty({ 
    type: [String],
    example: ['Deck has validation errors', 'Quality score too low (45/100)'],
    required: false,
    description: 'Reasons why deck is not ready (if ready is false)'
  })
  blockers?: string[];

  @ApiProperty({ example: 93, required: false, description: 'Current quality score' })
  qualityScore?: number;

  @ApiProperty({ example: true, required: false, description: 'Whether validation passed' })
  validationPassed?: boolean;
}
