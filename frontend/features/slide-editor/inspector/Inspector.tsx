'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Settings2, Palette, Type as TypeIcon, Layers, ChevronRight } from 'lucide-react';
import type { SlideElementDTO, ElementStyle } from '@/types/slide-element';
import { LayoutPanel } from './panels/LayoutPanel';
import { StylePanel } from './panels/StylePanel';
import { TypographyPanel, isTextElement } from './panels/TypographyPanel';
import { ContentPanel } from './panels/ContentPanel';
import { SlidePanel } from './panels/SlidePanel';

// =============================================================================
//  Inspector — docked right panel for editing the selected element(s) or slide.
//  Tabs swap content for the same selection so the panel stays compact.
// =============================================================================

type Tab = 'content' | 'style' | 'layout';

const TABS: Array<{ id: Tab; label: string; icon: React.ReactNode }> = [
  { id: 'content', label: 'Content', icon: <Settings2 className="w-3.5 h-3.5" /> },
  { id: 'style',   label: 'Style',   icon: <Palette className="w-3.5 h-3.5" /> },
  { id: 'layout',  label: 'Layout',  icon: <Layers className="w-3.5 h-3.5" /> },
];

interface SlideSummary {
  id: string;
  type: string;
  title: string;
  subtitle: string | null;
  speakerNotes: string | null;
  background?: any;
  themeTokens?: any;
}

interface InspectorProps {
  /** All elements on the slide (so multi-select math works). */
  elements:        SlideElementDTO[];
  selectedIds:     string[];
  onPatchElement:  (id: string, patch: Partial<SlideElementDTO>) => void;
  onStyleElement:  (id: string, patch: Partial<ElementStyle>) => void;

  /** Slide metadata (shown when no element is selected). */
  slide:           SlideSummary | null;
  onPatchSlide:    (patch: Partial<SlideSummary>) => void;
}

export const Inspector: React.FC<InspectorProps> = ({
  elements, selectedIds, onPatchElement, onStyleElement, slide, onPatchSlide,
}) => {
  const [tab, setTab] = useState<Tab>('content');

  // If the selection switches to a non-text element, hop off the (style + typography) tab
  // gracefully so users don't see a panel that doesn't apply.
  const selected = useMemo(
    () => elements.filter((e) => selectedIds.includes(e.id)),
    [elements, selectedIds],
  );

  const isSingleSelect = selected.length === 1;
  const single = isSingleSelect ? selected[0] : null;

  // ── Empty state: no selection → slide-level controls ───────────────────────
  if (selected.length === 0) {
    return (
      <aside className="w-[280px] flex-shrink-0 bg-white border-l border-slate-200 flex flex-col h-full">
        <header className="h-9 px-3 flex items-center text-xs font-bold uppercase tracking-wider text-slate-600 border-b border-slate-200">
          Slide
        </header>
        <div className="flex-1 overflow-y-auto">
          {slide ? (
            <SlidePanel slide={slide} onPatch={onPatchSlide} />
          ) : (
            <div className="p-6 text-center text-xs text-slate-400">Loading slide…</div>
          )}
        </div>
      </aside>
    );
  }

  // ── Multi-select: only show layout (numeric inputs would be misleading) ───
  if (!isSingleSelect) {
    return (
      <aside className="w-[280px] flex-shrink-0 bg-white border-l border-slate-200 flex flex-col h-full">
        <header className="h-9 px-3 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-600 border-b border-slate-200">
          <span>{selected.length} elements</span>
        </header>
        <div className="flex-1 overflow-y-auto p-3 text-xs text-slate-500 leading-relaxed">
          Multi-element editing is limited in this version.
          <ul className="mt-3 space-y-1.5">
            <li>• Drag to move all selected</li>
            <li>• Arrow keys to nudge all</li>
            <li>• <kbd className="px-1 py-0.5 bg-slate-100 border rounded text-[10px]">⌫</kbd> deletes all</li>
            <li>• <kbd className="px-1 py-0.5 bg-slate-100 border rounded text-[10px]">⌘D</kbd> duplicates all</li>
          </ul>
          <p className="mt-3">Select a single element to edit its content, style, and layout.</p>
        </div>
      </aside>
    );
  }

  // ── Single-select: full editor ────────────────────────────────────────────
  const el = single!;
  const showTypography = isTextElement(el.type);

  return (
    <aside className="w-[280px] flex-shrink-0 bg-white border-l border-slate-200 flex flex-col h-full">
      <header className="h-9 px-3 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-600 border-b border-slate-200">
        <span className="truncate">{el.name || el.type}</span>
        <span className="text-[10px] font-mono text-slate-400 uppercase">{el.type}</span>
      </header>

      <nav className="flex bg-slate-50 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex-1 h-9 flex items-center justify-center gap-1.5 text-[11px] font-semibold transition-colors ${
              tab === t.id
                ? 'bg-white text-green-700 border-b-2 border-green-600'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </nav>

      <div className="flex-1 overflow-y-auto">
        {tab === 'content' && (
          <ContentPanel element={el} onPatch={(patch) => onPatchElement(el.id, patch)} />
        )}
        {tab === 'style' && (
          <>
            <StylePanel element={el} onStyle={(p) => onStyleElement(el.id, p)} />
            {showTypography && <TypographyPanel element={el} onStyle={(p) => onStyleElement(el.id, p)} />}
          </>
        )}
        {tab === 'layout' && (
          <LayoutPanel element={el} onPatch={(p) => onPatchElement(el.id, p)} />
        )}
      </div>
    </aside>
  );
};
