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
  const hasFooter  = !!content.footer && content.footer.length > 0;
  const cols = Math.max(
    content.headers.length,
    content.footer?.length ?? 0,
    ...content.rows.map((r) => r.length),
    1,
  );

  // Phase 32K — theme-aware band colours.
  // When `themed` is true, the header background uses `style.fill` (or a
  // safe slate fallback) and the text is auto-contrasted; the footer mirrors
  // the band at lower opacity.
  const themeBand = content.themed
    ? (elStyle.fill && elStyle.fill !== 'transparent' ? elStyle.fill : '#0f172a')
    : null;
  const themeText = themeBand ? contrastTextOn(themeBand) : undefined;

  return (
    <div style={wrapStyle} className="slide-table">
      <table style={tableStyle}>
        <colgroup>
          {Array.from({ length: cols }).map((_, i) => {
            const w = content.colWidths?.[i];
            return <col key={i} style={{ width: w !== undefined ? (typeof w === 'number' ? `${w}px` : w) : undefined }} />;
          })}
        </colgroup>

        {hasHeaders && (
          <thead>
            <tr>
              {content.headers.map((cell, i) => (
                <CellNode key={i} cell={cell} header borderRule={borderRule}
                          themeBand={themeBand} themeText={themeText} />
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

        {hasFooter && (
          <tfoot>
            <tr>
              {content.footer!.map((cell, i) => (
                <CellNode key={i} cell={cell} footer borderRule={borderRule}
                          themeBand={themeBand} themeText={themeText} />
              ))}
            </tr>
          </tfoot>
        )}
      </table>

      {content.headers.length === 0 && content.rows.length === 0 && !hasFooter && (
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
  footer?:    boolean;
  borderRule: string;
  themeBand?: string | null;
  themeText?: string;
}> = ({ cell, header, footer, borderRule, themeBand, themeText }) => {
  const Tag: 'th' | 'td' = header ? 'th' : 'td';
  const isBold = !!cell.bold || header || footer;
  // Phase 32K — themed band overrides the per-cell defaults but yields to an
  // explicit `cell.fill`.
  const bandBg = cell.fill ?? (
    themeBand
      ? (footer ? `color-mix(in srgb, ${themeBand} 18%, transparent)` : themeBand)
      : (header ? '#f1f5f9'
      : footer ? '#f8fafc'
      : undefined)
  );
  const bandColor = cell.color ?? (themeBand ? (footer ? undefined : themeText) : undefined);
  const style: React.CSSProperties = {
    padding: '6px 8px',
    border: borderRule === 'none' ? 'none' : borderRule,
    textAlign: cell.align ?? 'left',
    fontWeight: isBold ? 700 : 400,
    background: bandBg,
    color: bandColor,
    verticalAlign: 'middle',
    wordBreak: 'break-word',
    borderTop: footer ? `2px solid ${themeBand || '#cbd5e1'}` : undefined,
  };
  return (
    <Tag
      style={style}
      colSpan={cell.colspan && cell.colspan > 1 ? cell.colspan : undefined}
      rowSpan={cell.rowspan && cell.rowspan > 1 ? cell.rowspan : undefined}
    >
      {cell.text || (header || footer ? '' : <span>&nbsp;</span>)}
    </Tag>
  );
};

// =============================================================================
//  contrastTextOn — pick white or near-black based on a hex/HSL band colour.
//  Used to keep theme-banded headers legible without manual text colour edits.
// =============================================================================

function contrastTextOn(color: string): string {
  // Try to parse a #RRGGBB or #RGB hex; fall back to white.
  const hex = color.trim();
  let r = 0, g = 0, b = 0;
  if (/^#([0-9a-fA-F]{6})$/.test(hex)) {
    r = parseInt(hex.slice(1, 3), 16);
    g = parseInt(hex.slice(3, 5), 16);
    b = parseInt(hex.slice(5, 7), 16);
  } else if (/^#([0-9a-fA-F]{3})$/.test(hex)) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else {
    return '#ffffff';
  }
  // YIQ luminance approximation
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 145 ? '#0f172a' : '#ffffff';
}

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
    footer:  Array.isArray(c.footer) ? c.footer.map(normaliseCell) : undefined,
    themed:  !!c.themed,
    colWidths: Array.isArray(c.colWidths) ? c.colWidths.slice() : undefined,
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
