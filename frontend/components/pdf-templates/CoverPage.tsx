/**
 * PDF Cover Page Template
 * Professional cover page with logo, title, subtitle, and branding
 */

import React from 'react';
import PDFPage from './PDFPage';

export interface CoverPageProps {
  title: string;
  subtitle?: string;
  companyName: string;
  companyLogo?: string;
  date?: string;
  author?: string;
  brandColor?: string;
  accentColor?: string;
}

export const CoverPage: React.FC<CoverPageProps> = ({
  title,
  subtitle,
  companyName,
  companyLogo,
  date,
  author,
  brandColor = '#8B5CF6',
  accentColor = '#06B6D4',
}) => {
  return (
    <PDFPage showPageNumber={false} brandColor={brandColor}>
      <div className="h-full flex flex-col justify-between">
        {/* Header with Logo */}
        <div className="flex justify-between items-start">
          {companyLogo ? (
            <img src={companyLogo} alt={companyName} className="h-12 object-contain" />
          ) : (
            <div
              className="px-4 py-2 rounded-lg font-bold text-white"
              style={{ backgroundColor: brandColor }}
            >
              {companyName}
            </div>
          )}
          {date && (
            <div className="text-sm text-[#6B6B6B]" style={{ fontSize: '10pt' }}>
              {date}
            </div>
          )}
        </div>

        {/* Main Content - Centered */}
        <div className="flex-1 flex flex-col justify-center items-center text-center px-12">
          {/* Decorative Element */}
          <div
            className="w-20 h-1 mb-8 rounded-full"
            style={{
              background: `linear-gradient(to right, ${brandColor}, ${accentColor})`,
            }}
          />
          
          {/* Title */}
          <h1
            className="text-6xl font-bold mb-6"
            style={{
              fontSize: '48pt',
              lineHeight: '1.2',
              background: `linear-gradient(135deg, ${brandColor}, ${accentColor})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            {title}
          </h1>

          {/* Subtitle */}
          {subtitle && (
            <p
              className="text-2xl text-[#6B6B6B] max-w-2xl"
              style={{ fontSize: '18pt', lineHeight: '1.5' }}
            >
              {subtitle}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-end">
          <div>
            {author && (
              <p className="text-sm text-[#6B6B6B] mb-1" style={{ fontSize: '10pt' }}>
                Prepared by
              </p>
            )}
            <p className="font-semibold text-[#111111]" style={{ fontSize: '12pt' }}>
              {author || companyName}
            </p>
          </div>
          
          {/* Decorative Corner Element */}
          <div
            className="w-24 h-24 rounded-full opacity-20"
            style={{
              background: `radial-gradient(circle, ${brandColor}, transparent)`,
            }}
          />
        </div>
      </div>
    </PDFPage>
  );
};

export default CoverPage;
