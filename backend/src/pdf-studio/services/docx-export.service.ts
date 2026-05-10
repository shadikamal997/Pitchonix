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
  UnderlineType,
} from 'docx';

@Injectable()
export class DocxExportService {
  private readonly logger = new Logger(DocxExportService.name);

  constructor(private prisma: PrismaService) {}

  async exportDocument(documentId: string): Promise<{ docxBuffer: Buffer; filename: string }> {
    this.logger.log(`Exporting document ${documentId} to DOCX`);

    const document = await this.prisma.pdfDocument.findUnique({
      where: { id: documentId },
      include: { pages: { orderBy: { order: 'asc' } } },
    });

    if (!document) throw new Error(`Document ${documentId} not found`);

    const docxDoc = await this.buildDocxDocument(document);
    const docxBuffer = await Packer.toBuffer(docxDoc);
    const filename = `${document.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.docx`;

    this.logger.log(`DOCX export complete: ${filename}`);
    return { docxBuffer, filename };
  }

  private async buildDocxDocument(document: any): Promise<Document> {
    const children: any[] = [];

    // Title page from document metadata
    children.push(
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
        run: { color: '6B7280' },
      }),
      new Paragraph({
        text: new Date(document.createdAt).toLocaleDateString('en-US', {
          year: 'numeric', month: 'long', day: 'numeric',
        }),
        alignment: AlignmentType.CENTER,
        spacing: { after: 800 },
        run: { color: '9CA3AF' },
      }),
      new Paragraph({ children: [new PageBreak()] }),
    );

    // Process pages — skip TOC, render cover as styled title block
    const contentPages = (document.pages as any[]).filter(p => p.pageType !== 'toc');

    for (let i = 0; i < contentPages.length; i++) {
      const page = contentPages[i];

      if (page.pageType === 'cover') {
        let coverData: any = {};
        try { coverData = JSON.parse(page.content?.text || '{}'); } catch (_) {
          coverData = { title: page.title || document.title };
        }
        children.push(
          new Paragraph({
            text: coverData.title || document.title,
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { before: 400, after: 200 },
          }),
        );
        if (coverData.subtitle) {
          children.push(new Paragraph({
            text: coverData.subtitle,
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
          }));
        }
        if (i < contentPages.length - 1) {
          children.push(new Paragraph({ children: [new PageBreak()] }));
        }
        continue;
      }

      // Section heading
      if (page.title) {
        children.push(
          new Paragraph({
            text: page.title,
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: {
              bottom: { style: BorderStyle.SINGLE, size: 4, color: '2563EB', space: 4 },
            },
          }),
        );
      }

      // Parse and render markdown content
      const rawText = page.content?.text || '';
      const paragraphs = this.parseMarkdownToParagraphs(rawText);
      children.push(...paragraphs);

      // Page break between pages (except last)
      if (i < contentPages.length - 1) {
        children.push(new Paragraph({ children: [new PageBreak()] }));
      }
    }

    return new Document({
      numbering: {
        config: [
          {
            reference: 'default-numbering',
            levels: [{ level: 0, format: 'decimal', text: '%1.', alignment: AlignmentType.LEFT }],
          },
        ],
      },
      sections: [
        {
          properties: {
            page: { margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 } },
          },
          children,
        },
      ],
    });
  }

  /**
   * Parse markdown text into DOCX Paragraph elements.
   * Handles: # headings, - bullets, 1. numbered lists, **bold**, *italic*, plain text.
   */
  private parseMarkdownToParagraphs(content: string): Paragraph[] {
    if (!content?.trim()) return [];
    const paragraphs: Paragraph[] = [];
    const lines = content.split('\n');

    for (const rawLine of lines) {
      const line = rawLine.trimEnd();

      // Empty line → small spacer
      if (!line.trim()) {
        paragraphs.push(new Paragraph({ text: '', spacing: { after: 80 } }));
        continue;
      }

      // H1 heading
      if (/^#\s/.test(line)) {
        paragraphs.push(new Paragraph({
          text: line.replace(/^#\s+/, ''),
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 360, after: 160 },
        }));
        continue;
      }

      // H2 heading
      if (/^##\s/.test(line)) {
        paragraphs.push(new Paragraph({
          text: line.replace(/^##\s+/, ''),
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 280, after: 120 },
        }));
        continue;
      }

      // H3 heading
      if (/^###\s/.test(line)) {
        paragraphs.push(new Paragraph({
          text: line.replace(/^###\s+/, ''),
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 200, after: 80 },
        }));
        continue;
      }

      // Unordered bullet
      if (/^[-*•]\s/.test(line)) {
        paragraphs.push(new Paragraph({
          children: this.parseInlineMarkdown(line.replace(/^[-*•]\s+/, '')),
          bullet: { level: 0 },
          spacing: { after: 60 },
        }));
        continue;
      }

      // Nested bullet (two spaces indent)
      if (/^\s{2,}[-*•]\s/.test(line)) {
        paragraphs.push(new Paragraph({
          children: this.parseInlineMarkdown(line.trim().replace(/^[-*•]\s+/, '')),
          bullet: { level: 1 },
          spacing: { after: 40 },
        }));
        continue;
      }

      // Numbered list
      if (/^\d+\.\s/.test(line)) {
        paragraphs.push(new Paragraph({
          children: this.parseInlineMarkdown(line.replace(/^\d+\.\s+/, '')),
          numbering: { reference: 'default-numbering', level: 0 },
          spacing: { after: 60 },
        }));
        continue;
      }

      // Blockquote
      if (/^>\s/.test(line)) {
        paragraphs.push(new Paragraph({
          children: [new TextRun({ text: line.replace(/^>\s+/, ''), italics: true, color: '6B7280' })],
          indent: { left: 720 },
          border: { left: { style: BorderStyle.SINGLE, size: 8, color: '9CA3AF', space: 8 } },
          spacing: { after: 100 },
        }));
        continue;
      }

      // Horizontal rule
      if (/^---+$/.test(line.trim()) || /^\*\*\*+$/.test(line.trim())) {
        paragraphs.push(new Paragraph({
          text: '',
          border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: 'E5E7EB', space: 4 } },
          spacing: { before: 120, after: 120 },
        }));
        continue;
      }

      // Regular paragraph with inline formatting
      paragraphs.push(new Paragraph({
        children: this.parseInlineMarkdown(line),
        spacing: { after: 120 },
      }));
    }

    return paragraphs;
  }

  /**
   * Parse inline markdown (**bold**, *italic*, `code`) into TextRun elements.
   */
  private parseInlineMarkdown(text: string): TextRun[] {
    const runs: TextRun[] = [];
    // Tokenise: **bold**, *italic*, `code`, plain
    const tokenRe = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
    let last = 0;
    let match: RegExpExecArray | null;

    while ((match = tokenRe.exec(text)) !== null) {
      if (match.index > last) {
        runs.push(new TextRun({ text: text.slice(last, match.index) }));
      }
      if (match[2] !== undefined) {
        runs.push(new TextRun({ text: match[2], bold: true }));
      } else if (match[3] !== undefined) {
        runs.push(new TextRun({ text: match[3], italics: true }));
      } else if (match[4] !== undefined) {
        runs.push(new TextRun({ text: match[4], font: 'Courier New', color: 'DC2626', size: 18 }));
      }
      last = tokenRe.lastIndex;
    }

    if (last < text.length) {
      runs.push(new TextRun({ text: text.slice(last) }));
    }

    return runs.length ? runs : [new TextRun({ text })];
  }

  private createTable(rows: string[][]): Table {
    const tableRows = rows.map((row, rowIndex) =>
      new TableRow({
        children: row.map(cell =>
          new TableCell({
            children: [new Paragraph({ text: cell })],
            shading: rowIndex === 0
              ? { fill: '2563EB', type: ShadingType.SOLID, color: 'FFFFFF' }
              : undefined,
          }),
        ),
      }),
    );
    return new Table({ rows: tableRows, width: { size: 100, type: WidthType.PERCENTAGE } });
  }
}
