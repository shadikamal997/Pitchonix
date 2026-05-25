'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Filter, X } from 'lucide-react';

interface TemplateFiltersProps {
  onFilterChange: (filters: TemplateFilterState) => void;
  totalTemplates: number;
  filteredCount: number;
}

export interface TemplateFilterState {
  search: string;
  category: string;
  style: string;
  sortBy: string;
}

const CATEGORIES = [
  { value: 'all', label: 'All Categories' },
  { value: 'business_core', label: 'Business Core' },
  { value: 'analytics', label: 'Analytics & Data' },
  { value: 'sales_client', label: 'Sales & Client' },
  { value: 'strategy', label: 'Strategy & Internal' },
  { value: 'product_tech', label: 'Product & Tech' },
  { value: 'brand_content', label: 'Brand & Content' },
  { value: 'hr_operations', label: 'HR & Operations' },
  { value: 'marketing', label: 'Marketing' },
];

const STYLES = [
  { value: 'all', label: 'All Styles' },
  { value: 'gradient', label: 'Gradient' },
  { value: 'solid', label: 'Solid' },
  { value: 'minimal', label: 'Minimal' },
];

const SORT_OPTIONS = [
  { value: 'name', label: 'Name (A-Z)' },
  { value: 'popular', label: 'Most Popular' },
  { value: 'newest', label: 'Newest First' },
];

export function TemplateFilters({ onFilterChange, totalTemplates, filteredCount }: TemplateFiltersProps) {
  const [filters, setFilters] = useState<TemplateFilterState>({
    search: '',
    category: 'all',
    style: 'all',
    sortBy: 'popular',
  });
  const [showFilters, setShowFilters] = useState(false);

  const updateFilters = (newFilters: Partial<TemplateFilterState>) => {
    const updated = { ...filters, ...newFilters };
    setFilters(updated);
    onFilterChange(updated);
  };

  const clearFilters = () => {
    const cleared: TemplateFilterState = {
      search: '',
      category: 'all',
      style: 'all',
      sortBy: 'popular',
    };
    setFilters(cleared);
    onFilterChange(cleared);
  };

  const hasActiveFilters = filters.search || filters.category !== 'all' || filters.style !== 'all';

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#C9C6BD]" />
          <Input
            value={filters.search}
            onChange={(e) => updateFilters({ search: e.target.value })}
            placeholder="Search templates by name or description..."
            className="pl-10"
          />
        </div>
        <Button
          variant={showFilters ? 'default' : 'outline'}
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2"
        >
          <Filter className="w-4 h-4" />
          Filters
          {hasActiveFilters && (
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-white/20 rounded">
              {[filters.category !== 'all', filters.style !== 'all', !!filters.search].filter(Boolean).length}
            </span>
          )}
        </Button>
        {hasActiveFilters && (
          <Button variant="ghost" onClick={clearFilters} className="flex items-center gap-1">
            <X className="w-4 h-4" />
            Clear
          </Button>
        )}
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between text-sm text-[#6B6B6B]">
        <span>
          Showing <strong>{filteredCount}</strong> of <strong>{totalTemplates}</strong> templates
        </span>
        <select
          value={filters.sortBy}
          onChange={(e) => updateFilters({ sortBy: e.target.value })}
          className="text-sm border border-[#C9C6BD] rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#4F7563]"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Expanded Filters */}
      {showFilters && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-[#EDEBE6] rounded-lg border border-[#E3E1DA]">
          <div>
            <label className="block text-sm font-medium text-[#111111] mb-2">Category</label>
            <select
              value={filters.category}
              onChange={(e) => updateFilters({ category: e.target.value })}
              className="w-full border border-[#C9C6BD] rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#4F7563]"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#111111] mb-2">Header Style</label>
            <select
              value={filters.style}
              onChange={(e) => updateFilters({ style: e.target.value })}
              className="w-full border border-[#C9C6BD] rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#4F7563]"
            >
              {STYLES.map((style) => (
                <option key={style.value} value={style.value}>
                  {style.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
