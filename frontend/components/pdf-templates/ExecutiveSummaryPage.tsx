/**
 * PDF Executive Summary Page Template
 */

import React from 'react';
import PDFPage from './PDFPage';

export interface ExecutiveSummaryPageProps {
  content: string;
  highlights?: string[];
  pageNumber?: number;
  totalPages?: number;
  brandColor?: string;
}

export const ExecutiveSummaryPage: React.FC<ExecutiveSummaryPageProps> = ({
  content,
  highlights = [],
  pageNumber,
  totalPages,
  brandColor = '#8B5CF6',
}) => {
  return (
    <PDFPage pageNumber={pageNumber} totalPages={totalPages} brandColor={brandColor}>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="mb-8">
          <h1
            className="text-4xl font-bold mb-3"
            style={{
              fontSize: '32pt',
              color: brandColor,
            }}
          >
            Executive Summary
          </h1>
          <div
            className="w-16 h-1 rounded-full"
            style={{ backgroundColor: brandColor }}
          />
        </div>

        {/* Main Content */}
        <div className="flex-1 space-y-6">
          {/* Summary Text */}
          <div
            className="text-[#111111] leading-relaxed"
            style={{
              fontSize: '11pt',
              lineHeight: '1.8',
            }}
          >
            {content.split('\n').map((paragraph, index) => (
              <p key={index} className="mb-4">
                {paragraph}
              </p>
            ))}
          </div>

          {/* Key Highlights */}
          {highlights.length > 0 && (
            <div className="mt-8">
              <h3
                className="text-xl font-semibold mb-4"
                style={{
                  fontSize: '16pt',
                  color: brandColor,
                }}
              >
                Key Highlights
              </h3>
              <div className="grid grid-cols-1 gap-3">
                {highlights.map((highlight, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div
                      className="flex-shrink-0 w-2 h-2 rounded-full mt-2"
                      style={{ backgroundColor: brandColor }}
                    />
                    <p
                      className="text-[#111111]"
                      style={{ fontSize: '11pt', lineHeight: '1.6' }}
                    >
                      {highlight}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </PDFPage>
  );
};

export default ExecutiveSummaryPage;
