import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Crown, Search, X } from 'lucide-react';
import { PRO_TEMPLATE_REGISTRY, getProTemplate } from '../registry/proTemplateRegistry';
import { ProTemplatePreviewCard } from './ProTemplatePreviewCard';

const CATEGORIES = [
  'All', 'Business', 'Creative', 'Finance', 'Startup', 'Tech', 'Research', 'Impact',
];

const CATEGORY_MAP: Record<string, string[]> = {
  Business:  ['Executive', 'Consulting', 'Ultra Minimal', 'Modern Minimal'],
  Creative:  ['Dark Luxury', 'Editorial', 'Agency'],
  Finance:   ['Fintech', 'Analytics', 'Investor'],
  Startup:   ['Startup'],
  Tech:      ['Futuristic', 'AI/Future Tech', 'Product Showcase'],
  Research:  ['Whitepaper', 'Case Study', 'Educational'],
  Impact:    ['Sustainability', 'Healthcare', 'Roadmap'],
};

export function ProTemplatesDropdown({
  open, selectedId, onToggle, onSelect, onClear,
}: {
  open: boolean;
  selectedId: string | null;
  onToggle: () => void;
  onSelect: (id: string) => void;
  onClear: () => void;
}) {
  const selected = getProTemplate(selectedId);
  const [activeCategory, setActiveCategory] = useState('All');
  const [query, setQuery] = useState('');

  const visibleTemplates = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PRO_TEMPLATE_REGISTRY.filter(t => {
      const catMatch = activeCategory === 'All' || (CATEGORY_MAP[activeCategory]?.includes(t.category) ?? false);
      const qMatch = !q || [t.name, t.family, t.category, t.description, ...t.tags].join(' ').toLowerCase().includes(q);
      return catMatch && qMatch;
    });
  }, [activeCategory, query]);

  return (
    <div className="relative">
      {/* Trigger */}
      <button
        onClick={onToggle}
        className={`flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition-all ${
          selectedId
            ? 'border-teal-500 bg-teal-50 text-teal-800'
            : open
            ? 'border-gray-900 bg-gray-900 text-white'
            : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
        }`}
        title="Pro Templates"
      >
        <Crown className="h-3 w-3" />
        <span>Pro Templates</span>
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full z-50 mt-2 flex flex-col w-[420px] overflow-hidden rounded-xl border border-gray-100 bg-white shadow-2xl"
            style={{ maxHeight: '620px' }}
          >
            {/* Header */}
            <div className="shrink-0 flex items-center justify-between border-b border-gray-100 px-3 py-2">
              <div>
                <div className="flex items-center gap-1.5">
                  <Crown className="h-3.5 w-3.5 text-gray-700" />
                  <span className="text-xs font-semibold text-gray-900">Pro Templates</span>
                </div>
                <div className="text-[11px] text-gray-500">
                  {visibleTemplates.length} of {PRO_TEMPLATE_REGISTRY.length} designs
                </div>
              </div>
              {selected && (
                <div className="flex items-center gap-1.5">
                  <span className="max-w-[130px] truncate text-right text-[11px] font-medium text-gray-500">
                    {selected.name}
                  </span>
                  <button
                    onClick={onClear}
                    className="rounded border border-gray-200 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 hover:bg-gray-50"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>

            {/* Search + pills */}
            <div className="shrink-0 border-b border-gray-100 px-2.5 py-2">
              <div className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5">
                <Search className="h-3 w-3 shrink-0 text-gray-400" />
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search templates…"
                  className="min-w-0 flex-1 bg-transparent text-[11px] text-gray-900 outline-none placeholder:text-gray-400"
                />
                {query && (
                  <button onClick={() => setQuery('')} className="text-gray-400 hover:text-gray-600">
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
              <div className="mt-1.5 flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold transition-all ${
                      activeCategory === cat
                        ? 'bg-gray-900 text-white'
                        : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable grid */}
            <div className="min-h-0 flex-1 overflow-y-auto p-2.5">
              {visibleTemplates.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {visibleTemplates.map(template => (
                    <ProTemplatePreviewCard
                      key={template.id}
                      template={template}
                      selected={selectedId === template.id}
                      onSelect={() => onSelect(template.id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-[11px] text-gray-400">
                  No templates match your search
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
