'use client';

import React, { useState, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ChevronDown,
  FileText,
  BarChart3,
  Users,
  Target,
  Code,
  Sparkles,
  Search,
  X,
  Check
} from 'lucide-react';

export interface Template {
  type: string;
  name: string;
  description: string;
  category: string;
  preview?: string;
  colorScheme: string;
  features?: string[];
}

interface TemplateSelectorProps {
  open?: boolean;
  selectedTemplate?: string;
  onToggle?: () => void;
  onSelectTemplate: (templateType: string) => void;
  onClear?: () => void;
  autoSelectedTemplate?: string;
  mode?: 'dropdown' | 'inline'; // NEW: Allow explicit mode selection
}

const CATEGORY_INFO = {
  business_core: {
    label: 'Business Core',
    icon: FileText,
    color: 'text-[#4F7563]',
    bgColor: 'bg-[#EEF5F1]',
    borderColor: 'border-[#DDE8E1]',
  },
  analytics: {
    label: 'Analytics & Data',
    icon: BarChart3,
    color: 'text-[#4F7563]',
    bgColor: 'bg-[#EEF5F1]',
    borderColor: 'border-[#DDE8E1]',
  },
  sales_client: {
    label: 'Sales & Client',
    icon: Users,
    color: 'text-[#4F7563]',
    bgColor: 'bg-[#EEF5F1]',
    borderColor: 'border-[#DDE8E1]',
  },
  strategy: {
    label: 'Strategy & Planning',
    icon: Target,
    color: 'text-[#8c6210]',
    bgColor: 'bg-[#FAEEDB]',
    borderColor: 'border-orange-200',
  },
  product_tech: {
    label: 'Product & Tech',
    icon: Code,
    color: 'text-[#355846]',
    bgColor: 'bg-[#EEF5F1]',
    borderColor: 'border-indigo-200',
  },
  brand_content: {
    label: 'Brand & Content',
    icon: Sparkles,
    color: 'text-[#9a3737]',
    bgColor: 'bg-[#FCF1F1]',
    borderColor: 'border-pink-200',
  },
};

const DEFAULT_TEMPLATES: Template[] = [
  // Business Core
  { type: 'modern_one_pager', name: 'Modern One Pager', description: 'Clean, modern single-page executive summary', category: 'business_core', colorScheme: 'blue', features: ['Hero Header', 'Metrics', 'Process Steps'] },
  { type: 'executive_one_pager', name: 'Executive One Pager', description: 'Professional executive summary with metrics', category: 'business_core', colorScheme: 'navy', features: ['Cover Page', 'Metrics Strip', 'Two Columns'] },
  { type: 'business_plan_pro', name: 'Business Plan Pro', description: 'Comprehensive business plan with TOC', category: 'business_core', colorScheme: 'blue', features: ['Cover', 'TOC', 'Tables', 'Charts'] },
  { type: 'clean_business_report', name: 'Clean Business Report', description: 'Minimalist business report template', category: 'business_core', colorScheme: 'gray', features: ['Hero Header', 'Text Blocks', 'Tables'] },
  { type: 'corporate_overview', name: 'Corporate Overview', description: 'Corporate presentation with case studies', category: 'business_core', colorScheme: 'navy', features: ['Cover', 'Metrics', 'Case Studies'] },

  // Analytics
  { type: 'financial_report', name: 'Financial Report', description: 'Data-driven financial analysis', category: 'analytics', colorScheme: 'green', features: ['Cover', 'Charts', 'Tables', 'Metrics'] },
  { type: 'kpi_dashboard_report', name: 'KPI Dashboard Report', description: 'Visual KPI dashboard with charts', category: 'analytics', colorScheme: 'blue', features: ['Hero', 'Metrics', 'Charts'] },
  { type: 'budget_plan_report', name: 'Budget Plan Report', description: 'Budget planning with tables & charts', category: 'analytics', colorScheme: 'green', features: ['Tables', 'Charts', 'Financial Data'] },
  { type: 'data_insights_report', name: 'Data Insights Report', description: 'Data visualization and insights', category: 'analytics', colorScheme: 'purple', features: ['Cover', 'Charts', 'Insights'] },

  // Sales & Client
  { type: 'client_proposal_pro', name: 'Client Proposal Pro', description: 'Professional client proposal', category: 'sales_client', colorScheme: 'blue', features: ['Cover', 'Case Studies', 'Pricing'] },
  { type: 'sales_proposal_advanced', name: 'Sales Proposal Advanced', description: 'Advanced sales proposal with TOC', category: 'sales_client', colorScheme: 'purple', features: ['Cover', 'Metrics', 'Quotes', 'TOC'] },
  { type: 'client_performance_report', name: 'Client Performance Report', description: 'Client success metrics & charts', category: 'sales_client', colorScheme: 'blue', features: ['Metrics', 'Charts', 'Tables'] },
  { type: 'partnership_proposal', name: 'Partnership Proposal', description: 'Partnership opportunity proposal', category: 'sales_client', colorScheme: 'navy', features: ['Cover', 'Two Columns', 'Process Steps'] },

  // Strategy
  { type: 'strategy_document', name: 'Strategy Document', description: 'Strategic planning document', category: 'strategy', colorScheme: 'blue', features: ['Cover', 'Timeline', 'Tables', 'TOC'] },
  { type: 'roadmap_timeline', name: 'Roadmap Timeline', description: 'Visual roadmap with timeline', category: 'strategy', colorScheme: 'purple', features: ['Timeline', 'Milestones'] },
  { type: 'okr_goals_report', name: 'OKR Goals Report', description: 'OKR tracking and reporting', category: 'strategy', colorScheme: 'green', features: ['Sections', 'Tables', 'Metrics'] },
  { type: 'internal_team_report', name: 'Internal Team Report', description: 'Internal team updates & metrics', category: 'strategy', colorScheme: 'gray', features: ['Hero', 'Metrics', 'Sections'] },

  // Product & Tech
  { type: 'product_requirements', name: 'Product Requirements (PRD)', description: 'Detailed product requirements doc', category: 'product_tech', colorScheme: 'blue', features: ['Cover', 'Sections', 'Tables', 'TOC'] },
  { type: 'technical_documentation', name: 'Technical Documentation', description: 'Technical specs and documentation', category: 'product_tech', colorScheme: 'gray', features: ['Sections', 'Text', 'Tables', 'TOC'] },

  // Brand & Content
  { type: 'brand_guidelines', name: 'Brand Guidelines', description: 'Comprehensive brand guidelines', category: 'brand_content', colorScheme: 'purple', features: ['Cover', 'Images', 'Two Columns', 'TOC'] },
];

