'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, LayoutTemplate, Plus, Trash2, Sparkles } from 'lucide-react';
import { useDeckTemplates } from '@/features/pptx-editing/hooks';

// =============================================================================
//  Phase 38P — Template Builder / Deck Templates dashboard
//
//    - List existing deck templates (workspace + public)
//    - "Save deck as template" form (paste a deck id)
//    - "Spin up new deck" form (paste a project id + optional title)
// =============================================================================

export default function DeckTemplatesPage() {
  const { items, loading, fromDeck, instantiate, remove } = useDeckTemplates();
  const [sourceDeckId, setSourceDeckId] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [projectId, setProjectId] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);

  const handleSnapshot = async () => {
    if (!sourceDeckId.trim()) { alert('Paste a deck id first.'); return; }
    try {
      await fromDeck(sourceDeckId.trim(), {
        name: templateName.trim() || undefined,
        isPublic: false,
      });
      setSourceDeckId(''); setTemplateName('');
    } catch (e: any) {
      alert(`Save-as-template failed: ${e?.response?.data?.message || e?.message || e}`);
    }
  };

  const handleInstantiate = async (id: string) => {
    if (!projectId.trim()) { alert('Paste a project id first.'); return; }
    setActiveId(id);
    try {
      const deck = await instantiate(id, projectId.trim());
      alert(`Created deck ${deck.id}`);
    } catch (e: any) {
      alert(`Instantiate failed: ${e?.response?.data?.message || e?.message || e}`);
    } finally { setActiveId(null); }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 h-14 flex items-center gap-3">
        <Link href="/dashboard" className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" /> Back
        </Link>
        <div className="h-5 w-px bg-slate-200" />
        <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <LayoutTemplate className="w-4 h-4 text-slate-500" /> Deck Templates
        </h1>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        {/* Save deck as template */}
        <section className="bg-white border border-slate-200 rounded-lg p-4">
          <h2 className="text-sm font-bold text-slate-900 mb-2">Save a deck as a template</h2>
          <p className="text-[11px] text-slate-500 mb-3">Snapshots all slides, masters, themes, and sections into a portable template.</p>
          <div className="flex gap-2">
            <input value={sourceDeckId} onChange={(e) => setSourceDeckId(e.target.value)} placeholder="deck-uuid"
              className="w-72 h-8 px-2 text-xs font-mono border border-slate-300 rounded" />
            <input value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="Template name"
              className="flex-1 h-8 px-2 text-xs border border-slate-300 rounded" />
            <button onClick={handleSnapshot} className="h-8 px-3 text-xs font-semibold bg-blue-600 text-white rounded hover:bg-blue-700 inline-flex items-center gap-1">
              <Plus className="w-3 h-3" /> Snapshot
            </button>
          </div>
        </section>

        {/* Instantiate target */}
        <section className="bg-white border border-slate-200 rounded-lg p-4">
          <h2 className="text-sm font-bold text-slate-900 mb-2">Target project for new decks</h2>
          <input value={projectId} onChange={(e) => setProjectId(e.target.value)} placeholder="project-uuid"
            className="w-full h-8 px-2 text-xs font-mono border border-slate-300 rounded" />
        </section>

        {/* List */}
        <section>
          <h2 className="text-sm font-bold text-slate-900 mb-2">Templates ({items.length})</h2>
          {loading && <div className="text-xs text-slate-500">Loading…</div>}
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {items.map((t) => (
              <li key={t.id} className="bg-white border border-slate-200 rounded-lg p-3 space-y-1.5">
                <div className="text-xs font-bold text-slate-900 truncate">{t.name}</div>
                {t.description && <div className="text-[10px] text-slate-500 truncate">{t.description}</div>}
                <div className="text-[9px] text-slate-400 font-mono">
                  {t.isPublic ? 'public · ' : ''}{(t.payload?.slides?.length || 0)} slides
                </div>
                <div className="flex gap-1 pt-1">
                  <button
                    onClick={() => handleInstantiate(t.id)}
                    disabled={activeId === t.id || !projectId.trim()}
                    className="flex-1 h-7 text-[10px] font-semibold bg-blue-600 text-white rounded inline-flex items-center justify-center gap-1 hover:bg-blue-700 disabled:opacity-40"
                  >
                    <Sparkles className="w-3 h-3" /> {activeId === t.id ? 'Creating…' : 'New deck'}
                  </button>
                  <button
                    onClick={() => { if (window.confirm('Delete this template?')) remove(t.id); }}
                    className="h-7 px-2 text-[10px] font-semibold bg-red-50 text-red-700 rounded hover:bg-red-100"
                  ><Trash2 className="w-3 h-3" /></button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
