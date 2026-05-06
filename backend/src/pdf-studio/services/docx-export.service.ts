import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
  ShadingType,
  PageBreak,
} from 'docx';

@Injectable()
export class DocxExportService {
  private readonly logger = new Logger(DocxExportService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Export document to DOCX format
   */
  async exportDocument(documentId: string): Promise<{ docxBuffer: Buffer; filename: string }> {
    this.logger.log(`Exporting document ${documentId} to DOCX`);

    // Fetch document from database
    const document = await this.prisma.pdfDocument.findUnique({
      where: { id: documentId },
      include: { pages: true },
    });

    if (!document) {
      throw new Error(`Document ${documentId} not found`);
    }

    // Build DOCX document
    const docxDoc = await this.buildDocxDocument(document);

    // Generate buffer
    const docxBuffer = await Packer.toBuffer(docxDoc);

    const filename = `${document.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.docx`;

    this.logger.log(`DOCX export complete: ${filename}`);
    return { docxBuffer, filename };
  }

  /**
   * Build DOCX document from PDF document data
   */
  private async buildDocxDocument(document: any): Promise<Document> {
    const sections: any[] = [];

    // Title Page
    const titlePage = [
      new Paragraph({
        text: document.title,
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      }),
      new Paragraph({
        text: document.outline?.detectedType || 'Document',
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      }),
      new Paragraph({
        text: new Date(document.createdAt).toLocaleDateString(),
        alignment: AlignmentType.CENTER,
        spacing: { after: 800 },
      }),
    ];

    sections.push(...titlePage);

    // Add page break
    sections.push(
      new Paragraph({
        children: [new PageBreak()],
      }),
    );

    // Add content from pages
    for (const page of document.pages) {
      // Page title
      if (page.title) {
        sections.push(
          new Paragraph({
            text: page.title,
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
          }),
        );
      }

      // Page content
      const content = page.content?.text || '';
      const paragraphs = this.parseContentToParagraphs(content);
      sections.push(...paragraphs);

      // Add spacing between pages
      sections.push(
        new Paragraph({
          text: '',
          spacing: { after: 400 },
        }),
      );
    }

    // Create document
    return new Document({
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: 720, // 0.5 inch
                right: 720,
                bottom: 720,
                left: 720,
              },
            },
          },
          children: sections,
        },
      ],
    });
  }

  /**
   * Parse content into paragraphs with basic formatting
   */
  private parseContentToParagraphs(content: string): Paragraph[] {
    const paragraphs: Paragraph[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (!line) {
        // Empty line - add spacing
        paragraphs.push(
          new Paragraph({
            text: '',
            spacing: { after: 100 },
          }),
        );
        continue;
      }

      // Detect headings (lines ending with : or starting with #)
      if (line.endsWith(':') || line.startsWith('#')) {
        const heading = line.replace(/^#+\s*/, '').replace(/:$/, '');
        paragraphs.push(
          new Paragraph({
            text: heading,
            heading: line.startsWith('##') ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3,
            spacing: { before: 240, after: 120 },
          }),
        );
        continue;
      }

      // Detect bullet points
      if (line.startsWith('- ') || line.startsWith('* ') || line.startsWith('• ')) {
        const bulletText = line.replace(/^[-*•]\s*/, '');
        paragraphs.push(
          new Paragraph({
            text: bulletText,
            bullet: {
              level: 0,
            },
            spacing: { after: 60 },
          }),
        );
        continue;
      }

      // Detect numbered lists
      if (/^\d+\.\s/.test(line)) {
        const numberText = line.replace(/^\d+\.\s*/, '');
        paragraphs.push(
          new Paragraph({
            text: numberText,
            numbering: {
              reference: 'default-numbering',
              level: 0,
            },
            spacing: { after: 60 },
          }),
        );
        continue;
      }

      // Regular paragraph
      const textRuns: TextRun[] = [];
      
      // Simple bold detection (**text**)
      const boldRegex = /\*\*(.*?)\*\*/g;
      let lastIndex = 0;
      let match;
      
      while ((match = boldRegex.exec(line)) !== null) {
        // Add text before bold
        if (match.index > lastIndex) {
          textRuns.push(
            new TextRun({
              text: line.substring(lastIndex, match.index),
            }),
          );
        }
        // Add bold text
        textRuns.push(
          new TextRun({
            text: match[1],
            bold: true,
          }),
        );
        lastIndex = boldRegex.lastIndex;
      }
      
      // Add remaining text
      if (lastIndex < line.length) {
        textRuns.push(
          new TextRun({
            text: line.substring(lastIndex),
          }),
        );
      }

      if (textRuns.length === 0) {
        textRuns.push(new TextRun({ text: line }));
      }

      paragraphs.push(
        new Paragraph({
          children: textRuns,
          spacing: { after: 120 },
        }),
      );
    }

    return paragraphs;
  }

  /**
   * Create a simple table
   */
  private createTable(rows: string[][]): Table {
    const tableRows = rows.map(
      (row, rowIndex) =>
        new TableRow({
          children: row.map(
            (cell) =>
              new TableCell({
                children: [new Paragraph({ text: cell })],
                shading: rowIndex === 0
                  ? {
                      fill: '#3B82F6',
                      type: ShadingType.SOLID,
                      color: 'FFFFFF',
                    }
                  : undefined,
              }),
          ),
        }),
    );

    return new Table({
      rows: tableRows,
      width: {
        size: 100,
        type: WidthType.PERCENTAGE,
      },
    });
  }
}
