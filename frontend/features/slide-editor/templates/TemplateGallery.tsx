'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { X, Search, Check, Loader2, Sparkles, Eye, Maximize2, ChevronLeft, ChevronRight } from 'lucide-react';
import { TEMPLATES, TemplateSpec, findTemplate } from './registry';
import { applyTemplate } from './applyTemplate';
import { TemplatePreview } from './TemplatePreview';

// =============================================================================
//  TemplateGallery — modal that lets the user pick + apply a template to their
//  current deck.
//
//  Two columns: list of templates on the left, large preview + details + apply
//  CTA on the right.  Eye icon on hover / Maximize button opens a full-screen
//  preview overlay with keyboard navigation (← → Esc).
// =============================================================================

interface Props {
  projectId:             string;
  deckId:                string;
  currentTemplateId?:    string | null;
  onClose:               () => void;
  onApplyingChange?:     (applying: boolean) => void;
  /** Called after a successful apply so the editor can refresh its current slide. */
  onApplied:             (templateId: string, firstSlideId?: string) => void;
}

export const TemplateGallery: React.FC<Props> = ({ projectId, deckId, currentTemplateId, onClose, onApplied, onApplyingChange }) => {
  const [search, setSearch]           = useState('');
  const [activeId, setActiveId]       = useState<string>(currentTemplateId || TEMPLATES[0].id);
  const [applying, setApplying]       = useState(false);
  const [progress, setProgress]       = useState<{ done: number; total: number } | null>(null);
  const [error, setError]             = useState<string | null>(null);
  const [fullscreenId, setFullscreenId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return TEMPLATES;
    return TEMPLATES.filter((t) =>
      t.name.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q) ||
      t.tags.some((tag) => tag.toLowerCase().includes(q)),
    );
  }, [search]);

  const active             = findTemplate(activeId) || TEMPLATES[0];
  const fullscreenTemplate = fullscreenId ? (findTemplate(fullscreenId) || active) : null;
  const fullscreenIdx      = fullscreenId ? filtered.findIndex((t) => t.id === fullscreenId) : -1;

  // Keyboard: Esc closes fullscreen; ← / → navigate templates
  useEffect(() => {
    if (!fullscreenId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setFullscreenId(null); return; }
      if (e.key === 'ArrowLeft'  && fullscreenIdx > 0)                    setFullscreenId(filtered[fullscreenIdx - 1].id);
      if (e.key === 'ArrowRight' && fullscreenIdx < filtered.length - 1)  setFullscreenId(filtered[fullscreenIdx + 1].id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fullscreenId, fullscreenIdx, filtered]);

  const handleApply = async (tpl?: TemplateSpec) => {
    const template = tpl || active;
    if (applying) return;
    setApplying(true); setError(null); setProgress({ done: 0, total: 1 });
    onApplyingChange?.(true);
    try {
      const result = await applyTemplate(projectId, deckId, template, {
        onSlideDone: () => setProgress((p) => p ? { ...p, done: p.done + 1 } : p),
      });
      setProgress({ done: result.slidesApplied, total: result.slidesApplied });
      const firstSlideId = [...result.slides].sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))[0]?.id;
      onApplied(template.id, firstSlideId);
      setTimeout(() => { onClose(); }, 700);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Apply failed');
    } finally {
      setApplying(false);
      onApplyingChange?.(false);
    }
  };

  // Responsive fullscreen preview width
  const fsWidth = typeof window !== 'undefined' ? Math.min(840, Math.floor(window.innerWidth * 0.80)) : 840;

  return (
    <>
      {/* ─── Gallery modal ─────────────────────────────────────────────────────── */}
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
                  const isActive  = t.id === activeId;
                  const isApplied = t.id === currentTemplateId;
                  return (
                    <li key={t.id} className="group">
                      {/* Outer wrapper — handles hover ring, NOT a button to avoid nesting */}
                      <div className={`w-full flex items-center gap-2 px-2 py-1.5 rounded transition-colors ${
                        isActive ? 'bg-green-50 ring-1 ring-green-200' : 'hover:bg-white'
                      }`}>
                        {/* Main click target */}
                        <button
                          type="button"
                          onClick={() => setActiveId(t.id)}
                          className="flex-1 flex items-center gap-2 text-left min-w-0"
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
                        {/* Eye — visible on hover */}
                        <button
                          type="button"
                          onClick={() => { setActiveId(t.id); setFullscreenId(t.id); }}
                          className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-slate-200 transition-opacity flex-shrink-0"
                          title="Full-screen preview"
                        >
                          <Eye className="w-3 h-3 text-slate-500" />
                        </button>
                      </div>
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
                  {/* Preview */}
                  <TemplatePreview template={active} width={480} />

                  {/* Fullscreen button — clearly visible below the preview */}
                  <button
                    onClick={() => setFullscreenId(active.id)}
                    className="mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors shadow-sm"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    Preview fullscreen
                  </button>

                  <div className="mt-4">
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
                  onClick={() => handleApply()}
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

      {/* ─── Full-screen preview overlay ───────────────────────────────────────── */}
      {fullscreenTemplate && (
        <div
          className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-md flex items-center justify-center"
          onClick={() => setFullscreenId(null)}
        >
          {/* Prev arrow */}
          {fullscreenIdx > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); setFullscreenId(filtered[fullscreenIdx - 1].id); }}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
              title="Previous (←)"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {/* Next arrow */}
          {fullscreenIdx < filtered.length - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); setFullscreenId(filtered[fullscreenIdx + 1].id); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
              title="Next (→)"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}

          {/* Content panel */}
          <div
            className="relative flex flex-col"
            style={{ width: fsWidth }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top bar: counter + close */}
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-xs text-white/40 tabular-nums">
                {fullscreenIdx + 1} / {filtered.length}
              </span>
              <button
                onClick={() => setFullscreenId(null)}
                className="p-1.5 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                title="Close (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Preview */}
            <div className="rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/10">
              <TemplatePreview template={fullscreenTemplate} width={fsWidth} />
            </div>

            {/* Info + apply */}
            <div className="mt-5 flex items-start justify-between gap-6">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <h3 className="text-xl font-bold text-white leading-tight">{fullscreenTemplate.name}</h3>
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-white/10 text-white/60 font-medium">
                    {fullscreenTemplate.category}
                  </span>
                </div>
                <p className="text-sm text-white/65 mt-1.5 leading-relaxed max-w-lg">{fullscreenTemplate.description}</p>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {fullscreenTemplate.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border border-white/15 text-white/45"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0 pt-0.5">
                <button
                  onClick={() => setFullscreenId(null)}
                  className="px-4 py-2 text-sm font-semibold text-white/55 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setActiveId(fullscreenTemplate.id);
                    setFullscreenId(null);
                    handleApply(fullscreenTemplate);
                  }}
                  disabled={applying}
                  className="px-5 py-2 text-sm font-semibold bg-green-600 hover:bg-green-500 text-white rounded-lg shadow-lg shadow-green-900/40 disabled:opacity-60 flex items-center gap-2 transition-colors"
                >
                  {applying && <Loader2 className="w-4 h-4 animate-spin" />}
                  Apply to deck
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
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
