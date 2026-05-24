import {
  Document, Packer, Paragraph, HeadingLevel, TextRun, Table as DocxTable,
  TableRow, TableCell, WidthType, AlignmentType, ImageRun, PageBreak,
} from 'docx';
import { UniversalDocument, DocumentNode, forEachNode } from '../document-model';
import { renderChartPng } from './chart-renderer';

// =============================================================================
//  Phase 41H + 41J — DOCX exporter.
//
//  Builds a proper Word document from the UniversalDocument tree using the
//  `docx` library. One page (slide-style) becomes a section terminated by a
//  PageBreak so Word's pagination engine treats each as a logical chapter.
//
//  Supported conversions per node type:
//    heading        → Paragraph(heading=H1..H6)
//    paragraph      → Paragraph + per-run formatting
//    list           → Paragraphs with bullets / numbering
//    quote          → italic paragraph
//    callout        → bold tag + body paragraph
//    table          → docx Table (with header row markup)
//    image (data URL only) → ImageRun
//    chart          → "[Chart: …]" placeholder paragraph
//    code           → monospace paragraph
// =============================================================================

export async function exportDocx(doc: UniversalDocument): Promise<Buffer> {
  const children: any[] = [];

  // Phase Ω.1 — derive brand styling from doc.theme (populated when a
  // brandKitId was applied). Used by renderNode for headings, paragraphs,
  // table headers, code blocks; falls back to neutral defaults when absent.
  const brand = {
    primary:  hexOnly(doc.theme?.colors?.primary)  ?? '0F172A',
    accent:   hexOnly(doc.theme?.colors?.accent)   ?? '2563EB',
    text:     hexOnly(doc.theme?.colors?.text)     ?? '1F2937',
    secondary: hexOnly(doc.theme?.colors?.secondary) ?? '64748B',
    headingFont: doc.theme?.fonts?.heading,
    bodyFont:    doc.theme?.fonts?.body,
  };

  // Phase 41.1G — pre-render every chart node to PNG (sharp pipeline) so
  // renderNode can stay synchronous. Map by a synthetic key per (page, idx).
  const chartPngs = new Map<string, Buffer>();
  const chartJobs: Promise<void>[] = [];
  forEachNode(doc, (node, pageIdx, nodeIdx) => {
    if (node.type === 'chart' && node.chart) {
      const key = `c-${pageIdx}-${nodeIdx}`;
      chartJobs.push(renderChartPng(node.chart, 960, 540).then((png) => {
        if (png) chartPngs.set(key, png);
      }).catch(() => { /* swallow per-chart failure */ }));
    }
  });
  await Promise.all(chartJobs);

  doc.pages.forEach((page, pi) => {
    if (pi > 0) children.push(new Paragraph({ children: [new PageBreak()] }));
    if (page.title) {
      children.push(new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun({ text: page.title, color: brand.primary, font: brand.headingFont })],
      }));
    }
    page.nodes.forEach((node, ni) => {
      const built = renderNode(node, {
        brand,
        chartPng: node.type === 'chart' ? chartPngs.get(`c-${pi}-${ni}`) : undefined,
      });
      for (const b of built) children.push(b);
    });
    if (page.notes) {
      children.push(new Paragraph({
        children: [new TextRun({ text: `Notes: ${page.notes}`, italics: true, color: brand.secondary })],
      }));
    }
  });

  const document = new Document({
    creator:  doc.metadata.author || 'Pitchonix',
    title:    doc.metadata.title,
    sections: [{ properties: {}, children }],
  });

  const buf = await Packer.toBuffer(document);
  return buf;
}

function hexOnly(c: string | undefined | null): string | null {
  if (!c) return null;
  const m = c.replace('#', '');
  return /^[0-9A-Fa-f]{6}$/.test(m) ? m : null;
}

