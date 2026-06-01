import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { CareerController } from './career.controller';
import { CvProfilesService }  from './cv-profiles.service';
import { CvDocumentsService } from './cv-documents.service';
import { CvTemplatesService } from './cv-templates.service';
import { CvImportService }    from './cv-import.service';
import { CvExportService }    from './cv-export.service';
import { CvExportQueueProcessor, CV_EXPORT_QUEUE } from './cv-export-queue.processor';
import { CvAnalyzerService }  from './cv-analyzer.service';
import {
  CvSnapshotService, CvVariantsService, CvBenchmarkService,
  CvInterviewReadinessService, CvExportValidationService,
  CvTemplateInsightsService,
} from './cv-pro.service';
import { ImportProgressTracker } from './cv-import-polish';
import { CvMappingMemoryService } from './cv-mapping-memory.service';
import { AtsAnalyzerService } from './ats-analyzer.service';
import { JobMatcherService } from './job-matcher.service';
import { BetaTelemetryService } from './beta-telemetry.service';
import { PrismaModule } from '../prisma/prisma.module';
import { UniversalConversionModule } from '../universal-conversion/universal-conversion.module';
import { PptxImportModule }   from '../pptx-import/pptx-import.module';
import { BrandKitsModule }    from '../brand-kits/brand-kits.module';

@Module({
  imports: [
    UniversalConversionModule, PptxImportModule, BrandKitsModule, PrismaModule,
    // Phase Ω.4 — async export queue (uses shared BullModule Redis from AppModule)
    BullModule.registerQueue({ name: CV_EXPORT_QUEUE, defaultJobOptions: { attempts: 2, backoff: { type: 'exponential', delay: 2000 }, removeOnComplete: 50, removeOnFail: 20 } }),
  ],
  controllers: [CareerController],
  providers:   [
    CvProfilesService, CvDocumentsService, CvTemplatesService, CvImportService,
    CvExportService, CvAnalyzerService,
    // Phase 42.4 PRO+
    CvSnapshotService, CvVariantsService, CvBenchmarkService,
    CvInterviewReadinessService, CvExportValidationService,
    CvTemplateInsightsService,
    ImportProgressTracker, CvMappingMemoryService,
    // Phase Ω.2 ATS + Job Matching
    AtsAnalyzerService, JobMatcherService,
    // Phase Ω.4 Beta telemetry
    BetaTelemetryService,
    // Phase Ω.4 Async export queue processor
    CvExportQueueProcessor,
  ],
  exports:     [
    CvProfilesService, CvDocumentsService, CvTemplatesService, CvImportService,
    CvExportService, CvAnalyzerService,
    CvSnapshotService, CvVariantsService, CvBenchmarkService,
    CvInterviewReadinessService, CvExportValidationService,
    CvTemplateInsightsService,
    ImportProgressTracker, CvMappingMemoryService,
    // Phase Ω.2 ATS + Job Matching
    AtsAnalyzerService, JobMatcherService,
    // Phase Ω.4 Beta telemetry
    BetaTelemetryService,
  ],
})
export class CareerModule {}
