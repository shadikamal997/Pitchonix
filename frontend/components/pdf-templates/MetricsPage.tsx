/**
 * PDF Metrics Page Template
 * Display key metrics and KPIs in a grid layout
 */

import React from 'react';
import PDFPage from './PDFPage';

export interface Metric {
  label: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon?: string;
}

export interface MetricsPageProps {
  title: string;
  subtitle?: string;
  metrics: Metric[];
  pageNumber?: number;
  totalPages?: number;
  brandColor?: string;
}

export const MetricsPage: React.FC<MetricsPageProps> = ({
  title,
  subtitle,
  metrics,
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
          {subtitle && (
            <p className="text-slate-600" style={{ fontSize: '12pt' }}>
              {subtitle}
            </p>
          )}
          <div
            className="w-16 h-1 rounded-full mt-3"
            style={{ backgroundColor: brandColor }}
          />
        </div>

        {/* Metrics Grid */}
        <div className="flex-1 grid grid-cols-2 gap-6">
          {metrics.map((metric, index) => (
            <div
              key={index}
              className="p-6 rounded-xl border-2 border-slate-100 bg-gradient-to-br from-white to-slate-50"
            >
              {/* Metric Label */}
              <p
                className="text-slate-600 mb-2"
                style={{ fontSize: '10pt', fontWeight: 500 }}
              >
                {metric.label}
              </p>

              {/* Metric Value */}
              <p
                className="font-bold mb-2"
                style={{
                  fontSize: '32pt',
                  color: brandColor,
                  lineHeight: '1',
                }}
              >
                {metric.value}
              </p>

              {/* Change Indicator */}
              {metric.change && (
                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm font-semibold ${
                      metric.changeType === 'positive'
                        ? 'text-emerald-600'
                        : metric.changeType === 'negative'
                        ? 'text-red-600'
                        : 'text-slate-600'
                    }`}
                    style={{ fontSize: '10pt' }}
                  >
                    {metric.changeType === 'positive' && '↑ '}
                    {metric.changeType === 'negative' && '↓ '}
                    {metric.change}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </PDFPage>
  );
};

export default MetricsPage;
