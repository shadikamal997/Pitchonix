/**
 * Export Options Panel Component
 * Phase 10: Export Configuration
 */

'use client';

import { useState } from 'react';
import { ExportOptions, TEMPLATE_LAYOUTS, PAGE_SIZES, ORIENTATIONS } from '@/types/export';

interface ExportOptionsPanelProps {
  format: 'pptx' | 'pdf' | 'html';
  options: ExportOptions;
  onChange: (options: ExportOptions) => void;
}

export function ExportOptionsPanel({ format, options, onChange }: ExportOptionsPanelProps) {
  const updateOption = <K extends keyof ExportOptions>(
    key: K,
    value: ExportOptions[K]
  ) => {
    onChange({ ...options, [key]: value });
  };

  // PDF-specific options
  if (format === 'pdf') {
    return (
      <div className="space-y-6">
        {/* Layout */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Layout
          </label>
          <div className="grid grid-cols-2 gap-3">
            {TEMPLATE_LAYOUTS.map((layout) => (
              <button
                key={layout.value}
                onClick={() => updateOption('layout', layout.value)}
                className={`p-3 border-2 rounded-lg text-left transition-colors ${
                  options.layout === layout.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-medium text-sm text-gray-900">{layout.label}</div>
                <div className="text-xs text-gray-600 mt-1">{layout.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Page Size */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Page Size
          </label>
          <select
            value={options.pageSize || 'A4'}
            onChange={(e) => updateOption('pageSize', e.target.value as any)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {PAGE_SIZES.map((size) => (
              <option key={size.value} value={size.value}>
                {size.label}
              </option>
            ))}
          </select>
        </div>

        {/* Orientation */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Orientation
          </label>
          <div className="grid grid-cols-2 gap-3">
            {ORIENTATIONS.map((orientation) => (
              <button
                key={orientation.value}
                onClick={() => updateOption('orientation', orientation.value)}
                className={`p-3 border-2 rounded-lg text-center transition-colors ${
                  options.orientation === orientation.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-medium text-sm text-gray-900">
                  {orientation.label}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Margins */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Margins (mm)
          </label>
          <div className="grid grid-cols-4 gap-3">
            {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
              <div key={side}>
                <label className="block text-xs text-gray-600 mb-1 capitalize">
                  {side}
                </label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={options.margins?.[side] || 20}
                  onChange={(e) =>
                    updateOption('margins', {
                      ...(options.margins || { top: 20, right: 20, bottom: 20, left: 20 }),
                      [side]: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Watermark */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Watermark (optional)
          </label>
          <input
            type="text"
            value={options.watermark || ''}
            onChange={(e) => updateOption('watermark', e.target.value || undefined)}
            placeholder="Enter watermark text"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Text will appear diagonally across each page
          </p>
        </div>

        {/* Toggles */}
        <div className="space-y-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={options.headerFooter !== false}
              onChange={(e) => updateOption('headerFooter', e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Include headers and footers</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={options.compression !== false}
              onChange={(e) => updateOption('compression', e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">
              Compress PDF (smaller file size)
            </span>
          </label>
        </div>
      </div>
    );
  }

  // PPTX options
  if (format === 'pptx') {
    return (
      <div className="space-y-6">
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700">
            PPTX exports will use your selected template&apos;s styling automatically.
          </p>
        </div>

        {/* Watermark */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Watermark (optional)
          </label>
          <input
            type="text"
            value={options.watermark || ''}
            onChange={(e) => updateOption('watermark', e.target.value || undefined)}
            placeholder="Enter watermark text"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
    );
  }

  // HTML options
  return (
    <div className="space-y-6">
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-700">
          HTML exports create interactive web presentations.
        </p>
      </div>
    </div>
  );
}
