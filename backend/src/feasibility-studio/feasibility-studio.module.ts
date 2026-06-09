import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ContentLedgerModule } from '../content-ledger/content-ledger.module';
import { FeasibilityAnalyzerService } from './feasibility-analyzer.service';
import { FeasibilityStudioController } from './feasibility-studio.controller';
import { FeasibilityStudioService } from './feasibility-studio.service';

@Module({
  imports: [PrismaModule, ContentLedgerModule],
  controllers: [FeasibilityStudioController],
  providers: [FeasibilityAnalyzerService, FeasibilityStudioService],
  exports: [FeasibilityStudioService],
})
export class FeasibilityStudioModule {}
