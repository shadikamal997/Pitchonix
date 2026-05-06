import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DocumentParserService } from './document-parser.service';
import { AIExtractorService } from './ai-extractor.service';
import { ParsedDocumentDto } from './dto/document-upload.dto';

@ApiTags('Document Parser')
@Controller('document-parser')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DocumentParserController {
  constructor(
    private documentParserService: DocumentParserService,
    private aiExtractorService: AIExtractorService,
  ) {}

  @Post('parse')
  @ApiOperation({ 
    summary: 'Upload and parse document (PDF/DOCX)',
    description: 'Extract text and structured business data from uploaded document'
  })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async parseDocument(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ParsedDocumentDto> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Step 1: Parse document to extract raw text
    const parsed = await this.documentParserService.parseDocument(file);

    // Step 2: Extract sections from text
    const sections = this.documentParserService.extractSections(parsed.text);

    // Step 3: Use AI to extract structured data
    const extractedData = await this.aiExtractorService.extractStructuredData(
      parsed.text,
    );

    // Step 4: Validate and clean data
    const validatedData = this.aiExtractorService.validateExtractedData(extractedData);

    // Step 5: Enhance with insights (if needed)
    const enhancedData = await this.aiExtractorService.enhanceWithInsights(validatedData);

    // Step 6: Build extracted sections array
    const extractedSections = Object.entries(sections).map(([section, content]) => ({
      section,
      content,
      confidence: content.length > 50 ? 80 : 50,
    }));

    return {
      data: {
        ...enhancedData,
        extractedSections,
      },
      rawText: parsed.text,
      confidence: enhancedData.confidence || 0,
      metadata: {
        filename: file.originalname,
        pages: parsed.metadata.pages,
        words: parsed.metadata.words,
        documentType: file.mimetype,
      },
    };
  }

  @Post('extract-text')
  @ApiOperation({ 
    summary: 'Extract raw text only (no AI processing)',
    description: 'Quickly extract text from document without AI analysis'
  })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async extractText(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{ text: string; metadata: any }> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const parsed = await this.documentParserService.parseDocument(file);

    return {
      text: parsed.text,
      metadata: {
        filename: file.originalname,
        ...parsed.metadata,
      },
    };
  }
}
