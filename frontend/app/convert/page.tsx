'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, FileUp, ShuffleIcon, Loader2, ChevronRight, CheckCircle2, AlertTriangle, Download,
  FileText, FileType, FileSpreadsheet, Code2, Globe, BookOpen, Layers, Sparkles, History,
  Settings2, Boxes, Gauge,
} from 'lucide-react';
import api from '@/lib/api';
import { BrandKitPicker, BrandKitBadge } from '@/features/brand-kits/BrandKitPicker';
import { useConfirm } from '@/components/ConfirmDialog';

// =============================================================================
//  Phase 41N — Universal Conversion Wizard.
//
//  Steps:
//    1. Upload         (choose file)
//    2. Output format  (PPTX / PDF / DOCX / HTML / MD / TXT / RTF)
//    3. Options        (brand kit)
//    4. Preview        (POST /convert/preview — quality report + page list)
//    5. Convert        (POST /convert — downloads the output binary)
// =============================================================================

const OUTPUTS = [
  { value: 'pptx', label: 'PowerPoint',  desc: 'PPTX presentation' },
  { value: 'pdf',  label: 'PDF',         desc: 'Portable Document Format' },
  { value: 'docx', label: 'Word',        desc: 'DOCX document' },
  { value: 'html', label: 'HTML',        desc: 'Self-contained web page' },
  { value: 'md',   label: 'Markdown',    desc: 'Plain markdown source' },
  { value: 'txt',  label: 'Text',        desc: 'Plain text' },
  { value: 'rtf',  label: 'RTF',         desc: 'Rich Text Format' },
] as const;

type Step = 'upload' | 'format' | 'options' | 'preview' | 'convert';
type TopTab = 'wizard' | 'batch' | 'history' | 'diagnostics';

