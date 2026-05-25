'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Settings2, Palette, Type as TypeIcon, Layers, ChevronRight, Lock, Sparkles } from 'lucide-react';
import type { SlideElementDTO, ElementStyle } from '@/types/slide-element';
import { LayoutPanel } from './panels/LayoutPanel';
import { StylePanel } from './panels/StylePanel';
import { TypographyPanel, isTextElement } from './panels/TypographyPanel';
import { ContentPanel } from './panels/ContentPanel';
import { SlidePanel } from './panels/SlidePanel';
import { AnimationsPanel } from '@/features/pptx-editing/AnimationsPanel';

// =============================================================================
//  Inspector — docked right panel for editing the selected element(s) or slide.
//  Tabs swap content for the same selection so the panel stays compact.
// =============================================================================

type Tab = 'content' | 'style' | 'layout' | 'animate';

const TABS: Array<{ id: Tab; label: string; icon: React.ReactNode }> = [
  { id: 'content', label: 'Content', icon: <Settings2 className="w-3.5 h-3.5" /> },
  { id: 'style',   label: 'Style',   icon: <Palette className="w-3.5 h-3.5" /> },
  { id: 'layout',  label: 'Layout',  icon: <Layers className="w-3.5 h-3.5" /> },
  { id: 'animate', label: 'Animate', icon: <Sparkles className="w-3.5 h-3.5" /> },
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

  /** Phase 35-final-B Task 4 — render a lock pane during Version History
   *  preview mode so editable controls are visually absent. The actual
   *  mutators upstream remain guarded as defense-in-depth. */
  readOnly?:        boolean;
  /** Optional metadata for the lock pane (version name + captured timestamp). */
  readOnlyContext?: { label: string; timestamp?: string } | null;
}

export const Inspector: React.FC<InspectorProps> = ({
  elements, selectedIds, onPatchElement, onStyleElement, slide, onPatchSlide,
  readOnly = false, readOnlyContext = null,
}) => {
  const [tab, setTab] = useState<Tab>('content');

  // Phase 35-final-B Task 4 — Inspector lock pane in preview mode.
  if (readOnly) {
    const selectedCount = selectedIds.length;
    const lockSingle = selectedCount === 1 ? elements.find((e) => e.id === selectedIds[0]) : null;
    return (
      <aside className="w-[280px] flex-shrink-0 bg-white border-l border-[#E3E1DA] flex flex-col h-full">
        <header className="h-9 px-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#6B6B6B] border-b border-[#E3E1DA]">
          <Lock className="w-3.5 h-3.5 text-violet-600" />
          Read-only preview
        </header>
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          <div className="rounded border border-violet-200 bg-violet-50 p-2.5">
            <div className="text-[11px] font-semibold text-violet-800">Editing disabled</div>
            <div className="text-[10px] text-violet-700 mt-1 leading-relaxed">
              You're viewing a historical version. Exit preview to edit, or restore this version to replace the current deck.
            </div>
          </div>

          {readOnlyContext && (
            <div className="rounded border border-[#E3E1DA] p-2.5">
              <div className="text-[10px] uppercase tracking-wide text-[#9A9A9A]">Version</div>
              <div className="text-[12px] font-medium text-[#111111] truncate">{readOnlyContext.label}</div>
              {readOnlyContext.timestamp && (
                <div className="text-[10px] text-[#9A9A9A] mt-0.5">{readOnlyContext.timestamp}</div>
              )}
            </div>
          )}

          {slide && (
            <div className="rounded border border-[#E3E1DA] p-2.5">
              <div className="text-[10px] uppercase tracking-wide text-[#9A9A9A]">Slide</div>
              <div className="text-[12px] font-medium text-[#111111] truncate">{slide.title || '(untitled)'}</div>
              <div className="text-[10px] text-[#9A9A9A] mt-0.5">{slide.type}</div>
            </div>
          )}

          <div className="rounded border border-[#E3E1DA] p-2.5">
            <div className="text-[10px] uppercase tracking-wide text-[#9A9A9A]">Selection</div>
            {selectedCount === 0 ? (
              <div className="text-[11px] text-[#9A9A9A] italic">Nothing selected</div>
            ) : lockSingle ? (
              <>
                <div className="text-[12px] font-medium text-[#111111]">{lockSingle.name || lockSingle.type}</div>
                <div className="text-[10px] text-[#9A9A9A] mt-0.5">{lockSingle.type}</div>
              </>
            ) : (
              <div className="text-[12px] font-medium text-[#111111]">{selectedCount} elements</div>
            )}
          </div>
        </div>
      </aside>
    );
  }

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
      <aside className="w-[280px] flex-shrink-0 bg-white border-l border-[#E3E1DA] flex flex-col h-full">
        <header className="h-9 px-3 flex items-center text-xs font-bold uppercase tracking-wider text-[#6B6B6B] border-b border-[#E3E1DA]">
          Slide
        </header>
        <div className="flex-1 overflow-y-auto">
          {slide ? (
            <SlidePanel slide={slide} onPatch={onPatchSlide} />
          ) : (
            <div className="p-6 text-center text-xs text-[#C9C6BD]">Loading slide…</div>
          )}
        </div>
      </aside>
    );
  }

  // ── Multi-select: only show layout (numeric inputs would be misleading) ───
  if (!isSingleSelect) {
    return (
      <aside className="w-[280px] flex-shrink-0 bg-white border-l border-[#E3E1DA] flex flex-col h-full">
        <header className="h-9 px-3 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#6B6B6B] border-b border-[#E3E1DA]">
          <span>{selected.length} elements</span>
        </header>
        <div className="flex-1 overflow-y-auto p-3 text-xs text-[#9A9A9A] leading-relaxed">
          Multi-element editing is limited in this version.
          <ul className="mt-3 space-y-1.5">
            <li>• Drag to move all selected</li>
            <li>• Arrow keys to nudge all</li>
            <li>• <kbd className="px-1 py-0.5 bg-[#F1F0EC] border rounded text-[10px]">⌫</kbd> deletes all</li>
            <li>• <kbd className="px-1 py-0.5 bg-[#F1F0EC] border rounded text-[10px]">⌘D</kbd> duplicates all</li>
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
    <aside className="w-[280px] flex-shrink-0 bg-white border-l border-[#E3E1DA] flex flex-col h-full">
      <header className="h-9 px-3 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#6B6B6B] border-b border-[#E3E1DA]">
        <span className="truncate">{el.name || el.type}</span>
        <span className="text-[10px] font-mono text-[#C9C6BD] uppercase">{el.type}</span>
      </header>

      <nav className="flex bg-[#EDEBE6] border-b border-[#E3E1DA]">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex-1 h-9 flex items-center justify-center gap-1.5 text-[11px] font-semibold transition-colors ${
              tab === t.id
                ? 'bg-white text-[#355846] border-b-2 border-[#4F7563]'
                : 'text-[#9A9A9A] hover:text-[#111111]'
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
        {tab === 'animate' && (
          /* Phase 38H — per-element animations. */
          <AnimationsPanel elementId={el.id} />
        )}
      </div>
    </aside>
  );
};
