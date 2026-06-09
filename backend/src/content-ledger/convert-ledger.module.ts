import { Module } from '@nestjs/common';
import { ContentLedgerModule } from './content-ledger.module';
import { ConvertLedgerService } from './convert-ledger.service';

/** Phase Ω.CONTENT.2E — Convert content ledger. */
@Module({
  imports: [ContentLedgerModule],
  providers: [ConvertLedgerService],
  exports: [ConvertLedgerService],
})
export class ConvertLedgerModule {}
