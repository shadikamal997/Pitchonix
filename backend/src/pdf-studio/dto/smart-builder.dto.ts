import { IsString, MinLength, MaxLength, IsOptional, IsEnum, IsBoolean } from 'class-validator';

export class AnalyzeContentDto {
  @IsString()
  @MinLength(10, { message: 'Content must be at least 10 characters' })
  @MaxLength(100000, { message: 'Content must not exceed 100,000 characters' })
  rawContent: string;
}

export class EnhanceContentDto {
  @IsString()
  @MinLength(10)
  @MaxLength(100000)
  rawContent: string;

  @IsOptional()
  @IsBoolean()
  fixAll?: boolean;

  @IsOptional()
  options?: {
    improveWriting?: boolean;
    fixGrammar?: boolean;
    removeRepetition?: boolean;
    improveClarity?: boolean;
    addStructure?: boolean;
    professionalTone?: boolean;
    addConclusion?: boolean;
    tone?: string;
  };
}

export class GenerateDocumentDto {
  @IsString()
  @MinLength(10)
  @MaxLength(100000)
  rawContent: string;

  @IsOptional()
  config?: {
    documentGoal?: string;
    targetAudience?: string;
    tone?: string;
    designStyle?: string;
    brandKitId?: string;
    title?: string;
    templateType?: string;
    improveWriting?: boolean;
    fixGrammar?: boolean;
    addStructure?: boolean;
    generateIntro?: boolean;
    generateSummary?: boolean;
    generateConclusion?: boolean;
    expandContent?: boolean;
    shortenContent?: boolean;
    includeTableOfContents?: boolean;
    includeCoverPage?: boolean;
  };
}

export class ExportDocumentDto {
  @IsString()
  documentId: string;

  @IsOptional()
  @IsEnum(['pdf', 'docx', 'pptx'])
  format?: string;

  @IsOptional()
  @IsString()
  templateType?: string;
}
