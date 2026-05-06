import { Module } from '@nestjs/common';
import { PdfDocumentsService } from './pdf-documents.service';
import { PdfDocumentsController } from './pdf-documents.controller';
import { PdfDocumentGenerationService } from './pdf-document-generation.service';
import { PdfGenerationModule } from '../pdf-generation/pdf-generation.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PageFactory } from '../pdf-pages/page.factory';

@Module({
  imports: [PrismaModule, PdfGenerationModule],
  providers: [PdfDocumentsService, PdfDocumentGenerationService, PageFactory],
  controllers: [PdfDocumentsController],
  exports: [PdfDocumentsService, PdfDocumentGenerationService],
})
export class PdfDocumentsModule {}