function renderNode(n: DocumentNode, ctx?: { brand?: any; chartPng?: Buffer }): any[] {
  const brand = ctx?.brand;
  switch (n.type) {
    case 'heading':
      return [new Paragraph({
        heading: HEADING_BY_LEVEL[Math.max(1, Math.min(6, n.level || 2))],
        children: [new TextRun({
          text:  n.text || '',
          color: brand?.primary,
          font:  brand?.headingFont,
        })],
      })];

    case 'paragraph': {
      if (Array.isArray(n.runs) && n.runs.length > 0) {
        return [new Paragraph({
          children: n.runs.map((r) => new TextRun({
            text:      r.text || '',
            bold:      !!r.bold,
            italics:   !!r.italic,
            underline: r.underline ? {} : undefined,
            color:     (r.color && /^#[0-9A-Fa-f]{6}$/.test(r.color)) ? r.color.replace('#', '') : brand?.text,
            size:      Number.isFinite(r.size) ? Math.round((r.size as number) * 2) : undefined,
            font:      r.font || brand?.bodyFont,
          })),
        })];
      }
      return [new Paragraph({
        children: [new TextRun({ text: n.text || '', color: brand?.text, font: brand?.bodyFont })],
      })];
    }

    case 'list': {
      const items = Array.isArray(n.items) ? n.items : [];
      return items.map((i: any, idx: number) =>
        new Paragraph({
          text: typeof i === 'string' ? i : i.text,
          bullet: n.ordered ? undefined : { level: 0 },
          numbering: n.ordered ? { reference: 'numbered', level: 0 } : undefined,
        }),
      );
    }

    case 'quote':
      return [new Paragraph({
        children: [new TextRun({ text: n.text || '', italics: true, color: '475569' })],
        spacing: { before: 120, after: 120 },
      })];

    case 'callout':
      return [new Paragraph({
        children: [
          new TextRun({ text: `${(n.callout || 'info').toUpperCase()}: `, bold: true }),
          new TextRun({ text: n.text || '' }),
        ],
      })];

    case 'table': {
      const rows = n.rows || [];
      if (rows.length === 0) return [];
      const tableRows = rows.map((r, rIdx) =>
        new TableRow({
          tableHeader: rIdx === 0 && !!n.headerRow,
          children: r.map((c) => new TableCell({
            children: [new Paragraph({
              children: [new TextRun({ text: c.text || '', bold: c.bold || (rIdx === 0 && !!n.headerRow) })],
              alignment: c.align === 'center' ? AlignmentType.CENTER
                       : c.align === 'right'  ? AlignmentType.RIGHT
                                              : AlignmentType.LEFT,
            })],
          })),
        }),
      );
      return [new DocxTable({
        rows: tableRows,
        width: { size: 100, type: WidthType.PERCENTAGE },
      })];
    }

    case 'image': {
      if (n.src?.startsWith('data:image/')) {
        try {
          const base64 = n.src.split(',')[1];
          if (!base64) return [];
          return [new Paragraph({
            children: [new ImageRun({
              data: Buffer.from(base64, 'base64'),
              transformation: { width: 480, height: 320 },
              type: 'png',
            })],
          })];
        } catch { /* fall through */ }
      }
      return [new Paragraph({
        children: [new TextRun({ text: `[Image: ${n.alt || n.src || 'untitled'}]`, italics: true, color: '64748B' })],
      })];
    }

    case 'chart': {
      // Phase 41.1G — embed rendered chart PNG when available; fall back to label.
      if (ctx?.chartPng && ctx.chartPng.length > 0) {
        return [
          ...(n.chart?.title ? [new Paragraph({
            children: [new TextRun({ text: n.chart.title, bold: true })],
          })] : []),
          new Paragraph({
            children: [new ImageRun({
              data: ctx.chartPng,
              transformation: { width: 560, height: 315 },
              type: 'png',
            })],
          }),
        ];
      }
      return [new Paragraph({
        children: [new TextRun({ text: `[Chart: ${n.chart?.type || 'bar'}]`, italics: true, color: '64748B' })],
      })];
    }

    case 'code':
      return [new Paragraph({
        children: [new TextRun({ text: n.text || '', font: 'Courier New', size: 20 })],
      })];

    case 'pageBreak':
      return [new Paragraph({ children: [new PageBreak()] })];

    default:
      return n.text ? [new Paragraph({ text: n.text })] : [];
  }
}

const HEADING_BY_LEVEL: Record<number, (typeof HeadingLevel)[keyof typeof HeadingLevel]> = {
  1: HeadingLevel.HEADING_1,
  2: HeadingLevel.HEADING_2,
  3: HeadingLevel.HEADING_3,
  4: HeadingLevel.HEADING_4,
  5: HeadingLevel.HEADING_5,
  6: HeadingLevel.HEADING_6,
};
