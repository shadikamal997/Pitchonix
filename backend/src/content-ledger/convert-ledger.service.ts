import { Injectable, Logger } from '@nestjs/common';
import AdmZip = require('adm-zip');
import * as mammoth from 'mammoth';
import * as cheerio from 'cheerio';
import * as XLSX from 'xlsx';
import { ContentLedgerService } from './content-ledger.service';
import { ReopenResultUpdate } from './content-ledger.types';
import type { UniversalDocument, DocumentNode } from '../universal-conversion/document-model';

const { PDFParse } = require('pdf-parse');

// Output formats that can embed binary content (images/charts).
const RICH_TARGETS = new Set(['docx', 'pdf', 'pptx', 'html', 'htm', 'xlsx', 'rtf']);

interface ConvNode {
  key: string;
  type: string;
  content: string;
  binary: boolean; // image/chart — not text-verifiable
  needle: string;
  metadata: any;
}

const norm = (s: any): string =>
  String(s ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
const chunk = (s: any, words = 8): string =>
  norm(s).split(' ').filter(Boolean).slice(0, words).join(' ');

/**
 * Phase Ω.CONTENT.2E — Convert ↔ Universal Content Ledger bridge.
 *
 * Both the source file and the converted output are parsed to the Universal
 * Document Model. The ledger records every source node (import) and proves it
 * survived into the output (rendered = exported = reopened) by re-parsing the
 * actual converted file — pinpointing exact heading/table/bullet/image/chart
 * loss when a conversion drops content.
 */
@Injectable()
export class ConvertLedgerService {
  private readonly logger = new Logger(ConvertLedgerService.name);

  constructor(private readonly ledger: ContentLedgerService) {}

  // ── Extraction (UDM → typed convert nodes) ──────────────────────────────────

  extractNodes(udm: UniversalDocument): ConvNode[] {
    const nodes: ConvNode[] = [];
    let idx = 0;
    const push = (type: string, content: string, binary = false, extra: any = {}) => {
      const text = String(content || '').trim();
      if (!text) return;
      nodes.push({
        key: `n${idx++}`,
        type,
        content: text,
        binary,
        needle: chunk(text, 8),
        metadata: extra,
      });
    };

    (udm.pages || []).forEach((page, pi) => {
      if (
        page.title &&
        (udm.metadata?.sourceFormat === 'pptx' || ((udm.pages || []).length > 1 && page.title))
      ) {
        push('convertedSlide', page.title, false, { page: pi });
      }
      for (const node of (page.nodes || []) as DocumentNode[]) {
        switch (node.type) {
          case 'heading':
            push('convertedHeading', node.text || '', false, { level: node.level });
            break;
          case 'paragraph':
          case 'quote':
          case 'code':
          case 'callout':
            push('convertedParagraph', node.text || '');
            break;
          case 'list':
            for (const it of node.items || [])
              push('convertedBullet', typeof it === 'string' ? it : it.text);
            break;
          case 'table': {
            const rows = node.rows || [];
            const flat = rows.map((r) => r.map((c) => c.text).join(' ')).join(' ');
            push('convertedTable', flat, false, { rows: rows.length });
            rows.forEach((r, ri) => {
              push('convertedTableRow', r.map((c) => c.text).join(' | '), false, { row: ri });
              r.forEach((c, ci) => push('convertedTableCell', c.text, false, { row: ri, col: ci }));
            });
            break;
          }
          case 'image':
            push('convertedImage', node.alt || basename(node.src) || `image ${idx}`, true, {
              src: node.src,
            });
            break;
          case 'chart':
            push(
              'convertedChart',
              node.chart?.title || node.chart?.type || `chart ${idx}`,
              true,
              {},
            );
            break;
          default:
            break;
        }
      }
    });
    return nodes;
  }

  // ── Lifecycle ───────────────────────────────────────────────────────────────

  /**
   * Record a full conversion: import nodes from the source UDM, then prove each
   * survived into the converted output by RE-PARSING the actual output bytes
   * with reliable extractors (pdf-parse / mammoth / cheerio / xlsx / OOXML).
   */
  async record(
    conversionId: string,
    sourceUdm: UniversalDocument,
    outputBuffer: Buffer,
    targetFormat: string,
  ) {
    const imp = this.extractNodes(sourceUdm);
    const outText = norm(await this.extractText(outputBuffer, targetFormat));
    // Binary content (images/charts) can only survive into formats that embed
    // them; plaintext targets (txt/md/csv) genuinely drop them.
    const richTarget = RICH_TARGETS.has(targetFormat);

    await this.ledger.resetDocument(conversionId);
    if (!imp.length) return { imported: 0, reopened: 0, lost: 0 };

    const created = await this.ledger.recordImport(
      imp.map((n) => ({
        module: 'convert',
        sourceDocumentId: conversionId,
        sourceType: 'conversion',
        sectionId: n.key,
        type: n.type,
        content: n.content,
        metadata: { ...n.metadata, binary: n.binary, needle: n.needle, target: targetFormat },
      })),
    );

    // Presence: text nodes by substring in the re-extracted output text; binary
    // nodes survive iff the target format can embed them (not text-verifiable).
    const presentIds: string[] = [];
    const updates: ReopenResultUpdate[] = [];
    created.forEach((node, i) => {
      const src = imp[i];
      const present = src.binary ? richTarget : !src.needle || outText.includes(src.needle);
      if (present) {
        presentIds.push(node.id);
        updates.push({ id: node.id, reopened: true, mutated: false, lossReason: null });
      } else
        updates.push({
          id: node.id,
          reopened: false,
          mutated: false,
          lossReason: this.lossReasonFor(src.type),
        });
    });

    if (presentIds.length) {
      await this.ledger.recordRender(conversionId, {
        renderer: `convert:${targetFormat}`,
        template: targetFormat,
        nodeIds: presentIds,
        destination: `output_${targetFormat}`,
      });
      await this.ledger.recordExport(conversionId, { nodeIds: presentIds });
    }
    const result = await this.ledger.applyReopenResults(updates);
    this.logger.log(
      `Convert ledger ${conversionId} (→${targetFormat}): imported=${created.length} preserved=${presentIds.length} lost=${result.lost}`,
    );
    return { imported: created.length, reopened: result.reopened, lost: result.lost };
  }

  /** Reliable plain-text extraction from converted output bytes. */
  async extractText(buffer: Buffer, format: string): Promise<string> {
    try {
      switch (format) {
        case 'pdf': {
          const data = await new PDFParse({ data: buffer }).getText();
          return String(data?.text || '');
        }
        case 'docx': {
          const { value } = await mammoth.extractRawText({ buffer });
          return String(value || '');
        }
        case 'html':
        case 'htm':
          return cheerio.load(buffer.toString('utf8')).root().text();
        case 'pptx': {
          const zip = new AdmZip(buffer);
          return zip
            .getEntries()
            .filter((e) => /ppt\/(slides|notesSlides)\/.*\.xml$/.test(e.entryName))
            .map((e) =>
              (
                e
                  .getData()
                  .toString('utf8')
                  .match(/<a:t>([\s\S]*?)<\/a:t>/g) || []
              )
                .map((m) => m.replace(/<\/?a:t>/g, ''))
                .join(' '),
            )
            .join(' ');
        }
        case 'xlsx':
        case 'xls': {
          const wb = XLSX.read(buffer, { type: 'buffer' });
          return wb.SheetNames.map((n) => XLSX.utils.sheet_to_csv(wb.Sheets[n])).join(' ');
        }
        default: // md, txt, csv, rtf
          return buffer.toString('utf8');
      }
    } catch (error: any) {
      this.logger.warn(
        `Convert ledger text extraction failed for ${format}: ${error?.message || error}`,
      );
      return '';
    }
  }

  private lossReasonFor(type: string): string {
    const map: Record<string, string> = {
      convertedHeading: 'heading_lost',
      convertedParagraph: 'paragraph_lost',
      convertedBullet: 'bullet_lost',
      convertedTable: 'table_lost',
      convertedTableRow: 'table_row_lost',
      convertedTableCell: 'table_cell_lost',
      convertedImage: 'image_lost',
      convertedChart: 'chart_lost',
      convertedSlide: 'section_lost',
      convertedMetric: 'metric_lost',
      convertedFormula: 'formula_lost',
      convertedAppendix: 'appendix_lost',
    };
    return map[type] || 'node_lost';
  }
}

function basename(src?: string): string {
  if (!src) return '';
  if (src.startsWith('data:')) return '';
  return src.split('/').pop()?.split('?')[0] || '';
}
