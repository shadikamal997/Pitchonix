import { asArray, extractText } from './ooxml-parser';

// =============================================================================
//  Phase 38.1E — Table importer.
//
//  Walks a `<a:tbl>` (graphicFrame > graphic > graphicData > a:tbl) and reduces
//  it into the TableContent shape the advanced table editor expects:
//
//    {
//      headers: TableCell[],            // first row when <a:firstRow val="1"/>
//      rows:    TableCell[][],          // body rows
//      borders: boolean,
//      zebra:   boolean,
//    }
//
//  Cell shape:  { text, bold?, fill?, color?, align?, colspan?, rowspan? }
//
//  Merged cells are detected via gridSpan + rowSpan + vMerge/hMerge attributes
//  on <a:tc>; child cells (vMerge/hMerge with no original) are emitted as
//  empty placeholders so the editor's grid math stays correct.
// =============================================================================

export interface ImportedCell {
  text: string;
  bold?: boolean;
  fill?: string;
  color?: string;
  align?: 'left' | 'center' | 'right';
  colspan?: number;
  rowspan?: number;
}

export interface ImportedTable {
  headers: ImportedCell[];
  rows:    ImportedCell[][];
  borders: boolean;
  zebra:   boolean;
}

export function importTable(tblNode: any): ImportedTable | null {
  if (!tblNode) return null;
  const tblPr = tblNode['a:tblPr'] || {};
  const hasFirstRow = tblPr['@firstRow'] === '1' || tblPr['@firstRow'] === 'true';
  const zebra       = tblPr['@bandRow']  === '1' || tblPr['@bandRow']  === 'true';

  const trs = asArray(tblNode['a:tr']);
  if (trs.length === 0) return null;

  const rowsOut: ImportedCell[][] = trs.map((tr: any) => {
    const tcs = asArray(tr['a:tc']);
    return tcs.map(buildCell);
  });

  // Filter rows that are entirely empty (often happens with vMerge children).
  const nonEmpty = rowsOut.filter((r) => r.some((c) => c.text.trim().length > 0 || (c.fill && c.fill.length > 0)));
  const usable = nonEmpty.length > 0 ? rowsOut : rowsOut;   // keep all even if blank

  let headers: ImportedCell[] = [];
  let rows = usable;
  if (hasFirstRow && rows.length > 0) {
    headers = rows[0].map((c) => ({ ...c, bold: c.bold ?? true }));
    rows = rows.slice(1);
  }

  return { headers, rows, borders: true, zebra };
}

function buildCell(tc: any): ImportedCell {
  const text = extractText(tc['a:txBody']);
  const tcPr = tc['a:tcPr'] || {};
  const fill = tcPr['a:solidFill']?.['a:srgbClr']?.['@val'];
  const colspan = tc['@gridSpan'] ? Number(tc['@gridSpan']) : undefined;
  const rowspan = tc['@rowSpan']  ? Number(tc['@rowSpan'])  : undefined;
  // <a:tc hMerge="1"/> and vMerge children resolve to empty cells.
  const cell: ImportedCell = {
    text:    tc['@hMerge'] === '1' || tc['@vMerge'] === '1' ? '' : text,
    fill:    fill ? `#${String(fill).toUpperCase()}` : undefined,
    colspan: colspan && colspan > 1 ? colspan : undefined,
    rowspan: rowspan && rowspan > 1 ? rowspan : undefined,
  };

  // Pull text run formatting from the first run if present.
  const firstRunPr = tc['a:txBody']?.['a:p']?.[0]?.['a:r']?.[0]?.['a:rPr']
                  ?? tc['a:txBody']?.['a:p']?.['a:r']?.['a:rPr'];
  if (firstRunPr) {
    if (firstRunPr['@b'] === '1') cell.bold = true;
    const color = firstRunPr['a:solidFill']?.['a:srgbClr']?.['@val'];
    if (color) cell.color = `#${String(color).toUpperCase()}`;
  }
  const align = tc['a:txBody']?.['a:p']?.[0]?.['a:pPr']?.['@algn']
             ?? tc['a:txBody']?.['a:p']?.['a:pPr']?.['@algn'];
  if (align === 'ctr')  cell.align = 'center';
  else if (align === 'r') cell.align = 'right';
  else if (align === 'l') cell.align = 'left';

  return cell;
}
