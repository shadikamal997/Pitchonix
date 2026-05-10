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
    <div className="space-y-4">
      {/* Compact Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">Choose Template</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Select a professional design
          {autoSelectedTemplate && (
            <span className="inline-flex items-center ml-2 px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
              <Sparkles className="w-3 h-3 mr-0.5" />
              Suggested
            </span>
          )}
        </p>
      </div>

      {/* Compact Category Pills */}
      <div className="flex flex-wrap gap-1.5">
        {categories.map((category) => {
          const info = category === 'all' 
            ? { label: 'All', icon: FileText, color: 'text-gray-700', bgColor: 'bg-gray-100', borderColor: 'border-gray-300' }
            : CATEGORY_INFO[category as keyof typeof CATEGORY_INFO];
          
          if (!info) return null;
          
          const Icon = info.icon;
          const isActive = activeCategory === category;

          return (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`
                inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all
                ${isActive 
                  ? `${info.bgColor} ${info.color} shadow-sm` 
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }
              `}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{info.label}</span>
            </button>
          );
        })}
      </div>

      {/* Compact Template Grid */}
      <div className="grid grid-cols-2 gap-3 max-h-[520px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
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
                relative group cursor-pointer rounded-lg border overflow-hidden
                transition-all duration-200 hover:shadow-md
                ${isSelected 
                  ? 'border-blue-500 ring-2 ring-blue-100 shadow-sm' 
                  : 'border-gray-200 hover:border-gray-300'
                }
              `}
            >
              {/* Visual Preview - Image Dominant */}
              <div className={`
                h-32 relative overflow-hidden flex items-center justify-center
                ${categoryInfo?.bgColor || 'bg-gray-50'}
              `}>
                {/* Minimal Pattern */}
                <div className="absolute inset-0 opacity-5">
                  <div className="absolute top-2 left-2 w-16 h-16 border-2 border-current rounded transform -rotate-6"></div>
                  <div className="absolute bottom-2 right-2 w-20 h-20 border-2 border-current rounded transform rotate-12"></div>
                </div>
                
                {/* Icon - Smaller */}
                <CategoryIcon className={`w-10 h-10 ${categoryInfo?.color || 'text-gray-400'} opacity-80`} />

                {/* Selection Badge */}
                {isSelected && (
                  <div className="absolute top-2 right-2 bg-blue-500 rounded-full p-1.5 shadow-md">
                    <Check className="w-3.5 h-3.5 text-white" />
                  </div>
                )}

                {/* Auto-suggested Badge */}
                {isAutoSuggested && !isSelected && (
                  <div className="absolute top-2 right-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white px-1.5 py-0.5 rounded-full text-xs font-medium flex items-center gap-0.5">
                    <Sparkles className="w-2.5 h-2.5" />
                    <span className="text-[10px]">AI</span>
                  </div>
                )}
              </div>

              {/* Compact Content */}
              <div className="p-3 bg-white">
                {/* Title - Clean and Scannable */}
                <h3 className="font-semibold text-gray-900 text-sm leading-tight mb-1 line-clamp-1">
                  {template.name}
                </h3>

                {/* Description - Smaller and Subtle */}
                <p className="text-xs text-gray-500 mb-2 line-clamp-2 leading-relaxed">
                  {template.description}
                </p>

                {/* Features - Compact Pills */}
                {template.features && template.features.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {template.features.slice(0, 2).map((feature, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded"
                      >
                        {feature}
                      </span>
                    ))}
                    {template.features.length > 2 && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-400 rounded">
                        +{template.features.length - 2}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Elegant Hover Border */}
              <div className={`
                absolute inset-0 rounded-lg pointer-events-none transition-all duration-200
                ${isSelected 
                  ? 'ring-2 ring-blue-500 ring-opacity-50' 
                  : 'group-hover:ring-1 group-hover:ring-gray-300'
                }
              `} />
            </div>
          );
        })}
      </div>

      {/* Compact Empty State */}
      {filteredTemplates.length === 0 && (
        <div className="text-center py-8">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">No templates in this category</p>
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
