/**
 * Template Selector Component
 * Phase 10: Export Templates
 */

'use client';

import { useState, useEffect } from 'react';
import { ExportTemplate } from '@/types/export';
import { getTemplates } from '@/lib/export-api';
import { motion } from 'framer-motion';

interface TemplateSelectorProps {
  format: 'pptx' | 'pdf' | 'html';
  selectedTemplateId?: string;
  onSelect: (template: ExportTemplate | null) => void;
}

export function TemplateSelector({
  format,
  selectedTemplateId,
  onSelect,
}: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<ExportTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTemplates();
  }, [format]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      setError(null);
      const allTemplates = await getTemplates();
      
      // Filter templates by format
      const filtered = allTemplates.filter((t) => t.format === format);
      setTemplates(filtered);

      // Auto-select default template if none selected
      if (!selectedTemplateId) {
        const defaultTemplate = filtered.find((t) => t.isDefault);
        if (defaultTemplate) {
          onSelect(defaultTemplate);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <p className="text-sm text-gray-600">No templates available for {format.toUpperCase()}</p>
      </div>
    );
  }

  // Separate system and custom templates
  const systemTemplates = templates.filter((t) => t.type === 'system');
  const customTemplates = templates.filter((t) => t.type === 'custom');

  return (
    <div className="space-y-6">
      {/* System Templates */}
      {systemTemplates.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">System Templates</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {systemTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                isSelected={template.id === selectedTemplateId}
                onSelect={() => onSelect(template)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Custom Templates */}
      {customTemplates.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">My Templates</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {customTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                isSelected={template.id === selectedTemplateId}
                onSelect={() => onSelect(template)}
              />
            ))}
          </div>
        </div>
      )}

      {/* None Option */}
      <div>
        <button
          onClick={() => onSelect(null)}
          className={`w-full p-4 border-2 rounded-lg text-left transition-colors ${
            !selectedTemplateId
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900">No Template</h4>
              <p className="text-sm text-gray-600 mt-1">Use default export settings</p>
            </div>
            {!selectedTemplateId && (
              <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 12 12">
                  <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" fill="none" />
                </svg>
              </div>
            )}
          </div>
        </button>
      </div>
    </div>
  );
}

interface TemplateCardProps {
  template: ExportTemplate;
  isSelected: boolean;
  onSelect: () => void;
}

function TemplateCard({ template, isSelected, onSelect }: TemplateCardProps) {
  const primaryColor = template.colors?.primary || '#3B82F6';

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
      className={`relative p-4 border-2 rounded-lg text-left transition-colors ${
        isSelected
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      {/* Color Preview */}
      <div className="flex items-center space-x-2 mb-3">
        <div
          className="w-8 h-8 rounded"
          style={{ backgroundColor: primaryColor }}
        />
        {template.colors?.secondary && (
          <div
            className="w-8 h-8 rounded"
            style={{ backgroundColor: template.colors.secondary }}
          />
        )}
        {template.colors?.accent && (
          <div
            className="w-8 h-8 rounded"
            style={{ backgroundColor: template.colors.accent }}
          />
        )}
      </div>

      {/* Template Info */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="font-medium text-gray-900">
            {template.name}
            {template.isDefault && (
              <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                Default
              </span>
            )}
          </h4>
          {template.description && (
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
              {template.description}
            </p>
          )}

          {/* Font Info */}
          {template.fonts && (
            <div className="mt-2 text-xs text-gray-500">
              <span>{template.fonts.heading}</span>
              {template.fonts.body && template.fonts.body !== template.fonts.heading && (
                <span> / {template.fonts.body}</span>
              )}
            </div>
          )}
        </div>

        {/* Selected Indicator */}
        {isSelected && (
          <div className="ml-3 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 12 12">
              <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" fill="none" />
            </svg>
          </div>
        )}
      </div>

      {/* Watermark Indicator */}
      {template.watermark && (
        <div className="mt-2 flex items-center text-xs text-gray-500">
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"
            />
          </svg>
          Watermark included
        </div>
      )}
    </motion.button>
  );
}
