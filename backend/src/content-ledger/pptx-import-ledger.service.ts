import { Injectable, Logger } from '@nestjs/common';
import AdmZip = require('adm-zip');
import { ContentLedgerService } from './content-ledger.service';
import { ReopenResultUpdate } from './content-ledger.types';
import { norm, chunk, segmentsOf, phrasePresent, isPlaceholderTitle } from './content-match';

const { PDFParse } = require('pdf-parse');

interface PptxNode {
  key: string;
  type: string;
  content: string;
  destination: string;
  binary: boolean;
  placeholder: boolean;
  needle: string;
  metadata: any;
}

const arr = (x: any): any[] => (Array.isArray(x) ? x : []);

/**
 * Phase Ω.CONTENT.2F — PPTX Import ↔ Universal Content Ledger bridge.
 *
 * After a .pptx is parsed into slides/elements, every node (slide, title,
 * subtitle, text box, bullet, table + rows + cells, chart + series + labels,
 * image, speaker note, layout) is recorded as imported → rendered → saved.
 * On export the produced PPTX/PDF is re-parsed and each node proven to survive
 * (reopened), with exact loss detection.
 *
 * Uses importId = `pi-<deckId>` so it never collides with the presentation
 * ledger that tracks the same deck under the plain deckId.
 */
@Injectable()
export class PptxImportLedgerService {
  private readonly logger = new Logger(PptxImportLedgerService.name);

  constructor(private readonly ledger: ContentLedgerService) {}

  private importId(deckId: string): string {
    return `pi-${deckId}`;
  }

  // ── Extraction (parser output → typed nodes) ────────────────────────────────

  extractNodes(parsedSlides: any[]): PptxNode[] {
    const nodes: PptxNode[] = [];
    const sorted = [...(parsedSlides || [])].sort(
      (a, b) => Number(a.order ?? 0) - Number(b.order ?? 0),
    );
    let idx = 0;
    for (const s of sorted) {
      const ord = Number(s.order ?? 0) + 1;
      const dest = `slide_${ord}`;
      const push = (
        type: string,
        content: string,
        opts: { binary?: boolean; placeholder?: boolean; destination?: string; extra?: any } = {},
      ) => {
        const text = String(content || '').trim();
        if (!text) return;
        nodes.push({
          key: `s${ord}n${idx++}`,
          type,
          content: text,
          destination: opts.destination || dest,
          binary: !!opts.binary,
          placeholder: !!opts.placeholder,
          needle: chunk(text, 8),
          metadata: {
            slide: ord,
            ...(opts.placeholder ? { placeholder: true } : {}),
            ...(opts.extra || {}),
          },
        });
      };

      // A slide with no authored title gets a synthetic "Slide N" placeholder —
      // structural, NOT authored content (Ω.CONTENT.3B placeholder policy).
      const titlePlaceholder = !s.title || isPlaceholderTitle(s.title);
      push('importedSlide', s.title || `Slide ${ord}`, { placeholder: titlePlaceholder });
      if (s.title)
        push('importedSlideTitle', s.title, { placeholder: isPlaceholderTitle(s.title) });
      if (s.subtitle) push('importedSlideSubtitle', s.subtitle);
      if (s.speakerNotes)
        push('importedSpeakerNote', s.speakerNotes, { destination: 'speaker_notes' });
      if (s.layoutSrc || s.masterSrc)
        push('importedLayout', String(s.layoutSrc || s.masterSrc), { extra: { layout: true } });

      for (const el of arr(s.elements)) {
        const c = el.content || {};
        switch (el.type) {
          case 'heading':
            // Title is already captured from s.title; only emit if it differs.
            if (norm(c.text) && norm(c.text) !== norm(s.title)) push('importedTextBox', c.text);
            break;
          case 'paragraph':
          case 'subheading': {
            const lines = String(c.text || '')
              .split(/\r?\n/)
              .map((l: string) => l.trim())
              .filter(Boolean);
            if (lines.length > 1) lines.forEach((l: string) => push('importedBullet', l));
            else if (lines.length === 1) push('importedTextBox', lines[0]);
            break;
          }
          case 'image':
            push('importedImage', c.alt || basename(c.src || c.url) || `image ${idx}`, {
              binary: true,
              extra: { src: c.src || c.url },
            });
            break;
          case 'chart': {
            push('importedChart', c.title || c.type || `chart ${idx}`);
            arr(c.categories).forEach((cat: any) =>
              push('importedChartLabel', typeof cat === 'string' ? cat : `${cat?.text ?? cat}`),
            );
            arr(c.series).forEach((se: any) =>
              push('importedChartSeries', se?.name || se?.label || `series`),
            );
            break;
          }
          case 'table': {
            const rows = arr(c.rows);
            const flat = rows
              .map((r: any) =>
                arr(r)
                  .map((cell: any) => cell?.text ?? cell)
                  .join(' '),
              )
              .join(' ');
            push('importedTable', flat || 'table');
            rows.forEach((r: any, ri: number) => {
              push(
                'importedTableRow',
                arr(r)
                  .map((cell: any) => cell?.text ?? cell)
                  .join(' | '),
                { extra: { row: ri } },
              );
              arr(r).forEach((cell: any, ci: number) =>
                push('importedTableCell', cell?.text ?? String(cell), {
                  extra: { row: ri, col: ci },
                }),
              );
            });
            break;
          }
          case 'smartArt':
          case 'shape':
            if (c.text) push('importedTextBox', c.text);
            arr(c.nodes).forEach((n: any) =>
              push('importedTextBox', typeof n === 'string' ? n : `${n?.text ?? ''}`),
            );
            break;
          default:
            if (c.text) push('importedTextBox', c.text);
            break;
        }
      }
    }
    return nodes;
  }

