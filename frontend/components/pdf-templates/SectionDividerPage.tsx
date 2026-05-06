/**
 * PDF Section Divider Page Template
 * Full-page visual divider between document sections
 */

import React from 'react';
import PDFPage from './PDFPage';

export interface SectionDividerPageProps {
  sectionNumber: number;
  sectionTitle: string;
  sectionDescription?: string;
  pageNumber?: number;
  totalPages?: number;
  brandColor?: string;
  accentColor?: string;
}

export const SectionDividerPage: React.FC<SectionDividerPageProps> = ({
  sectionNumber,
  sectionTitle,
  sectionDescription,
  pageNumber,
  totalPages,
  brandColor = '#8B5CF6',
  accentColor = '#06B6D4',
}) => {
  return (
    <PDFPage pageNumber={pageNumber} totalPages={totalPages} brandColor={brandColor}>
      <div className="h-full flex flex-col justify-center items-center relative overflow-hidden">
        {/* Background Gradient Decoration */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            background: `radial-gradient(circle at top right, ${brandColor}, transparent 70%)`,
          }}
        />
        <div
          className="absolute inset-0 opacity-5"
          style={{
            background: `radial-gradient(circle at bottom left, ${accentColor}, transparent 70%)`,
          }}
        />

        {/* Content */}
        <div className="relative z-10 text-center">
          {/* Section Number */}
          <div
            className="inline-flex items-center justify-center w-24 h-24 rounded-full mb-8"
            style={{
              background: `linear-gradient(135deg, ${brandColor}, ${accentColor})`,
            }}
          >
            <span className="text-white font-bold" style={{ fontSize: '36pt' }}>
              {sectionNumber}
            </span>
          </div>

          {/* Section Title */}
          <h1
            className="font-bold mb-4"
            style={{
              fontSize: '48pt',
              lineHeight: '1.2',
              background: `linear-gradient(135deg, ${brandColor}, ${accentColor})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            {sectionTitle}
          </h1>

          {/* Section Description */}
          {sectionDescription && (
            <p
              className="text-slate-600 max-w-lg mx-auto"
              style={{ fontSize: '14pt', lineHeight: '1.6' }}
            >
              {sectionDescription}
            </p>
          )}

          {/* Decorative Line */}
          <div className="flex items-center justify-center gap-2 mt-8">
            <div
              className="w-12 h-1 rounded-full"
              style={{ backgroundColor: brandColor }}
            />
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: accentColor }}
            />
            <div
              className="w-12 h-1 rounded-full"
              style={{ backgroundColor: brandColor }}
            />
          </div>
        </div>
      </div>
    </PDFPage>
  );
};

export default SectionDividerPage;
