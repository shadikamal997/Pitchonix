/**
 * PDF Two-Column Content Page Template
 * Versatile layout with title and two-column content
 */

import React from 'react';
import PDFPage from './PDFPage';

export interface TwoColumnContentPageProps {
  title: string;
  leftContent: string;
  rightContent: string;
  leftTitle?: string;
  rightTitle?: string;
  pageNumber?: number;
  totalPages?: number;
  brandColor?: string;
}

export const TwoColumnContentPage: React.FC<TwoColumnContentPageProps> = ({
  title,
  leftContent,
  rightContent,
  leftTitle,
  rightTitle,
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
            className="text-3xl font-bold mb-3"
            style={{
              fontSize: '28pt',
              color: brandColor,
            }}
          >
            {title}
          </h1>
          <div
            className="w-16 h-1 rounded-full"
            style={{ backgroundColor: brandColor }}
          />
        </div>

        {/* Two Columns */}
        <div className="flex-1 grid grid-cols-2 gap-8">
          {/* Left Column */}
          <div>
            {leftTitle && (
              <h3
                className="text-xl font-semibold mb-4"
                style={{
                  fontSize: '16pt',
                  color: '#1e293b',
                }}
              >
                {leftTitle}
              </h3>
            )}
            <div
              className="text-[#111111] leading-relaxed"
              style={{
                fontSize: '11pt',
                lineHeight: '1.8',
              }}
            >
              {leftContent.split('\n').map((paragraph, index) => (
                <p key={index} className="mb-4">
                  {paragraph}
                </p>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="absolute left-1/2 top-24 bottom-16 w-px bg-[#E3E1DA]" />

          {/* Right Column */}
          <div>
            {rightTitle && (
              <h3
                className="text-xl font-semibold mb-4"
                style={{
                  fontSize: '16pt',
                  color: '#1e293b',
                }}
              >
                {rightTitle}
              </h3>
            )}
            <div
              className="text-[#111111] leading-relaxed"
              style={{
                fontSize: '11pt',
                lineHeight: '1.8',
              }}
            >
              {rightContent.split('\n').map((paragraph, index) => (
                <p key={index} className="mb-4">
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PDFPage>
  );
};

export default TwoColumnContentPage;