  // ── Lifecycle ───────────────────────────────────────────────────────────────

  /** PHASE 2/3/4 — import (parse) → render → saved (parsed content is persisted 1:1). */
  async recordImport(deckId: string, parsedSlides: any[]): Promise<number> {
    const id = this.importId(deckId);
    const pnodes = this.extractNodes(parsedSlides);
    await this.ledger.resetDocument(id);
    if (!pnodes.length) return 0;
    const created = await this.ledger.recordImport(
      pnodes.map((n) => ({
        module: 'pptx_import',
        sourceDocumentId: id,
        sourceType: 'pptx',
        sectionId: n.key,
        type: n.type,
        content: n.content,
        metadata: {
          ...n.metadata,
          destination: n.destination,
          binary: n.binary,
          placeholder: n.placeholder,
          needle: n.needle,
          deckId,
        },
      })),
    );
    const destinationByNodeId: Record<string, string> = {};
    created.forEach((node, i) => {
      destinationByNodeId[node.id] = pnodes[i].destination;
    });
    await this.ledger.recordRender(id, {
      renderer: 'pptx-import',
      template: 'deck',
      destinationByNodeId,
    });
    this.logger.log(
      `PPTX import ledger: imported+saved ${created.length} node(s) for deck ${deckId}`,
    );
    return created.length;
  }

  /** PHASE 5/6 — export then reopen by re-parsing the exported PPTX / PDF bytes. */
  async recordExportReopen(deckId: string, buffer: Buffer, format: string) {
    const id = this.importId(deckId);
    const nodes = (await this.ledger.getNodes(id)).filter((n) => n.rendered);
    if (!nodes.length) return null; // deck wasn't pptx-imported
    const rawText = await this.extractText(buffer, format);
    const hay = norm(rawText);
    const segments = segmentsOf(rawText);
    const rich = format === 'pptx' || format === 'pdf';
    await this.ledger.recordExport(id);
    const updates: ReopenResultUpdate[] = nodes.map((n) => {
      const needle: string = n.metadata?.needle || '';
      // Structural nodes are not text-verifiable — they survive iff the export
      // target is a real deck format (pptx/pdf):
      //  • images / layout-master references (binary or importedLayout),
      //  • synthetic "Slide N" placeholder titles for untitled slides. Detect by
      //    the stored flag OR the content pattern, so records imported before the
      //    placeholder policy existed are reconciled correctly on re-reopen.
      const placeholder =
        n.metadata?.placeholder ||
        ((n.type === 'importedSlide' || n.type === 'importedSlideTitle') &&
          isPlaceholderTitle(n.content));
      const structural = n.metadata?.binary || n.type === 'importedLayout' || placeholder;
      const present = structural ? rich : phrasePresent(needle, hay, segments);
      return present
        ? { id: n.id, reopened: true, mutated: false, lossReason: null }
        : { id: n.id, reopened: false, mutated: false, lossReason: this.lossReasonFor(n.type) };
    });
    const result = await this.ledger.applyReopenResults(updates);
    this.logger.log(
      `PPTX import ledger reopen deck ${deckId} (${format}): reopened=${result.reopened} lost=${result.lost}`,
    );
    return result;
  }

  /** Reliable text extraction from exported bytes. */
  async extractText(buffer: Buffer, format: string): Promise<string> {
    try {
      if (format === 'pptx') {
        const zip = new AdmZip(buffer);
        const parts: string[] = [];
        for (const e of zip.getEntries()) {
          if (!/ppt\/.*\.xml$/.test(e.entryName)) continue;
          const xml = e.getData().toString('utf8');
          for (const m of xml.match(/<a:t>([\s\S]*?)<\/a:t>/g) || [])
            parts.push(m.replace(/<\/?a:t>/g, ''));
          for (const m of xml.match(/<c:v>([\s\S]*?)<\/c:v>/g) || [])
            parts.push(m.replace(/<\/?c:v>/g, ''));
        }
        // newline-separated so reopen matching can see per-run phrase boundaries
        return parts.join('\n');
      }
      if (format === 'pdf') {
        const data = await new PDFParse({ data: buffer }).getText();
        return String(data?.text || '');
      }
    } catch (error: any) {
      this.logger.warn(
        `PPTX import ledger text extraction failed for ${format}: ${error?.message || error}`,
      );
    }
    return '';
  }

  private lossReasonFor(type: string): string {
    const map: Record<string, string> = {
      importedSlide: 'slide_lost',
      importedSlideTitle: 'title_lost',
      importedSlideSubtitle: 'subtitle_lost',
      importedTextBox: 'textbox_lost',
      importedBullet: 'bullet_lost',
      importedTable: 'table_lost',
      importedTableRow: 'table_row_lost',
      importedTableCell: 'table_cell_lost',
      importedChart: 'chart_lost',
      importedChartSeries: 'chart_series_lost',
      importedChartLabel: 'chart_label_lost',
      importedImage: 'image_lost',
      importedSpeakerNote: 'speaker_note_lost',
      importedLayout: 'layout_lost',
    };
    return map[type] || 'node_lost';
  }
}

function basename(src?: string): string {
  if (!src || src.startsWith('data:')) return '';
  return src.split('/').pop()?.split('?')[0] || '';
}
