import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import mammoth from 'mammoth';
import { DocumentType } from './dto/document-upload.dto';

// pdf-parse doesn't have proper TypeScript exports, use require
const pdfParse = require('pdf-parse');

export interface ParsedDocument {
  text: string;
  metadata: {
    pages?: number;
    words: number;
    characters: number;
  };
}

@Injectable()
export class DocumentParserService {
  private readonly logger = new Logger(DocumentParserService.name);
  private readonly maxFileSize = 10 * 1024 * 1024; // 10MB
  private readonly allowedMimeTypes = {
    [DocumentType.PDF]: ['application/pdf'],
    [DocumentType.DOCX]: [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
    ],
    [DocumentType.PPTX]: [
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-powerpoint',
    ],
  };

  /**
   * Parse document based on file type
   */
  async parseDocument(file: Express.Multer.File): Promise<ParsedDocument> {
    this.validateFile(file);

    const documentType = this.detectDocumentType(file);
    this.logger.log(`Parsing ${documentType} document: ${file.originalname}`);

    try {
      switch (documentType) {
        case DocumentType.PDF:
          return await this.parsePDF(file);
        case DocumentType.DOCX:
          return await this.parseDOCX(file);
        case DocumentType.PPTX:
          return await this.parsePPTX(file);
        default:
          throw new BadRequestException(`Unsupported document type: ${documentType}`);
      }
    } catch (error) {
      this.logger.error(`Failed to parse document: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to parse document: ${error.message}`);
    }
  }

  /**
   * Validate uploaded file
   */
  private validateFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (file.size > this.maxFileSize) {
      throw new BadRequestException(
        `File too large. Maximum size is ${this.maxFileSize / 1024 / 1024}MB`,
      );
    }

    const documentType = this.detectDocumentType(file);
    if (!documentType) {
      throw new BadRequestException(
        'Invalid file type. Supported types: PDF, DOCX, PPTX',
      );
    }
  }

  /**
   * Detect document type from MIME type
   */
  private detectDocumentType(file: Express.Multer.File): DocumentType | null {
    for (const [type, mimeTypes] of Object.entries(this.allowedMimeTypes)) {
      if (mimeTypes.includes(file.mimetype)) {
        return type as DocumentType;
      }
    }

    // Fallback: check file extension
    const extension = file.originalname.split('.').pop()?.toLowerCase();
    if (extension === 'pdf') return DocumentType.PDF;
    if (extension === 'docx' || extension === 'doc') return DocumentType.DOCX;
    if (extension === 'pptx' || extension === 'ppt') return DocumentType.PPTX;

    return null;
  }

  /**
   * Parse PDF file
   */
  private async parsePDF(file: Express.Multer.File): Promise<ParsedDocument> {
    try {
      const data = await pdfParse(file.buffer);

      const text = data.text.trim();
      const words = text.split(/\s+/).length;

      this.logger.log(`PDF parsed: ${data.numpages} pages, ${words} words`);

      return {
        text,
        metadata: {
          pages: data.numpages,
          words,
          characters: text.length,
        },
      };
    } catch (error) {
      throw new Error(`PDF parsing failed: ${error.message}`);
    }
  }

  /**
   * Parse DOCX file
   */
  private async parseDOCX(file: Express.Multer.File): Promise<ParsedDocument> {
    try {
      const result = await mammoth.extractRawText({ buffer: file.buffer });

      const text = result.value.trim();
      const words = text.split(/\s+/).length;

      this.logger.log(`DOCX parsed: ${words} words`);

      if (result.messages.length > 0) {
        this.logger.warn('DOCX parsing warnings:', result.messages);
      }

      return {
        text,
        metadata: {
          words,
          characters: text.length,
        },
      };
    } catch (error) {
      throw new Error(`DOCX parsing failed: ${error.message}`);
    }
  }

  /**
   * Parse PPTX file (basic text extraction)
   */
  private async parsePPTX(file: Express.Multer.File): Promise<ParsedDocument> {
    // For now, return a placeholder
    // Full PPTX parsing requires additional libraries like pptxgen or node-pptx
    this.logger.warn('PPTX parsing is not fully implemented yet');

    throw new BadRequestException(
      'PowerPoint file parsing is not yet supported. Please use PDF or DOCX format.',
    );
  }

  /**
   * Clean and normalize extracted text
   */
  cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/\n{3,}/g, '\n\n') // Remove excessive line breaks
      .replace(/[^\S\r\n]+/g, ' ') // Normalize spaces
      .trim();
  }

  /**
   * Split text into sections based on common headers
   */
  extractSections(text: string): Record<string, string> {
    const sections: Record<string, string> = {};
    const sectionHeaders = [
      'problem',
      'solution',
      'market',
      'competition',
      'competitors',
      'team',
      'traction',
      'revenue',
      'business model',
      'roadmap',
      'funding',
      'vision',
      'mission',
      'product',
      'technology',
      'go-to-market',
      'strategy',
    ];

    const lines = text.split('\n');
    let currentSection = 'general';
    let currentContent: string[] = [];

    for (const line of lines) {
      const trimmedLine = line.trim().toLowerCase();

      // Check if line is a section header
      const matchedHeader = sectionHeaders.find((header) =>
        trimmedLine.includes(header),
      );

      if (matchedHeader && trimmedLine.length < 50) {
        // Save previous section
        if (currentContent.length > 0) {
          sections[currentSection] = currentContent.join('\n').trim();
        }

        // Start new section
        currentSection = matchedHeader;
        currentContent = [];
      } else {
        currentContent.push(line);
      }
    }

    // Save last section
    if (currentContent.length > 0) {
      sections[currentSection] = currentContent.join('\n').trim();
    }

    return sections;
  }
}