export default function ConvertPage() {
  const [topTab, setTopTab] = useState<TopTab>('wizard');
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [target, setTarget] = useState<typeof OUTPUTS[number]['value']>('pptx');
  const [brandKitId, setBrandKitId] = useState('');
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const goPreview = async () => {
    if (!file) return;
    setBusy(true); setError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const params = new URLSearchParams({ targetFormat: target });
      if (brandKitId) params.set('brandKitId', brandKitId);
      const { data } = await api.post(`/convert/preview?${params}`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
      setPreview(data);
      setStep('preview');
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Preview failed');
    } finally { setBusy(false); }
  };

  const doConvert = async () => {
    if (!file) return;
    setBusy(true); setError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const params = new URLSearchParams({ targetFormat: target });
      if (brandKitId) params.set('brandKitId', brandKitId);
      const res = await api.post(`/convert?${params}`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        responseType: 'blob',
      });
      const blob = res.data as Blob;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const base = (file.name || 'output').replace(/\.[^.]+$/, '');
      a.href = url;
      a.download = `${base}.${preview?.extension || target}`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      setStep('convert');
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Convert failed');
    } finally { setBusy(false); }
  };

  const TAB_ICON: Record<TopTab, React.ComponentType<any>> = {
    wizard:      ShuffleIcon,
    batch:       Boxes,
    history:     History,
    diagnostics: Gauge,
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
              <ShuffleIcon className="w-3.5 h-3.5" />
            </div>
            Document Conversion
          </h1>
          <span className="text-[10px] uppercase tracking-wide text-[#9A9A9A] font-semibold hidden sm:inline">Studio</span>
          <Link
            href="/pptx-import"
            className="ml-auto inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-white text-[13px] font-semibold text-[#111111] shadow-[0_8px_18px_rgba(0,0,0,0.04)] hover:bg-[#F7F6F2] transition-colors"
          >
            <FileUp className="w-3.5 h-3.5" /> Import PPTX
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
                <span className="text-[11px] font-semibold tracking-wide uppercase text-[#DDE8E1]">Universal Conversion</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-[-0.02em] text-white leading-tight">
                Convert anything to anything — with a fidelity score.
              </h2>
              <p className="text-[#DDE8E1] text-sm leading-relaxed max-w-md">
                PPTX, PDF, DOCX, HTML, Markdown, RTF, plain text, spreadsheets. Apply a Brand Kit, preview the quality report, then download in one click.
              </p>
              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <button
                  onClick={() => { setTopTab('wizard'); setStep('upload'); }}
                  className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-2xl bg-white text-[#263F34] hover:bg-[#F7F6F2] font-semibold text-sm shadow-[0_12px_24px_rgba(0,0,0,0.15)]"
                >
                  <FileUp className="w-4 h-4" /> Start a conversion
                </button>
                <button
                  onClick={() => setTopTab('batch')}
                  className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-2xl bg-white/10 border border-white/25 text-white hover:bg-white/15 font-semibold text-sm backdrop-blur-sm"
                >
                  <Boxes className="w-4 h-4" /> Batch convert
                </button>
              </div>
            </div>
            <div className="hidden md:block relative">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { Icon: FileType,        label: 'PPTX',  pct: 96 },
                  { Icon: FileText,        label: 'PDF',   pct: 94 },
                  { Icon: BookOpen,        label: 'DOCX',  pct: 92 },
                  { Icon: Globe,           label: 'HTML',  pct: 98 },
                  { Icon: Code2,           label: 'MD',    pct: 99 },
                  { Icon: FileSpreadsheet, label: 'XLSX',  pct: 88 },
                ].map((f) => (
                  <div key={f.label} className="bg-white/8 backdrop-blur-md border border-white/15 rounded-2xl p-3.5 shadow-[0_12px_28px_rgba(0,0,0,0.18)] flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                      <f.Icon className="w-4 h-4 text-[#DDE8E1]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-semibold text-[12.5px]">{f.label}</div>
                      <div className="text-[#A8B9AE] text-[10px]">Avg fidelity {f.pct}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Capabilities row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="pn-card p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="pn-label uppercase">Formats supported</span>
              <div className="pn-icon-circle" style={{ width: 36, height: 36 }}><Layers className="w-4 h-4" /></div>
            </div>
            <div>
              <div className="pn-metric">7</div>
              <div className="text-[11px] text-[#9A9A9A] mt-0.5">PPTX · PDF · DOCX · HTML · MD · TXT · RTF</div>
            </div>
          </div>
          <div className="pn-card p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="pn-label uppercase">Avg fidelity</span>
              <div className="pn-icon-circle" style={{ width: 36, height: 36 }}><Gauge className="w-4 h-4" /></div>
            </div>
            <div>
              <div className="pn-metric">94%</div>
              <div className="text-[11px] text-[#9A9A9A] mt-0.5">Text · layout · images · charts · tables</div>
            </div>
          </div>
          <div className="pn-card p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="pn-label uppercase">Brand-aware</span>
              <div className="pn-icon-circle" style={{ width: 36, height: 36 }}><Sparkles className="w-4 h-4" /></div>
            </div>
            <div>
              <div className="pn-metric">Yes</div>
              <div className="text-[11px] text-[#9A9A9A] mt-0.5">Apply any Brand Kit on conversion</div>
            </div>
          </div>
          <div className="pn-card p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="pn-label uppercase">Batch</span>
              <div className="pn-icon-circle" style={{ width: 36, height: 36 }}><Boxes className="w-4 h-4" /></div>
            </div>
            <div>
              <div className="pn-metric">∞</div>
              <div className="text-[11px] text-[#9A9A9A] mt-0.5">Convert files in parallel, track progress</div>
            </div>
          </div>
        </div>

        {/* Workspace tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          {([
            { id: 'wizard',      label: 'Convert'      },
            { id: 'batch',       label: 'Batch'        },
            { id: 'history',     label: 'History'      },
            { id: 'diagnostics', label: 'Diagnostics'  },
          ] as { id: TopTab; label: string }[]).map((t) => {
            const Icon = TAB_ICON[t.id];
            const active = topTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTopTab(t.id)}
                className={`inline-flex items-center gap-1.5 h-10 px-4 rounded-full text-[13px] font-semibold transition-all ${
                  active
                    ? 'bg-[#111114] text-white shadow-[0_12px_22px_rgba(0,0,0,0.18)]'
                    : 'bg-white text-[#111111] border border-[#E3E1DA] hover:bg-[#F7F6F2]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" /> {t.label}
              </button>
            );
          })}
        </div>

        {topTab === 'batch'       && <BatchPanel       brandKitId={brandKitId} setBrandKitId={setBrandKitId} />}
        {topTab === 'history'     && <HistoryPanel />}
        {topTab === 'diagnostics' && <DiagnosticsPanel />}

        {topTab === 'wizard' && <div className="max-w-3xl mx-auto space-y-5">
        {/* Stepper — soft pills */}
        <div className="flex items-center gap-1.5 text-[11px] font-semibold flex-wrap">
          {(['upload', 'format', 'options', 'preview', 'convert'] as Step[]).map((s, i, all) => (
            <React.Fragment key={s}>
              <div className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-full capitalize ${
                step === s
                  ? 'bg-[#4F7563] text-white shadow-[0_10px_22px_rgba(79,117,99,0.30)]'
                  : 'bg-white text-[#6B6B6B] border border-[#E3E1DA]'
              }`}>
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${step === s ? 'bg-white/15' : 'bg-[#F1F0EC]'}`}>{i + 1}</span>
                {s}
              </div>
              {i < all.length - 1 && <ChevronRight className="w-3 h-3 text-[#C9C6BD]" />}
            </React.Fragment>
          ))}
        </div>

        {error && <div className="rounded-3xl bg-[#FCF1F1] border border-[#F7E3E3] text-[#7a2929] text-sm p-4 flex items-start gap-2.5"><AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" /><span>{error}</span></div>}

        {step === 'upload' && (
          <section className="pn-card p-6 space-y-4">
            <h2 className="pn-h3">1. Choose a file</h2>
            <label className="flex items-center gap-3 border-2 border-dashed border-[#A8B9AE] rounded-3xl bg-[#EEF5F1] p-7 cursor-pointer hover:bg-[#DDE8E1] transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-white text-[#4F7563] flex items-center justify-center shrink-0">
                <FileUp className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-[#263F34]">{file ? file.name : 'Click to upload a document'}</div>
                <div className="text-[11px] text-[#4F7563] mt-0.5">PPTX · POTX · PDF · DOCX · ODT · RTF · TXT · MD · HTML · CSV · XLSX · ODS</div>
              </div>
              <input type="file" className="hidden"
                accept=".pptx,.potx,.pdf,.docx,.doc,.odt,.rtf,.txt,.md,.markdown,.html,.htm,.csv,.xlsx,.xls,.ods"
                onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </label>
            <button
              onClick={() => file && setStep('format')}
              disabled={!file}
              className="pn-btn pn-btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
            >Continue <ChevronRight className="w-4 h-4" /></button>
          </section>
        )}

        {step === 'format' && (
          <section className="pn-card p-6 space-y-4">
            <h2 className="text-sm font-bold">2. Output format</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {OUTPUTS.map((o) => (
                <button
                  key={o.value}
                  onClick={() => setTarget(o.value)}
                  className={`p-3 text-left border rounded transition-colors ${
                    target === o.value ? 'bg-[#EEF5F1] border-[#A8B9AE] text-[#263F34]' : 'bg-white border-[#E3E1DA] hover:bg-[#EDEBE6]'
                  }`}
                >
                  <div className="text-xs font-semibold">{o.label}</div>
                  <div className="text-[10px] text-[#9A9A9A]">{o.desc}</div>
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setStep('upload')} className="px-3 py-1.5 text-xs font-semibold border border-[#C9C6BD] rounded hover:bg-[#EDEBE6]">← Back</button>
              <button onClick={() => setStep('options')} className="px-3 py-1.5 text-xs font-semibold bg-[#4F7563] text-white rounded hover:bg-[#355846]">Next →</button>
            </div>
          </section>
        )}

        {step === 'options' && (
          <section className="pn-card p-6 space-y-4">
            <h2 className="text-sm font-bold">3. Options</h2>

            {/* Phase 37.3G — Brand Kit picker (replaces the old paste-a-UUID input) */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[#111111]">Brand Kit</span>
                <span className="text-[10px] text-[#C9C6BD]">(optional)</span>
                {brandKitId && <BrandKitBadge kitId={brandKitId} />}
              </div>
              <BrandKitPicker
                mode="select"
                value={brandKitId || null}
                emptyLabel="Choose Brand Kit"
                onSelect={(id) => setBrandKitId(id || '')}
              />
              <p className="text-[10px] text-[#9A9A9A]">
                When set, the converted output (PPTX / PDF / DOCX / HTML) uses
                the kit's colors, fonts, and logo. Leave empty to keep the
                source document's existing styling.
              </p>
            </div>

            <div className="flex gap-2 pt-2 border-t border-[#F1F0EC]">
              <button onClick={() => setStep('format')} className="px-3 py-1.5 text-xs font-semibold border border-[#C9C6BD] rounded hover:bg-[#EDEBE6]">← Back</button>
              <button onClick={goPreview} disabled={busy} className="px-3 py-1.5 text-xs font-semibold bg-[#4F7563] text-white rounded hover:bg-[#355846] disabled:opacity-40 inline-flex items-center gap-1">
                {busy && <Loader2 className="w-3 h-3 animate-spin" />} Preview →
              </button>
            </div>
          </section>
        )}

        {step === 'preview' && preview && (
          <section className="pn-card p-6 space-y-4">
            <h2 className="text-sm font-bold flex items-center gap-2">
              4. Preview
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${preview.report.overall >= 80 ? 'bg-[#DDE8E1] text-[#263F34]' : preview.report.overall >= 60 ? 'bg-[#F5E1B7] text-amber-800' : 'bg-[#F7E3E3] text-[#7a2929]'}`}>
                {preview.report.overall}% fidelity
              </span>
              <span className="text-[10px] text-[#9A9A9A]">· format: {preview.format} · {preview.durationMs}ms</span>
            </h2>

            {/* Phase Ω.2 — fidelity sub-scores (text/layout/image/chart/table)
                — previously the backend computed these but the UI only showed
                the rolled-up overall %. Now visible as labelled progress bars. */}
            {preview.report.fidelity && (
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#9A9A9A] mb-1">Fidelity breakdown</div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {(['text','layout','image','chart','table'] as const).map((k) => {
                    const v = Math.round(((preview.report.fidelity as any)[k] ?? 0) as number);
                    const tone = v >= 80 ? 'green' : v >= 60 ? 'amber' : 'red';
                    const fill = tone === 'green' ? 'bg-[#4F7563]' : tone === 'amber' ? 'bg-[#D9A441]' : 'bg-[#D96A6A]';
                    const badge = tone === 'green' ? 'bg-[#DDE8E1] text-[#263F34]' : tone === 'amber' ? 'bg-[#F5E1B7] text-amber-800' : 'bg-[#F7E3E3] text-[#7a2929]';
                    return (
                      <div key={k} className="border border-[#E3E1DA] rounded p-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-[#6B6B6B]">{k}</span>
                          <span className={`text-[10px] font-bold px-1 py-0.5 rounded ${badge}`}>{v}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-[#F1F0EC] rounded-full overflow-hidden">
                          <div className={`h-full ${fill}`} style={{ width: `${v}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2 text-[11px]">
              <Col title="Preserved" tone="green" rows={preview.report.preserved} />
              <Col title="Modified"  tone="amber" rows={preview.report.modified} />
              <Col title="Lost"      tone="red"   rows={preview.report.lost} />
            </div>

            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#9A9A9A] mb-1">Pages ({preview.pages.length})</div>
              <ul className="space-y-0.5 max-h-48 overflow-auto">
                {preview.pages.map((p: any, i: number) => (
                  <li key={i} className="text-xs text-[#111111] border-b border-[#F1F0EC] py-1">
                    <span className="font-mono text-[#C9C6BD] mr-1.5">#{i + 1}</span>
                    {p.title || <span className="text-[#C9C6BD]">(untitled)</span>}
                    <span className="text-[#C9C6BD] ml-2">{p.nodes} nodes</span>
                    {p.notes && <span className="text-[10px] text-[#4F7563] ml-1">+ notes</span>}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setStep('options')} className="px-3 py-1.5 text-xs font-semibold border border-[#C9C6BD] rounded hover:bg-[#EDEBE6]">← Back</button>
              <button onClick={doConvert} disabled={busy} className="px-3 py-1.5 text-xs font-semibold bg-[#4F7563] text-white rounded hover:bg-[#355846] disabled:opacity-40 inline-flex items-center gap-1">
                {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                Convert & download
              </button>
            </div>
          </section>
        )}

        {step === 'convert' && (
          <section className="bg-[#EEF5F1] border border-[#DDE8E1] rounded-lg p-6 text-center">
            <CheckCircle2 className="w-10 h-10 text-[#4F7563] mx-auto mb-2" />
            <div className="text-sm font-bold text-[#1A2D24]">Conversion complete</div>
            <div className="text-xs text-[#355846] mt-1">Your file has been downloaded.</div>
            <button onClick={() => { setStep('upload'); setFile(null); setPreview(null); }}
              className="mt-3 px-3 py-1.5 text-xs font-semibold bg-[#355846] text-white rounded hover:bg-green-800">
              Convert another
            </button>
          </section>
        )}
        </div>}{/* end topTab === 'wizard' */}
      </div>
    </div>
  );
}

// =============================================================================
//  Phase Ω.1 — Batch panel
//  Multiple-file conversion. Calls POST /convert/batch which spawns a job
//  and tracks progress via GET /convert/status/:jobId.
// =============================================================================
const BatchPanel: React.FC<{
  brandKitId:    string;
  setBrandKitId: (s: string) => void;
}> = ({ brandKitId, setBrandKitId }) => {
  const [files,  setFiles]  = useState<File[]>([]);
  const [target, setTarget] = useState<string>('pptx');
  const [job,    setJob]    = useState<any | null>(null);
  const [busy,   setBusy]   = useState(false);
  const [err,    setErr]    = useState<string | null>(null);

  // Poll job status while running.
  React.useEffect(() => {
    if (!job?.id || job.status === 'complete' || job.status === 'failed') return;
    const t = setInterval(async () => {
      try {
        const { data } = await api.get(`/convert/status/${job.id}`);
        setJob(data);
      } catch { /* ignore */ }
    }, 1500);
    return () => clearInterval(t);
  }, [job?.id, job?.status]);

  const submit = async () => {
    if (files.length === 0) { setErr('Pick at least one file'); return; }
    setBusy(true); setErr(null);
    try {
      const form = new FormData();
      files.forEach((f) => form.append('files', f));
      const q = new URLSearchParams();
      q.set('targetFormat', target);
      if (brandKitId) q.set('brandKitId', brandKitId);
      const { data } = await api.post(`/convert/batch?${q.toString()}`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setJob(data);
    } catch (e: any) { setErr(e?.response?.data?.message || e?.message); }
    finally { setBusy(false); }
  };

  return (
    <section className="pn-card p-6 space-y-4">
      <h2 className="text-sm font-bold">Batch conversion</h2>
      <p className="text-[10px] text-[#9A9A9A]">Convert multiple files at once with the same target format and brand kit.</p>

      <label className="flex items-center gap-2 border border-dashed border-[#C9C6BD] rounded p-4 cursor-pointer hover:bg-[#EDEBE6]">
        <FileUp className="w-4 h-4 text-[#9A9A9A]" />
        <span className="text-xs text-[#6B6B6B]">
          {files.length === 0 ? 'Pick one or more files (PPTX / PDF / DOCX / etc.)' : `${files.length} file(s) selected`}
        </span>
        <input type="file" multiple className="hidden"
          accept=".pptx,.potx,.pdf,.docx,.doc,.odt,.rtf,.txt,.md,.markdown,.html,.htm,.csv,.xlsx,.xls,.ods"
          onChange={(e) => setFiles(Array.from(e.target.files || []))} />
      </label>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {OUTPUTS.map((o) => (
          <button key={o.value} onClick={() => setTarget(o.value)}
            className={`p-2 text-left border rounded transition-colors ${target === o.value ? 'bg-[#EEF5F1] border-[#A8B9AE] text-[#263F34]' : 'bg-white border-[#E3E1DA] hover:bg-[#EDEBE6]'}`}>
            <div className="text-xs font-semibold">{o.label}</div>
            <div className="text-[10px] text-[#9A9A9A]">{o.desc}</div>
          </button>
        ))}
      </div>

      <div className="space-y-1.5 pt-2 border-t border-[#F1F0EC]">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[#111111]">Brand Kit</span>
          {brandKitId && <BrandKitBadge kitId={brandKitId} />}
        </div>
        <BrandKitPicker mode="select" value={brandKitId || null} emptyLabel="Choose Brand Kit"
          onSelect={(id) => setBrandKitId(id || '')} />
      </div>

      {err && <div className="bg-[#FCF1F1] border border-[#F7E3E3] text-[#7a2929] text-xs rounded p-2">{err}</div>}

      <button onClick={submit} disabled={busy || files.length === 0}
        className="px-3 py-1.5 text-xs font-semibold bg-[#4F7563] text-white rounded hover:bg-[#355846] disabled:opacity-40 inline-flex items-center gap-1">
        {busy && <Loader2 className="w-3 h-3 animate-spin" />} Start batch
      </button>

      {job && (
        <div className="mt-2 p-3 bg-[#EDEBE6] border border-[#E3E1DA] rounded">
          <div className="text-xs font-semibold mb-1">Job {job.id} — {job.status} · {job.done}/{job.total}</div>
          {job.results?.length > 0 && (
            <ul className="space-y-0.5 text-[11px]">
              {job.results.map((r: any, i: number) => (
                <li key={i} className="flex items-center gap-2">
                  {r.ok ? <CheckCircle2 className="w-3 h-3 text-[#4F7563]" /> : <AlertTriangle className="w-3 h-3 text-[#9a3737]" />}
                  <span className="truncate">{r.filename}</span>
                  {r.overall != null && <span className="text-[#9A9A9A]">· {r.overall}%</span>}
                  {r.error && <span className="text-[#9a3737]">· {r.error}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
};

// =============================================================================
//  Phase Ω.1 — History panel
//  Lists past conversions via GET /convert/history; restore via /restore/:id.
//  Click a row to show lineage chain via /convert/lineage/:id.
// =============================================================================
const HistoryPanel: React.FC = () => {
  const confirm = useConfirm();
  const [items, setItems]   = useState<any[]>([]);
  const [chain, setChain]   = useState<any[] | null>(null);
  const [busy,  setBusy]    = useState(false);
  const [err,   setErr]     = useState<string | null>(null);

  const refresh = async () => {
    setBusy(true); setErr(null);
    try {
      const { data } = await api.get('/convert/history');
      setItems(Array.isArray(data) ? data : (data?.items || []));
    } catch (e: any) { setErr(e?.response?.data?.message || e?.message); }
    finally { setBusy(false); }
  };

  React.useEffect(() => { refresh(); }, []);

  const showLineage = async (id: string) => {
    try {
      const { data } = await api.get(`/convert/lineage/${id}`);
      setChain(Array.isArray(data) ? data : (data?.chain || []));
    } catch (e: any) { setErr(e?.response?.data?.message || e?.message); }
  };

  const [restoredId, setRestoredId] = useState<string | null>(null);
  const restore = async (id: string) => {
    if (!(await confirm({ title: 'Restore conversion?', message: 'Restoring will re-create the downloaded artefact and overwrite any subsequent edits in the lineage.', confirmLabel: 'Restore' }))) return;
    try {
      await api.post(`/convert/restore/${id}`);
      setRestoredId(id);
      setTimeout(() => setRestoredId(null), 3000);
      refresh();
    } catch (e: any) { setErr(e?.response?.data?.message || e?.message); }
  };

  return (
    <section className="pn-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold">Conversion history</h2>
        <button onClick={refresh} disabled={busy}
          className="text-[11px] text-[#4F7563] hover:underline disabled:opacity-50 inline-flex items-center gap-1">
          {busy && <Loader2 className="w-3 h-3 animate-spin" />} Refresh
        </button>
      </div>
      {err && <div className="bg-[#FCF1F1] border border-[#F7E3E3] text-[#7a2929] text-xs rounded p-2">{err}</div>}
      {restoredId && (
        <div className="bg-[#EEF5F1] border border-[#DDE8E1] text-[#1A2D24] text-xs rounded p-2 inline-flex items-center gap-2">
          <CheckCircle2 className="w-3 h-3" /> Restored conversion <span className="font-mono">{restoredId}</span>
        </div>
      )}
      {items.length === 0 && !busy && (
        <p className="text-xs text-[#9A9A9A] italic">No past conversions yet.</p>
      )}
      <ul className="space-y-1">
        {items.map((it: any) => (
          <li key={it.id} className="flex items-center gap-2 text-xs p-2 border border-[#E3E1DA] rounded hover:bg-[#EDEBE6]">
            <span className="font-mono text-[10px] uppercase text-[#9A9A9A]">{it.format || it.targetFormat}</span>
            <span className="flex-1 truncate">{it.filename || it.title || it.id}</span>
            <span className="text-[10px] text-[#C9C6BD]">{it.createdAt ? new Date(it.createdAt).toLocaleString() : ''}</span>
            <button onClick={() => showLineage(it.id)}
              className="text-[10px] text-[#4F7563] hover:underline">Lineage</button>
            <button onClick={() => restore(it.id)}
              className="text-[10px] text-[#111111] hover:underline">Restore</button>
          </li>
        ))}
      </ul>
      {chain && (
        <div className="mt-3 p-3 bg-[#EDEBE6] border border-[#E3E1DA] rounded">
          <div className="text-xs font-bold mb-1">Lineage</div>
          <ul className="space-y-0.5 text-[11px] font-mono">
            {chain.map((c: any, i: number) => (
              <li key={i} className="flex items-center gap-2">
                <span className="text-[#9A9A9A]">{c.format || c.targetFormat || '?'}</span>
                <span className="truncate">{c.filename || c.id}</span>
              </li>
            ))}
          </ul>
          <button onClick={() => setChain(null)}
            className="mt-2 text-[10px] text-[#4F7563] hover:underline">Close</button>
        </div>
      )}
    </section>
  );
};

// =============================================================================
//  Phase Ω.1 — Diagnostics panel
//  Calls GET /convert/storage/diagnostics. Shows storage backend health.
// =============================================================================
const DiagnosticsPanel: React.FC = () => {
  const [diag, setDiag] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState<string | null>(null);

  const refresh = async () => {
    setBusy(true); setErr(null);
    try {
      const { data } = await api.get('/convert/storage/diagnostics');
      setDiag(data);
    } catch (e: any) { setErr(e?.response?.data?.message || e?.message); }
    finally { setBusy(false); }
  };
  React.useEffect(() => { refresh(); }, []);

  return (
    <section className="pn-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold">Storage diagnostics</h2>
        <button onClick={refresh} disabled={busy}
          className="text-[11px] text-[#4F7563] hover:underline disabled:opacity-50 inline-flex items-center gap-1">
          {busy && <Loader2 className="w-3 h-3 animate-spin" />} Refresh
        </button>
      </div>
      {err && <div className="bg-[#FCF1F1] border border-[#F7E3E3] text-[#7a2929] text-xs rounded p-2">{err}</div>}
      {diag && (
        <pre className="text-[11px] font-mono bg-[#EDEBE6] border border-[#E3E1DA] rounded p-2 overflow-auto">
{JSON.stringify(diag, null, 2)}
        </pre>
      )}
      {!diag && !err && !busy && <p className="text-xs text-[#9A9A9A] italic">Loading…</p>}
    </section>
  );
};

const Col: React.FC<{ title: string; tone: 'green' | 'amber' | 'red'; rows: Array<{ kind: string; count: number; note?: string }> }> = ({ title, tone, rows }) => {
  const tones = {
    green: 'border-[#DDE8E1] bg-[#EEF5F1] text-[#1A2D24]',
    amber: 'border-[#F2DCAE] bg-[#FAEEDB] text-amber-900',
    red:   'border-[#F7E3E3] bg-[#FCF1F1] text-red-900',
  } as const;
  return (
    <div className={`border rounded p-2 ${tones[tone]}`}>
      <div className="text-[10px] font-bold uppercase tracking-wider mb-1">{title}</div>
      {rows.length === 0 ? <div className="text-[10px] italic opacity-60">—</div> : (
        <ul className="space-y-0.5">
          {rows.map((r, i) => (
            <li key={i}>· {r.kind} <span className="opacity-60">× {r.count}</span>{r.note && <div className="ml-3 text-[9px] opacity-70">{r.note}</div>}</li>
          ))}
        </ul>
      )}
    </div>
  );
};
