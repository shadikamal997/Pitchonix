'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Shield, Activity, BarChart3, HardDrive, Cpu, Play, Loader2,
  CheckCircle2, AlertTriangle, Download, RefreshCw,
} from 'lucide-react';
import api from '@/lib/api';

// =============================================================================
//  Phase Ω.2 — /admin/diagnostics
//
//  Admin-only operational dashboard. Hidden from the normal sidebar nav;
//  only reachable via direct URL. Server-side access check happens via
//  GET /api/admin/access — non-admin users see a Forbidden screen.
//
//  Cards:
//    - PPTX Certification     → /api/pptx-import/diagnostics/renderer + fixtures/real/certify
//    - Round-trip test        → /api/pptx-import/round-trip/synthetic
//    - Collaboration metrics  → /api/collaboration/metrics
//    - Conversion storage     → /api/convert/storage/diagnostics
//    - Renderer diagnostics   → /api/pptx-import/diagnostics/renderer (subset of cert card)
// =============================================================================

export default function AdminDiagnosticsPage() {
  const router = useRouter();
  const [check, setCheck] = useState<'loading' | 'admin' | 'forbidden'>('loading');

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/admin/access');
        setCheck(data?.isAdmin ? 'admin' : 'forbidden');
      } catch (e: any) {
        if (e?.response?.status === 401) router.push('/login?redirect=/admin/diagnostics');
        else setCheck('forbidden');
      }
    })();
  }, [router]);

  if (check === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-slate-500">
        <Loader2 className="w-4 h-4 animate-spin mr-2" /> Checking admin access…
      </div>
    );
  }

  if (check === 'forbidden') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white border border-red-200 rounded-lg p-8 text-center max-w-md">
          <Shield className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h1 className="text-lg font-bold text-slate-900 mb-2">Admin access required</h1>
          <p className="text-sm text-slate-600">
            This page is reserved for workspace owners and platform administrators.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 h-14 flex items-center gap-3">
        <Shield className="w-5 h-5 text-purple-600" />
        <h1 className="text-base font-bold text-slate-900">Admin · Diagnostics</h1>
        <span className="ml-2 text-[10px] font-bold tracking-wide uppercase bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded">
          Internal
        </span>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        <p className="text-xs text-slate-500">
          Operational tooling. Not part of the user-facing product. All endpoints
          here are authenticated and access-checked server-side.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <RendererCard />
          <CollabMetricsCard />
          <PptxCertificationCard />
          <RoundTripCard />
          <StorageDiagnosticsCard />
          <CvImportAnalyticsCard />
        </div>
      </div>
    </div>
  );
}

// =============================================================================
//  Renderer (LibreOffice + Poppler) probe
// =============================================================================
function RendererCard() {
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState<any>(null);
  const [err,  setErr]  = useState<string | null>(null);

  const refresh = async () => {
    setBusy(true); setErr(null);
    try { const r = await api.get('/pptx-import/diagnostics/renderer'); setData(r.data); }
    catch (e: any) { setErr(e?.response?.data?.message || e?.message); }
    finally { setBusy(false); }
  };
  useEffect(() => { refresh(); }, []);

  const ok = data && data.soffice?.ok && data.pdftoppm?.ok && data.e2e?.ok;
  return (
    <Card title="Renderer diagnostics" icon={<Cpu className="w-4 h-4" />} action={<RefreshButton busy={busy} onClick={refresh} />}>
      {err && <ErrorBox text={err} />}
      {data && (
        <ul className="text-xs space-y-1.5">
          <li className="flex items-center gap-2">
            {data.soffice?.ok ? <CheckCircle2 className="w-3 h-3 text-green-600" /> : <AlertTriangle className="w-3 h-3 text-red-600" />}
            <span className="font-semibold">LibreOffice:</span>
            <span className="text-slate-600">{data.soffice?.version || '—'}</span>
          </li>
          <li className="flex items-center gap-2">
            {data.pdftoppm?.ok ? <CheckCircle2 className="w-3 h-3 text-green-600" /> : <AlertTriangle className="w-3 h-3 text-red-600" />}
            <span className="font-semibold">Poppler:</span>
            <span className="text-slate-600">{data.pdftoppm?.version || '—'}</span>
          </li>
          <li className="flex items-center gap-2">
            {data.e2e?.ok ? <CheckCircle2 className="w-3 h-3 text-green-600" /> : <AlertTriangle className="w-3 h-3 text-red-600" />}
            <span className="font-semibold">End-to-end:</span>
            <span className="text-slate-600">{data.e2e?.bytes ? `${data.e2e.bytes}B in ${data.e2e.ms}ms` : '—'}</span>
          </li>
          {!ok && data.installHint && (
            <li className="bg-amber-50 border border-amber-200 rounded p-2 text-[11px] text-amber-900 mt-1">
              <strong>Install hint:</strong> {data.installHint}
            </li>
          )}
        </ul>
      )}
    </Card>
  );
}

