import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ContentLedgerModule } from './content-ledger.module';
import { PresentationLedgerService } from './presentation-ledger.service';

/**
 * Phase Ω.CONTENT.2D — Presentation content ledger. Shared by the generation
 * pipeline (eager import) and the slide exporter (export + reopen).
 */
@Module({
  imports: [PrismaModule, ContentLedgerModule],
  providers: [PresentationLedgerService],
  exports: [PresentationLedgerService],
})
export class PresentationLedgerModule {}
