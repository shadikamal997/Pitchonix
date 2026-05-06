import { Module } from '@nestjs/common';
import { PdfPagesService } from './pdf-pages.service';
import { PdfPagesController } from './pdf-pages.controller';

@Module({
  providers: [PdfPagesService],
  controllers: [PdfPagesController],
  exports: [PdfPagesService],
})
export class PdfPagesModule {}
