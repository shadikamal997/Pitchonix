import { Module } from '@nestjs/common';
import { UniversalConversionController } from './universal-conversion.controller';
import { UniversalConversionService } from './universal-conversion.service';
import { ConversionLineageService } from './conversion-lineage.service';
import { PptxImportModule } from '../pptx-import/pptx-import.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ConvertLedgerModule } from '../content-ledger/convert-ledger.module';

@Module({
  imports: [PptxImportModule, PrismaModule, ConvertLedgerModule],
  controllers: [UniversalConversionController],
  providers: [UniversalConversionService, ConversionLineageService],
  exports: [UniversalConversionService, ConversionLineageService],
})
export class UniversalConversionModule {}
