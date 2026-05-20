import { Module } from '@nestjs/common';
import { SlideExportController } from './slide-export.controller';
import { SlideExportService } from './slide-export.service';

@Module({
  controllers: [SlideExportController],
  providers:   [SlideExportService],
  exports:     [SlideExportService],
})
export class SlideExportModule {}
