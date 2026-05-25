'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Layers, Plus, Copy, Trash2, Link2 } from 'lucide-react';
import { useMasterSlides } from '@/features/pptx-editing/hooks';
import { useToast } from '@/components/ToastProvider';
import { useConfirm } from '@/components/ConfirmDialog';

// =============================================================================
//  Phase 38A — Master Slides dashboard
//
//  Lightweight CRUD shell so users can manage masters for a deck. Paste a
//  deckId at the top → the grid below lists masters with quick-actions for
//  Duplicate, Apply-to-deck, Delete.
// =============================================================================

export default function MastersPage() {
  const [deckId, setDeckId] = useState('');
  const { items, loading, create, duplicate, remove, applyToDeck, update } = useMasterSlides(deckId);
  const [activeId, setActiveId] = useState<string | null>(null);
  const toast = useToast();
  const confirm = useConfirm();

  return (
    <div className="min-h-screen bg-[#EDEBE6]">
      <header className="bg-white border-b border-[#E3E1DA] px-6 h-14 flex items-center gap-3">
        <Link href="/dashboard" className="text-xs text-[#9A9A9A] hover:text-[#111111] flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" /> Back
        </Link>
        <div className="h-5 w-px bg-[#E3E1DA]" />
        <h1 className="text-base font-bold text-[#111111] flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#9A9A9A]" /> Slide Masters
        </h1>
        <input value={deckId} onChange={(e) => setDeckId(e.target.value)} placeholder="deck-uuid"
          className="ml-auto w-72 h-8 px-2 text-xs font-mono border border-[#C9C6BD] rounded" />
        <button
          onClick={() => create({ name: 'New master', layoutType: 'body' })}
          disabled={!deckId}
          className="h-8 px-2 text-xs font-semibold bg-[#4F7563] text-white rounded hover:bg-[#355846] inline-flex items-center gap-1 disabled:opacity-40"
        >
          <Plus className="w-3 h-3" /> New master
        </button>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-6">
        {!deckId && <div className="text-sm text-[#9A9A9A] italic">Paste a deck id to view its masters.</div>}
        {deckId && loading && items.length === 0 && <div className="text-xs text-[#9A9A9A]">Loading…</div>}
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((m) => (
            <li key={m.id} className="bg-white border border-[#E3E1DA] rounded-lg p-3 space-y-1.5">
              <input
                value={m.name}
                onChange={(e) => update(m.id, { name: e.target.value })}
                className="w-full text-xs font-bold text-[#111111] bg-transparent border-b border-transparent focus:border-[#C9C6BD] outline-none"
              />
              <select
                value={m.layoutType}
                onChange={(e) => update(m.id, { layoutType: e.target.value as any })}
                className="w-full h-7 px-1.5 text-[11px] border border-[#C9C6BD] rounded"
              >
                {['cover', 'body', 'divider', 'appendix', 'custom'].map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <div className="text-[9px] text-[#C9C6BD] font-mono truncate">{m.id}</div>
              <div className="flex gap-1 pt-1">
                <button onClick={() => duplicate(m.id)} title="Duplicate"
                  className="flex-1 h-7 text-[10px] font-semibold bg-[#F1F0EC] text-[#111111] rounded hover:bg-[#E3E1DA] inline-flex items-center justify-center gap-1"
                ><Copy className="w-3 h-3" /> Copy</button>
                <button
                  onClick={async () => {
                    setActiveId(m.id);
                    try { const r = await applyToDeck(m.id); toast.success(`Applied to ${r?.applied ?? 0} slides`); }
                    catch (e: any) { toast.error(e?.response?.data?.message || e?.message || 'Apply failed'); }
                    finally { setActiveId(null); }
                  }}
                  disabled={activeId === m.id}
                  className="flex-1 h-7 text-[10px] font-semibold bg-[#4F7563] text-white rounded hover:bg-[#355846] inline-flex items-center justify-center gap-1 disabled:opacity-40"
                ><Link2 className="w-3 h-3" /> Apply</button>
                <button onClick={async () => {
                  if (await confirm({ title: 'Delete master?', message: `"${m.name}" will be removed.`, confirmLabel: 'Delete', tone: 'danger' })) {
                    try { await remove(m.id); toast.success('Master deleted.'); }
                    catch (e: any) { toast.error(e?.response?.data?.message || e?.message || 'Delete failed'); }
                  }
                }}
                  className="h-7 px-2 text-[10px] font-semibold bg-[#FCF1F1] text-[#7a2929] rounded hover:bg-[#F7E3E3]"
                ><Trash2 className="w-3 h-3" /></button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
