'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Download, FileText, FileImage, Presentation, ChevronDown, Loader2,
  Settings, X as XIcon,
} from 'lucide-react';

export interface ExportFormat {
  id: string;
  label: string;
  icon: React.ElementType;
  description: string;
  extension: string;
  contentType: string;
}

export interface PdfExportOptions {
  paperSize?: 'A4' | 'Letter' | 'A3' | 'Legal';
  quality?: 'standard' | 'high' | 'compressed';
  watermark?: { text: string; opacity: number; position: 'diagonal' | 'center' } | null;
  pageRange?: { from: number; to: number } | null;
}

const EXPORT_FORMATS: ExportFormat[] = [
  {
    id: 'pdf',
    label: 'PDF Document',
    icon: FileImage,
    description: 'Professional PDF with layouts',
    extension: 'pdf',
    contentType: 'application/pdf',
  },
  {
    id: 'docx',
    label: 'Word Document',
    icon: FileText,
    description: 'Editable Microsoft Word format',
    extension: 'docx',
    contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  },
  {
    id: 'pptx',
    label: 'PowerPoint',
    icon: Presentation,
    description: 'Presentation slides format',
    extension: 'pptx',
    contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  },
];

interface ExportDropdownProps {
  onExport: (format: string, options?: PdfExportOptions) => Promise<void>;
  loading?: boolean;
  disabled?: boolean;
}

