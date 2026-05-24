import { Module } from '@nestjs/common';
import { SlideExportController } from './slide-export.controller';
import { SlideExportService } from './slide-export.service';
import { ExportCompatReportService } from './export-compat-report.service';
import { MasterElementsModule } from '../master-elements/master-elements.module';
import { ComponentsModule } from '../components/components.module';

@Module({
  imports:     [MasterElementsModule, ComponentsModule],
  controllers: [SlideExportController],
  providers:   [SlideExportService, ExportCompatReportService],
  exports:     [SlideExportService, ExportCompatReportService],
})
export class SlideExportModule {}
