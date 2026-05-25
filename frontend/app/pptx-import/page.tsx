'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, FileUp, Loader2, AlertTriangle, CheckCircle2,
  FileType, Layers, BarChart3, Image as ImageIcon, Table2, MessageSquare,
  Palette, BookOpenCheck, Sparkles, ShuffleIcon,
} from 'lucide-react';
import { importPptx, parsePptx } from '@/features/pptx-editing/hooks';

// =============================================================================
//  Phase 38D / Phase Δ — PPTX Import
//
//  Premium dashboard re-skin. Same backend flow:
//    - Preview: parse without persisting (returns a JSON tree)
//    - Import:  persist as a new Deck under the target project
//
//  Now surfaces:
//    - Hero + value props
//    - "What gets imported" capability grid
//    - Fidelity / category compatibility scoreboard
//    - Per-category score bars
// =============================================================================

const CAPABILITIES: { Icon: any; label: string; desc: string; tone: 'ok' | 'partial' | 'planned' }[] = [
  { Icon: FileType,       label: 'Slide structure',  desc: 'Titles + per-slide order + section breaks',         tone: 'ok' },
  { Icon: Layers,         label: 'Text frames',      desc: 'Paragraphs, headings, lists, geometry',             tone: 'ok' },
  { Icon: MessageSquare,  label: 'Speaker notes',    desc: 'Preserved per slide, editable after import',        tone: 'ok' },
  { Icon: ImageIcon,      label: 'Images & media',   desc: 'PNG / JPG / EMF extracted and re-embedded',         tone: 'ok' },
  { Icon: Table2,         label: 'Tables',           desc: 'Rows, columns, alignment, borders',                 tone: 'ok' },
  { Icon: BarChart3,      label: 'Charts',           desc: 'Bar, column, line, pie + axis labels',              tone: 'partial' },
  { Icon: Palette,        label: 'Theme colors',     desc: 'Source palette / fonts retained, then Brand-Kit aware', tone: 'partial' },
  { Icon: BookOpenCheck,  label: 'Masters & layouts',desc: 'Slide master + layout placeholders preserved',      tone: 'partial' },
];

