import { Injectable, Logger } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { ContentLedgerService } from '../content-ledger/content-ledger.service';
import { ReopenResultUpdate } from '../content-ledger/content-ledger.types';
import { ExcelWorkbookOperationInput } from './excel-studio.types';

/** A normalized workbook content node, derived identically from any XLSX buffer. */
interface WorkbookNode {
  key: string; // stable identity used to match import vs reopen
  type: string; // sheet | row | column | cell | formula | mergedCell | namedRange | rowMetadata | columnMetadata | workbookMetadata
  content: string; // value snapshot used for hashing / mutation detection
  metadata: any;
  preview: boolean; // visible in the editor preview vs preserved in the workbook model
}

// Guard against recording huge empty/dense grids — meaningful nodes only.
const MAX_CELLS_PER_SHEET = 4000;
const PREVIEW_ROWS = 80;

/**
 * Phase Ω.CONTENT.2B — Excel Studio ↔ Universal Content Ledger bridge.
 *
 * Derives content nodes (sheets, rows/cols metadata, cells, formulas, merges,
 * named ranges, workbook metadata) from a parsed XLSX buffer and drives the
 * import → render → export → reopen lifecycle. Reopen is operation-aware: a cell
 * the user intentionally edited is recognized as an expected mutation, not loss.
 */
@Injectable()
export class ExcelLedgerService {
  private readonly logger = new Logger(ExcelLedgerService.name);

  constructor(private readonly ledger: ContentLedgerService) {}

  // ── Extraction (single source of truth for import AND reopen) ───────────────

  extractWorkbookNodes(buffer: Buffer): WorkbookNode[] {
    const wb = XLSX.read(buffer, {
      type: 'buffer',
      cellFormula: true,
      cellDates: true,
      cellStyles: true,
      raw: false,
    });
    const nodes: WorkbookNode[] = [];
    const sheetNames = [...wb.SheetNames];

    nodes.push({
      key: 'workbook',
      type: 'workbookMetadata',
      content: `sheets=${sheetNames.length}; names=${sheetNames.join('|')}`,
      metadata: { sheetNames },
      preview: true,
    });

    for (const named of wb.Workbook?.Names || []) {
      const name = String((named as any).Name || '');
      const ref = String((named as any).Ref || '');
      if (!name) continue;
      nodes.push({
        key: `named::${name}`,
        type: 'namedRange',
        content: `${name}=${ref}`,
        metadata: { name, ref },
        preview: true,
      });
    }

    sheetNames.forEach((name, index) => {
      const sheet = wb.Sheets[name];
      if (!sheet) return;
      const ref = sheet['!ref'] || 'A1:A1';
      const range = XLSX.utils.decode_range(ref);
      const rows = Math.max(0, range.e.r - range.s.r + 1);
      const columns = Math.max(0, range.e.c - range.s.c + 1);
      const hidden = Boolean(wb.Workbook?.Sheets?.[index]?.Hidden);

      nodes.push({
        key: `sheet::${name}`,
        type: 'sheet',
        content: name,
        metadata: { index, rows, columns, usedRange: ref, hidden },
        preview: true,
      });

      for (const merge of sheet['!merges'] || []) {
        const encoded = XLSX.utils.encode_range(merge);
        nodes.push({
          key: `merge::${name}::${encoded}`,
          type: 'mergedCell',
          content: encoded,
          metadata: { sheetName: name, range: encoded },
          preview: true,
        });
      }

      (sheet['!cols'] || []).forEach((col: any, ci: number) => {
        const width = Number(col?.wch || col?.wpx || 0);
        if (width > 0) {
          nodes.push({
            key: `col::${name}::${ci}`,
            type: 'columnMetadata',
            content: `col${ci}=w${Math.round(width)}`,
            metadata: { sheetName: name, column: ci, width },
            preview: ci < columns,
          });
        }
      });

      (sheet['!rows'] || []).forEach((row: any, ri: number) => {
        const height = Number(row?.hpt || row?.hpx || 0);
        if (height > 0) {
          nodes.push({
            key: `row::${name}::${ri}`,
            type: 'rowMetadata',
            content: `row${ri}=h${Math.round(height)}`,
            metadata: { sheetName: name, row: ri, height },
            preview: ri < PREVIEW_ROWS,
          });
        }
      });

      let count = 0;
      for (let r = range.s.r; r <= range.e.r && count < MAX_CELLS_PER_SHEET; r++) {
        for (let c = range.s.c; c <= range.e.c; c++) {
          const addr = XLSX.utils.encode_cell({ r, c });
          const cell: any = (sheet as any)[addr];
          if (!cell) continue;
          const preview = r < PREVIEW_ROWS;
          const hasFormula = typeof cell.f === 'string' && cell.f.length > 0;
          if (hasFormula) {
            nodes.push({
              key: `formula::${name}::${addr}`,
              type: 'formula',
              content: `=${cell.f}`,
              metadata: { sheetName: name, cell: addr, value: this.normValue(cell.v) },
              preview,
            });
            count++;
          } else if (cell.v !== undefined && cell.v !== null && String(cell.v) !== '') {
            nodes.push({
              key: `cell::${name}::${addr}`,
              type: 'cell',
              content: `${addr}=${this.normValue(cell.v)}`,
              metadata: { sheetName: name, cell: addr, value: this.normValue(cell.v) },
              preview,
            });
            count++;
          }
        }
      }
      if (count >= MAX_CELLS_PER_SHEET) {
        this.logger.warn(
          `Sheet "${name}" exceeded ${MAX_CELLS_PER_SHEET} cell nodes — remaining cells not individually tracked.`,
        );
      }
    });

    return nodes;
  }

