import { Module } from '@nestjs/common';
import { PptxImportController } from './pptx-import.controller';
import { PptxImportService } from './pptx-import.service';

@Module({
  controllers: [PptxImportController],
  providers:   [PptxImportService],
  exports:     [PptxImportService],
})
export class PptxImportModule {}
