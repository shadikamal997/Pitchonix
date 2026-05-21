'use client';

import React, { useMemo, useState } from 'react';
import {
  Plus, X, ChevronLeft, ChevronRight, ChevronUp, ChevronDown,
  AlignLeft, AlignCenter, AlignRight, Bold,
} from 'lucide-react';
import type { SlideElementDTO, TableContent, TableCell } from '@/types/slide-element';
import {
  PanelSection, Row, TextField, NumberField, ColorField, SelectField, SegmentedControl, Toggle,
} from '../Primitives';

// =============================================================================
//  TablePanel
//
//  Cell-by-cell table editor:
//    1. Table-wide controls (borders / zebra / header toggle)
//    2. Row / column add / remove / reorder
//    3. Compact cell grid: every cell is a clickable chip; clicking selects it,
//       opening a per-cell sub-editor below the grid (text, align, bold, fill,
//       text color, colspan, rowspan).
//
//  Mutations keep `headers[]` and `rows[][]` widths consistent — adding a
//  column appends an empty cell to every existing row and the header row.
// =============================================================================

interface Props {
  element: SlideElementDTO;
  onPatch: (patch: Partial<SlideElementDTO>) => void;
}

export const TablePanel: React.FC<Props> = ({ element, onPatch }) => {
  const c = useMemo<TableContent>(() => normalise(element.content), [element.content]);
  const hasHeaders = c.headers.length > 0;
  const cols = Math.max(c.headers.length, ...c.rows.map((r) => r.length), 1);
  const [selected, setSelected] = useState<{ row: number; col: number } | null>(null);

  const set = (patch: Partial<TableContent>) => onPatch({ content: { ...c, ...patch } });

  // ── Row / col operations ──────────────────────────────────────────────────
  const addRow = (atIdx = c.rows.length) => {
    const blank: TableCell[] = Array.from({ length: cols }, () => ({ text: '' }));
    const next = [...c.rows];
    next.splice(atIdx, 0, blank);
    set({ rows: next });
  };
  const removeRow = (i: number) => {
    if (c.rows.length <= 0) return;
    set({ rows: c.rows.filter((_, j) => j !== i) });
    if (selected && selected.row === i + 1) setSelected(null);   // +1 because row 0 = header
  };
  const moveRow = (i: number, dir: -1 | 1) => {
    const j = i + dir; if (j < 0 || j >= c.rows.length) return;
    const next = [...c.rows]; [next[i], next[j]] = [next[j], next[i]];
    set({ rows: next });
  };

  const addColumn = (atIdx = cols) => {
    const blank = (): TableCell => ({ text: '' });
    const headers = hasHeaders ? [...c.headers] : [];
    if (hasHeaders) headers.splice(atIdx, 0, blank());
    const rows = c.rows.map((r) => {
      const nr = [...r];
      nr.splice(atIdx, 0, blank());
      return nr;
    });
    set({ headers, rows });
  };
  const removeColumn = (i: number) => {
    if (cols <= 1) return;
    set({
      headers: hasHeaders ? c.headers.filter((_, j) => j !== i) : c.headers,
      rows:    c.rows.map((r) => r.filter((_, j) => j !== i)),
    });
    if (selected && selected.col === i) setSelected(null);
  };

  const toggleHeaders = (on: boolean) => {
    if (on && c.headers.length === 0) {
      const blank: TableCell[] = Array.from({ length: cols }, (_, i) => ({ text: `Col ${i + 1}`, bold: true }));
      set({ headers: blank });
    } else if (!on) {
      set({ headers: [] });
    }
  };

  // ── Cell read / write ─────────────────────────────────────────────────────
  // row = 0 → header row; row > 0 → c.rows[row - 1]
  const readCell = (row: number, col: number): TableCell => {
    if (row === 0 && hasHeaders) return c.headers[col] || { text: '' };
    const r = c.rows[row - 1]; return r ? (r[col] || { text: '' }) : { text: '' };
  };
  const writeCell = (row: number, col: number, patch: Partial<TableCell>) => {
    if (row === 0 && hasHeaders) {
      const headers = [...c.headers];
      headers[col] = { ...(headers[col] || { text: '' }), ...patch };
      set({ headers });
    } else {
      const rows = c.rows.map((r) => [...r]);
      while (rows.length < row) rows.push(Array.from({ length: cols }, () => ({ text: '' })));
      const r = rows[row - 1] || (rows[row - 1] = Array.from({ length: cols }, () => ({ text: '' })));
      r[col] = { ...(r[col] || { text: '' }), ...patch };
      set({ rows });
    }
  };

  const isHeaderRow = selected?.row === 0 && hasHeaders;
  const selectedCell = selected ? readCell(selected.row, selected.col) : null;
  const totalRows = (hasHeaders ? 1 : 0) + c.rows.length;

  return (
    <>
      <PanelSection title="Table">
        <Toggle value={hasHeaders} onChange={toggleHeaders} label="Header row" />
        <Toggle
          value={!!c.footer && c.footer.length > 0}
          onChange={(on) => {
            if (on) {
              const footer: TableCell[] = Array.from({ length: cols }, () => ({ text: '', bold: true }));
              set({ footer });
            } else {
              set({ footer: undefined });
            }
          }}
          label="Footer row (totals)"
        />
        <Toggle value={!!c.zebra}  onChange={(v) => set({ zebra: v })}  label="Zebra stripes" />
        <Toggle value={!!c.themed} onChange={(v) => set({ themed: v })} label="Theme-aware header" />
      </PanelSection>

      <PanelSection title="Borders">
        <Row label="Style">
          <SelectField
            value={c.borders?.style || 'solid'}
            onChange={(v) => set({ borders: { ...(c.borders || {}), style: v as any } })}
            options={[
              { value: 'solid',  label: 'Solid' },
              { value: 'dashed', label: 'Dashed' },
              { value: 'none',   label: 'None' },
            ]}
          />
        </Row>
        <Row label="Color">
          <ColorField value={c.borders?.color ?? '#e5e7eb'}
                      onChange={(v) => set({ borders: { ...(c.borders || {}), color: v } })} />
        </Row>
        <Row label="Width">
          <NumberField value={c.borders?.width ?? 1} min={0} max={8} step={0.5} suffix="px"
                       onChange={(v) => set({ borders: { ...(c.borders || {}), width: v } })} />
        </Row>
      </PanelSection>

      <PanelSection title={`Grid (${totalRows}×${cols})`}>
        <div className="bg-slate-50 border border-slate-200 rounded overflow-x-auto -mx-1.5 px-1.5 py-1.5">
          <div className="inline-grid gap-0.5" style={{ gridTemplateColumns: `repeat(${cols}, minmax(60px, 1fr))` }}>
            {/* Header row */}
            {hasHeaders && c.headers.map((cell, ci) => {
              const isSel = selected?.row === 0 && selected.col === ci;
              return (
                <CellChip
                  key={`h-${ci}`}
                  cell={cell}
                  header
                  selected={isSel}
                  onSelect={() => setSelected({ row: 0, col: ci })}
                />
              );
            })}
            {/* Body rows */}
            {c.rows.map((r, ri) =>
              r.map((cell, ci) => {
                const rowIdx = ri + 1;
                const isSel = selected?.row === rowIdx && selected.col === ci;
                return (
                  <CellChip
                    key={`${ri}-${ci}`}
                    cell={cell}
                    selected={isSel}
                    onSelect={() => setSelected({ row: rowIdx, col: ci })}
                  />
                );
              })
            )}
          </div>
        </div>

        <div className="flex gap-1.5 mt-2">
          <button onClick={() => addRow()}
                  className="flex-1 h-7 flex items-center justify-center gap-1 text-[11px] font-semibold text-green-700 bg-green-50 hover:bg-green-100 rounded">
            <Plus className="w-3 h-3" /> Row
          </button>
          <button onClick={() => addColumn()}
                  className="flex-1 h-7 flex items-center justify-center gap-1 text-[11px] font-semibold text-green-700 bg-green-50 hover:bg-green-100 rounded">
            <Plus className="w-3 h-3" /> Column
          </button>
        </div>
      </PanelSection>

      {/* Per-cell editor */}
      {selected && selectedCell && (
        <PanelSection title={`Cell ${selected.row + 1} · ${selected.col + 1}${isHeaderRow ? ' (header)' : ''}`}>
          <textarea
            value={selectedCell.text}
            onChange={(e) => writeCell(selected.row, selected.col, { text: e.target.value })}
            placeholder="Cell text"
            className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-xs text-slate-800 outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/30 resize-y leading-relaxed"
            rows={2}
          />
          <Row label="Align">
            <SegmentedControl
              value={selectedCell.align ?? 'left'}
              onChange={(v) => writeCell(selected.row, selected.col, { align: v as any })}
              options={[
                { value: 'left',   icon: <AlignLeft className="w-3.5 h-3.5" /> },
                { value: 'center', icon: <AlignCenter className="w-3.5 h-3.5" /> },
                { value: 'right',  icon: <AlignRight className="w-3.5 h-3.5" /> },
              ]}
            />
            <button
              type="button"
              onClick={() => writeCell(selected.row, selected.col, { bold: !selectedCell.bold })}
              title="Toggle bold"
              className={`w-7 h-6 rounded text-xs font-bold ${selectedCell.bold ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-500'}`}
            >
              <Bold className="w-3.5 h-3.5 inline" />
            </button>
          </Row>
          <Row label="Fill">
            <ColorField value={selectedCell.fill ?? ''}
                        onChange={(v) => writeCell(selected.row, selected.col, { fill: v || undefined })}
                        allowTransparent />
          </Row>
          <Row label="Text">
            <ColorField value={selectedCell.color ?? ''}
                        onChange={(v) => writeCell(selected.row, selected.col, { color: v || undefined })} />
          </Row>
          <Row label="Span">
            <NumberField value={selectedCell.colspan ?? 1} min={1} max={cols}
                         onChange={(v) => writeCell(selected.row, selected.col, { colspan: Math.max(1, Math.round(v)) })} />
            <span className="text-[10px] text-slate-400">×</span>
            <NumberField value={selectedCell.rowspan ?? 1} min={1} max={Math.max(1, c.rows.length)}
                         onChange={(v) => writeCell(selected.row, selected.col, { rowspan: Math.max(1, Math.round(v)) })} />
          </Row>

          {/* Row / column action bar for the selected cell's row & column */}
          <div className="grid grid-cols-2 gap-1.5 pt-1.5 border-t border-slate-100">
            {/* Row actions */}
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Row</p>
              <div className="flex gap-1">
                {selected.row > 0 && (
                  <ActionBtn onClick={() => moveRow(selected.row - 1, -1)} disabled={selected.row <= 1} title="Move up">
                    <ChevronUp className="w-3 h-3" />
                  </ActionBtn>
                )}
                {selected.row > 0 && (
                  <ActionBtn onClick={() => moveRow(selected.row - 1, +1)} disabled={selected.row >= c.rows.length} title="Move down">
                    <ChevronDown className="w-3 h-3" />
                  </ActionBtn>
                )}
                <ActionBtn onClick={() => addRow((selected.row || 0) + (hasHeaders ? 0 : 1))} title="Insert below">
                  <Plus className="w-3 h-3" />
                </ActionBtn>
                {selected.row > 0 && (
                  <ActionBtn onClick={() => removeRow(selected.row - 1)} title="Remove row" danger>
                    <X className="w-3 h-3" />
                  </ActionBtn>
                )}
              </div>
            </div>
            {/* Column actions */}
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Column</p>
              <div className="flex gap-1">
                <ActionBtn onClick={() => addColumn(selected.col + 1)} title="Insert column right">
                  <Plus className="w-3 h-3" />
                </ActionBtn>
                <ActionBtn onClick={() => removeColumn(selected.col)} disabled={cols <= 1} title="Remove column" danger>
                  <X className="w-3 h-3" />
                </ActionBtn>
              </div>
            </div>
          </div>

          <button onClick={() => setSelected(null)}
                  className="w-full mt-2 h-6 text-[10px] font-semibold text-slate-500 hover:text-slate-900">
            Deselect cell
          </button>
        </PanelSection>
      )}
    </>
  );
};