export default function ExportDropdown({
  onExport,
  loading = false,
  disabled = false,
}: ExportDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>(EXPORT_FORMATS[0]);
  const [options, setOptions] = useState<PdfExportOptions>({
    paperSize: 'A4',
    quality: 'standard',
    watermark: null,
    pageRange: null,
  });
  const [watermarkText, setWatermarkText] = useState('DRAFT');
  const [watermarkEnabled, setWatermarkEnabled] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setShowOptions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const buildOptions = (): PdfExportOptions => ({
    ...options,
    watermark: watermarkEnabled && watermarkText.trim()
      ? { text: watermarkText.trim(), opacity: 0.12, position: 'diagonal' }
      : null,
  });

  const handleExport = async (format: ExportFormat) => {
    setSelectedFormat(format);
    setIsOpen(false);
    setShowOptions(false);
    const opts = format.id === 'pdf' ? buildOptions() : undefined;
    await onExport(format.id, opts);
  };

  const Icon = selectedFormat.icon;
  const isPdf = selectedFormat.id === 'pdf';

  return (
    <div ref={dropdownRef} className="relative inline-block text-left">
      {/* Main Export Button */}
      <div className="flex gap-0 rounded-lg shadow-sm transition-shadow hover:shadow-md">
        <button
          onClick={() => !disabled && !loading && handleExport(selectedFormat)}
          disabled={disabled || loading}
          aria-label={`Export as ${selectedFormat.label}`}
          className={`
            h-8 px-2.5 bg-gray-900 text-white font-semibold text-xs
            rounded-l-lg hover:bg-black transition-all
            flex items-center gap-2 border border-gray-900
            ${(disabled || loading) ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              Exporting...
            </>
          ) : (
            <>
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-white/12">
                <Download className="w-3 h-3" aria-hidden="true" />
              </span>
              Export {selectedFormat.id.toUpperCase()}
            </>
          )}
        </button>

        {/* Options gear (PDF only) */}
        {isPdf && (
          <button
            onClick={() => { setShowOptions(v => !v); setIsOpen(false); }}
            disabled={disabled || loading}
            title="Export options"
            aria-label="PDF export options"
            className={`
              h-8 px-1.5 bg-gray-900 text-white
              border-l border-gray-700 hover:bg-black transition-all
              ${(disabled || loading) ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <Settings className="w-3 h-3" aria-hidden="true" />
          </button>
        )}

        {/* Format dropdown toggle */}
        <button
          onClick={() => { setIsOpen(v => !v); setShowOptions(false); }}
          disabled={disabled || loading}
          aria-label="Select export format"
          aria-expanded={isOpen}
          className={`
            h-8 px-1.5 bg-gray-900 text-white
            border-l border-gray-800 rounded-r-lg hover:bg-black
            transition-all
            ${(disabled || loading) ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
        </button>
      </div>

      {/* Format Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-2xl border border-[#E3E1DA] z-20 overflow-hidden" role="menu">
          <div className="p-2.5 border-b border-[#F1F0EC] bg-[#EDEBE6]">
            <h3 className="text-sm font-semibold text-[#111111]">Export Format</h3>
          </div>
          <div className="p-2">
            {EXPORT_FORMATS.map((format) => {
              const FormatIcon = format.icon;
              const isSelected = selectedFormat.id === format.id;
              return (
                <button
                  key={format.id}
                  onClick={() => handleExport(format)}
                  role="menuitem"
                  className={`
                    w-full p-2.5 rounded-lg text-left transition-all flex items-start gap-2.5
                    ${isSelected
                      ? 'bg-[#EEF5F1] border-2 border-[#DDE8E1]'
                      : 'hover:bg-[#EDEBE6] border-2 border-transparent'
                    }
                  `}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-[#DDE8E1]' : 'bg-[#F1F0EC]'}`}>
                    <FormatIcon className={`w-4 h-4 ${isSelected ? 'text-[#4F7563]' : 'text-[#6B6B6B]'}`} aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold text-sm ${isSelected ? 'text-[#1A2D24]' : 'text-[#111111]'}`}>{format.label}</span>
                      {isSelected && <span className="text-xs px-2 py-0.5 bg-[#4F7563] text-white rounded-full">Selected</span>}
                    </div>
                    <p className="text-xs text-[#6B6B6B] mt-0.5">{format.description}</p>
                    <p className="text-xs text-[#C9C6BD] mt-1">.{format.extension}</p>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="p-2 border-t border-[#F1F0EC] bg-[#EDEBE6]">
            <p className="text-xs text-[#9A9A9A] text-center">Preserves content and structure</p>
          </div>
        </div>
      )}

      {/* PDF Options Panel */}
      {showOptions && (
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-2xl border border-[#E3E1DA] z-20 overflow-hidden" role="dialog" aria-label="PDF export options">
          <div className="flex items-center justify-between p-3 border-b border-[#F1F0EC] bg-[#EDEBE6]">
            <h3 className="text-sm font-semibold text-[#111111]">PDF Export Options</h3>
            <button onClick={() => setShowOptions(false)} aria-label="Close options" className="text-[#C9C6BD] hover:text-[#111111]">
              <XIcon className="w-4 h-4" />
            </button>
          </div>

          <div className="p-3 space-y-4">
            {/* Paper Size */}
            <div>
              <label className="block text-xs font-semibold text-[#6B6B6B] mb-1.5">Paper Size</label>
              <div className="grid grid-cols-4 gap-1">
                {(['A4', 'Letter', 'A3', 'Legal'] as const).map(size => (
                  <button
                    key={size}
                    onClick={() => setOptions(o => ({ ...o, paperSize: size }))}
                    className={`py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                      options.paperSize === size
                        ? 'border-[#4F7563] bg-[#EEF5F1] text-[#355846]'
                        : 'border-[#E3E1DA] text-[#6B6B6B] hover:bg-[#EDEBE6]'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Quality */}
            <div>
              <label className="block text-xs font-semibold text-[#6B6B6B] mb-1.5">Export Quality</label>
              <div className="grid grid-cols-3 gap-1">
                {([
                  { id: 'standard', label: 'Standard' },
                  { id: 'high', label: 'High Res' },
                  { id: 'compressed', label: 'Compact' },
                ] as const).map(q => (
                  <button
                    key={q.id}
                    onClick={() => setOptions(o => ({ ...o, quality: q.id }))}
                    className={`py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                      options.quality === q.id
                        ? 'border-[#4F7563] bg-[#EEF5F1] text-[#355846]'
                        : 'border-[#E3E1DA] text-[#6B6B6B] hover:bg-[#EDEBE6]'
                    }`}
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Watermark */}
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <input
                  type="checkbox"
                  id="wm-enable"
                  checked={watermarkEnabled}
                  onChange={e => setWatermarkEnabled(e.target.checked)}
                  className="accent-blue-600"
                />
                <label htmlFor="wm-enable" className="text-xs font-semibold text-[#6B6B6B] cursor-pointer">Watermark</label>
              </div>
              {watermarkEnabled && (
                <input
                  type="text"
                  value={watermarkText}
                  onChange={e => setWatermarkText(e.target.value)}
                  placeholder="e.g. DRAFT, CONFIDENTIAL"
                  maxLength={30}
                  className="w-full rounded-lg border border-[#E3E1DA] px-2.5 py-1.5 text-xs text-[#111111] outline-none focus:border-[#A8B9AE]"
                />
              )}
            </div>
          </div>

          <div className="p-3 border-t border-[#F1F0EC] bg-[#EDEBE6]">
            <button
              onClick={() => handleExport(selectedFormat)}
              disabled={loading}
              className="w-full py-2 rounded-lg bg-gray-900 text-white text-xs font-semibold hover:bg-black transition-colors flex items-center justify-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              Export with Options
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
