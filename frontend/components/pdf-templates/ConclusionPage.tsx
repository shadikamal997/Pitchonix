/**
 * PDF Conclusion Page Template
 * Final page with call-to-action and contact information
 */

import React from 'react';
import PDFPage from './PDFPage';

export interface ConclusionPageProps {
  title?: string;
  message: string;
  callToAction?: string;
  contactInfo?: {
    name?: string;
    email?: string;
    phone?: string;
    website?: string;
    address?: string;
  };
  companyLogo?: string;
  pageNumber?: number;
  totalPages?: number;
  brandColor?: string;
  accentColor?: string;
}

export const ConclusionPage: React.FC<ConclusionPageProps> = ({
  title = 'Thank You',
  message,
  callToAction,
  contactInfo,
  companyLogo,
  pageNumber,
  totalPages,
  brandColor = '#8B5CF6',
  accentColor = '#06B6D4',
}) => {
  return (
    <PDFPage pageNumber={pageNumber} totalPages={totalPages} brandColor={brandColor}>
      <div className="h-full flex flex-col justify-between">
        {/* Company Logo */}
        {companyLogo && (
          <div>
            <img src={companyLogo} alt="Company Logo" className="h-12 object-contain" />
          </div>
        )}

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
            className="font-bold mb-6"
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

          {/* Message */}
          <p
            className="text-[#111111] mb-8 max-w-2xl leading-relaxed"
            style={{ fontSize: '14pt', lineHeight: '1.8' }}
          >
            {message}
          </p>

          {/* Call to Action */}
          {callToAction && (
            <div
              className="inline-block px-8 py-4 rounded-xl text-white font-bold"
              style={{
                background: `linear-gradient(135deg, ${brandColor}, ${accentColor})`,
                fontSize: '14pt',
              }}
            >
              {callToAction}
            </div>
          )}
        </div>

        {/* Contact Information */}
        {contactInfo && (
          <div className="bg-[#EDEBE6] rounded-xl p-6 border-2 border-[#F1F0EC]">
            <h3
              className="font-bold mb-4 text-center"
              style={{ fontSize: '13pt', color: brandColor }}
            >
              Get In Touch
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {contactInfo.name && (
                <div>
                  <p className="text-[#9A9A9A] text-xs mb-1" style={{ fontSize: '9pt' }}>
                    Contact Person
                  </p>
                  <p className="text-[#111111] font-semibold" style={{ fontSize: '11pt' }}>
                    {contactInfo.name}
                  </p>
                </div>
              )}
              {contactInfo.email && (
                <div>
                  <p className="text-[#9A9A9A] text-xs mb-1" style={{ fontSize: '9pt' }}>
                    Email
                  </p>
                  <p
                    className="font-semibold"
                    style={{ fontSize: '11pt', color: brandColor }}
                  >
                    {contactInfo.email}
                  </p>
                </div>
              )}
              {contactInfo.phone && (
                <div>
                  <p className="text-[#9A9A9A] text-xs mb-1" style={{ fontSize: '9pt' }}>
                    Phone
                  </p>
                  <p className="text-[#111111] font-semibold" style={{ fontSize: '11pt' }}>
                    {contactInfo.phone}
                  </p>
                </div>
              )}
              {contactInfo.website && (
                <div>
                  <p className="text-[#9A9A9A] text-xs mb-1" style={{ fontSize: '9pt' }}>
                    Website
                  </p>
                  <p
                    className="font-semibold"
                    style={{ fontSize: '11pt', color: brandColor }}
                  >
                    {contactInfo.website}
                  </p>
                </div>
              )}
            </div>
            {contactInfo.address && (
              <div className="mt-4 pt-4 border-t border-[#E3E1DA]">
                <p className="text-[#9A9A9A] text-xs mb-1" style={{ fontSize: '9pt' }}>
                  Address
                </p>
                <p className="text-[#111111]" style={{ fontSize: '10pt' }}>
                  {contactInfo.address}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </PDFPage>
  );
};

export default ConclusionPage;
