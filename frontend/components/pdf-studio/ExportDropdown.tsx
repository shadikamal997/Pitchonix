'use client';

import React, { useState } from 'react';
import { Download, FileText, FileImage, Presentation, ChevronDown, Loader2 } from 'lucide-react';

export interface ExportFormat {
  id: string;
  label: string;
  icon: React.ElementType;
  description: string;
  extension: string;
  contentType: string;
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
  onExport: (format: string) => Promise<void>;
  loading?: boolean;
  disabled?: boolean;
}

export default function ExportDropdown({
  onExport,
  loading = false,
  disabled = false,
}: ExportDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>(EXPORT_FORMATS[0]);

  const handleExport = async (format: ExportFormat) => {
    setSelectedFormat(format);
    setIsOpen(false);
    await onExport(format.id);
  };

  const Icon = selectedFormat.icon;

  return (
    <div className="relative inline-block text-left">
      {/* Main Export Button */}
      <div className="flex gap-0 rounded-lg shadow-sm transition-shadow hover:shadow-md">
        <button
          onClick={() => !disabled && !loading && handleExport(selectedFormat)}
          disabled={disabled || loading}
          className={`
            h-8 px-2.5 bg-gray-900 text-white font-semibold text-xs
            rounded-l-lg hover:bg-black transition-all
            flex items-center gap-2 border border-gray-900
            ${(disabled || loading) ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-white/12">
                <Download className="w-3 h-3" />
              </span>
              Export {selectedFormat.id.toUpperCase()}
            </>
          )}
        </button>

        {/* Dropdown Toggle */}
        <button
          onClick={() => !disabled && !loading && setIsOpen(!isOpen)}
          disabled={disabled || loading}
          className={`
            h-8 px-1.5 bg-gray-900 text-white
            border border-l border-gray-800 rounded-r-lg hover:bg-black
            transition-all
            ${(disabled || loading) ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-2xl border border-gray-200 z-20 overflow-hidden">
            <div className="p-2.5 border-b border-gray-100 bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-900">Export Format</h3>
            </div>
            
            <div className="p-2">
              {EXPORT_FORMATS.map((format) => {
                const FormatIcon = format.icon;
                const isSelected = selectedFormat.id === format.id;

                return (
                  <button
                    key={format.id}
                    onClick={() => handleExport(format)}
                    className={`
                      w-full p-2.5 rounded-lg text-left transition-all flex items-start gap-2.5
                      ${isSelected 
                        ? 'bg-blue-50 border-2 border-blue-200' 
                        : 'hover:bg-gray-50 border-2 border-transparent'
                      }
                    `}
                  >
                    <div className={`
                      w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
                      ${isSelected ? 'bg-blue-100' : 'bg-gray-100'}
                    `}>
                      <FormatIcon className={`w-4 h-4 ${isSelected ? 'text-blue-600' : 'text-gray-600'}`} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold text-sm ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                          {format.label}
                        </span>
                        {isSelected && (
                          <span className="text-xs px-2 py-0.5 bg-blue-600 text-white rounded-full">
                            Selected
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 mt-0.5">{format.description}</p>
                      <p className="text-xs text-gray-400 mt-1">.{format.extension}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="p-2 border-t border-gray-100 bg-gray-50">
              <p className="text-xs text-gray-500 text-center">
                Preserves content and structure
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
