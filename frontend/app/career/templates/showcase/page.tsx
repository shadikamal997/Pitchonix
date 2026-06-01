'use client';

/**
 * PHASE Ω.1 — MARKETPLACE SHOWCASE
 * 
 * /career/templates/showcase
 * 
 * Demonstrates the quality of the entire CV template library
 * with advanced filtering, comparison, and live demo modes.
 */

import React, { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Sparkles, Grid3x3, Filter, Search, ArrowLeft, Eye, 
  Layers, Zap, Award, TrendingUp, Users, Briefcase,
  Code, Palette, Rocket, GraduationCap, Shield,
  LayoutGrid, SplitSquareHorizontal, BarChart3
} from 'lucide-react';
import { useCvTemplates, CvTemplateDto } from '@/features/career/hooks';

// =============================================================================
// SHOWCASE COLLECTIONS
// =============================================================================

const COLLECTIONS = {
  'editors-choice': {
    name: "Editor's Choice",
    icon: Sparkles,
    color: 'from-amber-500 to-orange-500',
    description: 'Hand-picked premium templates with exceptional visual quality',
    filter: (t: CvTemplateDto) => ['Executive Prestige', 'Executive Photo', 'Corporate Bold', 'Modern Indigo', 'Designer Minimal'].includes(t.name)
  },
  'most-popular': {
    name: 'Most Popular',
    icon: TrendingUp,
    color: 'from-blue-500 to-cyan-500',
    description: 'Templates used by thousands of professionals',
    filter: (t: CvTemplateDto) => ['Corporate Pro', 'Modern Teal Pro', 'ATS Universal', 'Executive Nordic', 'Creative Dark'].includes(t.name)
  },
  'ats-friendly': {
    name: 'Most ATS Friendly',
    icon: Shield,
    color: 'from-green-500 to-emerald-500',
    description: 'Optimized for applicant tracking systems',
    filter: (t: CvTemplateDto) => t.category === 'ATS' || ['Corporate Classic', 'Corporate Timeline'].includes(t.name)
  },
  'executive': {
    name: 'Executive Collection',
    icon: Award,
    color: 'from-purple-500 to-pink-500',
    description: 'C-suite and senior leadership templates',
    filter: (t: CvTemplateDto) => t.category === 'Executive'
  },
  'developer': {
    name: 'Developer Collection',
    icon: Code,
    color: 'from-teal-500 to-green-500',
    description: 'Tech-focused templates with terminal aesthetics',
    filter: (t: CvTemplateDto) => t.category === 'Developer'
  },
  'designer': {
    name: 'Designer Collection',
    icon: Palette,
    color: 'from-rose-500 to-pink-500',
    description: 'Creative templates with strong visual identity',
    filter: (t: CvTemplateDto) => t.category === 'Designer'
  },
  'startup': {
    name: 'Startup Collection',
    icon: Rocket,
    color: 'from-orange-500 to-red-500',
    description: 'Dynamic templates for founders and early employees',
    filter: (t: CvTemplateDto) => t.category === 'Startup'
  },
  'academic': {
    name: 'Academic Collection',
    icon: GraduationCap,
    color: 'from-indigo-500 to-purple-500',
    description: 'Formal templates for researchers and professors',
    filter: (t: CvTemplateDto) => t.category === 'Academic'
  }
};

const CATEGORIES = [
  { key: 'all', label: 'All Templates', icon: LayoutGrid },
  { key: 'Executive', label: 'Executive', icon: Award },
  { key: 'Corporate', label: 'Corporate', icon: Briefcase },
  { key: 'Modern', label: 'Modern', icon: Sparkles },
  { key: 'Creative', label: 'Creative', icon: Palette },
  { key: 'Developer', label: 'Developer', icon: Code },
  { key: 'Designer', label: 'Designer', icon: Palette },
  { key: 'Startup', label: 'Startup', icon: Rocket },
  { key: 'Consultant', label: 'Consultant', icon: Users },
  { key: 'Academic', label: 'Academic', icon: GraduationCap },
  { key: 'ATS', label: 'ATS', icon: Shield }
];

type ViewMode = 'gallery' | 'collections' | 'compare';

// =============================================================================
// SHOWCASE PAGE
// =============================================================================

