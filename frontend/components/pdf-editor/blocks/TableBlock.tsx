'use client';

import React from 'react';
import { Table as TableIcon } from 'lucide-react';

export interface TableCell {
  value: string;
  isHeader?: boolean;
  align?: 'left' | 'center' | 'right';
}

export interface TableRow {
  cells: TableCell[];
}

export interface TableBlockProps {
  title?: string;
  rows?: TableRow[];
  striped?: boolean;
  bordered?: boolean;
  compact?: boolean;
  highlightFirstColumn?: boolean;
  onChange?: (rows: TableRow[]) => void;
}

const defaultRows: TableRow[] = [
  {
    cells: [
      { value: 'Product', isHeader: true, align: 'left' },
      { value: 'Q1', isHeader: true, align: 'center' },
      { value: 'Q2', isHeader: true, align: 'center' },
      { value: 'Q3', isHeader: true, align: 'center' },
      { value: 'Q4', isHeader: true, align: 'center' },
      { value: 'Total', isHeader: true, align: 'right' },
    ],
  },
  {
    cells: [
      { value: 'Product A', align: 'left' },
      { value: '$45,000', align: 'center' },
      { value: '$52,000', align: 'center' },
      { value: '$61,000', align: 'center' },
      { value: '$71,000', align: 'center' },
      { value: '$229,000', align: 'right' },
    ],
  },
  {
    cells: [
      { value: 'Product B', align: 'left' },
      { value: '$38,000', align: 'center' },
      { value: '$41,000', align: 'center' },
      { value: '$45,000', align: 'center' },
      { value: '$52,000', align: 'center' },
      { value: '$176,000', align: 'right' },
    ],
  },
  {
    cells: [
      { value: 'Product C', align: 'left' },
      { value: '$29,000', align: 'center' },
      { value: '$33,000', align: 'center' },
      { value: '$38,000', align: 'center' },
      { value: '$44,000', align: 'center' },
      { value: '$144,000', align: 'right' },
    ],
  },
  {
    cells: [
      { value: 'Total Revenue', isHeader: true, align: 'left' },
      { value: '$112,000', isHeader: true, align: 'center' },
      { value: '$126,000', isHeader: true, align: 'center' },
      { value: '$144,000', isHeader: true, align: 'center' },
      { value: '$167,000', isHeader: true, align: 'center' },
      { value: '$549,000', isHeader: true, align: 'right' },
    ],
  },
];

export function TableBlock({
  title = 'Financial Summary',
  rows = defaultRows,
  striped = true,
  bordered = true,
  compact = false,
  highlightFirstColumn = false,
  onChange,
}: TableBlockProps) {
  const isHeaderRow = (row: TableRow) => {
    return row.cells.every((cell) => cell.isHeader);
  };

  const isLastRow = (index: number) => {
    return index === rows.length - 1 && rows[index].cells.some((cell) => cell.isHeader);
  };

  return (
    <div className="w-full py-8">
      {/* Title */}
      {title && (
        <div className="flex items-center gap-2 mb-6">
          <TableIcon className="h-6 w-6 text-slate-700" />
          <h3 className="text-2xl font-bold text-slate-900">{title}</h3>
        </div>
      )}

      {/* Table */}
      <div className={`overflow-hidden rounded-2xl ${bordered ? 'border-2 border-slate-200 shadow-lg' : ''}`}>
        <table className="w-full">
          <tbody>
            {rows.map((row, rowIndex) => {
              const isFirstRow = rowIndex === 0;
              const isTotalRow = isLastRow(rowIndex);
              const isDataRow = !isFirstRow && !isTotalRow;

              return (
                <tr
                  key={rowIndex}
                  className={`
                    ${isFirstRow ? 'bg-slate-900' : ''}
                    ${isTotalRow ? 'bg-green-600' : ''}
                    ${isDataRow && striped && rowIndex % 2 === 0 ? 'bg-slate-50' : ''}
                    ${isDataRow && (!striped || rowIndex % 2 !== 0) ? 'bg-white' : ''}
                    ${bordered && !isTotalRow ? 'border-b border-slate-200' : ''}
                  `}
                >
                  {row.cells.map((cell, cellIndex) => {
                    const isFirstColumn = cellIndex === 0;
                    const Tag = cell.isHeader ? 'th' : 'td';

                    return (
                      <Tag
                        key={cellIndex}
                        className={`
                          ${compact ? 'py-3 px-4' : 'py-4 px-6'}
                          ${cell.align === 'center' ? 'text-center' : ''}
                          ${cell.align === 'right' ? 'text-right' : ''}
                          ${cell.align === 'left' || !cell.align ? 'text-left' : ''}
                          ${isFirstRow && isFirstColumn ? 'text-white font-bold text-sm' : ''}
                          ${isFirstRow && !isFirstColumn ? 'text-white font-bold text-sm' : ''}
                          ${isTotalRow ? 'text-white font-bold' : ''}
                          ${isDataRow && isFirstColumn ? 'font-semibold text-slate-700' : ''}
                          ${isDataRow && !isFirstColumn ? 'text-slate-600' : ''}
                          ${highlightFirstColumn && isFirstColumn && !isFirstRow ? 'bg-slate-100 font-semibold' : ''}
                        `}
                      >
                        {cell.value}
                      </Tag>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default TableBlock;
