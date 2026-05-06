import { Module } from '@nestjs/common';
import { PdfGenerationService } from './pdf-generation.service';
import { PdfGenerationController } from './pdf-generation.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [PdfGenerationService],
  controllers: [PdfGenerationController],
  exports: [PdfGenerationService],
})
export class PdfGenerationModule {}
