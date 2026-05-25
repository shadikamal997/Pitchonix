'use client';

import { useState, useEffect } from 'react';
import { Search, Sparkles, TrendingUp, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';
import TemplateCard from './TemplateCard';
import TemplatePreviewModal from './TemplatePreviewModal';

export interface IndustryTemplate {
  id: string;
  name: string;
  category: string;
  industry: string;
  documentType: string;
  description: string;
  thumbnail?: string;
  tags: string[];
  popular: boolean;
  prefilled: {
    companyName: string;
    industry: string;
    shortDescription: string;
    problem: string;
    solution: string;
    targetCustomers: string;
    marketOpportunity: string;
    competitors: string;
    differentiation: string;
    revenueModel: string;
    pricing: string;
    currentTraction: string;
    team: string;
    fundingAsk: string;
    roadmap: string;
  };
}

interface TemplateGalleryProps {
  onSelectTemplate: (template: IndustryTemplate) => void;
  onCancel: () => void;
}

const CATEGORIES = [
  { id: 'all', name: 'All Templates', icon: Sparkles },
  { id: 'popular', name: 'Popular', icon: TrendingUp },
  { id: 'technology', name: 'Technology', icon: Filter },
  { id: 'fintech', name: 'Fintech', icon: Filter },
  { id: 'ecommerce', name: 'E-commerce', icon: Filter },
  { id: 'healthcare', name: 'Healthcare', icon: Filter },
  { id: 'education', name: 'Education', icon: Filter },
];

export default function TemplateGallery({ onSelectTemplate, onCancel }: TemplateGalleryProps) {
  const [templates, setTemplates] = useState<IndustryTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<IndustryTemplate[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedTemplate, setSelectedTemplate] = useState<IndustryTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    filterTemplates();
  }, [templates, searchQuery, selectedCategory]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      let endpoint = '/templates';
      if (selectedCategory === 'popular') {
        endpoint = '/templates/popular';
      } else if (selectedCategory !== 'all') {
        endpoint = `/templates/category/${selectedCategory}`;
      }
      const { data } = await api.get(endpoint);
      setTemplates(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching templates:', err);
      setError('Failed to load templates. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filterTemplates = () => {
    let filtered = [...templates];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (template) =>
          template.name.toLowerCase().includes(query) ||
          template.description.toLowerCase().includes(query) ||
          template.industry.toLowerCase().includes(query) ||
          template.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    setFilteredTemplates(filtered);
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    
    // If there's a search query, use the search API
    if (query.trim()) {
      try {
        const { data } = await api.get('/templates/search', { params: { q: query } });
        setFilteredTemplates(data);
      } catch (err) {
        console.error('Search error:', err);
      }
    }
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setSearchQuery('');
    fetchTemplates();
  };

  const handlePreview = (template: IndustryTemplate) => {
    setSelectedTemplate(template);
  };

  const handleUseTemplate = (template: IndustryTemplate) => {
    onSelectTemplate(template);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 py-12 px-6">
        <div className="max-w-[1600px] mx-auto">
          <div className="text-center py-32">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center animate-pulse">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-[#E3E1DA] border-t-green-600 mx-auto mb-6"></div>
            <h3 className="text-2xl font-bold text-[#111111] mb-2">Loading Premium Templates</h3>
            <p className="text-lg text-[#6B6B6B]">Preparing your creative workspace...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 py-12 px-6">
        <div className="max-w-[1600px] mx-auto">
          <div className="text-center py-32">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
              <X className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-[#111111] mb-3">Unable to Load Templates</h3>
            <p className="text-lg text-[#9a3737] mb-8">{error}</p>
            <Button 
              onClick={fetchTemplates} 
              size="lg"
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-8"
            >
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 py-8 px-4">
      <div className="max-w-[1400px] mx-auto">
        {/* Premium Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-[#DDE8E1]/50 mb-2">
              <Sparkles className="w-3 h-3 text-[#4F7563]" />
              <span className="text-xs font-semibold text-[#355846]">Premium Templates</span>
            </div>
            <h1 className="text-3xl font-bold text-[#111111] tracking-tight">
              Choose Your Template
            </h1>
            <p className="text-sm text-[#6B6B6B] max-w-2xl">
              Professional, industry-specific templates crafted for success. Start creating in minutes.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={onCancel}
            size="sm"
            className="flex items-center gap-1.5 border-[#C9C6BD] hover:bg-[#EDEBE6] px-4"
          >
            <X className="w-3 h-3" />
            Create from Scratch
          </Button>
        </div>

        {/* Premium Search Bar */}
        <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-md shadow-slate-200/50 p-3 mb-5 border border-[#E3E1DA]/60">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#C9C6BD] w-4 h-4" />
            <Input
              type="text"
              placeholder="Search templates by name, industry, or tag..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 pr-4 py-2 text-sm rounded-lg border-[#E3E1DA] focus:border-green-400 focus:ring-2 focus:ring-[#DDE8E1] bg-white"
            />
          </div>
        </div>

        {/* Premium Category Filter */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
          {CATEGORIES.map((category) => (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? 'default' : 'outline'}
              onClick={() => handleCategoryChange(category.id)}
              size="sm"
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 font-semibold text-xs transition-all ${
                selectedCategory === category.id
                  ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-md shadow-green-500/30 border-0'
                  : 'bg-white border-[#E3E1DA] text-[#111111] hover:border-[#A8B9AE] hover:bg-[#EEF5F1]/50'
              }`}
            >
              <category.icon className="w-3 h-3" />
              {category.name}
            </Button>
          ))}
        </div>

        {/* Templates Grid */}
        {filteredTemplates.length === 0 ? (
          <div className="text-center py-32 bg-white/60 backdrop-blur-xl rounded-3xl border border-[#E3E1DA]/60">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 flex items-center justify-center">
              <Sparkles className="w-10 h-10 text-[#C9C6BD]" />
            </div>
            <h3 className="text-2xl font-bold text-[#111111] mb-3">
              No templates found
            </h3>
            <p className="text-[#6B6B6B] mb-8 text-lg">
              Try adjusting your search or filters
            </p>
            <Button 
              onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}
              size="lg"
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-8"
            >
              Clear Filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredTemplates.map((template, index) => (
              <TemplateCard
                key={template.id}
                template={template}
                onPreview={handlePreview}
                onUse={handleUseTemplate}
              />
            ))}
          </div>
        )}

        {/* Premium Results Count */}
        {filteredTemplates.length > 0 && (
          <div className="mt-6 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#F1F0EC] border border-[#E3E1DA]">
              <span className="text-xs font-semibold text-[#111111]">
                {filteredTemplates.length} Premium Template{filteredTemplates.length !== 1 ? 's' : ''} Available
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {selectedTemplate && (
        <TemplatePreviewModal
          template={selectedTemplate}
          onClose={() => setSelectedTemplate(null)}
          onUse={handleUseTemplate}
        />
      )}
    </div>
  );
}
