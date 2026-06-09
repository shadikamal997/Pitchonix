import { Module } from '@nestjs/common';
import { ContentLedgerModule } from './content-ledger.module';
import { PptxImportLedgerService } from './pptx-import-ledger.service';

/** Phase Ω.CONTENT.2F — PPTX Import content ledger. */
@Module({
  imports: [ContentLedgerModule],
  providers: [PptxImportLedgerService],
  exports: [PptxImportLedgerService],
})
export class PptxImportLedgerModule {}