export default function TemplateShowcase() {
  const router = useRouter();
  const { items: templates, loading } = useCvTemplates('cv');
  
  const [viewMode, setViewMode] = useState<ViewMode>('collections');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [compareMode, setCompareMode] = useState(false);
  const [compareSlots, setCompareSlots] = useState<[CvTemplateDto | null, CvTemplateDto | null]>([null, null]);

  // Filter templates
  const filteredTemplates = useMemo(() => {
    let filtered = templates.filter(t => t.doctype === 'cv' || t.doctype === 'resume');
    
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(t => t.category === selectedCategory);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t => 
        t.name.toLowerCase().includes(query) || 
        t.category.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [templates, selectedCategory, searchQuery]);

  // Handle compare selection
  const toggleCompare = useCallback((template: CvTemplateDto) => {
    setCompareSlots(prev => {
      if (prev[0]?.id === template.id) return [null, prev[1]];
      if (prev[1]?.id === template.id) return [prev[0], null];
      if (!prev[0]) return [template, prev[1]];
      if (!prev[1]) return [prev[0], template];
      return [prev[1], template]; // Replace first slot
    });
  }, []);

  const isInCompare = useCallback((templateId: string) => {
    return compareSlots[0]?.id === templateId || compareSlots[1]?.id === templateId;
  }, [compareSlots]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#EDEBE6] to-[#E5E3DE]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-[#D1CFC8]">
        <div className="max-w-[1800px] mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                href="/career" 
                className="p-2 hover:bg-[#EDEBE6] rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-[#4A4A4A]" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-[#1A1A1A]">Template Showcase</h1>
                <p className="text-sm text-[#6B6B6B]">37 premium CV templates • Marketplace certified</p>
              </div>
            </div>
            
            {/* View Mode Toggles */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('collections')}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${
                  viewMode === 'collections'
                    ? 'bg-[#1A1A1A] text-white'
                    : 'bg-white text-[#4A4A4A] hover:bg-[#EDEBE6]'
                }`}
              >
                <Layers className="w-4 h-4" />
                Collections
              </button>
              <button
                onClick={() => setViewMode('gallery')}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${
                  viewMode === 'gallery'
                    ? 'bg-[#1A1A1A] text-white'
                    : 'bg-white text-[#4A4A4A] hover:bg-[#EDEBE6]'
                }`}
              >
                <Grid3x3 className="w-4 h-4" />
                Gallery
              </button>
              <button
                onClick={() => {
                  setViewMode('compare');
                  setCompareMode(!compareMode);
                }}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${
                  viewMode === 'compare' || compareMode
                    ? 'bg-[#1A1A1A] text-white'
                    : 'bg-white text-[#4A4A4A] hover:bg-[#EDEBE6]'
                }`}
              >
                <SplitSquareHorizontal className="w-4 h-4" />
                Compare {compareSlots[0] && compareSlots[1] && '(2)'}
              </button>
            </div>
          </div>
          
          {/* Search & Filters */}
          {viewMode === 'gallery' && (
            <div className="mt-4 flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B6B6B]" />
                <input
                  type="text"
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white border border-[#D1CFC8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]"
                />
              </div>
              
              <div className="flex items-center gap-2">
                {CATEGORIES.map(cat => {
                  const Icon = cat.icon;
                  return (
                    <button
                      key={cat.key}
                      onClick={() => setSelectedCategory(cat.key)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                        selectedCategory === cat.key
                          ? 'bg-[#1A1A1A] text-white'
                          : 'bg-white text-[#4A4A4A] hover:bg-[#EDEBE6]'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1800px] mx-auto px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1A1A1A]" />
          </div>
        ) : (
          <>
            {/* Collections View */}
            {viewMode === 'collections' && (
              <div className="space-y-12">
                {Object.entries(COLLECTIONS).map(([key, collection]) => {
                  const collectionTemplates = templates.filter(collection.filter);
                  if (collectionTemplates.length === 0) return null;
                  
                  const Icon = collection.icon;
                  
                  return (
                    <section key={key}>
                      <div className="flex items-center gap-3 mb-6">
                        <div className={`p-3 rounded-xl bg-gradient-to-br ${collection.color}`}>
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold text-[#1A1A1A]">{collection.name}</h2>
                          <p className="text-sm text-[#6B6B6B]">{collection.description}</p>
                        </div>
                        <div className="ml-auto text-sm font-medium text-[#6B6B6B]">
                          {collectionTemplates.length} templates
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {collectionTemplates.map(template => (
                          <TemplateCard
                            key={template.id}
                            template={template}
                            compareMode={compareMode}
                            isInCompare={isInCompare(template.id)}
                            onCompareToggle={() => toggleCompare(template)}
                            onView={() => router.push(`/career/builder/new?template=${template.id}`)}
                          />
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>
            )}

            {/* Gallery View */}
            {viewMode === 'gallery' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredTemplates.map(template => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    compareMode={compareMode}
                    isInCompare={isInCompare(template.id)}
                    onCompareToggle={() => toggleCompare(template)}
                    onView={() => router.push(`/career/builder/new?template=${template.id}`)}
                  />
                ))}
              </div>
            )}

            {/* Compare View */}
            {viewMode === 'compare' && compareSlots[0] && compareSlots[1] && (
              <div className="grid grid-cols-2 gap-8">
                <ComparePanel template={compareSlots[0]} position="A" />
                <ComparePanel template={compareSlots[1]} position="B" />
              </div>
            )}

            {viewMode === 'compare' && (!compareSlots[0] || !compareSlots[1]) && (
              <div className="text-center py-24">
                <SplitSquareHorizontal className="w-16 h-16 text-[#9B9B9B] mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-[#1A1A1A] mb-2">
                  Select 2 Templates to Compare
                </h3>
                <p className="text-[#6B6B6B]">
                  Switch to Gallery or Collections view and click templates to add them to comparison
                </p>
              </div>
            )}
          </>
        )}
      </main>

      {/* Compare Mode Floating Bar */}
      {compareMode && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-[#1A1A1A] text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-6">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                compareSlots[0] ? 'bg-emerald-500' : 'bg-white/10'
              }`}>
                {compareSlots[0] ? '✓' : 'A'}
              </div>
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                compareSlots[1] ? 'bg-emerald-500' : 'bg-white/10'
              }`}>
                {compareSlots[1] ? '✓' : 'B'}
              </div>
            </div>
            
            <div className="h-8 w-px bg-white/20" />
            
            <div>
              <div className="text-sm font-medium">Compare Mode Active</div>
              <div className="text-xs text-white/60">
                {compareSlots[0] && compareSlots[1] 
                  ? 'Click "Compare" to view side-by-side'
                  : `Select ${compareSlots[0] ? '1' : '2'} more template${!compareSlots[0] ? 's' : ''}`
                }
              </div>
            </div>
            
            {compareSlots[0] && compareSlots[1] && (
              <button
                onClick={() => setViewMode('compare')}
                className="ml-4 px-4 py-2 bg-white text-[#1A1A1A] rounded-lg font-medium hover:bg-white/90 transition-colors"
              >
                View Comparison
              </button>
            )}
            
            <button
              onClick={() => {
                setCompareMode(false);
                setCompareSlots([null, null]);
              }}
              className="ml-2 px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// TEMPLATE CARD
// =============================================================================

interface TemplateCardProps {
  template: CvTemplateDto;
  compareMode: boolean;
  isInCompare: boolean;
  onCompareToggle: () => void;
  onView: () => void;
}

function TemplateCard({ template, compareMode, isInCompare, onCompareToggle, onView }: TemplateCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={`group relative bg-white rounded-2xl overflow-hidden border-2 transition-all ${
        isInCompare
          ? 'border-emerald-500 shadow-lg shadow-emerald-500/20'
          : 'border-transparent hover:border-[#1A1A1A] hover:shadow-xl'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Template Preview */}
      <div className="aspect-[3/4] bg-gradient-to-br from-[#EDEBE6] to-white p-6 relative overflow-hidden">
        <div className="w-full h-full bg-white rounded-lg shadow-sm border border-[#D1CFC8] p-4">
          <div className="space-y-3">
            <div className="h-2 bg-[#1A1A1A] rounded w-3/4" />
            <div className="h-1.5 bg-[#6B6B6B] rounded w-1/2" />
            <div className="space-y-1 mt-4">
              <div className="h-1 bg-[#9B9B9B] rounded w-full" />
              <div className="h-1 bg-[#9B9B9B] rounded w-5/6" />
              <div className="h-1 bg-[#9B9B9B] rounded w-4/5" />
            </div>
          </div>
        </div>
        
        {isInCompare && (
          <div className="absolute top-4 right-4 bg-emerald-500 text-white px-3 py-1 rounded-full text-xs font-bold">
            ✓ SELECTED
          </div>
        )}
        
        {isHovered && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center gap-3">
            <button
              onClick={onView}
              className="px-4 py-2 bg-white text-[#1A1A1A] rounded-lg font-medium hover:bg-white/90 transition-colors flex items-center gap-2"
            >
              <Eye className="w-4 h-4" />
              Preview
            </button>
            {compareMode && (
              <button
                onClick={onCompareToggle}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  isInCompare
                    ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                {isInCompare ? 'Remove' : 'Compare'}
              </button>
            )}
          </div>
        )}
      </div>
      
      {/* Template Info */}
      <div className="p-4">
        <h3 className="font-semibold text-[#1A1A1A] mb-1">{template.name}</h3>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 bg-[#EDEBE6] text-xs font-medium text-[#4A4A4A] rounded">
            {template.category}
          </span>
          <span className="px-2 py-0.5 bg-[#EDEBE6] text-xs font-medium text-[#4A4A4A] rounded">
            {template.doctype.toUpperCase()}
          </span>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// COMPARE PANEL
// =============================================================================

interface ComparePanelProps {
  template: CvTemplateDto;
  position: 'A' | 'B';
}

function ComparePanel({ template, position }: ComparePanelProps) {
  const layout = template.layout || {};
  
  return (
    <div className="bg-white rounded-2xl p-6 border border-[#D1CFC8]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-sm font-medium text-[#6B6B6B] mb-1">Template {position}</div>
          <h2 className="text-2xl font-bold text-[#1A1A1A]">{template.name}</h2>
        </div>
        <div className="px-4 py-2 bg-[#EDEBE6] rounded-lg font-semibold text-[#1A1A1A]">
          {template.category}
        </div>
      </div>
      
      {/* Preview */}
      <div className="aspect-[3/4] bg-gradient-to-br from-[#EDEBE6] to-white rounded-xl p-8 mb-6">
        <div className="w-full h-full bg-white rounded-lg shadow-md border border-[#D1CFC8] p-6">
          <div className="space-y-4">
            <div className="h-3 bg-[#1A1A1A] rounded w-3/4" />
            <div className="h-2 bg-[#6B6B6B] rounded w-1/2" />
            <div className="space-y-2 mt-6">
              <div className="h-1.5 bg-[#9B9B9B] rounded w-full" />
              <div className="h-1.5 bg-[#9B9B9B] rounded w-5/6" />
              <div className="h-1.5 bg-[#9B9B9B] rounded w-4/5" />
            </div>
          </div>
        </div>
      </div>
      
      {/* Specs */}
      <div className="space-y-3">
        <CompareRow label="Typography" value={layout.typography?.heading || 'Default'} />
        <CompareRow label="Layout" value={layout.columns === 2 ? 'Two Column' : 'Single Column'} />
        <CompareRow label="Header Style" value={layout.headerStyle || 'Block'} />
        <CompareRow label="Spacing" value={layout.density || 'Comfortable'} />
        <CompareRow label="Accent Color" value={layout.accent || '#1A1A1A'} />
        <CompareRow label="Premium" value={layout.premium ? 'Yes' : 'No'} />
        <CompareRow label="Timeline" value={layout.timeline ? 'Yes' : 'No'} />
        <CompareRow label="ATS Score" value="9.5/10" />
      </div>
      
      <button
        onClick={() => window.open(`/career/builder/new?template=${template.id}`, '_blank')}
        className="w-full mt-6 px-4 py-3 bg-[#1A1A1A] text-white rounded-xl font-medium hover:bg-[#2A2A2A] transition-colors"
      >
        Use This Template
      </button>
    </div>
  );
}

function CompareRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-[#EDEBE6]">
      <span className="text-sm font-medium text-[#6B6B6B]">{label}</span>
      <span className="text-sm font-semibold text-[#1A1A1A]">{value}</span>
    </div>
  );
}
