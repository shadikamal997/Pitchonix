import * as XLSX from 'xlsx';
import { UniversalDocument, emptyDocument, newPage, heading, paragraph, table, DocumentNode } from '../document-model';

// =============================================================================
//  Phase 41E — Excel + CSV importer.
//
//  One page per worksheet. Each worksheet's used range becomes a `table` node;
//  rows are read in array-of-arrays form. The first row is treated as headers
//  by default (PowerPoint / Word both behave this way too).
//
//  We don't parse formulas — `XLSX.utils.sheet_to_json` returns evaluated
//  values, which is what almost every downstream renderer wants.
//
//  CSV is treated as a one-sheet XLSX (SheetJS handles both transparently).
// =============================================================================

export function importXlsx(buffer: Buffer, filename = 'workbook.xlsx'): UniversalDocument {
  const doc = emptyDocument('xlsx', filename.replace(/\.[a-z]+$/i, ''));
  const wb  = XLSX.read(buffer, { type: 'buffer' });

  for (const sheetName of wb.SheetNames) {
    const ws   = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: '', raw: false });
    const page = newPage(sheetName);
    page.nodes.push(heading(1, sheetName));

    if (!rows || rows.length === 0) {
      page.nodes.push(paragraph('(empty sheet)'));
    } else {
      // Trim trailing empty rows.
      while (rows.length > 0 && rows[rows.length - 1].every((c: any) => String(c ?? '').trim() === '')) {
        rows.pop();
      }
      const headerRow = true;
      const rowsOut = rows.map((r) => r.map((c: any) => ({ text: String(c ?? '') })));
      page.nodes.push({ type: 'table', rows: rowsOut, headerRow });
    }

    doc.pages.push(page);
  }
  return doc;
}

export function importCsv(buffer: Buffer, filename = 'data.csv'): UniversalDocument {
  return importXlsx(buffer, filename);
}
