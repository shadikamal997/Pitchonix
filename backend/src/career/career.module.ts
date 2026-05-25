import { Module } from '@nestjs/common';
import { CareerController } from './career.controller';
import { CvProfilesService }  from './cv-profiles.service';
import { CvDocumentsService } from './cv-documents.service';
import { CvTemplatesService } from './cv-templates.service';
import { CvImportService }    from './cv-import.service';
import { CvExportService }    from './cv-export.service';
import { CvAnalyzerService }  from './cv-analyzer.service';
import {
  CvSnapshotService, CvVariantsService, CvBenchmarkService,
  CvInterviewReadinessService, CvExportValidationService,
  CvTemplateInsightsService,
} from './cv-pro.service';
import { ImportProgressTracker } from './cv-import-polish';
import { CvMappingMemoryService } from './cv-mapping-memory.service';
import { PrismaModule } from '../prisma/prisma.module';
import { UniversalConversionModule } from '../universal-conversion/universal-conversion.module';
import { PptxImportModule }   from '../pptx-import/pptx-import.module';
import { BrandKitsModule }    from '../brand-kits/brand-kits.module';

@Module({
  imports:     [UniversalConversionModule, PptxImportModule, BrandKitsModule, PrismaModule],
  controllers: [CareerController],
  providers:   [
    CvProfilesService, CvDocumentsService, CvTemplatesService, CvImportService,
    CvExportService, CvAnalyzerService,
    // Phase 42.4 PRO+
    CvSnapshotService, CvVariantsService, CvBenchmarkService,
    CvInterviewReadinessService, CvExportValidationService,
    CvTemplateInsightsService,
    ImportProgressTracker, CvMappingMemoryService,
  ],
  exports:     [
    CvProfilesService, CvDocumentsService, CvTemplatesService, CvImportService,
    CvExportService, CvAnalyzerService,
    CvSnapshotService, CvVariantsService, CvBenchmarkService,
    CvInterviewReadinessService, CvExportValidationService,
    CvTemplateInsightsService,
    ImportProgressTracker, CvMappingMemoryService,
  ],
})
export class CareerModule {}
