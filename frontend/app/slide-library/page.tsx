'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, BookOpen, Trash2, FileInput } from 'lucide-react';
import { useSlideLibrary, ReusableSlideDTO } from '@/features/pptx-editing/hooks';

// =============================================================================
//  Phase 38O — Slide Library
//
//  Browse saved reusable slides / sections. Each entry shows title, kind,
//  tags, and a per-row "Insert into deck" prompt (deckId paste form).
// =============================================================================

export default function SlideLibraryPage() {
  const { items, loading, insert, remove } = useSlideLibrary();
  const [deckId, setDeckId] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const handleInsert = async (id: string) => {
    if (!deckId.trim()) { alert('Paste a deck id first.'); return; }
    setBusy(id);
    try {
      const res = await insert(id, deckId.trim());
      alert(`Inserted ${res?.inserted ?? 1} slide(s) into deck.`);
    } catch (e: any) {
      alert(`Insert failed: ${e?.response?.data?.message || e?.message || e}`);
    } finally { setBusy(null); }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 h-14 flex items-center gap-3">
        <Link href="/dashboard" className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" /> Back
        </Link>
        <div className="h-5 w-px bg-slate-200" />
        <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-slate-500" /> Slide Library
        </h1>
        <input
          value={deckId} onChange={(e) => setDeckId(e.target.value)} placeholder="Target deck id…"
          className="ml-auto w-72 h-8 px-2 text-xs font-mono border border-slate-300 rounded"
        />
      </header>

      <div className="max-w-5xl mx-auto px-6 py-6">
        {loading && <div className="text-xs text-slate-500">Loading…</div>}
        {!loading && items.length === 0 && (
          <div className="text-sm text-slate-500 italic">
            No saved slides yet. From the editor inspector, save a slide or section to the library.
          </div>
        )}
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((it: ReusableSlideDTO) => (
            <li key={it.id} className="bg-white border border-slate-200 rounded-lg overflow-hidden">
              {it.thumbnail
                ? <img src={it.thumbnail} alt="" className="w-full aspect-video object-cover bg-slate-100" />
                : <div className="w-full aspect-video bg-slate-100 flex items-center justify-center text-slate-400 text-xs">No preview</div>}
              <div className="p-3 space-y-1.5">
                <div className="text-xs font-bold text-slate-900 truncate">{it.name}</div>
                <div className="text-[10px] text-slate-500 truncate">{it.description}</div>
                <div className="flex flex-wrap gap-1">
                  <span className="text-[9px] font-mono uppercase bg-slate-100 text-slate-700 px-1 py-0.5 rounded">{it.kind}</span>
                  {it.tags?.slice(0, 3).map((t, i) => (
                    <span key={i} className="text-[9px] bg-blue-50 text-blue-700 px-1 py-0.5 rounded">#{t}</span>
                  ))}
                </div>
                <div className="flex gap-1 pt-1">
                  <button
                    onClick={() => handleInsert(it.id)}
                    disabled={busy === it.id || !deckId.trim()}
                    className="flex-1 h-7 text-[10px] font-semibold bg-blue-600 text-white rounded inline-flex items-center justify-center gap-1 hover:bg-blue-700 disabled:opacity-40"
                  >
                    <FileInput className="w-3 h-3" /> {busy === it.id ? 'Inserting…' : 'Insert'}
                  </button>
                  <button
                    onClick={() => { if (window.confirm('Delete this library entry?')) remove(it.id); }}
                    className="h-7 px-2 text-[10px] font-semibold bg-red-50 text-red-700 rounded hover:bg-red-100"
                  ><Trash2 className="w-3 h-3" /></button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
