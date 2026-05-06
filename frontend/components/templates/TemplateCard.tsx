'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Sparkles } from 'lucide-react';
import { IndustryTemplate } from './TemplateGallery';

interface TemplateCardProps {
  template: IndustryTemplate;
  onPreview: (template: IndustryTemplate) => void;
  onUse: (template: IndustryTemplate) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  technology: 'bg-blue-100 text-blue-700',
  fintech: 'bg-green-100 text-green-700',
  ecommerce: 'bg-purple-100 text-purple-700',
  healthcare: 'bg-red-100 text-red-700',
  education: 'bg-yellow-100 text-yellow-700',
  food: 'bg-orange-100 text-orange-700',
  'real-estate': 'bg-pink-100 text-pink-700',
  logistics: 'bg-indigo-100 text-indigo-700',
  industrial: 'bg-gray-100 text-gray-700',
  climate: 'bg-emerald-100 text-emerald-700',
  'creator-economy': 'bg-rose-100 text-rose-700',
  agriculture: 'bg-lime-100 text-lime-700',
  legal: 'bg-slate-100 text-slate-700',
  media: 'bg-fuchsia-100 text-fuchsia-700',
  insurance: 'bg-cyan-100 text-cyan-700',
  travel: 'bg-teal-100 text-teal-700',
  fashion: 'bg-violet-100 text-violet-700',
};

export default function TemplateCard({ template, onPreview, onUse }: TemplateCardProps) {
  const categoryColor = CATEGORY_COLORS[template.category] || 'bg-gray-100 text-gray-700';

  return (
    <div className="bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden group border border-gray-100 hover:border-blue-300">
      {/* Template Preview */}
      <div className="relative h-48 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        {template.thumbnail ? (
          <img
            src={template.thumbnail}
            alt={template.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-center p-6">
            <Sparkles className="w-12 h-12 text-blue-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">{template.industry}</p>
          </div>
        )}
        
        {template.popular && (
          <Badge className="absolute top-3 right-3 bg-yellow-500 text-white">
            <Sparkles className="w-3 h-3 mr-1" />
            Popular
          </Badge>
        )}
      </div>

      {/* Template Info */}
      <div className="p-6">
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
            {template.name}
          </h3>
          <Badge className={categoryColor}>
            {template.category}
          </Badge>
        </div>

        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
          {template.description}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-4">
          {template.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
          {template.tags.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{template.tags.length - 3}
            </Badge>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => onPreview(template)}
            className="flex-1 flex items-center justify-center gap-2"
          >
            <Eye className="w-4 h-4" />
            Preview
          </Button>
          <Button
            onClick={() => onUse(template)}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            Use Template
          </Button>
        </div>
      </div>
    </div>
  );
}
