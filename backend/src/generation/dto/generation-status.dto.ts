import { ApiProperty } from '@nestjs/swagger';

/**
 * Progress details for generation status
 */
export class GenerationProgressDto {
  @ApiProperty({ 
    example: 'VISUAL_GENERATION', 
    description: 'Current generation stage',
    enum: ['PENDING', 'BASE_GENERATION', 'AI_ENHANCEMENT', 'VISUAL_GENERATION', 'QUALITY_CHECK', 'EXPORT', 'COMPLETE', 'FAILED']
  })
  stage: string;

  @ApiProperty({ example: 75, description: 'Overall progress percentage (0-100)' })
  percentage: number;

  @ApiProperty({ example: 'Creating charts and visuals...', description: 'Current status message' })
  message: string;

  @ApiProperty({ example: 7, description: 'Current slide being processed' })
  currentSlide: number;

  @ApiProperty({ example: 10, description: 'Total number of slides' })
  totalSlides: number;

  @ApiProperty({ example: 5000, required: false, description: 'Estimated time remaining in milliseconds' })
  estimatedTimeRemaining?: number;
}

/**
 * Generation error details
 */
export class GenerationErrorDto {
  @ApiProperty({ example: 'AI_ENHANCEMENT', description: 'Stage where error occurred' })
  stage: string;

  @ApiProperty({ example: 'API rate limit exceeded', description: 'Error message' })
  error: string;

  @ApiProperty({ example: '2024-05-05T12:34:56.789Z', description: 'When error occurred' })
  timestamp: Date;

  @ApiProperty({ example: 3, required: false, description: 'Slide index where error occurred' })
  slideIndex?: number;

  @ApiProperty({ example: true, required: false, description: 'Whether error is retryable' })
  retryable?: boolean;
}

/**
 * Performance metrics for generation
 */
export class PerformanceMetricsDto {
  @ApiProperty({ example: 25000, description: 'Total generation time in milliseconds' })
  totalDuration: number;

  @ApiProperty({ example: 2500, description: 'Average time per slide in milliseconds' })
  averageSlideTime: number;

  @ApiProperty({ 
    example: {
      BASE_GENERATION: 8000,
      AI_ENHANCEMENT: 10000,
      VISUAL_GENERATION: 6000,
      QUALITY_CHECK: 1000
    },
    description: 'Duration breakdown by stage in milliseconds'
  })
  stageTimings: Record<string, number>;
}

/**
 * Generation status response DTO
 */
export class GenerationStatusDto {
  @ApiProperty({ example: 'deck-uuid', description: 'Deck identifier' })
  deckId: string;

  @ApiProperty({ example: 'generating', description: 'Current status',enum: ['queued', 'generating', 'completed', 'failed'] })
  status: string;

  @ApiProperty({ example: false, description: 'Whether generation is complete' })
  completed: boolean;

  @ApiProperty({ type: GenerationProgressDto, description: 'Current progress details' })
  progress: GenerationProgressDto;

  @ApiProperty({ type: [GenerationErrorDto], required: false, description: 'Errors encountered during generation' })
  errors?: GenerationErrorDto[];

  @ApiProperty({ type: PerformanceMetricsDto, required: false, description: 'Performance metrics (only available after completion)' })
  metrics?: PerformanceMetricsDto;

  @ApiProperty({ example: '2024-05-05T12:30:00.000Z', description: 'When generation started' })
  startTime: Date;

  @ApiProperty({ example: '2024-05-05T12:30:25.000Z', required: false, description: 'When generation ended (if completed)' })
  endTime?: Date;
}