  private normValue(value: any): string {
    if (value === undefined || value === null) return '';
    if (value instanceof Date) return value.toISOString();
    return String(value);
  }

  // ── Lifecycle ───────────────────────────────────────────────────────────────

  /** PHASE 2 (import) + PHASE 3 (render). Rebuilds the ledger from the buffer. */
  async recordImport(projectId: string, buffer: Buffer): Promise<{ imported: number }> {
    const raw = this.extractWorkbookNodes(buffer);
    await this.ledger.resetDocument(projectId);
    if (!raw.length) return { imported: 0 };
    const created = await this.ledger.recordImport(
      raw.map((n) => ({
        module: 'excel',
        sourceDocumentId: projectId,
        sourceType: 'workbook',
        sectionId: n.key,
        type: n.type,
        content: n.content,
        metadata: n.metadata,
      })),
    );
    // PHASE 3 — preview cells render to 'preview'; everything else is preserved
    // in the workbook model (not lost just because it isn't on screen).
    const destinationByNodeId: Record<string, string> = {};
    created.forEach((node, i) => {
      destinationByNodeId[node.id] = raw[i].preview ? 'preview' : 'workbook_model';
    });
    await this.ledger.recordRender(projectId, {
      renderer: 'excel-studio',
      template: 'workbook',
      destinationByNodeId,
    });
    return { imported: created.length };
  }

  /** PHASE 4 — mark all rendered nodes exported. */
  async recordExport(projectId: string): Promise<number> {
    return this.ledger.recordExport(projectId);
  }

