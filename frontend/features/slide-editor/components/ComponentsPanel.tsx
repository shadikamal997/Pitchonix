'use client';

import React, { useMemo, useState, useCallback } from 'react';
import { Search, Star, StarOff, Copy, Trash2, Grid3x3, List, Plus, Sparkles } from 'lucide-react';
import { PanelSection } from '../inspector/Primitives';
import { useComponents, useSlideInstances, categoryLabel } from './useComponents';
import { useSmartComponents } from './useSmartComponents';
import { useToast } from '@/components/ToastProvider';
import {
  COMPONENT_CATEGORY_GROUPS, COMPONENT_CATEGORIES,
} from '@/types/saved-component';
import type {
  SavedComponentDTO, ComponentCategory, CreateComponentInput,
} from '@/types/saved-component';
import type {
  SmartComponentDTO, SmartFamilyId, SmartUseCase,
} from '@/types/smart-component';
import {
  SMART_USE_CASES, SMART_FAMILIES, SMART_FAMILY_LABEL,
} from '@/types/smart-component';
import type { SlideElementDTO } from '@/types/slide-element';

// =============================================================================
//  ComponentsPanel — Phase 32.75 Tier 2
//
//  Browses the user's component library and lets them insert components
//  onto the active slide as linked instances. Drop into the sidebar.
//
//  Top bar:
//    - Search box        (debounced via query state)
//    - Filter chips      (All / Favorites / Recent / Built-in / Custom)
//    - View toggle       (grid / list)
//
//  Body:
//    - Category groups (Business / Presentation / Charts / Media / Custom)
//    - Component cards: thumbnail (fallback to category badge) + name +
//      favourite star + insert button.
//
//  Footer:
//    - "Save selection as component" button (visible when a selection is
//      provided via the `selection` prop).
// =============================================================================

type FilterMode = 'all' | 'favorites' | 'recent' | 'custom';
type ViewMode = 'grid' | 'list';
type LibraryTab = 'mine' | 'builtin';

interface Props {
  /** Required for inserting instances. */
  activeSlideId: string | null | undefined;
  /** Optional selection passed from the editor canvas. When non-empty the
   *  "Save as component" UI is enabled. */
  selection?: SlideElementDTO[] | null;
  /** Called after an instance is inserted so the canvas can refresh. */
  onInserted?: () => void;
  /** Active composition family — the Built-In tab defaults to this. */
  activeFamily?: SmartFamilyId | null;
}

