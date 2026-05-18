'use client';

import React from 'react';
import { Calendar, CheckCircle, Circle } from 'lucide-react';

export interface TimelineItem {
  id: string;
  date: string;
  title: string;
  description: string;
  status?: 'completed' | 'in-progress' | 'upcoming';
}

export interface TimelineBlockProps {
  items?: TimelineItem[];
  title?: string;
  orientation?: 'vertical' | 'horizontal';
  onChange?: (items: TimelineItem[]) => void;
}

const defaultItems: TimelineItem[] = [
  {
    id: '1',
    date: 'Q1 2024',
    title: 'Project Kickoff',
    description: 'Initial planning and team assembly',
    status: 'completed',
  },
  {
    id: '2',
    date: 'Q2 2024',
    title: 'Development Phase',
    description: 'Core feature development and testing',
    status: 'in-progress',
  },
  {
    id: '3',
    date: 'Q3 2024',
    title: 'Beta Launch',
    description: 'Limited release to select customers',
    status: 'upcoming',
  },
  {
    id: '4',
    date: 'Q4 2024',
    title: 'Full Launch',
    description: 'Public release and marketing campaign',
    status: 'upcoming',
  },
];

export function TimelineBlock({
  items = defaultItems,
  title = 'Project Timeline',
  orientation = 'vertical',
  onChange,
}: TimelineBlockProps) {
  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'in-progress':
        return <Circle className="h-5 w-5 text-blue-600 fill-blue-600" />;
      default:
        return <Circle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-300';
    }
  };

  if (orientation === 'horizontal') {
    return (
      <div className="w-full py-8">
        {title && (
          <div className="flex items-center gap-2 mb-6">
            <Calendar className="h-6 w-6 text-slate-700" />
            <h3 className="text-2xl font-bold text-slate-900">{title}</h3>
          </div>
        )}
        <div className="relative">
          {/* Horizontal Line */}
          <div className="absolute top-8 left-0 right-0 h-1 bg-slate-200" />

          {/* Timeline Items */}
          <div className="grid grid-cols-4 gap-4">
            {items.map((item, index) => (
              <div key={item.id} className="relative">
                {/* Circle Marker */}
                <div className="relative z-10 w-16 h-16 mx-auto bg-white rounded-full border-4 border-slate-200 flex items-center justify-center mb-4">
                  {getStatusIcon(item.status)}
                </div>

                {/* Content */}
                <div className="text-center">
                  <div className={`inline-block px-3 py-1 rounded-full border text-xs font-semibold mb-2 ${getStatusColor(item.status)}`}>
                    {item.date}
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 mb-1">{item.title}</h4>
                  <p className="text-xs text-slate-600">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full py-8">
      {title && (
        <div className="flex items-center gap-2 mb-6">
          <Calendar className="h-6 w-6 text-slate-700" />
          <h3 className="text-2xl font-bold text-slate-900">{title}</h3>
        </div>
      )}
      <div className="relative pl-8">
        {/* Vertical Line */}
        <div className="absolute left-6 top-0 bottom-0 w-1 bg-slate-200" />

        {/* Timeline Items */}
        <div className="space-y-8">
          {items.map((item, index) => (
            <div key={item.id} className="relative">
              {/* Circle Marker */}
              <div className="absolute -left-[1.875rem] top-1 w-12 h-12 bg-white rounded-full border-4 border-slate-200 flex items-center justify-center">
                {getStatusIcon(item.status)}
              </div>

              {/* Content Card */}
              <div className="ml-6 bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <div className={`px-3 py-1 rounded-full border text-xs font-semibold ${getStatusColor(item.status)}`}>
                    {item.date}
                  </div>
                  {item.status && (
                    <span className="text-xs text-slate-500 capitalize">{item.status.replace('-', ' ')}</span>
                  )}
                </div>
                <h4 className="text-lg font-bold text-slate-900 mb-2">{item.title}</h4>
                <p className="text-sm text-slate-600">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default TimelineBlock;