export default function PptxImportPage() {
  const router = useRouter();
  const [projectId, setProjectId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState<'parse' | 'import' | null>(null);
  const [report, setReport] = useState<any | null>(null);
  const [preview, setPreview] = useState<any | null>(null);
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
        setImportedDeckId((res as any).deckId);
      }
      setError(null);
    } catch (e: any) {
      setError(`Import failed: ${e?.response?.data?.message || e?.message || e}`);
    } finally { setBusy(null); }
  };

  return (
    <div className="min-h-screen bg-[#EDEBE6]">
      {/* Sticky header */}
      <header className="bg-[#EDEBE6]/85 backdrop-blur-md border-b border-[#E3E1DA]/60 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center gap-3">
          <Link href="/dashboard" className="text-xs text-[#9A9A9A] hover:text-[#111111] flex items-center gap-1">
            <ArrowLeft className="w-3 h-3" /> Dashboard
          </Link>
          <div className="h-5 w-px bg-[#E3E1DA]" />
          <h1 className="text-base font-bold text-[#111111] flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[#EEF5F1] text-[#4F7563] flex items-center justify-center">
              <FileUp className="w-3.5 h-3.5" />
            </div>
            Import PPTX
          </h1>
          <span className="text-[10px] uppercase tracking-wide text-[#9A9A9A] font-semibold hidden sm:inline">Studio</span>
          <Link
            href="/convert"
            className="ml-auto inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-white text-[13px] font-semibold text-[#111111] shadow-[0_8px_18px_rgba(0,0,0,0.04)] hover:bg-[#F7F6F2] transition-colors"
          >
            <ShuffleIcon className="w-3.5 h-3.5" /> Convert instead
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* HERO */}
        <div className="relative overflow-hidden rounded-[28px] bg-[#263F34] p-7 sm:p-10 shadow-[0_24px_60px_rgba(38,63,52,0.30)]">
          <div className="absolute inset-0 opacity-25 pointer-events-none">
            <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-[#4F7563] blur-3xl" />
            <div className="absolute bottom-0 left-1/3 w-64 h-64 rounded-full bg-[#7A988A] blur-3xl" />
          </div>
          <div className="relative grid md:grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/15">
                <Sparkles className="w-3.5 h-3.5 text-[#DDE8E1]" />
                <span className="text-[11px] font-semibold tracking-wide uppercase text-[#DDE8E1]">PPTX Studio Import</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-[-0.02em] text-white leading-tight">
                Bring your PowerPoint into Pitchonix — slide-for-slide.
              </h2>
              <p className="text-[#DDE8E1] text-sm leading-relaxed max-w-md">
                Preview first. See the fidelity report. Re-style with a Brand Kit when you import. Every text frame, chart and speaker note is preserved.
              </p>
              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <a
                  href="#pptx-import-form"
                  className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-2xl bg-white text-[#263F34] hover:bg-[#F7F6F2] font-semibold text-sm shadow-[0_12px_24px_rgba(0,0,0,0.15)]"
                >
                  <FileUp className="w-4 h-4" /> Start import
                </a>
                <Link
                  href="/pptx-certification"
                  className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-2xl bg-white/10 border border-white/25 text-white hover:bg-white/15 font-semibold text-sm backdrop-blur-sm"
                >
                  <CheckCircle2 className="w-4 h-4" /> View certification
                </Link>
              </div>
            </div>

            <div className="hidden md:block relative">
              <div className="bg-white/8 backdrop-blur-md border border-white/15 rounded-3xl p-5 shadow-[0_20px_40px_rgba(0,0,0,0.20)]">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-2xl bg-[#4F7563] flex items-center justify-center shadow-[0_10px_22px_rgba(79,117,99,0.4)]">
                    <BarChart3 className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="text-white font-semibold text-sm">Average fidelity</div>
                    <div className="text-[#A8B9AE] text-xs">Across all categories</div>
                  </div>
                </div>
                <div className="space-y-2.5">
                  {[
                    { label: 'Text frames',  pct: 96 },
                    { label: 'Layout',       pct: 88 },
                    { label: 'Images',       pct: 92 },
                    { label: 'Charts',       pct: 78 },
                    { label: 'Tables',       pct: 84 },
                  ].map((row) => (
                    <div key={row.label} className="grid grid-cols-[80px_1fr_36px] items-center gap-2">
                      <div className="text-[11px] text-[#A8B9AE]">{row.label}</div>
                      <div className="h-1.5 bg-white/15 rounded-full overflow-hidden">
                        <div className="h-full bg-white" style={{ width: `${row.pct}%` }} />
                      </div>
                      <div className="text-[11px] font-bold text-white text-right">{row.pct}%</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Capabilities row */}
        <section className="space-y-3">
          <h2 className="pn-h2">What we import</h2>
          <p className="pn-body text-[#6B6B6B]">Pitchonix preserves the structure and content from your .pptx. Some advanced effects are partially supported and continuously improving.</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {CAPABILITIES.map((c) => {
              const Icon = c.Icon;
              const bg = c.tone === 'ok'      ? 'bg-[#EEF5F1]'
                       : c.tone === 'partial' ? 'bg-[#FAEEDB]'
                       :                        'bg-[#F1F0EC]';
              const fg = c.tone === 'ok'      ? 'text-[#4F7563]'
                       : c.tone === 'partial' ? 'text-[#8c6210]'
                       :                        'text-[#6B6B6B]';
              const badge = c.tone === 'ok'      ? 'bg-[#DDE8E1] text-[#263F34]'
                          : c.tone === 'partial' ? 'bg-[#F5E1B7] text-[#8c6210]'
                          :                        'bg-[#F1F0EC] text-[#6B6B6B]';
              const tone = c.tone === 'ok'      ? 'Supported'
                         : c.tone === 'partial' ? 'Partial'
                         :                        'Planned';
              return (
                <div key={c.label} className="pn-card p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-10 h-10 rounded-2xl ${bg} ${fg} flex items-center justify-center`}>
                      <Icon className="w-4.5 h-4.5" />
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${badge}`}>{tone}</span>
                  </div>
                  <div className="text-[13.5px] font-semibold text-[#111111]">{c.label}</div>
                  <div className="text-[11.5px] text-[#6B6B6B] mt-1 leading-snug">{c.desc}</div>
                </div>
              );
            })}
          </div>
        </section>

        {/* IMPORT FORM */}
        <section id="pptx-import-form" className="grid lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 pn-card p-6 space-y-5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-[#EEF5F1] text-[#4F7563] flex items-center justify-center">
                <FileUp className="w-4 h-4" />
              </div>
              <div>
                <h3 className="pn-h2">Upload &amp; import</h3>
                <p className="text-[12px] text-[#9A9A9A]">Preview produces a fidelity report. Import persists the deck under your project.</p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#6B6B6B] mb-1.5">Target project ID</label>
                <input
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  placeholder="paste-project-uuid"
                  className="w-full h-11 px-4 text-sm font-mono bg-white border border-[#E3E1DA] rounded-[14px] text-[#111111] placeholder:text-[#9A9A9A] focus:outline-none focus:border-[#4F7563] focus:shadow-[0_0_0_3px_rgba(79,117,99,0.15)] transition"
                />
                <p className="text-[10px] text-[#9A9A9A] mt-1">Find this in the URL when you open a project from the dashboard.</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#6B6B6B] mb-1.5">PPTX file</label>
                <label className={`flex items-center gap-3 border-2 border-dashed border-[#A8B9AE] bg-[#EEF5F1] rounded-[14px] px-4 h-11 cursor-pointer hover:bg-[#DDE8E1] transition-colors`}>
                  <FileUp className="w-4 h-4 text-[#4F7563] shrink-0" />
                  <span className="flex-1 text-[12.5px] text-[#263F34] truncate">{file ? file.name : 'Click to choose…'}</span>
                  <input
                    type="file"
                    accept=".pptx,.potx,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                </label>
                <p className="text-[10px] text-[#9A9A9A] mt-1">Supports .pptx and .potx — max 100 MB.</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                onClick={handleParse} disabled={!file || busy !== null}
                className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-2xl bg-white text-[#111111] border border-[#E3E1DA] hover:bg-[#F7F6F2] font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {busy === 'parse' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Preview only
              </button>
              <button
                onClick={handleImport} disabled={!file || !projectId.trim() || busy !== null}
                className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-2xl bg-[#4F7563] hover:bg-[#355846] text-white font-semibold text-sm shadow-[0_14px_30px_rgba(79,117,99,0.22)] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {busy === 'import' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />} Import to project
              </button>
            </div>

            {/* Inline error / success banners */}
            {error && (
              <div className="rounded-3xl bg-[#FCF1F1] border border-[#F7E3E3] text-[#7a2929] text-sm p-4 flex items-start gap-3" role="alert">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-bold">Import error</div>
                  <div className="text-[13px] mt-0.5">{error}</div>
                </div>
                <button onClick={() => setError(null)} className="text-[11px] opacity-70 hover:opacity-100 underline font-semibold">dismiss</button>
              </div>
            )}
            {importedDeckId && (
              <div className="rounded-3xl bg-[#EEF5F1] border border-[#DDE8E1] text-[#1A2D24] text-sm p-4 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="font-bold">Imported successfully</div>
                  <div className="text-[12px] text-[#4F7563]">Deck id <span className="font-mono">{importedDeckId}</span></div>
                </div>
                <button onClick={() => router.push(`/editor/${importedDeckId}`)}
                  className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-[#4F7563] hover:bg-[#355846] text-white text-[12.5px] font-semibold">
                  Open editor →
                </button>
                <button onClick={() => setImportedDeckId(null)} className="text-[11px] opacity-70 hover:opacity-100 underline font-semibold">dismiss</button>
              </div>
            )}
          </div>

          {/* Tips card */}
          <aside className="pn-card p-6 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-[#FAEEDB] text-[#8c6210] flex items-center justify-center">
                <BookOpenCheck className="w-4 h-4" />
              </div>
              <h3 className="pn-h2">Tips</h3>
            </div>
            <ul className="space-y-3 text-[13px] text-[#6B6B6B]">
              <li className="flex gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#4F7563] mt-0.5 flex-shrink-0" />
                <span><strong className="text-[#111111]">Preview first</strong> — get the fidelity report before committing changes to a project.</span>
              </li>
              <li className="flex gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#4F7563] mt-0.5 flex-shrink-0" />
                <span><strong className="text-[#111111]">Bring your Brand Kit</strong> — re-style imported decks instantly from <Link href="/brand-kits" className="text-[#4F7563] hover:underline font-semibold">Brand Kits</Link>.</span>
              </li>
              <li className="flex gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#4F7563] mt-0.5 flex-shrink-0" />
                <span><strong className="text-[#111111]">Need a different format?</strong> Use the <Link href="/convert" className="text-[#4F7563] hover:underline font-semibold">Universal Converter</Link> for PDF / DOCX / HTML / MD.</span>
              </li>
            </ul>
          </aside>
        </section>

        {/* IMPORT REPORT */}
        {report && (
          <section className="pn-card p-6 space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-[#EEF5F1] text-[#4F7563] flex items-center justify-center">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <h3 className="pn-h2">Import report</h3>
              </div>
              <FidelityBadge score={report.fidelityScore ?? 0} />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
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
              <Stat label="Tokens"    value={report.resolvedTokens ?? 0} ok={(report.resolvedTokens ?? 0) > 0} />
            </div>

            {/* Categorised compatibility */}
            {report.compatibility && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <CompatColumn title="Imported"   tone="green"  rows={report.compatibility.imported} />
                <CompatColumn title="Partial"    tone="amber"  rows={report.compatibility.partiallyImported} />
                <CompatColumn title="Skipped"    tone="red"    rows={report.compatibility.skipped} />
              </div>
            )}

            {/* Per-category score bars */}
            {report.compatibility?.scores && (
              <div className="space-y-2 pt-1">
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#9A9A9A]">Category fidelity</div>
                {Object.entries(report.compatibility.scores).map(([k, v]: any) => (
                  <div key={k} className="flex items-center gap-3 text-[12px]">
                    <div className="w-32 capitalize text-[#6B6B6B]">{k}</div>
                    <div className="flex-1 h-2 bg-[#F1F0EC] rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${v >= 80 ? 'bg-[#4F7563]' : v >= 60 ? 'bg-[#D9A441]' : 'bg-[#D96A6A]'}`} style={{ width: `${v}%` }} />
                    </div>
                    <div className="w-10 text-right font-mono text-[#111111] text-[11px]">{v}%</div>
                  </div>
                ))}
              </div>
            )}

            {Array.isArray(report.warnings) && report.warnings.length > 0 && (
              <div className="rounded-2xl bg-[#FAEEDB] border border-[#F2DCAE] p-3.5 text-[12.5px] text-[#8c6210] space-y-0.5">
                <div className="flex items-center gap-2 font-bold mb-1"><AlertTriangle className="w-3.5 h-3.5" /> Notes</div>
                {report.warnings.map((w: string, i: number) => <div key={i}>· {w}</div>)}
              </div>
            )}
          </section>
        )}

        {/* SLIDE PREVIEW */}
        {preview && (
          <section className="pn-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="pn-h2">Preview · {preview.slides?.length ?? 0} slides</h3>
              <span className="text-[11px] text-[#9A9A9A] uppercase tracking-wide font-semibold">Parsed structure</span>
            </div>
            <ul className="divide-y divide-[#F1F0EC] max-h-96 overflow-auto">
              {(preview.slides || []).map((s: any, i: number) => (
                <li key={i} className="py-2.5 flex items-start gap-3">
                  <span className="w-7 h-7 rounded-full bg-[#F1F0EC] text-[#6B6B6B] text-[10px] font-mono flex items-center justify-center shrink-0">{s.order + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-[#111111] truncate">{s.title}</div>
                    <div className="text-[11px] text-[#9A9A9A] mt-0.5">
                      {s.elements?.length ?? 0} element{s.elements?.length === 1 ? '' : 's'}
                      {s.speakerNotes && ' · with speaker notes'}
                    </div>
                    {s.speakerNotes && (
                      <div className="text-[11px] text-[#6B6B6B] italic mt-1 truncate">"{s.speakerNotes}"</div>
                    )}
                  </div>
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
  <div className={`rounded-2xl border px-3 py-2.5 ${ok ? 'border-[#DDE8E1] bg-[#EEF5F1] text-[#263F34]' : 'border-[#E3E1DA] bg-[#F7F6F2] text-[#9A9A9A]'}`}>
    <div className="text-[9px] uppercase tracking-wider font-semibold">{label}</div>
    <div className="text-lg font-bold leading-tight">{value ?? 0}</div>
  </div>
);

const FidelityBadge: React.FC<{ score: number }> = ({ score }) => {
  const pct = Math.round(score * 100);
  const cls = pct >= 80 ? 'bg-[#DDE8E1] text-[#263F34]'
            : pct >= 60 ? 'bg-[#F5E1B7] text-[#8c6210]'
            :             'bg-[#F7E3E3] text-[#7a2929]';
  return <span className={`inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-[12px] font-bold ${cls}`}>{pct}% fidelity</span>;
};

const CompatColumn: React.FC<{ title: string; tone: 'green' | 'amber' | 'red'; rows: Array<{ kind: string; count: number; note?: string }> }> = ({ title, tone, rows }) => {
  const tones = {
    green: 'border-[#DDE8E1] bg-[#EEF5F1] text-[#1A2D24]',
    amber: 'border-[#F2DCAE] bg-[#FAEEDB] text-[#8c6210]',
    red:   'border-[#F7E3E3] bg-[#FCF1F1] text-[#7a2929]',
  } as const;
  return (
    <div className={`border rounded-2xl p-3.5 ${tones[tone]}`}>
      <div className="text-[10px] font-bold uppercase tracking-wider mb-1.5">{title}</div>
      {rows.length === 0 ? (
        <div className="text-[11px] italic opacity-60">—</div>
      ) : (
        <ul className="space-y-1">
          {rows.map((r, i) => (
            <li key={i} className="text-[12px]">
              · {r.kind} <span className="opacity-60">× {r.count}</span>
              {r.note && <div className="ml-3 text-[10px] opacity-70">{r.note}</div>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
