'use client';

import { useState, useEffect } from 'react';
import { Search, Sparkles, TrendingUp, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      
      let url = `${apiUrl}/templates`;
      if (selectedCategory === 'popular') {
        url = `${apiUrl}/templates/popular`;
      } else if (selectedCategory !== 'all') {
        url = `${apiUrl}/templates/category/${selectedCategory}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch templates');
      }

      const data = await response.json();
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
        const token = localStorage.getItem('token');
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
        const response = await fetch(
          `${apiUrl}/templates/search?q=${encodeURIComponent(query)}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setFilteredTemplates(data);
        }
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading templates...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-20">
            <div className="text-red-600 text-lg">{error}</div>
            <Button onClick={fetchTemplates} className="mt-4">
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Choose a Template
            </h1>
            <p className="text-gray-600">
              Start with pre-filled industry-specific templates or create from scratch
            </p>
          </div>
          <Button
            variant="outline"
            onClick={onCancel}
            className="flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            Create from Scratch
          </Button>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="Search templates by name, industry, or tag..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-12 pr-4 py-6 text-lg"
            />
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {CATEGORIES.map((category) => (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? 'default' : 'outline'}
              onClick={() => handleCategoryChange(category.id)}
              className="flex items-center gap-2 whitespace-nowrap"
            >
              <category.icon className="w-4 h-4" />
              {category.name}
            </Button>
          ))}
        </div>

        {/* Templates Grid */}
        {filteredTemplates.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl">
            <Sparkles className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No templates found
            </h3>
            <p className="text-gray-600 mb-6">
              Try adjusting your search or filters
            </p>
            <Button onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}>
              Clear Filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onPreview={handlePreview}
                onUse={handleUseTemplate}
              />
            ))}
          </div>
        )}

        {/* Results Count */}
        {filteredTemplates.length > 0 && (
          <div className="mt-8 text-center text-gray-600">
            Showing {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''}
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
