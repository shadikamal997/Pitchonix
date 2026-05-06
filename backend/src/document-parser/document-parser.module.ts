import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DocumentParserService } from './document-parser.service';
import { AIExtractorService } from './ai-extractor.service';
import { DocumentParserController } from './document-parser.controller';

@Module({
  imports: [ConfigModule],
  providers: [DocumentParserService, AIExtractorService],
  controllers: [DocumentParserController],
  exports: [DocumentParserService, AIExtractorService],
})
export class DocumentParserModule {}
