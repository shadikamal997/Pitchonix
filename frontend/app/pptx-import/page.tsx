'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, FileUp, Loader2, AlertTriangle } from 'lucide-react';
import { importPptx, parsePptx } from '@/features/pptx-editing/hooks';

// =============================================================================
//  Phase 38D — PPTX Import
//
//  Paste a project id, choose a .pptx/.potx file, and either:
//    - Preview: parse without persisting (returns a JSON tree)
//    - Import:  persist as a new Deck under the project
//
//  MVP scope:
//    ✓ Slide structure + titles
//    ✓ Text frames as paragraph elements (with rough geometry)
//    ✓ Speaker notes
//    ✗ Charts, images, animations (planned for follow-up passes)
// =============================================================================

export default function PptxImportPage() {
  const router = useRouter();
  const [projectId, setProjectId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState<'parse' | 'import' | null>(null);
  const [report, setReport] = useState<any | null>(null);
  const [preview, setPreview] = useState<any | null>(null);

  const handleParse = async () => {
    if (!file) return;
    setBusy('parse'); setPreview(null); setReport(null);
    try {
      const res = await parsePptx(file);
      setPreview(res);
      setReport(res?.report || null);
    } catch (e: any) {
      alert(`Parse failed: ${e?.response?.data?.message || e?.message || e}`);
    } finally { setBusy(null); }
  };

  const handleImport = async () => {
    if (!file || !projectId.trim()) return;
    setBusy('import');
    try {
      const res = await importPptx(file, projectId.trim());
      setReport((res as any)?.report || null);
      if ((res as any)?.deckId) {
        if (window.confirm(`Imported deck ${(res as any).deckId}. Open editor?`)) {
          router.push(`/editor/${(res as any).deckId}`);
        }
      }
    } catch (e: any) {
      alert(`Import failed: ${e?.response?.data?.message || e?.message || e}`);
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
          <FileUp className="w-4 h-4 text-slate-500" /> Import PPTX
        </h1>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-6 space-y-4">
        <section className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Target project id</label>
            <input value={projectId} onChange={(e) => setProjectId(e.target.value)} placeholder="project-uuid"
              className="w-full h-8 px-2 text-xs font-mono border border-slate-300 rounded" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">PPTX file</label>
            <input
              type="file"
              accept=".pptx,.potx,application/vnd.openxmlformats-officedocument.presentationml.presentation"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="text-xs"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleParse} disabled={!file || busy !== null}
              className="h-8 px-3 text-xs font-semibold bg-slate-100 text-slate-800 rounded hover:bg-slate-200 inline-flex items-center gap-1 disabled:opacity-40"
            >
              {busy === 'parse' ? <Loader2 className="w-3 h-3 animate-spin" /> : null} Preview
            </button>
            <button
              onClick={handleImport} disabled={!file || !projectId.trim() || busy !== null}
              className="h-8 px-3 text-xs font-semibold bg-blue-600 text-white rounded hover:bg-blue-700 inline-flex items-center gap-1 disabled:opacity-40"
            >
              {busy === 'import' ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileUp className="w-3 h-3" />} Import
            </button>
          </div>
        </section>

        {/* Phase 38.1J — import report */}
        {report && (
          <section className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
            <h2 className="text-sm font-bold text-slate-900 flex items-center justify-between">
              <span>Import report</span>
              <FidelityBadge score={report.fidelityScore ?? 0} />
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
              <Stat label="Slides"    value={report.slidesParsed}   ok />
              <Stat label="Text"      value={report.textFrames}     ok={report.textFrames > 0} />
              <Stat label="Images"    value={report.images}         ok={report.images > 0} />
              <Stat label="Charts"    value={report.charts}         ok={report.charts > 0} />
              <Stat label="Tables"    value={report.tables}         ok={report.tables > 0} />
              <Stat label="Notes"     value={report.notes}          ok={report.notes > 0} />
              <Stat label="Masters"   value={report.masters}        ok={report.masters > 0} />
              <Stat label="Themes"    value={report.themes}         ok={report.themes > 0} />
              <Stat label="Layouts"   value={report.layouts}        ok={report.layouts > 0} />
              <Stat label="Groups"    value={report.groups}         ok={report.groups > 0} />
              <Stat label="Media"     value={report.mediaExtracted} ok={report.mediaExtracted > 0} />
              <Stat label="SmartArt"  value={report.smartArt ?? 0}  ok={(report.smartArt ?? 0) > 0} />
              <Stat label="OLE objs"  value={report.oleObjects ?? 0} ok={(report.oleObjects ?? 0) > 0} />
              <Stat label="Resolved"  value={report.resolvedTokens ?? 0} ok={(report.resolvedTokens ?? 0) > 0} />
            </div>

            {/* Phase 38.2H — categorised compatibility */}
            {report.compatibility && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <CompatColumn title="Imported"   tone="green"  rows={report.compatibility.imported} />
                <CompatColumn title="Partial"    tone="amber"  rows={report.compatibility.partiallyImported} />
                <CompatColumn title="Skipped"    tone="red"    rows={report.compatibility.skipped} />
              </div>
            )}

            {/* Per-category score bars */}
            {report.compatibility?.scores && (
              <div className="space-y-1 pt-1">
                {Object.entries(report.compatibility.scores).map(([k, v]: any) => (
                  <div key={k} className="flex items-center gap-2 text-[10px]">
                    <div className="w-32 text-slate-600">{k}</div>
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${v >= 80 ? 'bg-green-500' : v >= 60 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${v}%` }} />
                    </div>
                    <div className="w-10 text-right font-mono text-slate-700">{v}%</div>
                  </div>
                ))}
              </div>
            )}

            {Array.isArray(report.warnings) && report.warnings.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded p-2.5 text-xs text-amber-800 space-y-0.5">
                <div className="flex items-center gap-1.5 font-bold"><AlertTriangle className="w-3 h-3" /> Notes</div>
                {report.warnings.map((w: string, i: number) => <div key={i}>· {w}</div>)}
              </div>
            )}
          </section>
        )}

        {preview && (
          <section className="bg-white border border-slate-200 rounded-lg p-4">
            <h2 className="text-sm font-bold text-slate-900 mb-2">Preview · {preview.slides?.length ?? 0} slides</h2>
            <ul className="space-y-1 max-h-80 overflow-auto">
              {(preview.slides || []).map((s: any, i: number) => (
                <li key={i} className="text-xs text-slate-700 border-b border-slate-100 py-1">
                  <span className="font-mono text-slate-400 mr-1.5">#{s.order + 1}</span>
                  <span className="font-semibold">{s.title}</span>
                  <span className="text-slate-400 ml-2">{s.elements?.length ?? 0} element(s)</span>
                  {s.speakerNotes && <div className="ml-6 text-[10px] text-slate-500 italic truncate">notes: {s.speakerNotes}</div>}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}

const Stat: React.FC<{ label: string; value: number | string; ok?: boolean }> = ({ label, value, ok }) => (
  <div className={`rounded border px-2 py-1.5 ${ok ? 'border-green-200 bg-green-50 text-green-800' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
    <div className="text-[9px] uppercase tracking-wider">{label}</div>
    <div className="text-base font-bold leading-none">{value ?? 0}</div>
  </div>
);

const FidelityBadge: React.FC<{ score: number }> = ({ score }) => {
  const pct = Math.round(score * 100);
  const cls = pct >= 80 ? 'bg-green-100 text-green-800'
            : pct >= 60 ? 'bg-amber-100 text-amber-800'
            :             'bg-red-100 text-red-800';
  return <span className={`text-[10px] font-bold px-2 py-1 rounded ${cls}`}>{pct}% fidelity</span>;
};

const CompatColumn: React.FC<{ title: string; tone: 'green' | 'amber' | 'red'; rows: Array<{ kind: string; count: number; note?: string }> }> = ({ title, tone, rows }) => {
  const tones = {
    green: 'border-green-200 bg-green-50 text-green-900',
    amber: 'border-amber-200 bg-amber-50 text-amber-900',
    red:   'border-red-200 bg-red-50 text-red-900',
  } as const;
  return (
    <div className={`border rounded p-2 ${tones[tone]}`}>
      <div className="text-[10px] font-bold uppercase tracking-wider mb-1">{title}</div>
      {rows.length === 0 ? (
        <div className="text-[10px] italic opacity-60">—</div>
      ) : (
        <ul className="space-y-0.5">
          {rows.map((r, i) => (
            <li key={i} className="text-[11px]">
              · {r.kind} <span className="opacity-60">× {r.count}</span>
              {r.note && <div className="ml-3 text-[9px] opacity-70">{r.note}</div>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
