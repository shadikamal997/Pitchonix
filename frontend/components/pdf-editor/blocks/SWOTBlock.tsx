'use client';

import React from 'react';
import { TrendingUp, TrendingDown, Target, AlertTriangle } from 'lucide-react';

export interface SWOTBlockProps {
  strengths?: string[];
  weaknesses?: string[];
  opportunities?: string[];
  threats?: string[];
  title?: string;
  onChange?: (data: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  }) => void;
}

const defaultData = {
  strengths: [
    'Strong brand recognition',
    'Experienced leadership team',
    'Innovative product portfolio',
    'Loyal customer base',
  ],
  weaknesses: [
    'Limited market presence in Asia',
    'High operational costs',
    'Dependency on key suppliers',
  ],
  opportunities: [
    'Emerging markets expansion',
    'Digital transformation trends',
    'Strategic partnerships',
    'New product categories',
  ],
  threats: [
    'Increasing competition',
    'Economic uncertainty',
    'Regulatory changes',
    'Supply chain disruptions',
  ],
};

export function SWOTBlock({
  strengths = defaultData.strengths,
  weaknesses = defaultData.weaknesses,
  opportunities = defaultData.opportunities,
  threats = defaultData.threats,
  title = 'SWOT Analysis',
  onChange,
}: SWOTBlockProps) {
  const QuadrantCard = ({
    title,
    items,
    icon: Icon,
    bgColor,
    textColor,
    borderColor,
  }: {
    title: string;
    items: string[];
    icon: any;
    bgColor: string;
    textColor: string;
    borderColor: string;
  }) => (
    <div className={`${bgColor} border-2 ${borderColor} rounded-2xl p-6 h-full`}>
      <div className="flex items-center gap-2 mb-4">
        <Icon className={`h-6 w-6 ${textColor}`} />
        <h4 className={`text-lg font-bold ${textColor}`}>{title}</h4>
      </div>
      <ul className="space-y-2.5">
        {items.map((item, index) => (
          <li key={index} className="flex items-start gap-2.5">
            <span className={`mt-1.5 h-1.5 w-1.5 rounded-full ${textColor.replace('text-', 'bg-')} flex-shrink-0`} />
            <span className="text-sm text-slate-700 leading-relaxed">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <div className="w-full py-8">
      {title && (
        <div className="text-center mb-8">
          <h3 className="text-3xl font-bold text-slate-900 mb-2">{title}</h3>
          <p className="text-sm text-slate-600">Strategic position assessment</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        {/* Strengths */}
        <QuadrantCard
          title="Strengths"
          items={strengths}
          icon={TrendingUp}
          bgColor="bg-green-50"
          textColor="text-green-700"
          borderColor="border-green-300"
        />

        {/* Weaknesses */}
        <QuadrantCard
          title="Weaknesses"
          items={weaknesses}
          icon={TrendingDown}
          bgColor="bg-red-50"
          textColor="text-red-700"
          borderColor="border-red-300"
        />

        {/* Opportunities */}
        <QuadrantCard
          title="Opportunities"
          items={opportunities}
          icon={Target}
          bgColor="bg-blue-50"
          textColor="text-blue-700"
          borderColor="border-blue-300"
        />

        {/* Threats */}
        <QuadrantCard
          title="Threats"
          items={threats}
          icon={AlertTriangle}
          bgColor="bg-orange-50"
          textColor="text-orange-700"
          borderColor="border-orange-300"
        />
      </div>
    </div>
  );
}

export default SWOTBlock;
