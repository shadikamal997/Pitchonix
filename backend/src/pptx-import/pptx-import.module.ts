import { Module } from '@nestjs/common';
import { PptxImportController } from './pptx-import.controller';
import { PptxImportService } from './pptx-import.service';
import { PptxImportLedgerModule } from '../content-ledger/pptx-import-ledger.module';

@Module({
  imports: [PptxImportLedgerModule],
  controllers: [PptxImportController],
  providers: [PptxImportService],
  exports: [PptxImportService],
})
export class PptxImportModule {}
