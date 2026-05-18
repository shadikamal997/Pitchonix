'use client';

import React from 'react';
import { Check, X, Minus } from 'lucide-react';

export interface ComparisonItem {
  feature: string;
  values: Array<boolean | string | 'partial'>;
}

export interface ComparisonTableProps {
  title?: string;
  columns?: string[];
  items?: ComparisonItem[];
  highlightColumn?: number;
  onChange?: (data: any) => void;
}

const defaultColumns = ['Basic', 'Pro', 'Enterprise'];
const defaultItems: ComparisonItem[] = [
  { feature: 'Users', values: ['5', '25', 'Unlimited'] },
  { feature: 'Storage', values: ['10GB', '100GB', '1TB'] },
  { feature: 'API Access', values: [false, true, true] },
  { feature: 'Priority Support', values: [false, 'partial', true] },
  { feature: 'Custom Branding', values: [false, false, true] },
  { feature: 'Analytics', values: [true, true, true] },
  { feature: 'Team Collaboration', values: ['partial', true, true] },
  { feature: 'Advanced Security', values: [false, true, true] },
];

export function ComparisonTableBlock({
  title = 'Feature Comparison',
  columns = defaultColumns,
  items = defaultItems,
  highlightColumn = 1,
  onChange,
}: ComparisonTableProps) {
  const renderCell = (value: boolean | string | 'partial') => {
    if (typeof value === 'boolean') {
      return value ? (
        <div className="flex justify-center">
          <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center">
            <Check className="h-4 w-4 text-green-600" />
          </div>
        </div>
      ) : (
        <div className="flex justify-center">
          <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center">
            <X className="h-4 w-4 text-red-600" />
          </div>
        </div>
      );
    }

    if (value === 'partial') {
      return (
        <div className="flex justify-center">
          <div className="w-7 h-7 rounded-full bg-yellow-100 flex items-center justify-center">
            <Minus className="h-4 w-4 text-yellow-600" />
          </div>
        </div>
      );
    }

    return (
      <div className="flex justify-center">
        <span className="text-sm font-semibold text-slate-700">{value}</span>
      </div>
    );
  };

  return (
    <div className="w-full py-8">
      {title && (
        <div className="text-center mb-8">
          <h3 className="text-2xl font-bold text-slate-900">{title}</h3>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border-2 border-slate-200 shadow-lg">
        <table className="w-full">
          {/* Header */}
          <thead>
            <tr className="bg-slate-50 border-b-2 border-slate-200">
              <th className="py-4 px-6 text-left text-sm font-bold text-slate-700 w-1/3">
                Feature
              </th>
              {columns.map((column, index) => (
                <th
                  key={index}
                  className={`py-4 px-6 text-center text-sm font-bold ${
                    index === highlightColumn
                      ? 'bg-green-600 text-white border-x-2 border-green-700'
                      : 'text-slate-700'
                  }`}
                >
                  {column}
                  {index === highlightColumn && (
                    <span className="block text-xs font-semibold mt-1 opacity-90">POPULAR</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            {items.map((item, rowIndex) => (
              <tr
                key={rowIndex}
                className={`border-b border-slate-100 ${
                  rowIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                }`}
              >
                <td className="py-4 px-6 text-sm font-semibold text-slate-700">
                  {item.feature}
                </td>
                {item.values.map((value, colIndex) => (
                  <td
                    key={colIndex}
                    className={`py-4 px-6 ${
                      colIndex === highlightColumn
                        ? 'bg-green-50/50 border-x-2 border-green-100'
                        : ''
                    }`}
                  >
                    {renderCell(value)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ComparisonTableBlock;
