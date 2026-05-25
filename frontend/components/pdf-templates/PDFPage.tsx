/**
 * Base PDF Page Component
 * A4 dimensions: 210mm x 297mm = 794px x 1123px at 96dpi
 */

import React from 'react';

export interface PDFPageProps {
  children: React.ReactNode;
  className?: string;
  pageNumber?: number;
  totalPages?: number;
  showPageNumber?: boolean;
  brandColor?: string;
}

export const PDFPage: React.FC<PDFPageProps> = ({
  children,
  className = '',
  pageNumber,
  totalPages,
  showPageNumber = true,
  brandColor = '#8B5CF6',
}) => {
  return (
    <div
      className={`relative bg-white ${className}`}
      style={{
        width: '210mm',
        height: '297mm',
        maxWidth: '794px',
        maxHeight: '1123px',
        padding: '20mm',
        boxSizing: 'border-box',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        margin: '0 auto',
      }}
    >
      {children}
      
      {/* Page Number */}
      {showPageNumber && pageNumber && (
        <div
          className="absolute bottom-4 right-8 text-sm text-[#C9C6BD] font-medium"
          style={{ fontSize: '10pt' }}
        >
          {totalPages ? `${pageNumber} / ${totalPages}` : pageNumber}
        </div>
      )}
    </div>
  );
};

export default PDFPage;