// =============================================================================
//  Collaboration metrics (rooms / users / docs / events)
// =============================================================================
function CollabMetricsCard() {
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState<any>(null);
  const [err,  setErr]  = useState<string | null>(null);

  const refresh = async () => {
    setBusy(true); setErr(null);
    try { const r = await api.get('/collaboration/metrics'); setData(r.data); }
    catch (e: any) { setErr(e?.response?.data?.message || e?.message); }
    finally { setBusy(false); }
  };
  useEffect(() => { refresh(); }, []);

  return (
    <Card title="Collaboration metrics" icon={<Activity className="w-4 h-4" />} action={<RefreshButton busy={busy} onClick={refresh} />}>
      {err && <ErrorBox text={err} />}
      {data && (
        <div className="grid grid-cols-2 gap-3 text-xs">
          <Metric label="Active rooms"     value={data.presence?.rooms ?? 0} />
          <Metric label="Active users"     value={data.presence?.users ?? 0} />
          <Metric label="Cached Y.Docs"    value={data.ydoc?.size  ?? 0} />
          <Metric label="Dirty Y.Docs"     value={data.ydoc?.dirty ?? 0} />
          <Metric label="Cursor events"    value={data.events?.cursor ?? 0} />
          <Metric label="Yjs updates"      value={data.events?.update ?? 0} />
          <Metric label="Sync bus pending" value={data.syncBus?.pending ?? 0} />
          <Metric label="Sync bus mode"    value={data.syncBus?.mode ?? '—'} />
        </div>
      )}
    </Card>
  );
}

// =============================================================================
//  PPTX certification dashboard (subset — full panel lives at /pptx-certification)
// =============================================================================
function PptxCertificationCard() {
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState<any>(null);
  const [err,  setErr]  = useState<string | null>(null);

  const run = async () => {
    setBusy(true); setErr(null);
    try { const r = await api.get('/pptx-import/fixtures/real/certify'); setData(r.data); }
    catch (e: any) { setErr(e?.response?.data?.message || e?.message); }
    finally { setBusy(false); }
  };

  return (
    <Card
      title="PPTX certification"
      icon={<BarChart3 className="w-4 h-4" />}
      action={
        <div className="flex items-center gap-2">
          <a href="/pptx-certification" target="_blank" rel="noopener noreferrer"
            className="text-[11px] text-blue-600 hover:underline">Open full dashboard →</a>
          <button onClick={run} disabled={busy}
            className="h-7 px-2 text-[11px] font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded inline-flex items-center gap-1 disabled:opacity-50">
            {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />} Certify
          </button>
        </div>
      }
    >
      {err && <ErrorBox text={err} />}
      {!data && !err && !busy && (
        <p className="text-xs text-slate-500 italic">Click "Certify" to run against the fixtures directory.</p>
      )}
      {data && (
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-3">
            <Metric label="Fixtures"    value={data.summary?.fixtures ?? data.fixtures?.length ?? 0} />
            <Metric label="Avg overall" value={data.summary?.avgOverall ?? data.avgOverall ?? '—'} />
            <Metric label="Bands"       value={JSON.stringify(data.summary?.bands || data.bands || {})} />
          </div>
        </div>
      )}
    </Card>
  );
}

// =============================================================================
//  Synthetic round-trip
// =============================================================================
function RoundTripCard() {
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState<any>(null);
  const [err,  setErr]  = useState<string | null>(null);

  const run = async () => {
    setBusy(true); setErr(null); setData(null);
    try { const r = await api.get('/pptx-import/round-trip/synthetic'); setData(r.data); }
    catch (e: any) { setErr(e?.response?.data?.message || e?.message); }
    finally { setBusy(false); }
  };

  return (
    <Card
      title="Synthetic PPTX round-trip"
      icon={<Play className="w-4 h-4" />}
      action={
        <button onClick={run} disabled={busy}
          className="h-7 px-2 text-[11px] font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded inline-flex items-center gap-1 disabled:opacity-50">
          {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />} Run
        </button>
      }
    >
      {err && <ErrorBox text={err} />}
      {!data && !err && !busy && (
        <p className="text-xs text-slate-500 italic">Builds a synthetic deck, exports it, re-parses it, diffs the structure.</p>
      )}
      {data && (
        <div className="grid grid-cols-2 gap-2 text-xs">
          <Metric label="Slides"   value={data.slides ?? data.report?.slides ?? '—'} />
          <Metric label="Fidelity" value={typeof data.fidelity === 'number' ? `${(data.fidelity * 100).toFixed(1)}%` : (data.report?.fidelity ?? '—')} />
          <Metric label="Runtime"  value={data.durationMs != null ? `${data.durationMs}ms` : '—'} />
          <Metric label="Warnings" value={(data.warnings?.length ?? 0)} />
        </div>
      )}
    </Card>
  );
}

