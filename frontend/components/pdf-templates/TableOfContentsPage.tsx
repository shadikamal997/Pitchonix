/**
 * PDF Table of Contents Page Template
 */

import React from 'react';
import PDFPage from './PDFPage';

export interface TOCItem {
  title: string;
  pageNumber: number;
  level?: number; // 1 for main sections, 2 for subsections
}

export interface TableOfContentsPageProps {
  items: TOCItem[];
  pageNumber?: number;
  totalPages?: number;
  brandColor?: string;
}

export const TableOfContentsPage: React.FC<TableOfContentsPageProps> = ({
  items,
  pageNumber,
  totalPages,
  brandColor = '#8B5CF6',
}) => {
  return (
    <PDFPage pageNumber={pageNumber} totalPages={totalPages} brandColor={brandColor}>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="mb-12">
          <h1
            className="text-4xl font-bold mb-3"
            style={{
              fontSize: '32pt',
              color: brandColor,
            }}
          >
            Table of Contents
          </h1>
          <div
            className="w-16 h-1 rounded-full"
            style={{ backgroundColor: brandColor }}
          />
        </div>

        {/* TOC Items */}
        <div className="space-y-3">
          {items.map((item, index) => {
            const isSubsection = item.level === 2;
            
            return (
              <div
                key={index}
                className={`flex items-center justify-between py-2 ${
                  isSubsection ? 'pl-8' : ''
                }`}
                style={{
                  borderBottom: isSubsection
                    ? 'none'
                    : '1px dotted rgba(148, 163, 184, 0.3)',
                }}
              >
                <span
                  className={`${
                    isSubsection ? 'text-slate-600' : 'text-slate-900 font-semibold'
                  }`}
                  style={{
                    fontSize: isSubsection ? '11pt' : '13pt',
                  }}
                >
                  {item.title}
                </span>
                <span
                  className="font-medium"
                  style={{
                    fontSize: '12pt',
                    color: brandColor,
                  }}
                >
                  {item.pageNumber}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </PDFPage>
  );
};

export default TableOfContentsPage;
