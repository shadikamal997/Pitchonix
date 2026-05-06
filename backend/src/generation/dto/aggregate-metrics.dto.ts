import { ApiProperty } from '@nestjs/swagger';

/**
 * Common error entry in aggregate statistics
 */
export class CommonErrorDto {
  @ApiProperty({ example: 'API rate limit exceeded', description: 'Error message' })
  error: string;

  @ApiProperty({ example: 5, description: 'Number of occurrences' })
  count: number;
}

/**
 * Aggregate statistics response DTO (admin only)
 */
export class AggregateMetricsDto {
  @ApiProperty({ example: 3, description: 'Number of active generations in progress' })
  activeGenerations: number;

  @ApiProperty({ example: 25000, description: 'Average generation time in milliseconds' })
  averageDuration: number;

  @ApiProperty({ example: 95.5, description: 'Success rate percentage (0-100)' })
  successRate: number;

  @ApiProperty({ example: 150, description: 'Total number of completed generations' })
  totalCompleted: number;

  @ApiProperty({ example: 7, description: 'Total number of failed generations' })
  totalFailed: number;

  @ApiProperty({ type: [CommonErrorDto], description: 'Most common errors encountered' })
  commonErrors: CommonErrorDto[];

  @ApiProperty({ example: 87.5, description: 'Average quality score across all generations' })
  averageQualityScore: number;

  @ApiProperty({ example: 92.3, description: 'Average export readiness percentage' })
  exportReadinessRate: number;
}
