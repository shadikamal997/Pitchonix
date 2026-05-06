import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ContentAnalysisService } from './services/content-analysis.service';
import { ContentEnhancementService } from './services/content-enhancement.service';
import { ContentStructureService } from './services/content-structure.service';
import { QualityCheckService } from './services/quality-check.service';
import { PdfExportService } from './services/pdf-export.service';
import { DocxExportService } from './services/docx-export.service';
import { PptxExportService } from './services/pptx-export.service';
import { ChartRenderingService } from './services/chart-rendering.service';
import { ChartGenerationService } from './services/chart-generation.service';
import { TemplatePreviewGeneratorService } from './services/template-preview-generator.service';
import { BrandKitService } from './services/brand-kit.service';
import { PerformanceService } from '../common/performance.service';
import { SmartBuilderController } from './controllers/smart-builder.controller';
import { PdfExportController } from './controllers/pdf-export.controller';
import { AdminController } from './controllers/admin.controller';

@Module({
  imports: [PrismaModule],
  controllers: [SmartBuilderController, PdfExportController, AdminController],
  providers: [
    ContentAnalysisService,
    ContentEnhancementService,
    ContentStructureService,
    QualityCheckService,
    PdfExportService,
    DocxExportService,
    PptxExportService,
    ChartRenderingService,
    ChartGenerationService,
    TemplatePreviewGeneratorService,
    BrandKitService,
    PerformanceService,
  ],
  exports: [
    ContentAnalysisService,
    ContentEnhancementService,
    ContentStructureService,
    QualityCheckService,
    PdfExportService,
    DocxExportService,
    PptxExportService,
    ChartRenderingService,
    ChartGenerationService,
    TemplatePreviewGeneratorService,
    BrandKitService,
    PerformanceService,
  ],
})
export class PdfStudioModule {}
