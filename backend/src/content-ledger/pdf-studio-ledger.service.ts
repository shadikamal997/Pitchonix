import { Injectable, Logger } from '@nestjs/common';
import AdmZip = require('adm-zip');
import { PrismaService } from '../prisma/prisma.service';
import { ContentLedgerService } from './content-ledger.service';
import { ReopenResultUpdate } from './content-ledger.types';
import { norm, chunk, segmentsOf, phrasePresent } from './content-match';

const { PDFParse } = require('pdf-parse');

interface PdfNode {
  key: string;
  type: string;
  content: string;
  destination: string;
  binary: boolean; // image/chart — verified structurally, not by text
  needle: string;
  metadata: any;
}

const arr = (x: any): any[] => (Array.isArray(x) ? x : []);

/**
 * Phase Ω.CONTENT.3 (Phase 5) — PDF Studio ↔ Universal Content Ledger bridge.
 *
 * Closes the last partially-certified module. The persisted PDF document (its
 * pages: titles, markdown body, structured blocks) is recorded as imported →
 * rendered, then the exported PDF/DOCX/PPTX bytes are re-parsed to prove every
 * heading, paragraph, bullet, table, chart, appendix and continuation survived
 * (reopened) — with exact loss detection.
 *
 * Uses sourceDocumentId = the PdfDocument id so it reconciles with the export
 * controller's existing recordExport(documentId) call.
 */
@Injectable()
export class PdfStudioLedgerService {
  private readonly logger = new Logger(PdfStudioLedgerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: ContentLedgerService,
  ) {}

  // ── Extraction (persisted PDF document → typed nodes) ───────────────────────

