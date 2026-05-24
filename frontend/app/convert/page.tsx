'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, FileUp, ShuffleIcon, Loader2, ChevronRight, CheckCircle2, AlertTriangle, Download,
} from 'lucide-react';
import api from '@/lib/api';
import { BrandKitPicker, BrandKitBadge } from '@/features/brand-kits/BrandKitPicker';

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

  return (
    <div className="min-h-screen bg-slate-50">
      {/* tab state — top-level "Convert" wizard vs. "History" / "Batch" / "Diagnostics" */}
      <header className="bg-white border-b border-slate-200 px-6 h-14 flex items-center gap-3">
        <Link href="/dashboard" className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" /> Back
        </Link>
        <div className="h-5 w-px bg-slate-200" />
        <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <ShuffleIcon className="w-4 h-4 text-slate-500" /> Document Conversion
        </h1>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-6 space-y-5">
        {/* Phase Ω.1 — top-level tabs surface batch / history / diagnostics
            which were all backend-only previously. */}
        <div className="flex items-center gap-1 border-b border-slate-200 mb-1">
          {([
            { id: 'wizard',      label: 'Convert'      },
            { id: 'batch',       label: 'Batch'        },
            { id: 'history',     label: 'History'      },
            { id: 'diagnostics', label: 'Diagnostics'  },
          ] as { id: TopTab; label: string }[]).map((t) => (
            <button
              key={t.id}
              onClick={() => setTopTab(t.id)}
              className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${topTab === t.id ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {topTab === 'batch'       && <BatchPanel       brandKitId={brandKitId} setBrandKitId={setBrandKitId} />}
        {topTab === 'history'     && <HistoryPanel />}
        {topTab === 'diagnostics' && <DiagnosticsPanel />}

        {topTab === 'wizard' && <>
        {/* Stepper */}
        <div className="flex items-center gap-2 text-[11px]">
          {(['upload', 'format', 'options', 'preview', 'convert'] as Step[]).map((s, i, all) => (
            <React.Fragment key={s}>
              <div className={`px-2 py-1 rounded ${step === s ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                {i + 1}. {s}
              </div>
              {i < all.length - 1 && <ChevronRight className="w-3 h-3 text-slate-300" />}
            </React.Fragment>
          ))}
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-800 text-xs rounded p-3">{error}</div>}

        {step === 'upload' && (
          <section className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
            <h2 className="text-sm font-bold">1. Choose a file</h2>
            <label className="flex items-center gap-2 border border-dashed border-slate-300 rounded p-6 cursor-pointer hover:bg-slate-50">
              <FileUp className="w-4 h-4 text-slate-500" />
              <span className="text-xs text-slate-600">{file ? file.name : 'Click to pick a PPTX / PDF / DOCX / XLSX / HTML / MD / TXT / RTF / CSV file'}</span>
              <input type="file" className="hidden"
                accept=".pptx,.potx,.pdf,.docx,.doc,.odt,.rtf,.txt,.md,.markdown,.html,.htm,.csv,.xlsx,.xls,.ods"
                onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </label>
            <button
              onClick={() => file && setStep('format')}
              disabled={!file}
              className="px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-40"
            >Next →</button>
          </section>
        )}

        {step === 'format' && (
          <section className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
            <h2 className="text-sm font-bold">2. Output format</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {OUTPUTS.map((o) => (
                <button
                  key={o.value}
                  onClick={() => setTarget(o.value)}
                  className={`p-3 text-left border rounded transition-colors ${
                    target === o.value ? 'bg-blue-50 border-blue-400 text-blue-800' : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="text-xs font-semibold">{o.label}</div>
                  <div className="text-[10px] text-slate-500">{o.desc}</div>
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setStep('upload')} className="px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded hover:bg-slate-50">← Back</button>
              <button onClick={() => setStep('options')} className="px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded hover:bg-blue-700">Next →</button>
            </div>
          </section>
        )}

        {step === 'options' && (
          <section className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
            <h2 className="text-sm font-bold">3. Options</h2>

            {/* Phase 37.3G — Brand Kit picker (replaces the old paste-a-UUID input) */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-700">Brand Kit</span>
                <span className="text-[10px] text-slate-400">(optional)</span>
                {brandKitId && <BrandKitBadge kitId={brandKitId} />}
              </div>
              <BrandKitPicker
                mode="select"
                value={brandKitId || null}
                emptyLabel="Choose Brand Kit"
                onSelect={(id) => setBrandKitId(id || '')}
              />
              <p className="text-[10px] text-slate-500">
                When set, the converted output (PPTX / PDF / DOCX / HTML) uses
                the kit's colors, fonts, and logo. Leave empty to keep the
                source document's existing styling.
              </p>
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <button onClick={() => setStep('format')} className="px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded hover:bg-slate-50">← Back</button>
              <button onClick={goPreview} disabled={busy} className="px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-40 inline-flex items-center gap-1">
                {busy && <Loader2 className="w-3 h-3 animate-spin" />} Preview →
              </button>
            </div>
          </section>
        )}

        {step === 'preview' && preview && (
          <section className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
            <h2 className="text-sm font-bold flex items-center gap-2">
              4. Preview
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${preview.report.overall >= 80 ? 'bg-green-100 text-green-800' : preview.report.overall >= 60 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}`}>
                {preview.report.overall}% fidelity
              </span>
              <span className="text-[10px] text-slate-500">· format: {preview.format} · {preview.durationMs}ms</span>
            </h2>

            {/* Phase Ω.2 — fidelity sub-scores (text/layout/image/chart/table)
                — previously the backend computed these but the UI only showed
                the rolled-up overall %. Now visible as labelled progress bars. */}
            {preview.report.fidelity && (
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Fidelity breakdown</div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {(['text','layout','image','chart','table'] as const).map((k) => {
                    const v = Math.round(((preview.report.fidelity as any)[k] ?? 0) as number);
                    const tone = v >= 80 ? 'green' : v >= 60 ? 'amber' : 'red';
                    const fill = tone === 'green' ? 'bg-green-500' : tone === 'amber' ? 'bg-amber-500' : 'bg-red-500';
                    const badge = tone === 'green' ? 'bg-green-100 text-green-800' : tone === 'amber' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800';
                    return (
                      <div key={k} className="border border-slate-200 rounded p-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-600">{k}</span>
                          <span className={`text-[10px] font-bold px-1 py-0.5 rounded ${badge}`}>{v}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
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
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Pages ({preview.pages.length})</div>
              <ul className="space-y-0.5 max-h-48 overflow-auto">
                {preview.pages.map((p: any, i: number) => (
                  <li key={i} className="text-xs text-slate-700 border-b border-slate-100 py-1">
                    <span className="font-mono text-slate-400 mr-1.5">#{i + 1}</span>
                    {p.title || <span className="text-slate-400">(untitled)</span>}
                    <span className="text-slate-400 ml-2">{p.nodes} nodes</span>
                    {p.notes && <span className="text-[10px] text-blue-600 ml-1">+ notes</span>}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setStep('options')} className="px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded hover:bg-slate-50">← Back</button>
              <button onClick={doConvert} disabled={busy} className="px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-40 inline-flex items-center gap-1">
                {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                Convert & download
              </button>
            </div>
          </section>
        )}

        {step === 'convert' && (
          <section className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
            <CheckCircle2 className="w-10 h-10 text-green-600 mx-auto mb-2" />
            <div className="text-sm font-bold text-green-900">Conversion complete</div>
            <div className="text-xs text-green-700 mt-1">Your file has been downloaded.</div>
            <button onClick={() => { setStep('upload'); setFile(null); setPreview(null); }}
              className="mt-3 px-3 py-1.5 text-xs font-semibold bg-green-700 text-white rounded hover:bg-green-800">
              Convert another
            </button>
          </section>
        )}
        </>}{/* end topTab === 'wizard' */}
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
    <section className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
      <h2 className="text-sm font-bold">Batch conversion</h2>
      <p className="text-[10px] text-slate-500">Convert multiple files at once with the same target format and brand kit.</p>

      <label className="flex items-center gap-2 border border-dashed border-slate-300 rounded p-4 cursor-pointer hover:bg-slate-50">
        <FileUp className="w-4 h-4 text-slate-500" />
        <span className="text-xs text-slate-600">
          {files.length === 0 ? 'Pick one or more files (PPTX / PDF / DOCX / etc.)' : `${files.length} file(s) selected`}
        </span>
        <input type="file" multiple className="hidden"
          accept=".pptx,.potx,.pdf,.docx,.doc,.odt,.rtf,.txt,.md,.markdown,.html,.htm,.csv,.xlsx,.xls,.ods"
          onChange={(e) => setFiles(Array.from(e.target.files || []))} />
      </label>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {OUTPUTS.map((o) => (
          <button key={o.value} onClick={() => setTarget(o.value)}
            className={`p-2 text-left border rounded transition-colors ${target === o.value ? 'bg-blue-50 border-blue-400 text-blue-800' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
            <div className="text-xs font-semibold">{o.label}</div>
            <div className="text-[10px] text-slate-500">{o.desc}</div>
          </button>
        ))}
      </div>

      <div className="space-y-1.5 pt-2 border-t border-slate-100">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-700">Brand Kit</span>
          {brandKitId && <BrandKitBadge kitId={brandKitId} />}
        </div>
        <BrandKitPicker mode="select" value={brandKitId || null} emptyLabel="Choose Brand Kit"
          onSelect={(id) => setBrandKitId(id || '')} />
      </div>

      {err && <div className="bg-red-50 border border-red-200 text-red-800 text-xs rounded p-2">{err}</div>}

      <button onClick={submit} disabled={busy || files.length === 0}
        className="px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-40 inline-flex items-center gap-1">
        {busy && <Loader2 className="w-3 h-3 animate-spin" />} Start batch
      </button>

      {job && (
        <div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded">
          <div className="text-xs font-semibold mb-1">Job {job.id} — {job.status} · {job.done}/{job.total}</div>
          {job.results?.length > 0 && (
            <ul className="space-y-0.5 text-[11px]">
              {job.results.map((r: any, i: number) => (
                <li key={i} className="flex items-center gap-2">
                  {r.ok ? <CheckCircle2 className="w-3 h-3 text-green-600" /> : <AlertTriangle className="w-3 h-3 text-red-600" />}
                  <span className="truncate">{r.filename}</span>
                  {r.overall != null && <span className="text-slate-500">· {r.overall}%</span>}
                  {r.error && <span className="text-red-600">· {r.error}</span>}
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

  const restore = async (id: string) => {
    if (!window.confirm('Restore this conversion result?')) return;
    try {
      await api.post(`/convert/restore/${id}`);
      alert('Restored');
      refresh();
    } catch (e: any) { setErr(e?.response?.data?.message || e?.message); }
  };

  return (
    <section className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold">Conversion history</h2>
        <button onClick={refresh} disabled={busy}
          className="text-[11px] text-blue-600 hover:underline disabled:opacity-50 inline-flex items-center gap-1">
          {busy && <Loader2 className="w-3 h-3 animate-spin" />} Refresh
        </button>
      </div>
      {err && <div className="bg-red-50 border border-red-200 text-red-800 text-xs rounded p-2">{err}</div>}
      {items.length === 0 && !busy && (
        <p className="text-xs text-slate-500 italic">No past conversions yet.</p>
      )}
      <ul className="space-y-1">
        {items.map((it: any) => (
          <li key={it.id} className="flex items-center gap-2 text-xs p-2 border border-slate-200 rounded hover:bg-slate-50">
            <span className="font-mono text-[10px] uppercase text-slate-500">{it.format || it.targetFormat}</span>
            <span className="flex-1 truncate">{it.filename || it.title || it.id}</span>
            <span className="text-[10px] text-slate-400">{it.createdAt ? new Date(it.createdAt).toLocaleString() : ''}</span>
            <button onClick={() => showLineage(it.id)}
              className="text-[10px] text-blue-600 hover:underline">Lineage</button>
            <button onClick={() => restore(it.id)}
              className="text-[10px] text-slate-700 hover:underline">Restore</button>
          </li>
        ))}
      </ul>
      {chain && (
        <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded">
          <div className="text-xs font-bold mb-1">Lineage</div>
          <ul className="space-y-0.5 text-[11px] font-mono">
            {chain.map((c: any, i: number) => (
              <li key={i} className="flex items-center gap-2">
                <span className="text-slate-500">{c.format || c.targetFormat || '?'}</span>
                <span className="truncate">{c.filename || c.id}</span>
              </li>
            ))}
          </ul>
          <button onClick={() => setChain(null)}
            className="mt-2 text-[10px] text-blue-600 hover:underline">Close</button>
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
    <section className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold">Storage diagnostics</h2>
        <button onClick={refresh} disabled={busy}
          className="text-[11px] text-blue-600 hover:underline disabled:opacity-50 inline-flex items-center gap-1">
          {busy && <Loader2 className="w-3 h-3 animate-spin" />} Refresh
        </button>
      </div>
      {err && <div className="bg-red-50 border border-red-200 text-red-800 text-xs rounded p-2">{err}</div>}
      {diag && (
        <pre className="text-[11px] font-mono bg-slate-50 border border-slate-200 rounded p-2 overflow-auto">
{JSON.stringify(diag, null, 2)}
        </pre>
      )}
      {!diag && !err && !busy && <p className="text-xs text-slate-500 italic">Loading…</p>}
    </section>
  );
};

const Col: React.FC<{ title: string; tone: 'green' | 'amber' | 'red'; rows: Array<{ kind: string; count: number; note?: string }> }> = ({ title, tone, rows }) => {
  const tones = {
    green: 'border-green-200 bg-green-50 text-green-900',
    amber: 'border-amber-200 bg-amber-50 text-amber-900',
    red:   'border-red-200 bg-red-50 text-red-900',
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
