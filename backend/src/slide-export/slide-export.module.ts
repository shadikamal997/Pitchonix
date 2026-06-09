import { Module } from '@nestjs/common';
import { SlideExportController } from './slide-export.controller';
import { SlideExportService } from './slide-export.service';
import { ExportCompatReportService } from './export-compat-report.service';
import { MasterElementsModule } from '../master-elements/master-elements.module';
import { ComponentsModule } from '../components/components.module';
import { PresentationLedgerModule } from '../content-ledger/presentation-ledger.module';
import { PptxImportLedgerModule } from '../content-ledger/pptx-import-ledger.module';

@Module({
  imports: [
    MasterElementsModule,
    ComponentsModule,
    PresentationLedgerModule,
    PptxImportLedgerModule,
  ],
  controllers: [SlideExportController],
  providers: [SlideExportService, ExportCompatReportService],
  exports: [SlideExportService, ExportCompatReportService],
})
export class SlideExportModule {}
