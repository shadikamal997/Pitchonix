'use client';

import React, { useState } from 'react';
import { FileText, BarChart3, Users, Target, Code, Sparkles, Check } from 'lucide-react';

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
  templates?: Template[];
  selectedTemplate?: string;
  onSelectTemplate: (templateType: string) => void;
  autoSelectedTemplate?: string;
}

const CATEGORY_INFO = {
  business_core: {
    label: 'Business Core',
    icon: FileText,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  analytics: {
    label: 'Analytics & Data',
    icon: BarChart3,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
  },
  sales_client: {
    label: 'Sales & Client',
    icon: Users,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
  },
  strategy: {
    label: 'Strategy & Planning',
    icon: Target,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
  },
  product_tech: {
    label: 'Product & Tech',
    icon: Code,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
  },
  brand_content: {
    label: 'Brand & Content',
    icon: Sparkles,
    color: 'text-pink-600',
    bgColor: 'bg-pink-50',
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

export default function TemplateSelector({
  templates = DEFAULT_TEMPLATES,
  selectedTemplate,
  onSelectTemplate,
  autoSelectedTemplate,
}: TemplateSelectorProps) {
  const [activeCategory, setActiveCategory] = useState<string>('all');

  // Group templates by category
  const groupedTemplates = templates.reduce((acc, template) => {
    if (!acc[template.category]) {
      acc[template.category] = [];
    }
    acc[template.category].push(template);
    return acc;
  }, {} as Record<string, Template[]>);

  const filteredTemplates = activeCategory === 'all' 
    ? templates 
    : groupedTemplates[activeCategory] || [];

  const categories = ['all', ...Object.keys(groupedTemplates)];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Choose Your Template</h2>
        <p className="text-gray-600 mt-1">
          Select a professionally designed template for your document
          {autoSelectedTemplate && (
            <span className="inline-flex items-center ml-2 px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
              <Sparkles className="w-3 h-3 mr-1" />
              Auto-suggested: {templates.find(t => t.type === autoSelectedTemplate)?.name}
            </span>
          )}
        </p>
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => {
          const info = category === 'all' 
            ? { label: 'All Templates', icon: FileText, color: 'text-gray-700', bgColor: 'bg-gray-100', borderColor: 'border-gray-300' }
            : CATEGORY_INFO[category as keyof typeof CATEGORY_INFO];
          
          if (!info) return null;
          
          const Icon = info.icon;
          const isActive = activeCategory === category;

          return (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`
                inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all
                ${isActive 
                  ? `${info.bgColor} ${info.borderColor} ${info.color} font-medium shadow-sm` 
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }
              `}
            >
              <Icon className="w-4 h-4" />
              <span className="text-sm">{info.label}</span>
              {category !== 'all' && (
                <span className="text-xs opacity-75">
                  ({groupedTemplates[category]?.length || 0})
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Template Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map((template) => {
          const categoryInfo = CATEGORY_INFO[template.category as keyof typeof CATEGORY_INFO];
          const isSelected = selectedTemplate === template.type;
          const isAutoSuggested = autoSelectedTemplate === template.type;
          const CategoryIcon = categoryInfo?.icon || FileText;

          return (
            <div
              key={template.type}
              onClick={() => onSelectTemplate(template.type)}
              className={`
                relative group cursor-pointer rounded-xl border-2 overflow-hidden
                transition-all duration-300 hover:shadow-xl hover:-translate-y-1
                ${isSelected 
                  ? `${categoryInfo?.borderColor} ring-4 ring-opacity-50 shadow-lg` 
                  : 'border-gray-200 hover:border-gray-300'
                }
              `}
            >
              {/* Preview/Thumbnail Area */}
              <div className={`
                h-48 flex items-center justify-center relative overflow-hidden
                ${categoryInfo?.bgColor || 'bg-gray-100'}
              `}>
                {/* Decorative Pattern */}
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute top-4 left-4 w-24 h-24 border-4 border-current rounded-lg transform -rotate-6"></div>
                  <div className="absolute bottom-4 right-4 w-32 h-32 border-4 border-current rounded-lg transform rotate-12"></div>
                </div>
                
                {/* Icon */}
                <CategoryIcon className={`w-16 h-16 ${categoryInfo?.color || 'text-gray-400'}`} />

                {/* Selection Overlay */}
                {isSelected && (
                  <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center">
                    <div className="bg-white rounded-full p-3 shadow-lg">
                      <Check className="w-8 h-8 text-green-600" />
                    </div>
                  </div>
                )}

                {/* Auto-suggested Badge */}
                {isAutoSuggested && !isSelected && (
                  <div className="absolute top-3 right-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-2 py-1 rounded-full text-xs font-medium shadow-lg flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Suggested
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-5 bg-white">
                {/* Header */}
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-gray-900 text-lg leading-tight">
                    {template.name}
                  </h3>
                  {isSelected && (
                    <div className="bg-green-100 rounded-full p-1">
                      <Check className="w-4 h-4 text-green-600" />
                    </div>
                  )}
                </div>

                {/* Category Badge */}
                <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${categoryInfo?.bgColor} ${categoryInfo?.color} mb-3`}>
                  <CategoryIcon className="w-3 h-3" />
                  {categoryInfo?.label}
                </div>

                {/* Description */}
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {template.description}
                </p>

                {/* Features */}
                {template.features && template.features.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {template.features.slice(0, 3).map((feature, idx) => (
                      <span
                        key={idx}
                        className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded"
                      >
                        {feature}
                      </span>
                    ))}
                    {template.features.length > 3 && (
                      <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded">
                        +{template.features.length - 3} more
                      </span>
                    )}
                  </div>
                )}

                {/* Color Scheme Indicator */}
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Color Scheme</span>
                    <div className="flex gap-1">
                      {getColorSwatches(template.colorScheme).map((color, idx) => (
                        <div
                          key={idx}
                          className="w-4 h-4 rounded-full border border-gray-300"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Hover Effect */}
              <div className={`
                absolute inset-0 border-2 rounded-xl pointer-events-none
                ${isSelected ? categoryInfo?.borderColor : 'border-transparent'}
                group-hover:border-gray-400 transition-colors
              `} />
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">No templates found in this category</p>
        </div>
      )}
    </div>
  );
}

// Helper function to get color swatches
function getColorSwatches(colorScheme: string): string[] {
  const schemes: Record<string, string[]> = {
    blue: ['#3B82F6', '#60A5FA', '#DBEAFE'],
    navy: ['#1E3A8A', '#3B82F6', '#BFDBFE'],
    gray: ['#4B5563', '#9CA3AF', '#E5E7EB'],
    purple: ['#9333EA', '#C084FC', '#E9D5FF'],
    green: ['#10B981', '#34D399', '#D1FAE5'],
    red: ['#EF4444', '#F87171', '#FEE2E2'],
  };
  return schemes[colorScheme] || schemes.gray;
}
