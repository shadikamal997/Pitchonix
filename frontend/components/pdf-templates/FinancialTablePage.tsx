/**
 * PDF Financial Table Page Template
 * Display financial data in structured tables
 */

import React from 'react';
import PDFPage from './PDFPage';

export interface FinancialRow {
  label: string;
  values: (string | number)[];
  isBold?: boolean;
  isTotal?: boolean;
  indent?: boolean;
}

export interface FinancialTablePageProps {
  title: string;
  subtitle?: string;
  headers: string[];
  rows: FinancialRow[];
  notes?: string[];
  pageNumber?: number;
  totalPages?: number;
  brandColor?: string;
}

export const FinancialTablePage: React.FC<FinancialTablePageProps> = ({
  title,
  subtitle,
  headers,
  rows,
  notes = [],
  pageNumber,
  totalPages,
  brandColor = '#8B5CF6',
}) => {
  return (
    <PDFPage pageNumber={pageNumber} totalPages={totalPages} brandColor={brandColor}>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="mb-6">
          <h1
            className="text-3xl font-bold mb-2"
            style={{
              fontSize: '28pt',
              color: brandColor,
            }}
          >
            {title}
          </h1>
          {subtitle && (
            <p className="text-[#6B6B6B]" style={{ fontSize: '11pt' }}>
              {subtitle}
            </p>
          )}
          <div
            className="w-16 h-1 rounded-full mt-3"
            style={{ backgroundColor: brandColor }}
          />
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full border-collapse">
            {/* Table Header */}
            <thead>
              <tr style={{ backgroundColor: brandColor }}>
                {headers.map((header, index) => (
                  <th
                    key={index}
                    className="px-4 py-3 text-left text-white font-semibold"
                    style={{
                      fontSize: '10pt',
                      textAlign: index === 0 ? 'left' : 'right',
                    }}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>

            {/* Table Body */}
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className={`border-b border-[#E3E1DA] ${
                    row.isTotal ? 'bg-[#F1F0EC]' : rowIndex % 2 === 0 ? 'bg-white' : 'bg-[#EDEBE6]'
                  }`}
                >
                  <td
                    className={`px-4 py-3 ${row.indent ? 'pl-8' : ''} ${
                      row.isBold || row.isTotal ? 'font-bold' : ''
                    }`}
                    style={{
                      fontSize: '10pt',
                      color: row.isTotal ? '#1e293b' : '#475569',
                    }}
                  >
                    {row.label}
                  </td>
                  {row.values.map((value, colIndex) => (
                    <td
                      key={colIndex}
                      className={`px-4 py-3 text-right ${
                        row.isBold || row.isTotal ? 'font-bold' : ''
                      }`}
                      style={{
                        fontSize: '10pt',
                        color: row.isTotal ? '#1e293b' : '#475569',
                      }}
                    >
                      {value}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Notes */}
        {notes.length > 0 && (
          <div className="mt-6 space-y-2">
            {notes.map((note, index) => (
              <p
                key={index}
                className="text-[#6B6B6B]"
                style={{ fontSize: '9pt', lineHeight: '1.4' }}
              >
                <span className="font-semibold">Note {index + 1}:</span> {note}
              </p>
            ))}
          </div>
        )}
      </div>
    </PDFPage>
  );
};

export default FinancialTablePage;
