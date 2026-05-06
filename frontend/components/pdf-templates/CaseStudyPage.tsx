/**
 * PDF Case Study Page Template
 * Display customer success story with problem/solution/results
 */

import React from 'react';
import PDFPage from './PDFPage';

export interface CaseStudyPageProps {
  customerName: string;
  customerLogo?: string;
  industry?: string;
  challenge: string;
  solution: string;
  results: string[];
  pageNumber?: number;
  totalPages?: number;
  brandColor?: string;
}

export const CaseStudyPage: React.FC<CaseStudyPageProps> = ({
  customerName,
  customerLogo,
  industry,
  challenge,
  solution,
  results,
  pageNumber,
  totalPages,
  brandColor = '#8B5CF6',
}) => {
  return (
    <PDFPage pageNumber={pageNumber} totalPages={totalPages} brandColor={brandColor}>
      <div className="h-full flex flex-col">
        {/* Header with Customer Info */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1
              className="text-3xl font-bold mb-2"
              style={{
                fontSize: '28pt',
                color: brandColor,
              }}
            >
              Case Study
            </h1>
            <p className="text-2xl font-semibold text-slate-900" style={{ fontSize: '18pt' }}>
              {customerName}
            </p>
            {industry && (
              <p className="text-slate-600 mt-1" style={{ fontSize: '11pt' }}>
                {industry}
              </p>
            )}
          </div>
          {customerLogo && (
            <img src={customerLogo} alt={customerName} className="h-16 object-contain" />
          )}
        </div>

        {/* Content Sections */}
        <div className="flex-1 space-y-6">
          {/* Challenge */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: '#EF4444', fontSize: '16pt' }}
              >
                !
              </div>
              <h2
                className="text-xl font-bold"
                style={{ fontSize: '16pt', color: '#1e293b' }}
              >
                The Challenge
              </h2>
            </div>
            <p
              className="text-slate-700 ml-13 leading-relaxed"
              style={{ fontSize: '11pt', lineHeight: '1.8' }}
            >
              {challenge}
            </p>
          </div>

          {/* Solution */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: brandColor, fontSize: '16pt' }}
              >
                ✓
              </div>
              <h2
                className="text-xl font-bold"
                style={{ fontSize: '16pt', color: '#1e293b' }}
              >
                The Solution
              </h2>
            </div>
            <p
              className="text-slate-700 ml-13 leading-relaxed"
              style={{ fontSize: '11pt', lineHeight: '1.8' }}
            >
              {solution}
            </p>
          </div>

          {/* Results */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: '#10B981', fontSize: '16pt' }}
              >
                ★
              </div>
              <h2
                className="text-xl font-bold"
                style={{ fontSize: '16pt', color: '#1e293b' }}
              >
                The Results
              </h2>
            </div>
            <div className="ml-13 grid grid-cols-2 gap-4">
              {results.map((result, index) => (
                <div
                  key={index}
                  className="p-4 rounded-lg bg-gradient-to-br from-emerald-50 to-cyan-50 border border-emerald-100"
                >
                  <p
                    className="font-bold text-emerald-900"
                    style={{ fontSize: '12pt', lineHeight: '1.5' }}
                  >
                    {result}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PDFPage>
  );
};

export default CaseStudyPage;