// =============================================================================
//  Conversion storage diagnostics
// =============================================================================
function StorageDiagnosticsCard() {
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState<any>(null);
  const [err,  setErr]  = useState<string | null>(null);

  const refresh = async () => {
    setBusy(true); setErr(null);
    try { const r = await api.get('/convert/storage/diagnostics'); setData(r.data); }
    catch (e: any) { setErr(e?.response?.data?.message || e?.message); }
    finally { setBusy(false); }
  };
  useEffect(() => { refresh(); }, []);

  return (
    <Card title="Conversion storage" icon={<HardDrive className="w-4 h-4" />} action={<RefreshButton busy={busy} onClick={refresh} />}>
      {err && <ErrorBox text={err} />}
      {data && (
        <pre className="text-[11px] font-mono bg-slate-50 border border-slate-200 rounded p-2 overflow-auto max-h-48">
{JSON.stringify(data, null, 2)}
        </pre>
      )}
    </Card>
  );
}

// =============================================================================
//  Atoms
// =============================================================================
const Card: React.FC<{ title: string; icon: React.ReactNode; action?: React.ReactNode; children: React.ReactNode }> =
  ({ title, icon, action, children }) => (
  <section className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <div className="text-slate-600">{icon}</div>
        <h2 className="text-sm font-bold text-slate-900">{title}</h2>
      </div>
      <div>{action}</div>
    </div>
    {children}
  </section>
);

const Metric: React.FC<{ label: string; value: any }> = ({ label, value }) => (
  <div className="bg-slate-50 border border-slate-200 rounded p-2">
    <div className="text-[10px] text-slate-500 uppercase tracking-wide">{label}</div>
    <div className="text-sm font-semibold text-slate-900 font-mono truncate">{String(value)}</div>
  </div>
);

// =============================================================================
//  Phase 42.8C + 42.8K — CV Import Analytics (admin-only).
//  Aggregates over the last 30 days of CvAnalysisSnapshot rows (kind='import').
// =============================================================================
function CvImportAnalyticsCard() {
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState<any>(null);
  const [err,  setErr]  = useState<string | null>(null);

  const refresh = async () => {
    setBusy(true); setErr(null);
    try { const r = await api.get('/career/import/analytics'); setData(r.data); }
    catch (e: any) { setErr(e?.response?.data?.message || e?.message); }
    finally { setBusy(false); }
  };
  useEffect(() => { refresh(); }, []);

  return (
    <Card title="CV import analytics" icon={<BarChart3 className="w-4 h-4" />} action={<RefreshButton busy={busy} onClick={refresh} />}>
      {err && <ErrorBox text={err} />}
      {!data && !err && !busy && <p className="text-xs text-slate-500 italic">Loading…</p>}
      {data && data.total === 0 && (
        <p className="text-xs text-slate-500 italic">No imports in the last 30 days yet.</p>
      )}
      {data && data.total > 0 && (
        <div className="space-y-3 text-xs">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Metric label="Imports (30d)"   value={data.total} />
            <Metric label="Avg confidence"  value={`${data.avgConfidence} / 100`} />
            <Metric label="OCR usage"       value={`${data.ocrUsage}%`} />
            <Metric label="Avg duration"    value={`${(data.avgDurationMs/1000).toFixed(1)}s`} />
            <Metric label="Failure rate"    value={`${data.failureRate}%`} />
          </div>
          {data.missingSections?.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-wide text-slate-500 mb-1">Most common missing sections</div>
              <div className="flex flex-wrap gap-1">
                {data.missingSections.map((r: any) => (
                  <span key={r.key} className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono">{r.key} × {r.count}</span>
                ))}
              </div>
            </div>
          )}
          {data.unknownHeadings?.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-wide text-slate-500 mb-1">Most common unknown headings</div>
              <div className="flex flex-wrap gap-1">
                {data.unknownHeadings.map((r: any) => (
                  <span key={r.key} className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-mono">"{r.key}" × {r.count}</span>
                ))}
              </div>
            </div>
          )}
          {data.langs?.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-wide text-slate-500 mb-1">OCR languages used</div>
              <div className="flex flex-wrap gap-1">
                {data.langs.map((r: any) => (
                  <span key={r.key} className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-mono">{r.key} × {r.count}</span>
                ))}
              </div>
            </div>
          )}
          {data.daily?.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-wide text-slate-500 mb-1">Daily volume</div>
              <div className="flex items-end gap-0.5 h-10">
                {data.daily.map((d: any) => (
                  <div key={d.day} title={`${d.day}: ${d.n}`}
                    className="flex-1 bg-purple-400/70 rounded-t"
                    style={{ height: `${Math.max(4, Math.min(40, d.n * 3))}px` }} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

const RefreshButton: React.FC<{ busy: boolean; onClick: () => void }> = ({ busy, onClick }) => (
  <button onClick={onClick} disabled={busy}
    className="text-[11px] text-blue-600 hover:underline inline-flex items-center gap-1 disabled:opacity-50">
    {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
    Refresh
  </button>
);

const ErrorBox: React.FC<{ text: string }> = ({ text }) => (
  <div className="bg-red-50 border border-red-200 text-red-800 text-xs rounded p-2">{text}</div>
);
