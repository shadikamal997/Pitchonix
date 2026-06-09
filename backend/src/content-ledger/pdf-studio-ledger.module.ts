import { Module } from '@nestjs/common';
import { ContentLedgerModule } from './content-ledger.module';
import { PdfStudioLedgerService } from './pdf-studio-ledger.service';

/** Phase Ω.CONTENT.3 (Phase 5) — PDF Studio content ledger. */
@Module({
  imports: [ContentLedgerModule],
  providers: [PdfStudioLedgerService],
  exports: [PdfStudioLedgerService],
})
export class PdfStudioLedgerModule {}
