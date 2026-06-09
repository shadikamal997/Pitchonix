import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ContentLedgerController } from './content-ledger.controller';
import { ContentLedgerService } from './content-ledger.service';
import { ContentCertificationService } from './content-certification.service';

/**
 * Phase Ω.CONTENT.2 — Universal Content Ledger.
 * Exports ContentLedgerService so every studio/module can emit and update
 * ContentNodes through one shared accounting surface.
 *
 * Phase Ω.CONTENT.3 — adds the platform-wide ContentCertificationService.
 */
@Module({
  imports: [PrismaModule],
  controllers: [ContentLedgerController],
  providers: [ContentLedgerService, ContentCertificationService],
  exports: [ContentLedgerService, ContentCertificationService],
})
export class ContentLedgerModule {}
