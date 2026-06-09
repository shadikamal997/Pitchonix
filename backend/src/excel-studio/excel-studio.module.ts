import { Module } from '@nestjs/common';
import { ExcelStudioController } from './excel-studio.controller';
import { ExcelStudioService } from './excel-studio.service';
import { ExcelLedgerService } from './excel-ledger.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ContentLedgerModule } from '../content-ledger/content-ledger.module';

@Module({
  imports: [PrismaModule, ContentLedgerModule],
  controllers: [ExcelStudioController],
  providers: [ExcelStudioService, ExcelLedgerService],
  exports: [ExcelStudioService],
})
export class ExcelStudioModule {}
