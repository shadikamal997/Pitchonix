'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Trash2, FileText, RotateCcw, Save } from 'lucide-react';
import api from '@/lib/api';

// =============================================================================
//  Phase 42.8D — CV Import Mapping Memory management.
//
//  Lists the user's saved "Career Highlights → experience" mappings and
//  exposes edit / delete / autoApply-toggle / reset-all controls.
// =============================================================================

const TARGETS = ['experience','education','skills','languages','projects','certifications','awards','publications','summary','references'];

interface MemoryRow {
  id:            string;
  sourceHeading: string;
  targetSection: string;
  count:         number;
  autoApply:     boolean;
  createdAt:     string;
  updatedAt:     string;
}

export default function CvImportMappingsPage() {
  const [rows, setRows] = useState<MemoryRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 3000); return () => clearTimeout(t); }, [toast]);

  const refresh = async () => {
    setBusy(true); setError(null);
    try { const { data } = await api.get('/career/import/mappings'); setRows(data || []); }
    catch (e: any) { setError(e?.response?.data?.message || e?.message); }
    finally { setBusy(false); }
  };
  useEffect(() => { refresh(); }, []);

  const updateRow = async (id: string, patch: Partial<MemoryRow>) => {
    try {
      const { data } = await api.patch(`/career/import/mappings/${id}`, patch);
      setRows((r) => r.map((x) => x.id === id ? { ...x, ...data } : x));
      setToast('Mapping updated');
    } catch (e: any) { setError(e?.response?.data?.message || e?.message); }
  };

  const removeRow = async (id: string) => {
    if (!window.confirm('Delete this mapping?')) return;
    try { await api.delete(`/career/import/mappings/${id}`); setRows((r) => r.filter((x) => x.id !== id)); setToast('Mapping deleted'); }
    catch (e: any) { setError(e?.response?.data?.message || e?.message); }
  };

  const wipeAll = async () => {
    if (!window.confirm('Delete ALL saved mappings? Future imports will treat unknown headings as new.')) return;
    try { await api.delete('/career/import/mappings'); setRows([]); setToast('All mappings cleared'); }
    catch (e: any) { setError(e?.response?.data?.message || e?.message); }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {toast && <div className="fixed top-4 right-4 z-50 bg-green-50 border border-green-200 text-green-900 text-xs rounded-lg shadow-lg px-3 py-2">{toast}</div>}
      <header className="bg-white border-b border-slate-200 px-6 h-14 flex items-center gap-3">
        <Link href="/career" className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" /> Career
        </Link>
        <div className="h-5 w-px bg-slate-200" />
        <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <FileText className="w-4 h-4 text-purple-600" /> CV Import Preferences
        </h1>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-6 space-y-4">
        <section className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Saved section mappings</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Headings you've previously mapped. When auto-apply is on, future imports will route these headings automatically.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={refresh} disabled={busy}
                className="h-7 px-2 text-[11px] text-blue-600 hover:underline disabled:opacity-50 inline-flex items-center gap-1">
                {busy && <Loader2 className="w-3 h-3 animate-spin" />} Refresh
              </button>
              {rows.length > 0 && (
                <button onClick={wipeAll}
                  className="h-7 px-2 text-[11px] text-red-600 hover:underline inline-flex items-center gap-1">
                  <RotateCcw className="w-3 h-3" /> Reset all
                </button>
              )}
            </div>
          </div>

          {error && <div className="bg-red-50 border border-red-200 text-red-800 text-xs rounded p-2">{error}</div>}

          {rows.length === 0 && !busy && (
            <p className="text-[11px] text-slate-500 italic">
              No saved mappings yet. They appear here automatically when you map an unknown heading during a CV import.
            </p>
          )}

          {rows.length > 0 && (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <th className="py-1.5 pr-2">Source heading</th>
                  <th className="py-1.5 pr-2">Target section</th>
                  <th className="py-1.5 pr-2">Auto-apply</th>
                  <th className="py-1.5 pr-2">Used</th>
                  <th className="py-1.5"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100">
                    <td className="py-1.5 pr-2 font-mono text-[11px]">{r.sourceHeading}</td>
                    <td className="py-1.5 pr-2">
                      <select value={r.targetSection}
                        onChange={(e) => updateRow(r.id, { targetSection: e.target.value })}
                        className="h-7 px-1.5 border border-slate-300 rounded bg-white text-xs">
                        {TARGETS.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </td>
                    <td className="py-1.5 pr-2">
                      <label className="inline-flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" checked={r.autoApply}
                          onChange={(e) => updateRow(r.id, { autoApply: e.target.checked })} />
                        <span className="text-[11px]">{r.autoApply ? 'on' : 'off'}</span>
                      </label>
                    </td>
                    <td className="py-1.5 pr-2 text-[11px] text-slate-500">×{r.count}</td>
                    <td className="py-1.5">
                      <button onClick={() => removeRow(r.id)}
                        className="h-7 px-2 text-[11px] text-red-600 hover:bg-red-50 rounded inline-flex items-center gap-1">
                        <Trash2 className="w-3 h-3" /> Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}