export const ComponentsPanel: React.FC<Props> = ({ activeSlideId, selection, onInserted, activeFamily }) => {
  const toast = useToast();
  const [tab,    setTab]    = useState<LibraryTab>('mine');
  const [filter, setFilter] = useState<FilterMode>('all');
  const [view,   setView]   = useState<ViewMode>('grid');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ComponentCategory | null>(null);
  const [familyFilter, setFamilyFilter] = useState<SmartFamilyId | null>(activeFamily || null);

  const components = useComponents({
    search:   search || undefined,
    category: categoryFilter || undefined,
    favorite: filter === 'favorites' ? true : undefined,
  });
  const smart = useSmartComponents(familyFilter);
  const slideInstances = useSlideInstances(activeSlideId || null);

  const filtered = useMemo(() => {
    let xs = components.items;
    if (filter === 'recent') {
      xs = xs.filter((c) => c.usageCount > 0);
    } else if (filter === 'custom') {
      xs = xs.filter((c) => c.category === 'custom');
    }
    return xs;
  }, [components.items, filter]);

  const insert = useCallback(async (componentId: string) => {
    if (!activeSlideId) return;
    await slideInstances.insert(componentId, { x: 10, y: 30, scale: 1 });
    onInserted?.();
  }, [activeSlideId, slideInstances, onInserted]);

  /**
   * Insert a smart component: first materialise it into a SavedComponent in
   * the user's library (so they can customise / version it), then insert a
   * linked instance pointing at that row. This keeps Tier 3 inserts on the
   * same code path as Tier 2 linked instances.
   */
  const insertSmart = useCallback(async (sc: SmartComponentDTO) => {
    if (!activeSlideId) return;
    const created = await components.create({
      name:        sc.name,
      category:    sc.category,
      description: sc.description,
      tags:        sc.tags,
      familyId:    sc.family,
      elementTree: sc.elementTree,
    });
    if (created) {
      await slideInstances.insert(created.id, { x: 10, y: 30, scale: 1 });
      onInserted?.();
    }
  }, [activeSlideId, components, slideInstances, onInserted]);

  const onSaveSelection = useCallback(async () => {
    if (!selection || selection.length === 0) return;
    const name = prompt('Component name?');
    if (!name) return;
    const category = (prompt(`Category? (${COMPONENT_CATEGORIES.slice(0, 6).join(', ')}, …)`, 'custom') || 'custom') as ComponentCategory;
    if (!COMPONENT_CATEGORIES.includes(category)) {
      toast.error(`Unknown category. Use one of: ${COMPONENT_CATEGORIES.join(', ')}`);
      return;
    }
    const input: CreateComponentInput = {
      name,
      category,
      elementTree: normalizeSelectionToTree(selection),
    };
    await components.create(input);
  }, [selection, components]);

  return (
    <div className="text-xs flex flex-col h-full">
      {/* Tab switcher */}
      <div className="flex border-b border-[#E3E1DA]">
        <TabButton active={tab === 'mine'}    onClick={() => setTab('mine')}>My library</TabButton>
        <TabButton active={tab === 'builtin'} onClick={() => setTab('builtin')}>
          <Sparkles className="w-3 h-3" /> Built-In
        </TabButton>
      </div>

      {/* Toolbar */}
      <div className="px-3 py-2 border-b border-[#F1F0EC] space-y-2">
        <div className="flex items-center gap-1.5 bg-[#EDEBE6] border border-[#E3E1DA] rounded h-7 px-2">
          <Search className="w-3 h-3 text-[#C9C6BD]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={tab === 'mine' ? 'Search your components…' : 'Search built-in…'}
            className="flex-1 bg-transparent text-xs outline-none"
          />
        </div>

        <div className="flex items-center gap-1">
          {(['all', 'favorites', 'recent', 'custom'] as FilterMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setFilter(m)}
              className={`h-6 px-2 text-[10px] uppercase tracking-wide rounded ${
                filter === m
                  ? 'bg-slate-800 text-white'
                  : 'bg-[#EDEBE6] text-[#6B6B6B] hover:bg-[#F1F0EC] border border-[#E3E1DA]'
              }`}
            >
              {m}
            </button>
          ))}
          <div className="flex-1" />
          <button type="button" onClick={() => setView('grid')}
            className={`w-7 h-7 flex items-center justify-center rounded ${view === 'grid' ? 'bg-slate-800 text-white' : 'text-[#9A9A9A] hover:bg-[#F1F0EC]'}`}>
            <Grid3x3 className="w-3.5 h-3.5" />
          </button>
          <button type="button" onClick={() => setView('list')}
            className={`w-7 h-7 flex items-center justify-center rounded ${view === 'list' ? 'bg-slate-800 text-white' : 'text-[#9A9A9A] hover:bg-[#F1F0EC]'}`}>
            <List className="w-3.5 h-3.5" />
          </button>
        </div>

        {tab === 'mine' ? (
          <div className="flex items-center gap-1 flex-wrap">
            <button
              type="button"
              onClick={() => setCategoryFilter(null)}
              className={`h-5 px-1.5 text-[10px] rounded ${categoryFilter == null ? 'bg-[#DDE8E1] text-green-800' : 'bg-[#EDEBE6] text-[#9A9A9A] border border-[#E3E1DA]'}`}
            >
              All
            </button>
            {COMPONENT_CATEGORY_GROUPS.flatMap((g) => g.categories).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat === categoryFilter ? null : cat)}
                className={`h-5 px-1.5 text-[10px] rounded ${categoryFilter === cat ? 'bg-[#DDE8E1] text-green-800' : 'bg-[#EDEBE6] text-[#9A9A9A] border border-[#E3E1DA]'}`}
              >
                {categoryLabel(cat)}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-1 flex-wrap">
            <button
              type="button"
              onClick={() => setFamilyFilter(null)}
              className={`h-5 px-1.5 text-[10px] rounded ${familyFilter == null ? 'bg-violet-100 text-violet-800' : 'bg-[#EDEBE6] text-[#9A9A9A] border border-[#E3E1DA]'}`}
            >
              All families
            </button>
            {SMART_FAMILIES.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFamilyFilter(f === familyFilter ? null : f)}
                className={`h-5 px-1.5 text-[10px] rounded ${familyFilter === f ? 'bg-violet-100 text-violet-800' : 'bg-[#EDEBE6] text-[#9A9A9A] border border-[#E3E1DA]'}`}
              >
                {SMART_FAMILY_LABEL[f]}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'builtin' ? (
          <BuiltInBody
            smart={smart}
            view={view}
            search={search}
            insertSmart={insertSmart}
          />
        ) : (
          <>
        {components.loading && filtered.length === 0 && (
          <div className="px-3 py-4 text-[11px] text-[#9A9A9A] italic">Loading…</div>
        )}
        {!components.loading && filtered.length === 0 && (
          <div className="px-3 py-6 text-center">
            <div className="text-[11px] text-[#9A9A9A]">No components yet.</div>
            <div className="text-[10px] text-[#C9C6BD] mt-1">Select something on a slide and click "Save as component".</div>
          </div>
        )}

        {view === 'grid' ? (
          <div className="grid grid-cols-2 gap-2 px-3 py-2">
            {filtered.map((c) => (
              <ComponentCard
                key={c.id}
                component={c}
                onInsert={() => insert(c.id)}
                onToggleFavorite={() => components.toggleFavorite(c.id)}
                onDuplicate={() => components.duplicate(c.id)}
                onDelete={() => {
                  if (confirm(`Delete "${c.name}"? Linked instances will also be removed.`)) {
                    components.remove(c.id);
                  }
                }}
              />
            ))}
          </div>
        ) : (
          <div className="px-3 py-2 space-y-1">
            {filtered.map((c) => (
              <ComponentRow
                key={c.id}
                component={c}
                onInsert={() => insert(c.id)}
                onToggleFavorite={() => components.toggleFavorite(c.id)}
                onDelete={() => components.remove(c.id)}
              />
            ))}
          </div>
        )}
          </>
        )}
      </div>

      {/* Footer */}
      {selection && selection.length > 0 && (
        <div className="border-t border-[#F1F0EC] px-3 py-2">
          <button
            type="button"
            onClick={onSaveSelection}
            className="w-full h-7 text-[11px] bg-[#4F7563] hover:bg-[#4F7563] text-white rounded flex items-center justify-center gap-1.5"
          >
            <Plus className="w-3 h-3" />
            Save selection as component ({selection.length})
          </button>
        </div>
      )}
    </div>
  );
};

