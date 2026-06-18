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
  ImageRun,
  UnderlineType,
} from 'docx';
import { buildSafePdfStudioDocument } from './safe-document-model';

// Arabic/Hebrew Unicode blocks — used to detect RTL text
const RTL_BLOCK_RE = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿֐-׿]/;

function hasRtlContent(text: string): boolean {
  return RTL_BLOCK_RE.test(text ?? '');
}

/** Convert "#2563EB" or "2563EB" → "2563EB" (bare, uppercase) */
function bareHex(hex: string | null | undefined, fallback: string): string {
  if (!hex) return fallback;
  return hex.replace(/^#/, '').toUpperCase();
}

interface DocxBrandKit {
  primaryHex: string;
  accentHex: string;
  fontFamily: string | null;
  logo: Buffer | null;
  isRtl: boolean;
}

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

    const kit = await this.resolveBrandKit(document);
    const docxDoc = await this.buildDocxDocument(document, kit);
    const docxBuffer = await Packer.toBuffer(docxDoc);
    const filename = `${document.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.docx`;

    this.logger.log(`DOCX export complete: ${filename}`);
    return { docxBuffer, filename };
  }

  private async resolveBrandKit(document: any): Promise<DocxBrandKit> {
    let brandKit: any = null;

    if (document.userId) {
      brandKit = await this.prisma.brandKit.findFirst({
        where: { userId: document.userId, isDefault: true },
        orderBy: { createdAt: 'desc' },
      });
      if (!brandKit) {
        brandKit = await this.prisma.brandKit.findFirst({
          where: { userId: document.userId },
          orderBy: { createdAt: 'desc' },
        });
      }
    }

    const isRtl = hasRtlContent(document.title ?? '') ||
      (document.pages ?? []).some((p: any) => hasRtlContent(p.normalizedText ?? ''));

    if (!brandKit) {
      return { primaryHex: '2563EB', accentHex: '60A5FA', fontFamily: null, logo: null, isRtl };
    }

    const tokens: any = brandKit.tokens ?? {};
    const colors = tokens.colors ?? {};
    const typography: any = tokens.typography ?? {};

    const primaryHex  = bareHex(colors.primary  ?? brandKit.primaryColor,   '2563EB');
    const accentHex   = bareHex(colors.accent,  '60A5FA');
    const fontFamily  = typography.body?.family ?? brandKit.fontFamily ?? null;

    // Attempt to fetch logo bytes for inline embedding
    let logo: Buffer | null = null;
    if (brandKit.logo) {
      try {
        const resp = await fetch(brandKit.logo);
        if (resp.ok) logo = Buffer.from(await resp.arrayBuffer());
      } catch {
        // Logo fetch failed — skip
      }
    }

    return { primaryHex, accentHex, fontFamily, logo, isRtl };
  }

  private async buildDocxDocument(document: any, kit: DocxBrandKit): Promise<Document> {
    const children: any[] = [];
    const safeDocument = buildSafePdfStudioDocument(document);
    const isRtl = kit.isRtl;
    const rtlAlign = isRtl ? AlignmentType.RIGHT : AlignmentType.LEFT;

    const headingFont = kit.fontFamily ? { font: kit.fontFamily } : {};
    const bodyFont    = kit.fontFamily ? { font: kit.fontFamily } : {};

    // ── Logo (brand kit header) ──────────────────────────────────────────────
    if (kit.logo) {
      try {
        children.push(
          new Paragraph({
            children: [
              new ImageRun({
                data: kit.logo,
                transformation: { width: 120, height: 50 },
              }),
            ],
            alignment: isRtl ? AlignmentType.RIGHT : AlignmentType.LEFT,
            spacing: { after: 200 },
          }),
        );
      } catch {
        // ImageRun failed (bad logo format) — skip
      }
    }

    // ── Title page ───────────────────────────────────────────────────────────
    children.push(
      new Paragraph({
        text: safeDocument.title,
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
        bidirectional: isRtl,
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: document.outline?.detectedType || 'Document',
            color: '6B7280',
            ...bodyFont,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        bidirectional: isRtl,
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: new Date(document.createdAt).toLocaleDateString('en-US', {
              year: 'numeric', month: 'long', day: 'numeric',
            }),
            color: '9CA3AF',
            ...bodyFont,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 800 },
        bidirectional: isRtl,
      }),
      new Paragraph({ children: [new PageBreak()] }),
    );

    // ── Content pages ────────────────────────────────────────────────────────
    const contentPages = safeDocument.pages.filter((p) => p.pageType !== 'toc');

    for (let i = 0; i < contentPages.length; i++) {
      const page = contentPages[i];
      const pageIsRtl = isRtl || hasRtlContent(page.normalizedText ?? '') || hasRtlContent(page.displayTitle ?? '');

      if (page.pageType === 'cover') {
        const coverData = page.cover;
        children.push(
          new Paragraph({
            text: coverData?.title || safeDocument.title,
            heading: HeadingLevel.HEADING_1,
            alignment: pageIsRtl ? AlignmentType.RIGHT : AlignmentType.CENTER,
            spacing: { before: 400, after: 200 },
            bidirectional: pageIsRtl,
          }),
        );
        if (coverData?.subtitle) {
          children.push(
            new Paragraph({
              text: coverData.subtitle,
              alignment: pageIsRtl ? AlignmentType.RIGHT : AlignmentType.CENTER,
              spacing: { after: 200 },
              bidirectional: pageIsRtl,
            }),
          );
        }
        if (i < contentPages.length - 1) {
          children.push(new Paragraph({ children: [new PageBreak()] }));
        }
        continue;
      }

      // Section heading
      if (page.displayTitle) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: page.displayTitle,
                bold: true,
                color: kit.primaryHex,
                ...headingFont,
              }),
            ],
            heading: HeadingLevel.HEADING_1,
            alignment: pageIsRtl ? AlignmentType.RIGHT : AlignmentType.LEFT,
            spacing: { before: 400, after: 200 },
            bidirectional: pageIsRtl,
            border: {
              bottom: { style: BorderStyle.SINGLE, size: 4, color: kit.primaryHex, space: 4 },
            },
          }),
        );
      }

      const paragraphs = this.parseMarkdownToParagraphs(page.normalizedText, pageIsRtl, kit);
      children.push(...paragraphs);

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

  private parseMarkdownToParagraphs(
    content: string,
    pageIsRtl: boolean,
    kit: DocxBrandKit,
  ): Paragraph[] {
    if (!content?.trim()) return [];
    const paragraphs: Paragraph[] = [];
    const lines = content.split('\n');
    const headingFont = kit.fontFamily ? { font: kit.fontFamily } : {};
    const bodyFont    = kit.fontFamily ? { font: kit.fontFamily } : {};

    for (const rawLine of lines) {
      const line = rawLine.trimEnd();

      if (!line.trim()) {
        paragraphs.push(new Paragraph({ text: '', spacing: { after: 80 } }));
        continue;
      }

      const lineIsRtl = pageIsRtl || hasRtlContent(line);
      const align = lineIsRtl ? AlignmentType.RIGHT : AlignmentType.LEFT;

      if (/^#\s/.test(line)) {
        paragraphs.push(
          new Paragraph({
            children: [new TextRun({ text: line.replace(/^#\s+/, ''), bold: true, color: kit.primaryHex, ...headingFont })],
            heading: HeadingLevel.HEADING_1,
            alignment: align,
            spacing: { before: 360, after: 160 },
            bidirectional: lineIsRtl,
          }),
        );
        continue;
      }

      if (/^##\s/.test(line)) {
        paragraphs.push(
          new Paragraph({
            children: [new TextRun({ text: line.replace(/^##\s+/, ''), bold: true, color: kit.primaryHex, ...headingFont })],
            heading: HeadingLevel.HEADING_2,
            alignment: align,
            spacing: { before: 280, after: 120 },
            bidirectional: lineIsRtl,
          }),
        );
        continue;
      }

      if (/^###\s/.test(line)) {
        paragraphs.push(
          new Paragraph({
            children: [new TextRun({ text: line.replace(/^###\s+/, ''), bold: true, ...headingFont })],
            heading: HeadingLevel.HEADING_3,
            alignment: align,
            spacing: { before: 200, after: 80 },
            bidirectional: lineIsRtl,
          }),
        );
        continue;
      }

      if (/^[-*•]\s/.test(line)) {
        paragraphs.push(
          new Paragraph({
            children: this.parseInlineMarkdown(line.replace(/^[-*•]\s+/, ''), lineIsRtl, bodyFont),
            bullet: { level: 0 },
            alignment: align,
            spacing: { after: 60 },
            bidirectional: lineIsRtl,
          }),
        );
        continue;
      }

      if (/^\s{2,}[-*•]\s/.test(line)) {
        paragraphs.push(
          new Paragraph({
            children: this.parseInlineMarkdown(line.trim().replace(/^[-*•]\s+/, ''), lineIsRtl, bodyFont),
            bullet: { level: 1 },
            alignment: align,
            spacing: { after: 40 },
            bidirectional: lineIsRtl,
          }),
        );
        continue;
      }

      if (/^\d+\.\s/.test(line)) {
        paragraphs.push(
          new Paragraph({
            children: this.parseInlineMarkdown(line.replace(/^\d+\.\s+/, ''), lineIsRtl, bodyFont),
            numbering: { reference: 'default-numbering', level: 0 },
            alignment: align,
            spacing: { after: 60 },
            bidirectional: lineIsRtl,
          }),
        );
        continue;
      }

      if (/^>\s/.test(line)) {
        paragraphs.push(
          new Paragraph({
            children: [new TextRun({ text: line.replace(/^>\s+/, ''), italics: true, color: '6B7280', ...bodyFont })],
            alignment: align,
            indent: { left: 720 },
            border: { left: { style: BorderStyle.SINGLE, size: 8, color: '9CA3AF', space: 8 } },
            spacing: { after: 100 },
            bidirectional: lineIsRtl,
          }),
        );
        continue;
      }

      if (/^---+$/.test(line.trim()) || /^\*\*\*+$/.test(line.trim())) {
        paragraphs.push(
          new Paragraph({
            text: '',
            border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: 'E5E7EB', space: 4 } },
            spacing: { before: 120, after: 120 },
          }),
        );
        continue;
      }

      paragraphs.push(
        new Paragraph({
          children: this.parseInlineMarkdown(line, lineIsRtl, bodyFont),
          alignment: align,
          spacing: { after: 120 },
          bidirectional: lineIsRtl,
        }),
      );
    }

    return paragraphs;
  }

  private parseInlineMarkdown(
    text: string,
    isRtl: boolean,
    fontOpts: { font?: string },
  ): TextRun[] {
    const runs: TextRun[] = [];
    const tokenRe = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
    let last = 0;
    let match: RegExpExecArray | null;

    while ((match = tokenRe.exec(text)) !== null) {
      if (match.index > last) {
        runs.push(new TextRun({ text: text.slice(last, match.index), rightToLeft: isRtl, ...fontOpts }));
      }
      if (match[2] !== undefined) {
        runs.push(new TextRun({ text: match[2], bold: true, rightToLeft: isRtl, ...fontOpts }));
      } else if (match[3] !== undefined) {
        runs.push(new TextRun({ text: match[3], italics: true, rightToLeft: isRtl, ...fontOpts }));
      } else if (match[4] !== undefined) {
        runs.push(new TextRun({ text: match[4], font: 'Courier New', color: 'DC2626', size: 18 }));
      }
      last = tokenRe.lastIndex;
    }

    if (last < text.length) {
      runs.push(new TextRun({ text: text.slice(last), rightToLeft: isRtl, ...fontOpts }));
    }

    return runs.length ? runs : [new TextRun({ text, rightToLeft: isRtl, ...fontOpts })];
  }

  // Kept for potential internal callers (unused by exportDocument but part of public surface)
  protected createTable(rows: string[][], isRtl = false): Table {
    const tableRows = rows.map(
      (row, rowIndex) =>
        new TableRow({
          children: row.map(
            (cell) =>
              new TableCell({
                children: [
                  new Paragraph({
                    text: cell,
                    alignment: isRtl ? AlignmentType.RIGHT : AlignmentType.LEFT,
                    bidirectional: isRtl,
                  }),
                ],
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
