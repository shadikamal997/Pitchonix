import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ContentAnalysisService } from './services/content-analysis.service';
import { ContentEnhancementService } from './services/content-enhancement.service';
import { ContentStructureService } from './services/content-structure.service';
import { QualityCheckService } from './services/quality-check.service';
import { ContentNormalizerService } from './services/content-normalizer.service';
import { ContentBlockExtractorService } from './services/content-block-extractor.service';
import { OutlineBuilderService } from './services/outline-builder.service';
import { RuleBasedPagePlannerService } from './services/rule-based-page-planner.service';
import { PdfExportService } from './services/pdf-export.service';
import { DocxExportService } from './services/docx-export.service';
import { PptxExportService } from './services/pptx-export.service';
import { ChartRenderingService } from './services/chart-rendering.service';
import { ChartGenerationService } from './services/chart-generation.service';
import { TemplatePreviewGeneratorService } from './services/template-preview-generator.service';
import { BrandKitService } from './services/brand-kit.service';
import { VisualCompositionService } from './services/visual-composition.service';
import { AdaptiveLayoutEngineService } from './services/adaptive-layout-engine.service';
import { ImageUploadService } from './services/image-upload.service';
import { PreviewService } from './services/preview.service';
import { BrowserPoolService } from './services/browser-pool.service';
import { PerformanceService } from '../common/performance.service';
import { DocumentCompositionService } from './services/document-composition.service';
import { PageDensityBalancerService } from './services/page-density-balancer.service';
import { SemanticContinuationService } from './services/semantic-continuation.service';
import { DynamicCoverComposerService } from './services/dynamic-cover-composer.service';
import { ParagraphSemanticAnalyzer } from './services/paragraph-semantic-analyzer.service';
import { TopicSegmentationService } from './services/topic-segmentation.service';
import { SectionInferenceService } from './services/section-inference.service';
import { SemanticStructureEngine } from './services/semantic-structure-engine.service';
import { SemanticTOCBuilder } from './services/semantic-toc-builder.service';
import { ProTemplateRendererService } from './pro-templates/renderers/pro-template-renderer.service';
import { SmartBuilderController } from './controllers/smart-builder.controller';
import { PdfExportController } from './controllers/pdf-export.controller';
import { AdminController } from './controllers/admin.controller';
import { ImageUploadController } from './controllers/image-upload.controller';

@Module({
  imports: [PrismaModule],
  controllers: [SmartBuilderController, PdfExportController, AdminController, ImageUploadController],
  providers: [
    ContentAnalysisService,
    ContentEnhancementService,
    ContentStructureService,
    QualityCheckService,
    ContentNormalizerService,
    ContentBlockExtractorService,
    OutlineBuilderService,
    RuleBasedPagePlannerService,
    PdfExportService,
    DocxExportService,
    PptxExportService,
    ChartRenderingService,
    ChartGenerationService,
    TemplatePreviewGeneratorService,
    BrandKitService,
    VisualCompositionService,
    AdaptiveLayoutEngineService,
    ImageUploadService,
    PreviewService,
    BrowserPoolService,
    PerformanceService,
    // NEW: Production-quality composition services
    DocumentCompositionService,
    PageDensityBalancerService,
    SemanticContinuationService,
    DynamicCoverComposerService,
    // NEW: Semantic Structure Intelligence Engine
    ParagraphSemanticAnalyzer,
    TopicSegmentationService,
    SectionInferenceService,
    SemanticStructureEngine,
    SemanticTOCBuilder,
    ProTemplateRendererService,
  ],
  exports: [
    ContentAnalysisService,
    ContentEnhancementService,
    ContentStructureService,
    QualityCheckService,
    ContentNormalizerService,
    ContentBlockExtractorService,
    OutlineBuilderService,
    RuleBasedPagePlannerService,
    PdfExportService,
    DocxExportService,
    PptxExportService,
    ChartRenderingService,
    ChartGenerationService,
    TemplatePreviewGeneratorService,
    BrandKitService,
    VisualCompositionService,
    AdaptiveLayoutEngineService,
    ImageUploadService,
    PreviewService,
    BrowserPoolService,
    PerformanceService,
    // NEW: Production-quality composition services
    DocumentCompositionService,
    PageDensityBalancerService,
    SemanticContinuationService,
    DynamicCoverComposerService,
    ProTemplateRendererService,
  ],
})
export class PdfStudioModule {}
