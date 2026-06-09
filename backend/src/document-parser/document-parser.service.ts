import { Injectable, BadRequestException, Logger } from '@nestjs/common';
// `esModuleInterop` is off in this project, so a default import resolves to
// `mammoth.default` (undefined). Use a namespace import to reach the CommonJS
// named exports (convertToHtml / extractRawText) at runtime.
import * as mammoth from 'mammoth';
import { DocumentType } from './dto/document-upload.dto';

// pdf-parse v2 exports a PDFParse class (the v1 callable default was removed).
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PDFParse } = require('pdf-parse');

export interface ParsedDocument {
  text: string;
  /** Phase Ω.2 — structure-preserving HTML (headings/bold/lists/tables for DOCX;
   *  paragraph/heading structure for PDF). Used by the PDF Studio import flow so
   *  document structure survives the round-trip instead of collapsing to raw text. */
  html: string;
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
      throw new BadRequestException('Invalid file type. Supported types: PDF, DOCX, PPTX');
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
      const parser = new PDFParse({ data: file.buffer });
      let data: any;
      try {
        data = await parser.getText();
      } finally {
        await parser.destroy?.();
      }

      const text = (data.text || '').trim();
      const pages = data.total ?? data.numpages ?? data.pages?.length;
      const words = text ? text.split(/\s+/).length : 0;

      this.logger.log(`PDF parsed: ${pages} pages, ${words} words`);

      return {
        text,
        html: this.textToStructuredHtml(text),
        metadata: {
          pages,
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
      // Phase Ω.2 — convertToHtml preserves headings, bold/italic, lists, and
      // tables; extractRawText (the old path) dropped all of that. We keep the
      // raw text too for analysis/word-count.
      const [htmlResult, textResult] = await Promise.all([
        mammoth.convertToHtml({ buffer: file.buffer }),
        mammoth.extractRawText({ buffer: file.buffer }),
      ]);

      const html = (htmlResult.value || '').trim();
      const text = (textResult.value || '').trim();
      const words = text ? text.split(/\s+/).length : 0;

      this.logger.log(`DOCX parsed: ${words} words (structure-preserving HTML)`);

      const messages = [...(htmlResult.messages || []), ...(textResult.messages || [])];
      if (messages.length > 0) {
        this.logger.warn(`DOCX parsing warnings: ${messages.length}`);
      }

      return {
        text,
        html: html || this.textToStructuredHtml(text),
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
   * Phase Ω.2 — turn flat extracted text (PDF) into structure-preserving HTML.
   * Every non-empty block becomes an element (no content is dropped): bullet
   * groups → <ul>, short ALL-CAPS lines → <h2>, everything else → <p>.
   */
  private textToStructuredHtml(text: string): string {
    if (!text || !text.trim()) return '';
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const isBullet = (l: string) => /^[-•*▪‣·]\s+/.test(l) || /^\d+[.)]\s+/.test(l);
    const blocks = text
      .split(/\n\s*\n/)
      .map((b) => b.trim())
      .filter(Boolean);
    const out: string[] = [];
    for (const block of blocks) {
      const lines = block
        .split(/\n/)
        .map((l) => l.trim())
        .filter(Boolean);
      // Group consecutive lines: bullet runs → <ul>, prose runs → <p>, with a
      // short ALL-CAPS standalone line treated as an <h2>. Nothing is dropped.
      let i = 0;
      const proseBuf: string[] = [];
      const flushProse = () => {
        if (!proseBuf.length) return;
        out.push(`<p>${proseBuf.map(esc).join('<br/>')}</p>`);
        proseBuf.length = 0;
      };
      while (i < lines.length) {
        const l = lines[i];
        if (isBullet(l)) {
          flushProse();
          const items: string[] = [];
          while (i < lines.length && isBullet(lines[i])) {
            items.push(`<li>${esc(lines[i].replace(/^[-•*▪‣·]\s+|^\d+[.)]\s+/, ''))}</li>`);
            i++;
          }
          out.push(`<ul>${items.join('')}</ul>`);
          continue;
        }
        if (lines.length === 1 && l.length <= 70 && /[A-Z]/.test(l) && l === l.toUpperCase()) {
          out.push(`<h2>${esc(l)}</h2>`);
          i++;
          continue;
        }
        proseBuf.push(l);
        i++;
      }
      flushProse();
    }
    return out.join('\n');
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
      const matchedHeader = sectionHeaders.find((header) => trimmedLine.includes(header));

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
