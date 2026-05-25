'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, BookOpen, Trash2, FileInput } from 'lucide-react';
import { useSlideLibrary, ReusableSlideDTO } from '@/features/pptx-editing/hooks';
import { useToast } from '@/components/ToastProvider';
import { useConfirm } from '@/components/ConfirmDialog';

// =============================================================================
//  Phase 38O — Slide Library
//
//  Browse saved reusable slides / sections. Each entry shows title, kind,
//  tags, and a per-row "Insert into deck" prompt (deckId paste form).
// =============================================================================

export default function SlideLibraryPage() {
  const { items, loading, insert, remove } = useSlideLibrary();
  const toast = useToast();
  const confirm = useConfirm();
  const [deckId, setDeckId] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const handleInsert = async (id: string) => {
    if (!deckId.trim()) { toast.warning('Paste a deck id first.'); return; }
    setBusy(id);
    try {
      const res = await insert(id, deckId.trim());
      toast.success(`Inserted ${res?.inserted ?? 1} slide(s) into deck.`);
    } catch (e: any) {
      toast.error(`Insert failed: ${e?.response?.data?.message || e?.message || e}`);
    } finally { setBusy(null); }
  };

  return (
    <div className="min-h-screen bg-[#EDEBE6]">
      <header className="bg-white border-b border-[#E3E1DA] px-6 h-14 flex items-center gap-3">
        <Link href="/dashboard" className="text-xs text-[#9A9A9A] hover:text-[#111111] flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" /> Back
        </Link>
        <div className="h-5 w-px bg-[#E3E1DA]" />
        <h1 className="text-base font-bold text-[#111111] flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-[#9A9A9A]" /> Slide Library
        </h1>
        <input
          value={deckId} onChange={(e) => setDeckId(e.target.value)} placeholder="Target deck id…"
          className="ml-auto w-72 h-8 px-2 text-xs font-mono border border-[#C9C6BD] rounded"
        />
      </header>

      <div className="max-w-5xl mx-auto px-6 py-6">
        {loading && <div className="text-xs text-[#9A9A9A]">Loading…</div>}
        {!loading && items.length === 0 && (
          <div className="text-sm text-[#9A9A9A] italic">
            No saved slides yet. From the editor inspector, save a slide or section to the library.
          </div>
        )}
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((it: ReusableSlideDTO) => (
            <li key={it.id} className="bg-white border border-[#E3E1DA] rounded-lg overflow-hidden">
              {it.thumbnail
                ? <img src={it.thumbnail} alt="" className="w-full aspect-video object-cover bg-[#F1F0EC]" />
                : <div className="w-full aspect-video bg-[#F1F0EC] flex items-center justify-center text-[#C9C6BD] text-xs">No preview</div>}
              <div className="p-3 space-y-1.5">
                <div className="text-xs font-bold text-[#111111] truncate">{it.name}</div>
                <div className="text-[10px] text-[#9A9A9A] truncate">{it.description}</div>
                <div className="flex flex-wrap gap-1">
                  <span className="text-[9px] font-mono uppercase bg-[#F1F0EC] text-[#111111] px-1 py-0.5 rounded">{it.kind}</span>
                  {it.tags?.slice(0, 3).map((t, i) => (
                    <span key={i} className="text-[9px] bg-[#EEF5F1] text-[#355846] px-1 py-0.5 rounded">#{t}</span>
                  ))}
                </div>
                <div className="flex gap-1 pt-1">
                  <button
                    onClick={() => handleInsert(it.id)}
                    disabled={busy === it.id || !deckId.trim()}
                    className="flex-1 h-7 text-[10px] font-semibold bg-[#4F7563] text-white rounded inline-flex items-center justify-center gap-1 hover:bg-[#355846] disabled:opacity-40"
                  >
                    <FileInput className="w-3 h-3" /> {busy === it.id ? 'Inserting…' : 'Insert'}
                  </button>
                  <button
                    onClick={async () => {
                      if (await confirm({ title: 'Delete entry?', message: `"${it.name}" will be removed from the slide library.`, confirmLabel: 'Delete', tone: 'danger' })) {
                        try { await remove(it.id); toast.success('Entry deleted.'); }
                        catch (e: any) { toast.error(e?.response?.data?.message || e?.message || 'Delete failed'); }
                      }
                    }}
                    className="h-7 px-2 text-[10px] font-semibold bg-[#FCF1F1] text-[#7a2929] rounded hover:bg-[#F7E3E3]"
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
