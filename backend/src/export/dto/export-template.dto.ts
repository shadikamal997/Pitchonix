import { IsString, IsOptional, IsEnum, IsBoolean, IsObject, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTemplateDto {
  @ApiProperty({ example: 'My Custom Template' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'A custom template for my brand', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'pptx', enum: ['pptx', 'pdf', 'html'] })
  @IsEnum(['pptx', 'pdf', 'html'])
  format: 'pptx' | 'pdf' | 'html';

  @ApiProperty({ example: { layout: 'clean', style: 'modern' } })
  @IsObject()
  config: Record<string, any>;

  @ApiProperty({ example: 'https://example.com/logo.png', required: false })
  @IsString()
  @IsOptional()
  logoUrl?: string;

  @ApiProperty({ example: 'Confidential', required: false })
  @IsString()
  @IsOptional()
  watermark?: string;

  @ApiProperty({ 
    example: { primary: '#1e3a8a', secondary: '#64748b', accent: '#3b82f6' },
    required: false 
  })
  @IsObject()
  @IsOptional()
  colors?: Record<string, string>;

  @ApiProperty({ 
    example: { heading: 'Arial', body: 'Arial' },
    required: false 
  })
  @IsObject()
  @IsOptional()
  fonts?: Record<string, any>;

  @ApiProperty({ example: false, required: false })
  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;
}

export class UpdateTemplateDto {
  @ApiProperty({ example: 'My Updated Template', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ example: 'Updated description', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: { layout: 'spacious' }, required: false })
  @IsObject()
  @IsOptional()
  config?: Record<string, any>;

  @ApiProperty({ example: 'https://example.com/new-logo.png', required: false })
  @IsString()
  @IsOptional()
  logoUrl?: string;

  @ApiProperty({ example: 'Internal Use Only', required: false })
  @IsString()
  @IsOptional()
  watermark?: string;

  @ApiProperty({ 
    example: { primary: '#000000', secondary: '#666666' },
    required: false 
  })
  @IsObject()
  @IsOptional()
  colors?: Record<string, string>;

  @ApiProperty({ 
    example: { heading: 'Helvetica', body: 'Helvetica' },
    required: false 
  })
  @IsObject()
  @IsOptional()
  fonts?: Record<string, any>;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;
}

export class CreateBatchExportDto {
  @ApiProperty({ 
    example: ['deck-uuid-1', 'deck-uuid-2'], 
    description: 'Array of deck IDs to export' 
  })
  @IsArray()
  @IsString({ each: true })
  deckIds: string[];

  @ApiProperty({ example: 'pdf', enum: ['pptx', 'pdf', 'html'] })
  @IsEnum(['pptx', 'pdf', 'html'])
  format: 'pptx' | 'pdf' | 'html';

  @ApiProperty({ example: 'template-uuid', required: false })
  @IsString()
  @IsOptional()
  templateId?: string;

  @ApiProperty({ 
    example: { layout: 'document', merge: true },
    description: 'Export options'
  })
  @IsObject()
  options: Record<string, any>;
}

export class ExportWithOptionsDto {
  @ApiProperty({ example: 'deck-uuid' })
  @IsString()
  deckId: string;

  @ApiProperty({ example: 'pdf', enum: ['pptx', 'pdf', 'html'] })
  @IsEnum(['pptx', 'pdf', 'html'])
  format: 'pptx' | 'pdf' | 'html';

  @ApiProperty({ example: 'template-uuid', required: false })
  @IsString()
  @IsOptional()
  templateId?: string;

  @ApiProperty({ 
    example: { 
      layout: 'slide-based',
      pageSize: 'A4',
      orientation: 'landscape',
      watermark: 'Confidential',
      compression: true
    },
    required: false
  })
  @IsObject()
  @IsOptional()
  options?: Record<string, any>;
}
