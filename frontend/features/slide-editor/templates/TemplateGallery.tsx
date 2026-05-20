'use client';

import React, { useMemo, useState } from 'react';
import { X, Search, Check, Loader2, Sparkles } from 'lucide-react';
import { TEMPLATES, TemplateSpec, findTemplate } from './registry';
import { applyTemplate } from './applyTemplate';
import { TemplatePreview } from './TemplatePreview';

// =============================================================================
//  TemplateGallery — modal that lets the user pick + apply a template to their
//  current deck.
//
//  Two columns: list of templates on the left, large preview + details + apply
//  CTA on the right.
// =============================================================================

interface Props {
  deckId:                string;
  currentTemplateId?:    string | null;
  onClose:               () => void;
  /** Called after a successful apply so the editor can refresh its current slide. */
  onApplied:             (templateId: string) => void;
}

export const TemplateGallery: React.FC<Props> = ({ deckId, currentTemplateId, onClose, onApplied }) => {
  const [search, setSearch] = useState('');
  const [activeId, setActiveId] = useState<string>(currentTemplateId || TEMPLATES[0].id);
  const [applying, setApplying] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError]       = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return TEMPLATES;
    return TEMPLATES.filter((t) =>
      t.name.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q) ||
      t.tags.some((tag) => tag.toLowerCase().includes(q)),
    );
  }, [search]);

  const active = findTemplate(activeId) || TEMPLATES[0];

  const handleApply = async () => {
    if (applying) return;
    setApplying(true); setError(null); setProgress({ done: 0, total: 1 });
    try {
      const result = await applyTemplate(deckId, active, {
        onSlideDone: () => setProgress((p) => p ? { ...p, done: p.done + 1 } : p),
      });
      setProgress({ done: result.slidesApplied, total: result.slidesApplied });
      onApplied(active.id);
      setTimeout(() => { onClose(); }, 700);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Apply failed');
    } finally {
      setApplying(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-5xl bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col"
        style={{ height: 'min(640px, calc(100vh - 32px))', maxHeight: 'calc(100vh - 32px)' }}
      >
        {/* Header */}
        <header className="h-12 border-b border-slate-200 px-4 flex items-center gap-3 flex-shrink-0">
          <Sparkles className="w-4 h-4 text-green-600" />
          <h2 className="text-sm font-bold text-slate-900">Choose template</h2>
          <span className="text-[11px] text-slate-400">{TEMPLATES.length} available</span>
          <button onClick={onClose} className="ml-auto p-1 rounded text-slate-500 hover:bg-slate-100" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* Body */}
        <div className="flex-1 min-h-0 flex overflow-hidden">
          {/* Left: list */}
          <aside className="w-[240px] flex-shrink-0 border-r border-slate-200 bg-slate-50 flex flex-col">
            <div className="p-2 border-b border-slate-200">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                <input
                  type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search templates…"
                  className="w-full h-7 pl-7 pr-2 text-xs bg-white border border-slate-200 rounded outline-none focus:border-green-500"
                />
              </div>
            </div>
            <ul className="flex-1 overflow-y-auto p-2 space-y-1">
              {filtered.map((t) => {
                const isActive = t.id === activeId;
                const isApplied = t.id === currentTemplateId;
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => setActiveId(t.id)}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left transition-colors ${
                        isActive ? 'bg-green-50 ring-1 ring-green-200' : 'hover:bg-white'
                      }`}
                    >
                      <TemplatePreview template={t} width={56} />
                      <div className="flex-1 min-w-0">
                        <div className={`text-xs font-semibold truncate ${isActive ? 'text-green-800' : 'text-slate-800'}`}>
                          {t.name}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate">{t.category}</div>
                      </div>
                      {isApplied && <Check className="w-3 h-3 text-green-600 flex-shrink-0" />}
                    </button>
                  </li>
                );
              })}
              {filtered.length === 0 && (
                <li className="px-2 py-4 text-center text-xs text-slate-400">No templates match "{search}"</li>
              )}
            </ul>
          </aside>

          {/* Right: preview + details */}
          <section className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 bg-slate-100">
              <div className="max-w-2xl mx-auto">
                <TemplatePreview template={active} width={480} />
                <div className="mt-5">
                  <h3 className="text-lg font-bold text-slate-900">{active.name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{active.category}</p>
                  <p className="text-sm text-slate-700 mt-3 leading-relaxed">{active.description}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {active.tags.map((tag) => (
                      <span key={tag} className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">{tag}</span>
                    ))}
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-3 gap-2 text-[10px]">
                  <Swatch label="Primary"    color={active.theme.primary    || '#000'} />
                  <Swatch label="Accent"     color={active.theme.accent     || '#000'} />
                  <Swatch label="Text"       color={active.theme.text       || '#000'} />
                  <Swatch label="Background" color={active.theme.background || '#fff'} />
                  <Swatch label="Surface"    color={active.theme.surface    || '#fff'} />
                  <Swatch label="Muted"      color={active.theme.muted      || '#888'} />
                </div>
                <div className="mt-3 space-y-1 text-[11px] text-slate-600">
                  <div><span className="font-semibold">Heading font: </span><span style={{ fontFamily: active.theme.fontHeading }}>{active.theme.fontHeading || 'default'}</span></div>
                  <div><span className="font-semibold">Body font: </span><span style={{ fontFamily: active.theme.fontBody }}>{active.theme.fontBody || 'default'}</span></div>
                </div>
              </div>
            </div>

            {/* Apply bar */}
            <footer className="h-14 border-t border-slate-200 px-4 flex items-center gap-3 flex-shrink-0 bg-white">
              {progress && (
                <span className="text-xs text-slate-500">
                  {applying ? `Applying… (${progress.done}/${progress.total})` : `Applied to ${progress.done} slide${progress.done === 1 ? '' : 's'}`}
                </span>
              )}
              {error && <span className="text-xs text-red-600">{error}</span>}
              <button
                onClick={onClose}
                className="ml-auto px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleApply}
                disabled={applying}
                className="px-3 py-1.5 text-xs font-semibold bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded shadow-md shadow-green-500/30 flex items-center gap-1.5 disabled:opacity-60"
              >
                {applying && <Loader2 className="w-3 h-3 animate-spin" />}
                Apply to deck
              </button>
            </footer>
          </section>
        </div>
      </div>
    </div>
  );
};

const Swatch: React.FC<{ label: string; color: string }> = ({ label, color }) => (
  <div className="flex items-center gap-1.5 px-2 py-1.5 bg-white rounded border border-slate-200">
    <span className="w-4 h-4 rounded border border-slate-300 flex-shrink-0" style={{ background: color }} />
    <div className="min-w-0">
      <div className="font-semibold text-slate-700 truncate">{label}</div>
      <div className="font-mono text-slate-500 truncate">{color}</div>
    </div>
  </div>
);