const CATEGORIES = ['All', 'Business', 'Analytics', 'Sales', 'Strategy', 'Product', 'Brand'];

export default function TemplateSelector({
  open = false,
  selectedTemplate,
  onToggle,
  onSelectTemplate,
  onClear,
  autoSelectedTemplate,
  mode,
}: TemplateSelectorProps) {
  const [activeCategory, setActiveCategory] = useState('All');
  const [query, setQuery] = useState('');

  // Determine mode: if onToggle is provided, it's dropdown mode; otherwise inline
  const isDropdownMode = mode === 'dropdown' || (onToggle !== undefined);

  const selectedTemplateData = DEFAULT_TEMPLATES.find(t => t.type === selectedTemplate);

  const visibleTemplates = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return DEFAULT_TEMPLATES.filter(template => {
      const categoryMatch =
        activeCategory === 'All' ||
        (activeCategory === 'Business' && template.category === 'business_core') ||
        (activeCategory === 'Analytics' && template.category === 'analytics') ||
        (activeCategory === 'Sales' && template.category === 'sales_client') ||
        (activeCategory === 'Strategy' && template.category === 'strategy') ||
        (activeCategory === 'Product' && template.category === 'product_tech') ||
        (activeCategory === 'Brand' && template.category === 'brand_content');

      const queryMatch =
        !normalizedQuery ||
        [template.name, template.description, template.category, ...(template.features || [])]
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery);

      return categoryMatch && queryMatch;
    });
  }, [activeCategory, query]);

  const TemplateCard = ({ template, compact = false }: { template: Template; compact?: boolean }) => {
    const categoryInfo = CATEGORY_INFO[template.category as keyof typeof CATEGORY_INFO];
    const isSelected = selectedTemplate === template.type;
    const isAutoSuggested = autoSelectedTemplate === template.type;
    const CategoryIcon = categoryInfo?.icon || FileText;

    return (
      <button
        onClick={() => {
          onSelectTemplate(template.type);
          if (isDropdownMode && onToggle) onToggle();
        }}
        className={`group w-full overflow-hidden rounded-2xl border bg-white text-left shadow-sm transition-all duration-200 ${
          isSelected
            ? 'border-teal-500 shadow-teal-100 ring-4 ring-teal-100'
            : 'border-[#E3E1DA] hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-xl'
        }`}
      >
        {/* Visual Preview */}
        <div className="relative p-2.5 pb-0">
          <div className={`relative aspect-[16/9] overflow-hidden rounded-2xl ${categoryInfo?.bgColor || 'bg-[#EDEBE6]'} p-3.5`}>
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-5">
              <div className="absolute top-2 left-2 w-16 h-16 border-2 border-current rounded transform -rotate-6"></div>
              <div className="absolute bottom-2 right-2 w-20 h-20 border-2 border-current rounded transform rotate-12"></div>
            </div>

            {/* Icon */}
            <CategoryIcon className={`absolute inset-0 m-auto w-12 h-12 ${categoryInfo?.color || 'text-[#C9C6BD]'} opacity-80`} />

            {/* Selection Badge */}
            {isSelected && (
              <span className="absolute right-6 top-6 rounded-full bg-teal-600 p-1.5 text-white shadow-lg">
                <Check className="h-4 w-4" />
              </span>
            )}

            {/* Auto-suggested Badge */}
            {isAutoSuggested && !isSelected && (
              <div className="absolute top-6 right-6 bg-gradient-to-r from-blue-500 to-purple-500 text-white px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                AI Pick
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-black leading-tight text-gray-950">{template.name}</div>
              <div className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#9A9A9A]">{template.description}</div>
            </div>
            <span className="shrink-0 rounded-full bg-gray-950 px-2.5 py-1 text-[10px] font-bold text-white">
              {categoryInfo?.label.split(' ')[0] || 'Template'}
            </span>
          </div>

          {/* Features */}
          {template.features && template.features.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {template.features.slice(0, 3).map((feature, idx) => (
                <span key={idx} className="rounded-full border border-[#E3E1DA] bg-[#EDEBE6] px-2 py-1 text-[10px] font-semibold text-[#6B6B6B]">
                  {feature}
                </span>
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="mt-3 flex items-center justify-between border-t border-[#F1F0EC] pt-3">
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-[#9A9A9A]">
              <Sparkles className="h-3.5 w-3.5 text-[#4F7563]" />
              {template.features?.length || 0} features
            </span>
            <span className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
              isSelected ? 'bg-teal-600 text-white' : 'bg-gray-950 text-white group-hover:bg-teal-600'
            }`}>
              {isSelected ? 'Selected' : 'Select'}
            </span>
          </div>
        </div>
      </button>
    );
  };

  // INLINE MODE - Render full component inline
  if (!isDropdownMode) {
    return (
      <div className="space-y-4">
        {/* Header */}
        <div>
          <h2 className="text-xl font-bold text-[#111111] flex items-center gap-2">
            <FileText className="h-5 w-5 text-[#111111]" />
            Choose Template
          </h2>
          <p className="text-sm text-[#9A9A9A] mt-0.5">
            Select a professional design • 20 templates available
            {autoSelectedTemplate && (
              <span className="inline-flex items-center ml-2 px-2 py-0.5 rounded text-xs font-medium bg-[#EEF5F1] text-[#355846]">
                <Sparkles className="w-3 h-3 mr-0.5" />
                AI Suggested
              </span>
            )}
          </p>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 rounded-xl border border-[#E3E1DA] bg-[#EDEBE6] px-3 py-2.5">
          <Search className="h-4 w-4 shrink-0 text-[#C9C6BD]" />
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Search templates by name, category, or feature..."
            className="min-w-0 flex-1 bg-transparent text-sm font-medium text-[#111111] outline-none placeholder:text-[#C9C6BD]"
          />
        </div>

        {/* Categories */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(category => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition-all ${
                activeCategory === category
                  ? 'bg-gray-950 text-white shadow-sm'
                  : 'border border-[#E3E1DA] bg-white text-[#6B6B6B] hover:border-[#C9C6BD] hover:bg-[#EDEBE6]'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Results Counter */}
        <div className="flex items-center justify-between px-1">
          <div className="text-xs font-bold text-[#9A9A9A]">
            {visibleTemplates.length} professional {visibleTemplates.length === 1 ? 'template' : 'templates'}
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-[#EEF5F1] px-2.5 py-1 text-[11px] font-bold text-[#355846]">
            <Sparkles className="h-3.5 w-3.5" />
            Premium designs
          </div>
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-2 gap-3 max-h-[600px] overflow-y-auto pr-2">
          {visibleTemplates.map(template => (
            <TemplateCard key={template.type} template={template} />
          ))}
        </div>

        {/* Empty State */}
        {visibleTemplates.length === 0 && (
          <div className="rounded-3xl border border-dashed border-[#C9C6BD] bg-white p-8 text-center">
            <div className="text-sm font-bold text-[#111111]">No matching templates</div>
            <div className="mt-1 text-xs text-[#9A9A9A]">Try another category or search term.</div>
          </div>
        )}
      </div>
    );
  }

  // DROPDOWN MODE - Render as dropdown button + modal
  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className={`group flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold shadow-sm transition-all ${
          selectedTemplate
            ? 'border-teal-500 bg-[#EEF5F1] text-teal-800 shadow-teal-100'
            : 'border-[#E3E1DA] bg-white text-[#111111] hover:border-[#C9C6BD] hover:bg-[#EDEBE6] hover:shadow-md'
        }`}
        title="Templates"
      >
        <FileText className="h-3.5 w-3.5" />
        <span className="hidden md:inline">Templates</span>
        {selectedTemplateData && (
          <span className="hidden max-w-[104px] truncate text-[10px] opacity-75 2xl:inline">
            {selectedTemplateData.name}
          </span>
        )}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 top-full z-50 mt-3 flex h-[min(74vh,650px)] w-[min(calc(100vw-2rem),920px)] flex-col overflow-hidden rounded-3xl border border-[#E3E1DA] bg-white shadow-[0_20px_64px_rgba(15,23,42,0.20)]"
          >
            {/* Header */}
            <div className="shrink-0 border-b border-[#F1F0EC] bg-white/95 px-4 pb-3 pt-4 backdrop-blur">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gray-950 text-white shadow-sm">
                      <FileText className="h-4 w-4" />
                    </span>
                    <div>
                      <div className="text-sm font-black leading-tight text-gray-950">Templates</div>
                      <div className="text-xs font-medium text-[#9A9A9A]">20 professional designs</div>
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {selectedTemplate && onClear && (
                    <button
                      onClick={onClear}
                      className="rounded-full border border-[#E3E1DA] px-3 py-1.5 text-[11px] font-bold text-[#6B6B6B] transition-colors hover:border-[#C9C6BD] hover:bg-[#EDEBE6]"
                    >
                      Clear
                    </button>
                  )}
                  <button
                    onClick={onToggle}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-[#E3E1DA] text-[#9A9A9A] transition-colors hover:bg-[#EDEBE6] hover:text-[#111111]"
                    aria-label="Close Templates"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Search */}
              <div className="mt-3 flex items-center gap-2 rounded-2xl border border-[#E3E1DA] bg-[#EDEBE6] px-3 py-2">
                <Search className="h-4 w-4 shrink-0 text-[#C9C6BD]" />
                <input
                  value={query}
                  onChange={event => setQuery(event.target.value)}
                  placeholder="Search templates"
                  className="min-w-0 flex-1 bg-transparent text-sm font-medium text-[#111111] outline-none placeholder:text-[#C9C6BD]"
                />
              </div>

              {/* Categories */}
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {CATEGORIES.map(category => (
                  <button
                    key={category}
                    onClick={() => setActiveCategory(category)}
                    className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold transition-all ${
                      activeCategory === category
                        ? 'bg-gray-950 text-white shadow-sm'
                        : 'border border-[#E3E1DA] bg-white text-[#6B6B6B] hover:border-[#C9C6BD] hover:bg-[#EDEBE6]'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            {/* Templates Grid */}
            <div className="min-h-0 flex-1 overflow-y-auto bg-gradient-to-b from-gray-50 to-white px-3.5 py-3.5">
              <div className="mb-3 flex items-center justify-between px-1">
                <div className="text-xs font-bold text-[#9A9A9A]">
                  {visibleTemplates.length} professional {visibleTemplates.length === 1 ? 'template' : 'templates'}
                </div>
                <div className="flex items-center gap-1.5 rounded-full bg-[#EEF5F1] px-2.5 py-1 text-[11px] font-bold text-[#355846]">
                  <Sparkles className="h-3.5 w-3.5" />
                  Premium designs
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {visibleTemplates.map(template => (
                  <TemplateCard key={template.type} template={template} />
                ))}
              </div>

              {visibleTemplates.length === 0 && (
                <div className="col-span-2 rounded-3xl border border-dashed border-[#C9C6BD] bg-white p-8 text-center">
                  <div className="text-sm font-bold text-[#111111]">No matching templates</div>
                  <div className="mt-1 text-xs text-[#9A9A9A]">Try another category or search term.</div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
