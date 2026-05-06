import { Module } from '@nestjs/common';
import { ExportService } from './export.service';
import { ExportController } from './export.controller';
import { 
  ExportTemplateService,
  QualityHistoryService,
  BatchExportService,
} from './services';

@Module({
  controllers: [ExportController],
  providers: [
    ExportService,
    ExportTemplateService,
    QualityHistoryService,
    BatchExportService,
  ],
  exports: [
    ExportService,
    ExportTemplateService,
    QualityHistoryService,
    BatchExportService,
  ],
})
export class ExportModule {}
