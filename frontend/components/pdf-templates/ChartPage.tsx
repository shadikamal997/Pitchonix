/**
 * PDF Chart Page Template
 * Display charts and data visualizations
 */

import React from 'react';
import PDFPage from './PDFPage';

export interface ChartPageProps {
  title: string;
  subtitle?: string;
  chartType: 'bar' | 'line' | 'pie' | 'area';
  chartData?: any; // Chart.js or Recharts compatible data
  chartImage?: string; // Pre-rendered chart as base64 or URL
  description?: string;
  pageNumber?: number;
  totalPages?: number;
  brandColor?: string;
}

export const ChartPage: React.FC<ChartPageProps> = ({
  title,
  subtitle,
  chartType,
  chartImage,
  description,
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

        {/* Chart Container */}
        <div className="flex-1 flex items-center justify-center bg-[#EDEBE6] rounded-xl p-8">
          {chartImage ? (
            <img
              src={chartImage}
              alt={title}
              className="max-w-full max-h-full object-contain"
            />
          ) : (
            <div className="text-center text-[#C9C6BD]">
              <p style={{ fontSize: '12pt' }}>Chart will render here</p>
              <p className="text-sm mt-2" style={{ fontSize: '10pt' }}>
                Type: {chartType}
              </p>
            </div>
          )}
        </div>

        {/* Description/Legend */}
        {description && (
          <div className="mt-6">
            <p
              className="text-[#111111] leading-relaxed"
              style={{ fontSize: '10pt', lineHeight: '1.6' }}
            >
              {description}
            </p>
          </div>
        )}
      </div>
    </PDFPage>
  );
};

export default ChartPage;
