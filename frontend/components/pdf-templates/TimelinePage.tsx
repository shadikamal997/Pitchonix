/**
 * PDF Timeline Page Template
 * Display roadmap, milestones, or project timeline
 */

import React from 'react';
import PDFPage from './PDFPage';

export interface TimelineEvent {
  date: string;
  title: string;
  description: string;
  status?: 'completed' | 'in-progress' | 'upcoming';
}

export interface TimelinePageProps {
  title: string;
  subtitle?: string;
  events: TimelineEvent[];
  pageNumber?: number;
  totalPages?: number;
  brandColor?: string;
  accentColor?: string;
}

export const TimelinePage: React.FC<TimelinePageProps> = ({
  title,
  subtitle,
  events,
  pageNumber,
  totalPages,
  brandColor = '#8B5CF6',
  accentColor = '#06B6D4',
}) => {
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'completed':
        return '#10B981';
      case 'in-progress':
        return accentColor;
      case 'upcoming':
        return '#94A3B8';
      default:
        return brandColor;
    }
  };

  return (
    <PDFPage pageNumber={pageNumber} totalPages={totalPages} brandColor={brandColor}>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="mb-8">
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
            <p className="text-slate-600" style={{ fontSize: '11pt' }}>
              {subtitle}
            </p>
          )}
          <div
            className="w-16 h-1 rounded-full mt-3"
            style={{ backgroundColor: brandColor }}
          />
        </div>

        {/* Timeline */}
        <div className="flex-1 relative pl-8">
          {/* Vertical Line */}
          <div
            className="absolute left-6 top-0 bottom-0 w-0.5"
            style={{ backgroundColor: '#E2E8F0' }}
          />

          {/* Timeline Events */}
          <div className="space-y-8">
            {events.map((event, index) => {
              const statusColor = getStatusColor(event.status);
              
              return (
                <div key={index} className="relative">
                  {/* Timeline Dot */}
                  <div
                    className="absolute left-[-32px] top-1 w-4 h-4 rounded-full border-4 border-white"
                    style={{
                      backgroundColor: statusColor,
                      boxShadow: '0 0 0 2px rgba(0,0,0,0.1)',
                    }}
                  />

                  {/* Event Content */}
                  <div className="bg-white rounded-lg border-2 border-slate-100 p-5 shadow-sm">
                    {/* Date Badge */}
                    <div
                      className="inline-block px-3 py-1 rounded-full text-white font-semibold mb-3"
                      style={{
                        fontSize: '9pt',
                        backgroundColor: statusColor,
                      }}
                    >
                      {event.date}
                    </div>

                    {/* Title */}
                    <h3
                      className="font-bold mb-2"
                      style={{
                        fontSize: '13pt',
                        color: '#1e293b',
                      }}
                    >
                      {event.title}
                    </h3>

                    {/* Description */}
                    <p
                      className="text-slate-600"
                      style={{
                        fontSize: '10pt',
                        lineHeight: '1.6',
                      }}
                    >
                      {event.description}
                    </p>

                    {/* Status Badge */}
                    {event.status && (
                      <div className="mt-3">
                        <span
                          className="inline-block px-2 py-1 rounded text-xs font-medium capitalize"
                          style={{
                            fontSize: '8pt',
                            backgroundColor: `${statusColor}20`,
                            color: statusColor,
                          }}
                        >
                          {event.status.replace('-', ' ')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </PDFPage>
  );
};

export default TimelinePage;
