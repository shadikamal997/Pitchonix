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
import { AutoLayoutEngineService } from './services/auto-layout-engine.service';
import { LayoutCompositionService } from './services/layout-composition.service';
import { PdfExportService } from './services/pdf-export.service';
import { DocxExportService } from './services/docx-export.service';
import { PptxExportService } from './services/pptx-export.service';
import { PngExportService } from './services/png-export.service';
import { JpegExportService } from './services/jpeg-export.service';
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
import { PreflightService } from './services/preflight.service';
import { PaginationIntelligenceService } from './services/pagination-intelligence.service';
import { EditorialGridEngineService } from './services/editorial-grid-engine.service';
import { MagazineLayoutEngineService } from './services/magazine-layout-engine.service';
import { SmartAutoFlowEngineService } from './services/smart-auto-flow-engine.service';
import { PublishingIntelligenceService } from './services/publishing-intelligence.service';
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
    AutoLayoutEngineService,
    RuleBasedPagePlannerService,
    PdfExportService,
    DocxExportService,
    PptxExportService,
    PngExportService,
    JpegExportService,
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
    DocumentCompositionService,
    PageDensityBalancerService,
    SemanticContinuationService,
    DynamicCoverComposerService,
    ParagraphSemanticAnalyzer,
    TopicSegmentationService,
    SectionInferenceService,
    SemanticStructureEngine,
    SemanticTOCBuilder,
    ProTemplateRendererService,
    PreflightService,
    PaginationIntelligenceService,
    EditorialGridEngineService,
    MagazineLayoutEngineService,
    SmartAutoFlowEngineService,
    PublishingIntelligenceService,
  ],
  exports: [
    ContentAnalysisService,
    ContentEnhancementService,
    ContentStructureService,
    QualityCheckService,
    ContentNormalizerService,
    ContentBlockExtractorService,
    OutlineBuilderService,
    AutoLayoutEngineService,
    RuleBasedPagePlannerService,
    PdfExportService,
    DocxExportService,
    PptxExportService,
    PngExportService,
    JpegExportService,
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
    DocumentCompositionService,
    PageDensityBalancerService,
    SemanticContinuationService,
    DynamicCoverComposerService,
    ProTemplateRendererService,
    PaginationIntelligenceService,
    EditorialGridEngineService,
    MagazineLayoutEngineService,
    SmartAutoFlowEngineService,
    PublishingIntelligenceService,
  ],
})
export class PdfStudioModule {}
