/**
 * Batch Export Dialog Component
 * Phase 10: Batch Export Features
 */

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExportTemplate, ExportOptions, BatchExportStatus } from '@/types/export';
import { createBatchExport, pollBatchExport } from '@/lib/export-api';
import { TemplateSelector } from './TemplateSelector';
import { ExportOptionsPanel } from './ExportOptionsPanel';

interface BatchExportDialogProps {
  deckIds: string[];
  isOpen: boolean;
  onClose: () => void;
  onComplete?: (status: BatchExportStatus) => void;
}

export function BatchExportDialog({
  deckIds,
  isOpen,
  onClose,
  onComplete,
}: BatchExportDialogProps) {
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
    merge: false,
  });
  const [exportStatus, setExportStatus] = useState<BatchExportStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Reset state when dialog opens
      setStep('format');
      setError(null);
      setExportStatus(null);
    }
  }, [isOpen]);

  const handleStartExport = async () => {
    try {
      setStep('exporting');
      setError(null);

      const job = await createBatchExport(
        deckIds,
        format,
        selectedTemplate?.id,
        options
      );

      // Poll for completion
      await pollBatchExport(job.id, (status) => {
        setExportStatus(status);
      });

      if (onComplete && exportStatus) {
        onComplete(exportStatus);
      }
    } catch (err: any) {
      setError(err.message || 'Export failed');
    }
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
                  Batch Export
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Export {deckIds.length} deck{deckIds.length !== 1 ? 's' : ''}
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
                disabled={step === 'exporting'}
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
          </div>

          {/* Content */}
          <div className="px-6 py-6 overflow-y-auto max-h-[calc(90vh-200px)]">
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
                      className={`p-4 border-2 rounded-lg text-center transition-colors ${
                        format === fmt.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-3xl mb-2">{fmt.icon}</div>
                      <div className="font-medium text-gray-900">{fmt.label}</div>
                      <div className="text-xs text-gray-600 mt-1">{fmt.description}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 'template' && (
              <div className="space-y-4">
                <h3 className="font-medium text-gray-900">Select Template (Optional)</h3>
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

                {/* Merge Option for Batch */}
                <div className="pt-4 border-t border-gray-200">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={options.merge || false}
                      onChange={(e) => setOptions({ ...options, merge: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Merge all exports into a single file
                    </span>
                  </label>
                  <p className="text-xs text-gray-500 mt-1 ml-6">
                    Combine all decks into one {format.toUpperCase()} file
                  </p>
                </div>
              </div>
            )}

            {step === 'exporting' && exportStatus && (
              <div className="space-y-4">
                <h3 className="font-medium text-gray-900">Exporting...</h3>
                
                {/* Progress Bar */}
                <div>
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                    <span>
                      {exportStatus.completedDecks} of {exportStatus.totalDecks} completed
                    </span>
                    <span>{exportStatus.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${exportStatus.progress}%` }}
                    />
                  </div>
                </div>

                {/* Current Deck */}
                {exportStatus.currentDeck && (
                  <div className="text-sm text-gray-600">
                    Currently exporting: <span className="font-medium">{exportStatus.currentDeck}</span>
                  </div>
                )}

                {/* Estimated Completion */}
                {exportStatus.estimatedCompletion && (
                  <div className="text-sm text-gray-600">
                    Estimated completion: {new Date(exportStatus.estimatedCompletion).toLocaleTimeString()}
                  </div>
                )}

                {/* Completion */}
                {exportStatus.status === 'completed' && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="text-sm font-medium text-green-700">
                        Export completed successfully!
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
              disabled={step === 'exporting' && exportStatus?.status !== 'completed'}
            >
              {step === 'exporting' && exportStatus?.status === 'completed' ? 'Close' : 'Cancel'}
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
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
                >
                  Next
                </button>
              )}

              {step === 'template' && (
                <button
                  onClick={() => setStep('options')}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
                >
                  Next
                </button>
              )}

              {step === 'options' && (
                <button
                  onClick={handleStartExport}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
                >
                  Start Export
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