  /**
   * PHASE 5 + PHASE 6 — reopen the exported XLSX, compare against the ledger,
   * and reconcile against the applied operation log so intentional edits are
   * recognized as expected mutations rather than data loss.
   */
  async recordReopen(
    projectId: string,
    exportedBuffer: Buffer,
    operations: ExcelWorkbookOperationInput[],
  ) {
    const reNodes = this.extractWorkbookNodes(exportedBuffer);
    const reByKey = new Map(reNodes.map((n) => [n.key, n]));
    const reContentByScope = new Map<string, Set<string>>();
    for (const n of reNodes) {
      const scope = `${n.type}::${n.metadata?.sheetName || ''}`;
      if (!reContentByScope.has(scope)) reContentByScope.set(scope, new Set());
      const h = this.ledger.hash(n.content);
      if (h) reContentByScope.get(scope)!.add(h);
    }

    // Operation analysis → expected mutations / removals / sheet renames.
    const renameMap = new Map<string, string>();
    const expectedCellChanges = new Set<string>(); // `${sheet}::${addr}`
    const deletedSheets = new Set<string>();
    const structurallyEditedSheets = new Set<string>(); // insert/delete row/column
    let sheetSetChanged = false; // rename/create/delete/move sheet → workbook metadata changes
    const remap = (s?: string) => (s && renameMap.has(s) ? renameMap.get(s)! : s || '');
    for (const op of operations) {
      if (['renameSheet', 'createSheet', 'deleteSheet', 'moveSheet'].includes(op.type))
        sheetSetChanged = true;
      const sheet = op.sheetName || (op.target as any)?.sheetName || (op.payload as any)?.sheetName;
      if (op.type === 'renameSheet') {
        const to = String((op.payload as any)?.name || (op.payload as any)?.newName || '');
        if (sheet && to) renameMap.set(sheet, to);
      } else if (op.type === 'deleteSheet' && sheet) {
        deletedSheets.add(sheet);
      } else if (
        (op.type === 'deleteRow' ||
          op.type === 'deleteColumn' ||
          op.type === 'insertRow' ||
          op.type === 'insertColumn') &&
        sheet
      ) {
        structurallyEditedSheets.add(remap(sheet));
      } else if (op.type === 'setCellValue' || op.type === 'setFormula') {
        const addr = String(
          (op.target as any)?.address || (op.target as any)?.cell || '',
        ).toUpperCase();
        if (sheet && addr) expectedCellChanges.add(`${remap(sheet)}::${addr}`);
      }
    }

    const imported = (await this.ledger.getNodes(projectId)).filter((n) => n.exported);
    const updates: ReopenResultUpdate[] = [];
    for (const node of imported) {
      const meta = node.metadata || {};
      // A sheet node's "sheet" is its own name (its content); others carry sheetName.
      const origSheet =
        node.type === 'sheet' ? String(node.content || '') : String(meta.sheetName || '');
      const wasRenamed = renameMap.has(origSheet);
      let sheet = origSheet;
      let key = node.sectionId as string;
      if (sheet && renameMap.has(sheet)) {
        const ns = renameMap.get(sheet)!;
        key = node.type === 'sheet' ? `sheet::${ns}` : key.split(`::${sheet}::`).join(`::${ns}::`);
        sheet = ns;
      }
      const nodeHash = node.contentHash as string | null;
      const re = reByKey.get(key);

      if (re) {
        const reHash = this.ledger.hash(re.content);
        if (reHash === nodeHash) {
          updates.push({ id: node.id, reopened: true, mutated: false, lossReason: null });
        } else {
          const addr = meta.cell;
          let expected = false;
          if (node.type === 'cell' || node.type === 'formula') {
            expected = !!addr && expectedCellChanges.has(`${sheet}::${String(addr).toUpperCase()}`);
          } else if (node.type === 'sheet') {
            expected = wasRenamed;
          } else if (node.type === 'workbookMetadata') {
            expected = sheetSetChanged;
          }
          updates.push({
            id: node.id,
            reopened: true,
            mutated: true,
            lossReason: expected
              ? 'expected_mutation'
              : node.type === 'formula'
                ? 'formula_changed'
                : 'cell_value_changed',
          });
        }
        continue;
      }

      // Not found by location — shift-tolerant fallback: same content still
      // present elsewhere in the same sheet/type (e.g. a row insert moved it).
      const scope = `${node.type}::${sheet}`;
      if (nodeHash && reContentByScope.get(scope)?.has(nodeHash)) {
        updates.push({ id: node.id, reopened: true, mutated: false, lossReason: null });
        continue;
      }

      // Genuinely absent — was the removal intentional?
      const addr = meta.cell;
      const expectedRemoval =
        deletedSheets.has(sheet) ||
        structurallyEditedSheets.has(sheet) ||
        (addr && expectedCellChanges.has(`${sheet}::${String(addr).toUpperCase()}`));
      updates.push({
        id: node.id,
        reopened: false,
        mutated: !!expectedRemoval,
        lossReason: expectedRemoval ? 'expected_removal' : this.lossReasonFor(node.type),
      });
    }

    return this.ledger.applyReopenResults(updates);
  }

  private lossReasonFor(type: string): string {
    switch (type) {
      case 'formula':
        return 'formula_lost';
      case 'sheet':
        return 'sheet_missing';
      case 'mergedCell':
        return 'merged_range_missing';
      case 'namedRange':
        return 'named_range_missing';
      case 'rowMetadata':
        return 'row_metadata_missing';
      case 'columnMetadata':
        return 'column_metadata_missing';
      case 'cell':
        return 'cell_value_changed';
      case 'workbookMetadata':
        return 'workbook_metadata_changed';
      default:
        return 'node_lost';
    }
  }
}
