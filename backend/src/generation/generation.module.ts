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
import {
  ContentStructureService,
  ContentStructureAnalyzer,
  VisualBlockDetector,
  ContentBlockMapper,
  SlideBlueprintGenerator,
  StructureScorer,
  StructureValidator,
} from './content-structure';
import {
  DocumentFrameworkEngine,
  BusinessLogicValidator,
  ExecutiveQualityEngine,
  InvestorReadinessEngine,
  SalesReadinessEngine,
  BoardReadinessEngine,
  StrategyReadinessEngine,
  DocumentScorecardService,
  AutoExpansionService,
} from './document-quality';
// Phase 31 — Unified Generation Pipeline
import { UnifiedGenerationPipeline } from './pipeline/unified-pipeline.service';
import { GenerationEventBus } from './pipeline/event-bus';
import { GenerationProgressBridge } from './pipeline/progress-bridge';
// Phase 35 — Version History
import { VersionHistoryModule } from '../version-history/version-history.module';

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
    VersionHistoryModule,
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
    // Phase 27 — Content Structure Generation Engine
    ContentStructureService,
    ContentStructureAnalyzer,
    VisualBlockDetector,
    ContentBlockMapper,
    SlideBlueprintGenerator,
    StructureScorer,
    StructureValidator,
    // Phase 30 — Professional Document Systems
    DocumentFrameworkEngine,
    BusinessLogicValidator,
    ExecutiveQualityEngine,
    InvestorReadinessEngine,
    SalesReadinessEngine,
    BoardReadinessEngine,
    StrategyReadinessEngine,
    DocumentScorecardService,
    AutoExpansionService,
    // Phase 31 — Unified Generation Pipeline
    GenerationEventBus,
    UnifiedGenerationPipeline,
    GenerationProgressBridge,
  ],
  exports: [
    GenerationService, VisualGenerationService, ExportService, AIEnhancementService,
    ContentStructureService,
    DocumentScorecardService,
    DocumentFrameworkEngine,
    AutoExpansionService,
    UnifiedGenerationPipeline,
    GenerationEventBus,
  ],
})
export class GenerationModule {}
