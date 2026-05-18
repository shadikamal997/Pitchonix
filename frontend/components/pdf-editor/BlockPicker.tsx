'use client';

import React, { useState } from 'react';
import {
  Calendar,
  BarChart3,
  Image as ImageIcon,
  Table as TableIcon,
  Grid3x3,
  Quote,
  Megaphone,
  Layout,
  TrendingUp,
  Columns,
  Target,
  X,
  Search,
} from 'lucide-react';

export interface BlockType {
  id: string;
  name: string;
  description: string;
  icon: any;
  category: 'content' | 'data' | 'media' | 'layout';
  component: string;
}

const blockTypes: BlockType[] = [
  {
    id: 'timeline',
    name: 'Timeline',
    description: 'Display events chronologically',
    icon: Calendar,
    category: 'content',
    component: 'TimelineBlock',
  },
  {
    id: 'swot',
    name: 'SWOT Analysis',
    description: 'Strategic position assessment',
    icon: Target,
    category: 'content',
    component: 'SWOTBlock',
  },
  {
    id: 'kpi-cards',
    name: 'KPI Cards',
    description: 'Key performance indicators',
    icon: TrendingUp,
    category: 'data',
    component: 'KPICardsBlock',
  },
  {
    id: 'chart',
    name: 'Chart',
    description: 'Bar, line, or pie charts',
    icon: BarChart3,
    category: 'data',
    component: 'ChartBlock',
  },
  {
    id: 'table',
    name: 'Table',
    description: 'Data tables with styling',
    icon: TableIcon,
    category: 'data',
    component: 'TableBlock',
  },
  {
    id: 'comparison',
    name: 'Comparison Table',
    description: 'Feature comparison grid',
    icon: Columns,
    category: 'data',
    component: 'ComparisonTableBlock',
  },
  {
    id: 'image',
    name: 'Image',
    description: 'Single or gallery images',
    icon: ImageIcon,
    category: 'media',
    component: 'ImageBlock',
  },
  {
    id: 'feature-grid',
    name: 'Feature Grid',
    description: 'Showcase key features',
    icon: Grid3x3,
    category: 'layout',
    component: 'FeatureGridBlock',
  },
  {
    id: 'testimonial',
    name: 'Testimonial',
    description: 'Customer testimonials',
    icon: Quote,
    category: 'content',
    component: 'TestimonialBlock',
  },
  {
    id: 'cta',
    name: 'Call to Action',
    description: 'CTA section with buttons',
    icon: Megaphone,
    category: 'content',
    component: 'CTABlock',
  },
];

interface BlockPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectBlock: (blockType: BlockType) => void;
}

export function BlockPicker({ isOpen, onClose, onSelectBlock }: BlockPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  if (!isOpen) return null;

  const categories = [
    { id: 'all', name: 'All Blocks' },
    { id: 'content', name: 'Content' },
    { id: 'data', name: 'Data' },
    { id: 'media', name: 'Media' },
    { id: 'layout', name: 'Layout' },
  ];

  const filteredBlocks = blockTypes.filter((block) => {
    const matchesSearch =
      !searchQuery ||
      block.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      block.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      activeCategory === 'all' || block.category === activeCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Insert Block</h2>
              <p className="text-sm text-slate-600 mt-1">
                Choose a block to add to your document
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-100 transition-colors"
            >
              <X className="h-5 w-5 text-slate-600" />
            </button>
          </div>

          {/* Search */}
          <div className="flex items-center gap-2 px-4 py-3 bg-white border border-slate-200 rounded-xl">
            <Search className="h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search blocks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400"
            />
          </div>

          {/* Category Tabs */}
          <div className="flex gap-2 mt-4">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  activeCategory === category.id
                    ? 'bg-green-600 text-white shadow-md'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>

        {/* Block Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-3 gap-4">
            {filteredBlocks.map((block) => {
              const IconComponent = block.icon;
              return (
                <button
                  key={block.id}
                  onClick={() => {
                    onSelectBlock(block);
                    onClose();
                  }}
                  className="group bg-white border-2 border-slate-200 rounded-2xl p-6 hover:border-green-400 hover:shadow-xl transition-all text-left"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:from-green-100 group-hover:to-emerald-100 transition-all">
                    <IconComponent className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-1 group-hover:text-green-700 transition-colors">
                    {block.name}
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {block.description}
                  </p>
                  <div className="mt-3 inline-block px-2.5 py-1 rounded-full bg-slate-100 text-xs font-semibold text-slate-600 capitalize">
                    {block.category}
                  </div>
                </button>
              );
            })}
          </div>

          {filteredBlocks.length === 0 && (
            <div className="text-center py-12">
              <Layout className="h-16 w-16 mx-auto mb-4 text-slate-300" />
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                No blocks found
              </h3>
              <p className="text-sm text-slate-600">
                Try adjusting your search or category filter
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default BlockPicker;
