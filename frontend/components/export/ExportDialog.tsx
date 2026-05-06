/**
 * Export Dialog Component
 * Phase 10: Enhanced Export Features
 */

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExportTemplate, ExportOptions } from '@/types/export';
import { exportDeck } from '@/lib/export-api';
import { TemplateSelector } from './TemplateSelector';
import { ExportOptionsPanel } from './ExportOptionsPanel';

interface ExportDialogProps {
  deckId: string;
  deckTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (fileUrl: string) => void;
}

export function ExportDialog({
  deckId,
  deckTitle,
  isOpen,
  onClose,
  onSuccess,
}: ExportDialogProps) {
  const [step, setStep] = useState<'format' | 'template' | 'options' | 'exporting'>('format');
  const [format, setFormat] = useState<'pptx' | 'pdf' | 'html'>('pdf');
  const [selectedTemplate, setSelectedTemplate] = useState<ExportTemplate | null>(null);
  const [options, setOptions] = useState<ExportOptions>({
    layout: 'slide-based',
    pageSize: 'A4',
    orientation: 'landscape',
    margins: { top: 20, right: 20, bottom: 20, left: 20 },
    headerFooter: true,
    compression: true,
  });
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Reset state when dialog opens
      setStep('format');
      setError(null);
      setSuccess(false);
      setExporting(false);
    }
  }, [isOpen]);

  const handleStartExport = async () => {
    try {
      setExporting(true);
      setError(null);
      setStep('exporting');

      const result = await exportDeck(
        deckId,
        format,
        selectedTemplate?.id,
        options
      );

      if (result.success && result.fileUrl) {
        setSuccess(true);
        if (onSuccess) {
          onSuccess(result.fileUrl);
        }
      } else {
        throw new Error(result.error || 'Export failed');
      }
    } catch (err: any) {
      setError(err.message || 'Export failed');
      setExporting(false);
    }
  };

  const handleDownload = (fileUrl: string) => {
    window.open(fileUrl, '_blank');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Export Deck
                </h2>
                <p className="text-sm text-gray-600 mt-1">{deckTitle}</p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
                disabled={exporting}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Step Indicator */}
            <div className="flex items-center mt-4 space-x-2">
              {['format', 'template', 'options', 'export'].map((s, index) => (
                <div key={s} className="flex items-center flex-1">
                  <div
                    className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                      step === s || (s === 'export' && exporting)
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : index < ['format', 'template', 'options', 'exporting'].indexOf(step)
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-gray-300 text-gray-400'
                    }`}
                  >
                    {index + 1}
                  </div>
                  <div
                    className={`flex-1 h-1 mx-2 ${
                      index < ['format', 'template', 'options', 'exporting'].indexOf(step)
                        ? 'bg-blue-600'
                        : 'bg-gray-300'
                    }`}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-6 overflow-y-auto max-h-[calc(90vh-250px)]">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {step === 'format' && (
              <div className="space-y-4">
                <h3 className="font-medium text-gray-900">Choose Export Format</h3>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { value: 'pdf', label: 'PDF', icon: '📄', description: 'Portable Document Format' },
                    { value: 'pptx', label: 'PPTX', icon: '📊', description: 'PowerPoint Presentation' },
                    { value: 'html', label: 'HTML', icon: '🌐', description: 'Interactive Web Page' },
                  ].map((fmt) => (
                    <button
                      key={fmt.value}
                      onClick={() => setFormat(fmt.value as any)}
                      className={`p-6 border-2 rounded-lg text-center transition-colors ${
                        format === fmt.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-4xl mb-2">{fmt.icon}</div>
                      <div className="font-medium text-gray-900">{fmt.label}</div>
                      <div className="text-xs text-gray-600 mt-1">{fmt.description}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 'template' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-gray-900">Select Template</h3>
                  <button
                    onClick={() => setSelectedTemplate(null)}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    Skip
                  </button>
                </div>
                <TemplateSelector
                  format={format}
                  selectedTemplateId={selectedTemplate?.id}
                  onSelect={setSelectedTemplate}
                />
              </div>
            )}

            {step === 'options' && (
              <div className="space-y-4">
                <h3 className="font-medium text-gray-900">Export Options</h3>
                <ExportOptionsPanel
                  format={format}
                  options={options}
                  onChange={setOptions}
                />
              </div>
            )}

            {step === 'exporting' && (
              <div className="space-y-6 text-center py-8">
                {!success ? (
                  <>
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 mb-2">Exporting your deck...</h3>
                      <p className="text-sm text-gray-600">
                        This may take a few moments
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-center">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 mb-2">Export Complete!</h3>
                      <p className="text-sm text-gray-600">
                        Your deck has been exported successfully
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
              disabled={exporting && !success}
            >
              {success ? 'Close' : 'Cancel'}
            </button>

            <div className="flex items-center space-x-3">
              {step !== 'format' && step !== 'exporting' && (
                <button
                  onClick={() => {
                    if (step === 'template') setStep('format');
                    if (step === 'options') setStep('template');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  Back
                </button>
              )}

              {step === 'format' && (
                <button
                  onClick={() => setStep('template')}
                  className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
                >
                  Next
                </button>
              )}

              {step === 'template' && (
                <button
                  onClick={() => setStep('options')}
                  className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
                >
                  Next
                </button>
              )}

              {step === 'options' && (
                <button
                  onClick={handleStartExport}
                  className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
                >
                  Export
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