// =============================================================================
//  Sub-components
// =============================================================================

const TabButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex-1 h-8 flex items-center justify-center gap-1 text-[11px] font-medium border-b-2 ${
      active
        ? 'border-violet-500 text-violet-700 bg-violet-50/50'
        : 'border-transparent text-[#9A9A9A] hover:text-[#111111] hover:bg-[#EDEBE6]'
    }`}
  >
    {children}
  </button>
);

const BuiltInBody: React.FC<{
  smart: ReturnType<typeof useSmartComponents>;
  view: ViewMode;
  search: string;
  insertSmart: (sc: SmartComponentDTO) => Promise<void>;
}> = ({ smart, view, search, insertSmart }) => {
  if (smart.loading && smart.items.length === 0) {
    return <div className="px-3 py-4 text-[11px] text-[#9A9A9A] italic">Loading built-in components…</div>;
  }
  const items = search
    ? smart.items.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()))
    : smart.items;
  // Group by use-case for the "Investor / Sales / Strategy / Board / Marketing / Business" sections.
  const groups: Array<[SmartUseCase, SmartComponentDTO[]]> = SMART_USE_CASES.map((u) => [u, items.filter((s) => s.useCase === u)]);
  return (
    <>
      {groups.map(([useCase, list]) => list.length === 0 ? null : (
        <div key={useCase} className="px-3 py-2 border-b border-slate-50 last:border-b-0">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#9A9A9A] mb-2">
            {useCase} · {list.length}
          </div>
          {view === 'grid' ? (
            <div className="grid grid-cols-2 gap-2">
              {list.map((sc) => (
                <SmartCard key={sc.id} sc={sc} onInsert={() => insertSmart(sc)} />
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {list.map((sc) => (
                <SmartRow key={sc.id} sc={sc} onInsert={() => insertSmart(sc)} />
              ))}
            </div>
          )}
        </div>
      ))}
      {items.length === 0 && (
        <div className="px-3 py-6 text-center text-[11px] text-[#9A9A9A]">No built-in components match your search.</div>
      )}
    </>
  );
};

const SmartCard: React.FC<{ sc: SmartComponentDTO; onInsert: () => void }> = ({ sc, onInsert }) => (
  <button
    type="button"
    onClick={onInsert}
    onDoubleClick={onInsert}
    className="text-left border border-[#E3E1DA] rounded-lg overflow-hidden bg-white hover:border-violet-300 hover:shadow-sm"
  >
    <div className="aspect-[4/3] bg-gradient-to-br from-violet-50 to-slate-50 flex items-center justify-center text-violet-400 text-[10px] uppercase font-bold tracking-wide">
      {sc.family.replace(/-/g, ' ')}
    </div>
    <div className="p-1.5">
      <div className="text-[11px] font-medium text-[#111111] truncate">{sc.name.split(' · ')[0]}</div>
      <div className="text-[9px] text-[#9A9A9A] truncate">{SMART_FAMILY_LABEL[sc.family]}</div>
    </div>
  </button>
);

const SmartRow: React.FC<{ sc: SmartComponentDTO; onInsert: () => void }> = ({ sc, onInsert }) => (
  <button
    type="button"
    onClick={onInsert}
    className="w-full flex items-center justify-between gap-2 h-7 px-2 border border-[#E3E1DA] rounded bg-white hover:bg-violet-50 hover:border-violet-300"
  >
    <span className="text-[11px] text-[#111111] truncate">{sc.name}</span>
    <span className="text-[9px] text-[#C9C6BD] flex-shrink-0">{SMART_FAMILY_LABEL[sc.family]}</span>
  </button>
);

const ComponentCard: React.FC<{
  component: SavedComponentDTO;
  onInsert: () => void;
  onToggleFavorite: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}> = ({ component, onInsert, onToggleFavorite, onDuplicate, onDelete }) => (
  <div className="relative group border border-[#E3E1DA] rounded-lg overflow-hidden bg-white hover:border-[#C9C6BD] hover:shadow-sm">
    <button
      type="button"
      onDoubleClick={onInsert}
      onClick={onInsert}
      className="block w-full"
      title="Double-click to insert"
    >
      <div className="aspect-[4/3] bg-[#EDEBE6] flex items-center justify-center text-[#C9C6BD]">
        {component.thumbnail ? (
          <img src={component.thumbnail} alt={component.name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-[10px] uppercase tracking-wide font-semibold">{categoryLabel(component.category)}</span>
        )}
      </div>
      <div className="p-1.5 text-left">
        <div className="text-[11px] font-medium text-[#111111] truncate">{component.name}</div>
        <div className="flex items-center justify-between mt-0.5">
          <span className="text-[9px] text-[#9A9A9A]">{categoryLabel(component.category)}</span>
          <span className="text-[9px] text-[#C9C6BD]">used {component.usageCount}×</span>
        </div>
      </div>
    </button>

    <div className="absolute top-1 right-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
      <IconButton title={component.favorite ? 'Unfavourite' : 'Favourite'} onClick={onToggleFavorite}>
        {component.favorite ? <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" /> : <StarOff className="w-3 h-3" />}
      </IconButton>
      <IconButton title="Duplicate" onClick={onDuplicate}>
        <Copy className="w-3 h-3" />
      </IconButton>
      <IconButton title="Delete" onClick={onDelete}>
        <Trash2 className="w-3 h-3 text-[#D96A6A]" />
      </IconButton>
    </div>
  </div>
);

const ComponentRow: React.FC<{
  component: SavedComponentDTO;
  onInsert: () => void;
  onToggleFavorite: () => void;
  onDelete: () => void;
}> = ({ component, onInsert, onToggleFavorite, onDelete }) => (
  <div className="flex items-center gap-2 h-8 px-2 border border-[#E3E1DA] rounded bg-white hover:bg-[#EDEBE6]">
    <button
      type="button"
      onClick={onToggleFavorite}
      className="w-4 h-4 flex items-center justify-center flex-shrink-0"
    >
      {component.favorite ? <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" /> : <Star className="w-3 h-3 text-slate-300" />}
    </button>
    <button
      type="button"
      onClick={onInsert}
      className="flex-1 text-left text-[11px] text-[#111111] truncate min-w-0"
      title="Click to insert"
    >
      <span className="font-medium">{component.name}</span>
      <span className="text-[#9A9A9A]"> · {categoryLabel(component.category)}</span>
    </button>
    <span className="text-[9px] text-[#C9C6BD] flex-shrink-0">used {component.usageCount}×</span>
    <button
      type="button"
      onClick={onDelete}
      className="w-4 h-4 flex items-center justify-center flex-shrink-0 text-[#C9C6BD] hover:text-[#9a3737]"
    >
      <Trash2 className="w-3 h-3" />
    </button>
  </div>
);

const IconButton: React.FC<{ title?: string; onClick: () => void; children: React.ReactNode }> = ({ title, onClick, children }) => (
  <button
    type="button"
    onClick={(e) => { e.stopPropagation(); onClick(); }}
    title={title}
    className="w-5 h-5 flex items-center justify-center bg-white/90 hover:bg-white border border-[#E3E1DA] rounded text-[#6B6B6B]"
  >
    {children}
  </button>
);

// =============================================================================
//  Selection → element tree
//
//  Normalises a multi-element selection so the SavedComponent's elementTree
//  occupies a 0..100 bounding box. The first element's top-left becomes the
//  component origin; everything else is offset relative to that.
// =============================================================================
function normalizeSelectionToTree(selection: SlideElementDTO[]): SlideElementDTO[] {
  if (selection.length === 0) return [];
  const minX = Math.min(...selection.map((e) => e.x));
  const minY = Math.min(...selection.map((e) => e.y));
  const maxX = Math.max(...selection.map((e) => e.x + e.width));
  const maxY = Math.max(...selection.map((e) => e.y + e.height));
  const spanX = Math.max(1, maxX - minX);
  const spanY = Math.max(1, maxY - minY);
  // Scale into 0..100 in component-local coordinates.
  return selection.map((e) => ({
    ...e,
    x: ((e.x - minX) / spanX) * 100,
    y: ((e.y - minY) / spanY) * 100,
    width:  (e.width  / spanX) * 100,
    height: (e.height / spanY) * 100,
  }));
}
