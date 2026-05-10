import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Crown, Search, Sparkles, X } from 'lucide-react';
import { PRO_TEMPLATE_REGISTRY, getProTemplate } from '../registry/proTemplateRegistry';
import { ProTemplatePreviewCard } from './ProTemplatePreviewCard';

const CATEGORIES = ['All', 'Business', 'Editorial', 'Corporate', 'Minimal', 'Startup', 'Marketing', 'Reports'];

export function ProTemplatesDropdown({
  open,
  selectedId,
  onToggle,
  onSelect,
  onClear,
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
    const normalizedQuery = query.trim().toLowerCase();
    return PRO_TEMPLATE_REGISTRY.filter(template => {
      const categoryMatch =
        activeCategory === 'All' ||
        template.category === activeCategory ||
        template.tags.includes(activeCategory);

      const queryMatch =
        !normalizedQuery ||
        [template.name, template.family, template.category, template.description, ...template.tags]
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery);

      return categoryMatch && queryMatch;
    });
  }, [activeCategory, query]);

  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className={`group flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold shadow-sm transition-all ${
          selectedId
            ? 'border-teal-500 bg-teal-50 text-teal-800 shadow-teal-100'
            : 'border-gray-200 bg-white text-gray-800 hover:border-gray-300 hover:bg-gray-50 hover:shadow-md'
        }`}
        title="Pro Templates"
      >
        <Crown className="h-3.5 w-3.5" />
        <span className="hidden md:inline">Pro Templates</span>
        {selected && <span className="hidden max-w-[104px] truncate text-[10px] opacity-75 2xl:inline">{selected.name}</span>}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 top-full z-50 mt-3 flex h-[min(74vh,650px)] w-[min(calc(100vw-2rem),460px)] flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-[0_20px_64px_rgba(15,23,42,0.20)]"
          >
            <div className="shrink-0 border-b border-gray-100 bg-white/95 px-4 pb-3 pt-4 backdrop-blur">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gray-950 text-white shadow-sm">
                      <Crown className="h-4 w-4" />
                    </span>
                    <div>
                      <div className="text-sm font-black leading-tight text-gray-950">Pro Templates</div>
                      <div className="text-xs font-medium text-gray-500">Premium marketplace layouts</div>
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {selectedId && (
                    <button
                      onClick={onClear}
                      className="rounded-full border border-gray-200 px-3 py-1.5 text-[11px] font-bold text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50"
                    >
                      Use Basic
                    </button>
                  )}
                  <button
                    onClick={onToggle}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-900"
                    aria-label="Close Pro Templates"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2">
                <Search className="h-4 w-4 shrink-0 text-gray-400" />
                <input
                  value={query}
                  onChange={event => setQuery(event.target.value)}
                  placeholder="Search pro templates"
                  className="min-w-0 flex-1 bg-transparent text-sm font-medium text-gray-900 outline-none placeholder:text-gray-400"
                />
              </div>

              <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {CATEGORIES.map(category => (
                  <button
                    key={category}
                    onClick={() => setActiveCategory(category)}
                    className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold transition-all ${
                      activeCategory === category
                        ? 'bg-gray-950 text-white shadow-sm'
                        : 'border border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto bg-gradient-to-b from-gray-50 to-white px-3.5 py-3.5">
              <div className="mb-3 flex items-center justify-between px-1">
                <div className="text-xs font-bold text-gray-500">
                  {visibleTemplates.length} premium {visibleTemplates.length === 1 ? 'template' : 'templates'}
                </div>
                <div className="flex items-center gap-1.5 rounded-full bg-teal-50 px-2.5 py-1 text-[11px] font-bold text-teal-700">
                  <Sparkles className="h-3.5 w-3.5" />
                  Pro layouts
                </div>
              </div>

              <div className="grid gap-3">
                {visibleTemplates.map(template => (
                  <ProTemplatePreviewCard
                    key={template.id}
                    template={template}
                    selected={selectedId === template.id}
                    onSelect={() => onSelect(template.id)}
                  />
                ))}
              </div>

              {visibleTemplates.length === 0 && (
                <div className="rounded-3xl border border-dashed border-gray-300 bg-white p-8 text-center">
                  <div className="text-sm font-bold text-gray-900">No matching Pro Templates</div>
                  <div className="mt-1 text-xs text-gray-500">Try another category or search term.</div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