// =============================================================================
//  Cell chip (compact grid)
// =============================================================================

const CellChip: React.FC<{
  cell:     TableCell;
  header?:  boolean;
  selected: boolean;
  onSelect: () => void;
}> = ({ cell, header, selected, onSelect }) => {
  const txt = cell.text || (header ? '—' : '·');
  return (
    <button
      type="button"
      onClick={onSelect}
      title={cell.text || '(empty)'}
      className={`text-[10px] px-1.5 py-1 rounded text-left truncate transition-colors ${
        selected
          ? 'bg-green-600 text-white shadow-sm'
          : header
          ? 'bg-white border border-slate-300 text-slate-700 font-semibold hover:bg-green-50'
          : 'bg-white border border-slate-200 text-slate-600 hover:bg-green-50'
      }`}
      style={{
        background: !selected && cell.fill ? cell.fill : undefined,
        color: !selected && cell.color ? cell.color : undefined,
        fontWeight: !selected && cell.bold ? 700 : undefined,
        textAlign: cell.align,
      }}
    >
      {txt.length > 12 ? txt.slice(0, 11) + '…' : txt}
    </button>
  );
};

const ActionBtn: React.FC<{ children: React.ReactNode; onClick: () => void; disabled?: boolean; title?: string; danger?: boolean }> = ({ children, onClick, disabled, title, danger }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={`w-6 h-6 flex items-center justify-center rounded text-xs ${
      danger
        ? 'bg-red-50 hover:bg-red-100 text-red-700'
        : 'bg-slate-100 hover:bg-green-100 text-slate-700 hover:text-green-800'
    } disabled:opacity-30 disabled:cursor-not-allowed`}
  >
    {children}
  </button>
);

// =============================================================================
//  Normalisation
// =============================================================================

function normalise(raw: any): TableContent {
  const c = (raw || {}) as Partial<TableContent>;
  return {
    headers: Array.isArray(c.headers) ? c.headers.map(normaliseCell) : [],
    rows:    Array.isArray(c.rows)
              ? c.rows.map((r) => Array.isArray(r) ? r.map(normaliseCell) : [])
              : [],
    borders: c.borders,
    zebra:   !!c.zebra,
  };
}
function normaliseCell(raw: any): TableCell {
  if (raw == null) return { text: '' };
  if (typeof raw === 'string') return { text: raw };
  return {
    text: typeof raw.text === 'string' ? raw.text : '',
    align: raw.align, bold: !!raw.bold, fill: raw.fill, color: raw.color,
    colspan: raw.colspan, rowspan: raw.rowspan,
  };
}