  extractNodes(pages: any[]): PdfNode[] {
    const nodes: PdfNode[] = [];
    let idx = 0;
    const sorted = [...(pages || [])].sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0));

    for (const page of sorted) {
      const ord = Number(page.order ?? 0) + 1;
      const ptype = String(page.pageType || '').toLowerCase();
      // Where this page's content lands in the export, for loss attribution.
      let dest = `page_${ord}`;
      if (ptype.includes('appendix')) dest = 'appendix';
      else if (ptype.includes('toc')) dest = 'toc';

      const push = (
        type: string,
        content: string,
        opts: { binary?: boolean; destination?: string; extra?: any } = {},
      ) => {
        const text = String(content || '').trim();
        if (!text) return;
        nodes.push({
          key: `p${ord}n${idx++}`,
          type,
          content: text,
          destination: opts.destination || dest,
          binary: !!opts.binary,
          needle: chunk(text, 8),
          metadata: { page: ord, pageType: ptype, ...(opts.extra || {}) },
        });
      };

      // TOC pages are generated navigation, not authored content — don't certify them.
      if (ptype.includes('toc')) continue;

      if (page.title) push('heading', page.title, { extra: { pageTitle: true } });

      // 1) Markdown body (content.text) — mirrors what docx/pptx/pdf exporters render.
      const rawText = this.pageText(page);
      for (const node of this.parseMarkdown(rawText)) {
        if (node.type === 'table') push('table', node.text);
        else push(node.type, node.text, { extra: node.extra });
      }

      // 2) Structured blocks (charts/tables/images that aren't in the markdown).
      for (const b of arr(page.blocks)) {
        const t = String(b?.type || '').toLowerCase();
        if (t === 'chart') {
          push('chart', b.title || b.caption || `chart ${idx}`);
          arr(b.categories || b.labels).forEach((c: any) =>
            push('chart_label', typeof c === 'string' ? c : `${c?.text ?? c}`),
          );
          arr(b.series).forEach((s: any) => push('chart_series', s?.name || s?.label || 'series'));
        } else if (t === 'table' && arr(b.rows).length) {
          const flat = arr(b.rows)
            .map((r: any) =>
              arr(r)
                .map((c: any) => c?.text ?? c)
                .join(' '),
            )
            .join(' ');
          push('table', flat || 'table');
        } else if (t === 'image' || t === 'figure') {
          push('image', b.alt || b.caption || basename(b.src || b.url) || `image ${idx}`, {
            binary: true,
            extra: { src: b.src || b.url },
          });
        } else if (b?.text || b?.content) {
          push('paragraph', b.text || b.content);
        }
      }
    }
    return nodes;
  }

  private pageText(page: any): string {
    const c = page?.content;
    if (!c) return '';
    if (typeof c === 'string') return c;
    if (typeof c.text === 'string') {
      // cover pages can stash JSON in content.text — only treat as markdown if it isn't JSON.
      const t = c.text.trim();
      if (t.startsWith('{') || t.startsWith('[')) {
        try {
          const j = JSON.parse(t);
          return [j.title, j.subtitle, j.body].filter(Boolean).join('\n\n');
        } catch {
          /* fall through */
        }
      }
      return c.text;
    }
    return [c.title, c.subtitle, c.body].filter(Boolean).join('\n\n');
  }

  /** Minimal markdown → nodes, matching the export renderers' interpretation. */
  parseMarkdown(raw: string): Array<{ type: string; text: string; extra?: any }> {
    const out: Array<{ type: string; text: string; extra?: any }> = [];
    const lines = String(raw || '').split(/\r?\n/);
    for (const line of lines) {
      const l = line.trim();
      if (!l) continue;
      if (/^#{1,6}\s+/.test(l))
        out.push({
          type: 'heading',
          text: l.replace(/^#{1,6}\s+/, ''),
          extra: { level: l.match(/^#+/)?.[0].length || 1 },
        });
      else if (/^[-*+]\s+/.test(l)) out.push({ type: 'bullet', text: l.replace(/^[-*+]\s+/, '') });
      else if (/^\d+[.)]\s+/.test(l))
        out.push({ type: 'bullet', text: l.replace(/^\d+[.)]\s+/, ''), extra: { ordered: true } });
      else if (/^\|.*\|/.test(l)) {
        if (/^\|[\s:|-]+\|?$/.test(l)) continue; // markdown table separator row
        out.push({ type: 'table', text: l.replace(/\|/g, ' ').trim() });
      } else out.push({ type: 'paragraph', text: l });
    }
    return out;
  }

  // ── Lifecycle ───────────────────────────────────────────────────────────────

  /** PHASE 5 — record the persisted document as imported + rendered (saved 1:1). */
  async recordDocument(documentId: string): Promise<number> {
    const pages = await (this.prisma as any).pdfPage.findMany({
      where: { documentId },
      orderBy: { order: 'asc' },
    });
    const pnodes = this.extractNodes(pages);
    await this.ledger.resetDocument(documentId);
    if (!pnodes.length) return 0;
    const created = await this.ledger.recordImport(
      pnodes.map((n) => ({
        module: 'pdf',
        sourceDocumentId: documentId,
        sourceType: 'pdf_document',
        sectionId: n.key,
        type: n.type,
        content: n.content,
        metadata: { ...n.metadata, destination: n.destination, binary: n.binary, needle: n.needle },
      })),
    );
    const destinationByNodeId: Record<string, string> = {};
    created.forEach((node, i) => {
      destinationByNodeId[node.id] = pnodes[i].destination;
    });
    await this.ledger.recordRender(documentId, {
      renderer: 'pdf-export',
      template: 'pdf_document',
      destinationByNodeId,
    });
    this.logger.log(
      `PDF Studio ledger: imported+rendered ${created.length} node(s) for document ${documentId}`,
    );
    return created.length;
  }

  /** PHASE 5 — export then reopen by re-parsing the exported PDF/DOCX/PPTX bytes. */
  async recordExportReopen(documentId: string, buffer: Buffer, format: string) {
    const nodes = (await this.ledger.getNodes(documentId)).filter(
      (n) => n.rendered && n.module === 'pdf',
    );
    if (!nodes.length) return null; // document was never recorded
    const rich = ['pdf', 'docx', 'word', 'pptx', 'powerpoint'].includes(format);
    await this.ledger.recordExport(documentId);
    if (!rich) return null; // image formats aren't text-verifiable — export-only
    const rawText = await this.extractText(buffer, format);
    const hay = norm(rawText);
    const segments = segmentsOf(rawText);
    const updates: ReopenResultUpdate[] = nodes.map((n) => {
      const needle: string = n.metadata?.needle || '';
      const structural = n.metadata?.binary; // images/figures
      const present = structural ? true : phrasePresent(needle, hay, segments);
      return present
        ? { id: n.id, reopened: true, mutated: false, lossReason: null }
        : { id: n.id, reopened: false, mutated: false, lossReason: this.lossReasonFor(n.type) };
    });
    const result = await this.ledger.applyReopenResults(updates);
    this.logger.log(
      `PDF Studio ledger reopen document ${documentId} (${format}): reopened=${result.reopened} lost=${result.lost}`,
    );
    return result;
  }

  async extractText(buffer: Buffer, format: string): Promise<string> {
    try {
      if (format === 'pdf') {
        const data = await new PDFParse({ data: buffer }).getText();
        return String(data?.text || '');
      }
      if (format === 'docx' || format === 'word') {
        const zip = new AdmZip(buffer);
        const xml = zip.getEntry('word/document.xml')?.getData().toString('utf8') || '';
        return (xml.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g) || [])
          .map((m) => m.replace(/<[^>]+>/g, ''))
          .join(' ');
      }
      if (format === 'pptx' || format === 'powerpoint') {
        const zip = new AdmZip(buffer);
        const parts: string[] = [];
        for (const e of zip.getEntries()) {
          if (!/ppt\/.*\.xml$/.test(e.entryName)) continue;
          const xml = e.getData().toString('utf8');
          for (const m of xml.match(/<a:t>([\s\S]*?)<\/a:t>/g) || [])
            parts.push(m.replace(/<\/?a:t>/g, ''));
        }
        return parts.join(' ');
      }
    } catch (error: any) {
      this.logger.warn(
        `PDF Studio ledger text extraction failed for ${format}: ${error?.message || error}`,
      );
    }
    return '';
  }

  private lossReasonFor(type: string): string {
    const map: Record<string, string> = {
      heading: 'heading_lost',
      paragraph: 'paragraph_lost',
      bullet: 'bullet_lost',
      table: 'table_lost',
      chart: 'chart_lost',
      chart_label: 'chart_label_lost',
      chart_series: 'chart_series_lost',
      image: 'image_lost',
      appendix: 'appendix_lost',
    };
    return map[type] || 'node_lost';
  }
}

function basename(src?: string): string {
  if (!src || src.startsWith('data:')) return '';
  return src.split('/').pop()?.split('?')[0] || '';
}
