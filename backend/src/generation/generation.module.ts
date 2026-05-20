import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { GenerationService } from './generation.service';
import { GenerationController } from './generation.controller';
import { GenerationProcessor } from './generation.processor';
import { AIEnhancementService } from './ai-enhancement.service';
import { SlideFactory } from './slide-types/slide.factory';
import { DecksModule } from '../decks/decks.module';
import { SlidesModule } from '../slides/slides.module';
import { QualityModule } from './quality/quality.module';
import { TemplateModule } from './templates/template.module';
import { SuggestionsModule } from './suggestions/suggestions.module';
import { ProgressModule } from './progress/progress.module';
import {
  ChartGenerationService,
  LayoutService,
  ThemeService,
  VisualGenerationService,
} from './visual';
import {
  ExportService,
  ChartRenderingService,
  PowerPointExportService,
  PDFExportService,
  HTMLPreviewService,
} from './export';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'generation',
    }),
    DecksModule,
    SlidesModule,
    QualityModule,
    TemplateModule,
    SuggestionsModule,
    ProgressModule,
    // Import PDF documents module for PDF generation
    require('../pdf-documents/pdf-documents.module').PdfDocumentsModule,
  ],
  controllers: [GenerationController],
  providers: [
    GenerationService,
    GenerationProcessor,
    AIEnhancementService,
    ChartGenerationService,
    LayoutService,
    ThemeService,
    VisualGenerationService,
    ChartRenderingService,
    PowerPointExportService,
    PDFExportService,
    HTMLPreviewService,
    ExportService,
    SlideFactory,
  ],
  exports: [GenerationService, VisualGenerationService, ExportService, AIEnhancementService],
})
export class GenerationModule {}
