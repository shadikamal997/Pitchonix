'use client';

import React, { useMemo } from 'react';
import type { SlideElementDTO, TableContent, TableCell, ElementStyle } from '@/types/slide-element';

// =============================================================================
//  TableRenderer
//
//  Pure HTML <table> renderer. Native colspan/rowspan/alignment, paginates
//  cleanly into PDF/PPTX exports, easy to screenshot. Renderer is read-only;
//  the TablePanel handles editing.
//
//  Cell shape (mirrors element-types.ts):
//    {
//      text, align?, bold?, fill?, color?, colspan?, rowspan?
//    }
//
//  Table-wide shape:
//    {
//      headers:  TableCell[]
//      rows:     TableCell[][]
//      borders?: { color, width, style }
//      zebra?:   boolean
//    }
// =============================================================================

interface Props {
  el: SlideElementDTO;
  pageNumber?: number;
  total?: number;
}

export const TableRenderer: React.FC<Props> = ({ el }) => {
  const content = useMemo(() => normalise(el.content), [el.content]);
  const elStyle = (el.style || {}) as ElementStyle;

  const borderColor = content.borders?.color || '#e5e7eb';
  const borderWidth = content.borders?.width ?? 1;
  const borderStyle = content.borders?.style ?? 'solid';
  const borderRule  = borderStyle === 'none' ? 'none' : `${borderWidth}px ${borderStyle} ${borderColor}`;

  const wrapStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    background: elStyle.fill && elStyle.fill !== 'transparent' ? elStyle.fill : undefined,
    color:      elStyle.color || '#111827',
    fontFamily: elStyle.fontFamily,
    fontSize:   typeof elStyle.fontSize === 'number' ? elStyle.fontSize : 12,
    lineHeight: elStyle.lineHeight ?? 1.4,
    borderRadius: elStyle.borderRadius ?? 6,
    padding: 2,
    boxSizing: 'border-box',
  };

  const tableStyle: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    tableLayout: 'fixed',
    border: borderRule,
  };

  const hasHeaders = content.headers.length > 0;
  const cols = Math.max(
    content.headers.length,
    ...content.rows.map((r) => r.length),
    1,
  );

  return (
    <div style={wrapStyle} className="slide-table">
      <table style={tableStyle}>
        <colgroup>
          {Array.from({ length: cols }).map((_, i) => <col key={i} />)}
        </colgroup>

        {hasHeaders && (
          <thead>
            <tr>
              {content.headers.map((cell, i) => (
                <CellNode key={i} cell={cell} header borderRule={borderRule} />
              ))}
            </tr>
          </thead>
        )}

        <tbody>
          {content.rows.map((row, ri) => (
            <tr key={ri} style={{ background: content.zebra && ri % 2 === 1 ? '#f8fafc' : undefined }}>
              {row.map((cell, ci) => (
                <CellNode key={ci} cell={cell} borderRule={borderRule} />
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {content.headers.length === 0 && content.rows.length === 0 && (
        <div style={{ padding: 20, textAlign: 'center', color: '#9ca3af', fontSize: 11 }}>
          No table data
        </div>
      )}
    </div>
  );
};

// =============================================================================
//  Cell — handles header vs body styling + per-cell overrides.
// =============================================================================

const CellNode: React.FC<{
  cell:       TableCell;
  header?:    boolean;
  borderRule: string;
}> = ({ cell, header, borderRule }) => {
  const Tag: 'th' | 'td' = header ? 'th' : 'td';
  const isBold = !!cell.bold || header;
  const style: React.CSSProperties = {
    padding: '6px 8px',
    border: borderRule === 'none' ? 'none' : borderRule,
    textAlign: cell.align ?? (header ? 'left' : 'left'),
    fontWeight: isBold ? 700 : 400,
    background: cell.fill ?? (header ? '#f1f5f9' : undefined),
    color: cell.color,
    verticalAlign: 'middle',
    wordBreak: 'break-word',
  };
  return (
    <Tag
      style={style}
      colSpan={cell.colspan && cell.colspan > 1 ? cell.colspan : undefined}
      rowSpan={cell.rowspan && cell.rowspan > 1 ? cell.rowspan : undefined}
    >
      {cell.text || (header ? '' : <span>&nbsp;</span>)}
    </Tag>
  );
};

// =============================================================================
//  Normalisation — backstop for elements still carrying loose shapes.
// =============================================================================

function normalise(raw: any): TableContent {
  const c = (raw || {}) as Partial<TableContent>;
  return {
    headers: Array.isArray(c.headers) ? c.headers.map(normaliseCell) : [],
    rows:    Array.isArray(c.rows)
              ? c.rows.map((r) => (Array.isArray(r) ? r.map(normaliseCell) : []))
              : [],
    borders: c.borders,
    zebra:   !!c.zebra,
  };
}

function normaliseCell(raw: any): TableCell {
  if (raw == null) return { text: '' };
  if (typeof raw === 'string') return { text: raw };
  return {
    text:    typeof raw.text === 'string' ? raw.text : '',
    align:   raw.align,
    bold:    !!raw.bold,
    fill:    raw.fill,
    color:   raw.color,
    colspan: raw.colspan,
    rowspan: raw.rowspan,
  };
}
