'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, FileUp, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
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
  // Phase Audit Fix — inline error + imported-deck state (replaces alert/confirm).
  const [error, setError] = useState<string | null>(null);
  const [importedDeckId, setImportedDeckId] = useState<string | null>(null);

  const handleParse = async () => {
    if (!file) return;
    setBusy('parse'); setPreview(null); setReport(null);
    try {
      const res = await parsePptx(file);
      setPreview(res);
      setReport(res?.report || null);
      setError(null);
    } catch (e: any) {
      setError(`Parse failed: ${e?.response?.data?.message || e?.message || e}`);
    } finally { setBusy(null); }
  };

  const handleImport = async () => {
    if (!file || !projectId.trim()) return;
    setBusy('import');
    try {
      const res = await importPptx(file, projectId.trim());
      setReport((res as any)?.report || null);
      if ((res as any)?.deckId) {
        // Phase Audit Fix — replace window.confirm() with inline "Imported"
        // success banner that surfaces the Open-in-editor action.
        setImportedDeckId((res as any).deckId);
      }
      setError(null);
    } catch (e: any) {
      setError(`Import failed: ${e?.response?.data?.message || e?.message || e}`);
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
          <FileUp className="w-4 h-4 text-[#9A9A9A]" /> Import PPTX
        </h1>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-6 space-y-4">
        <section className="bg-white border border-[#E3E1DA] rounded-lg p-4 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-[#111111] mb-1">Target project id</label>
            <input value={projectId} onChange={(e) => setProjectId(e.target.value)} placeholder="project-uuid"
              className="w-full h-8 px-2 text-xs font-mono border border-[#C9C6BD] rounded" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#111111] mb-1">PPTX file</label>
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
              className="h-8 px-3 text-xs font-semibold bg-[#F1F0EC] text-[#111111] rounded hover:bg-[#E3E1DA] inline-flex items-center gap-1 disabled:opacity-40"
            >
              {busy === 'parse' ? <Loader2 className="w-3 h-3 animate-spin" /> : null} Preview
            </button>
            <button
              onClick={handleImport} disabled={!file || !projectId.trim() || busy !== null}
              className="h-8 px-3 text-xs font-semibold bg-[#4F7563] text-white rounded hover:bg-[#355846] inline-flex items-center gap-1 disabled:opacity-40"
            >
              {busy === 'import' ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileUp className="w-3 h-3" />} Import
            </button>
          </div>
        </section>

        {/* Phase Audit Fix — inline error / success banners (replace alert/confirm) */}
        {error && (
          <div className="bg-[#FCF1F1] border border-[#F7E3E3] text-red-900 text-xs rounded p-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-bold">Import error</div>
              <div className="mt-0.5">{error}</div>
            </div>
            <button onClick={() => setError(null)} className="text-[10px] opacity-70 hover:opacity-100 underline">dismiss</button>
          </div>
        )}
        {importedDeckId && (
          <div className="bg-[#EEF5F1] border border-[#DDE8E1] text-[#1A2D24] text-xs rounded p-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <div className="flex-1">
              <div className="font-bold">Imported successfully</div>
              <div className="text-[11px]">Deck id <span className="font-mono">{importedDeckId}</span></div>
            </div>
            <button onClick={() => router.push(`/editor/${importedDeckId}`)}
              className="h-7 px-2.5 text-[11px] font-semibold bg-[#4F7563] hover:bg-[#355846] text-white rounded">
              Open editor →
            </button>
            <button onClick={() => setImportedDeckId(null)} className="text-[10px] opacity-70 hover:opacity-100 underline">dismiss</button>
          </div>
        )}

        {/* Phase 38.1J — import report */}
        {report && (
          <section className="bg-white border border-[#E3E1DA] rounded-lg p-4 space-y-3">
            <h2 className="text-sm font-bold text-[#111111] flex items-center justify-between">
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
                    <div className="w-32 text-[#6B6B6B]">{k}</div>
                    <div className="flex-1 h-1.5 bg-[#F1F0EC] rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${v >= 80 ? 'bg-[#4F7563]' : v >= 60 ? 'bg-[#D9A441]' : 'bg-[#D96A6A]'}`} style={{ width: `${v}%` }} />
                    </div>
                    <div className="w-10 text-right font-mono text-[#111111]">{v}%</div>
                  </div>
                ))}
              </div>
            )}

            {Array.isArray(report.warnings) && report.warnings.length > 0 && (
              <div className="bg-[#FAEEDB] border border-[#F2DCAE] rounded p-2.5 text-xs text-amber-800 space-y-0.5">
                <div className="flex items-center gap-1.5 font-bold"><AlertTriangle className="w-3 h-3" /> Notes</div>
                {report.warnings.map((w: string, i: number) => <div key={i}>· {w}</div>)}
              </div>
            )}
          </section>
        )}

        {preview && (
          <section className="bg-white border border-[#E3E1DA] rounded-lg p-4">
            <h2 className="text-sm font-bold text-[#111111] mb-2">Preview · {preview.slides?.length ?? 0} slides</h2>
            <ul className="space-y-1 max-h-80 overflow-auto">
              {(preview.slides || []).map((s: any, i: number) => (
                <li key={i} className="text-xs text-[#111111] border-b border-[#F1F0EC] py-1">
                  <span className="font-mono text-[#C9C6BD] mr-1.5">#{s.order + 1}</span>
                  <span className="font-semibold">{s.title}</span>
                  <span className="text-[#C9C6BD] ml-2">{s.elements?.length ?? 0} element(s)</span>
                  {s.speakerNotes && <div className="ml-6 text-[10px] text-[#9A9A9A] italic truncate">notes: {s.speakerNotes}</div>}
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
  <div className={`rounded border px-2 py-1.5 ${ok ? 'border-[#DDE8E1] bg-[#EEF5F1] text-[#263F34]' : 'border-[#E3E1DA] bg-[#EDEBE6] text-[#9A9A9A]'}`}>
    <div className="text-[9px] uppercase tracking-wider">{label}</div>
    <div className="text-base font-bold leading-none">{value ?? 0}</div>
  </div>
);

const FidelityBadge: React.FC<{ score: number }> = ({ score }) => {
  const pct = Math.round(score * 100);
  const cls = pct >= 80 ? 'bg-[#DDE8E1] text-[#263F34]'
            : pct >= 60 ? 'bg-[#F5E1B7] text-amber-800'
            :             'bg-[#F7E3E3] text-[#7a2929]';
  return <span className={`text-[10px] font-bold px-2 py-1 rounded ${cls}`}>{pct}% fidelity</span>;
};

const CompatColumn: React.FC<{ title: string; tone: 'green' | 'amber' | 'red'; rows: Array<{ kind: string; count: number; note?: string }> }> = ({ title, tone, rows }) => {
  const tones = {
    green: 'border-[#DDE8E1] bg-[#EEF5F1] text-[#1A2D24]',
    amber: 'border-[#F2DCAE] bg-[#FAEEDB] text-amber-900',
    red:   'border-[#F7E3E3] bg-[#FCF1F1] text-red-900',
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
