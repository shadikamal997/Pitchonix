'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Sparkles, TrendingUp, Briefcase, FileText, Trash2, Loader2,
  BarChart3, Award, Clock, ChevronRight, GitCompare,
} from 'lucide-react';
import api from '@/lib/api';
import { useCvProfile, useCvDocuments } from '@/features/career/hooks';
import { useConfirm } from '@/components/ConfirmDialog';

// =============================================================================
//  Phase 42.4G — Career Intelligence Dashboard
//
//  Aggregates everything the PRO+ pipeline exposes for the current user:
//
//    - latest overall + ATS scores (from most recent analysis snapshot)
//    - latest benchmark percentile bands
//    - latest interview-readiness score
//    - analysis timeline (history) with Restore / Compare / Delete
//    - recent CV documents / variants
//    - quick links to the wizard
// =============================================================================

export default function CareerDashboardPage() {
  const { profile } = useCvProfile();
  const { items: docs } = useCvDocuments('cv');
  const confirm = useConfirm();
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  // Phase 42.8G — Import history (separate from snapshot timeline).
  const [imports, setImports] = useState<any[]>([]);

  const loadSnapshots = async () => {
    setBusy(true);
    try {
      const { data } = await api.get('/career/analyze/snapshots');
      setSnapshots(Array.isArray(data) ? data : []);
    } catch { /* ignore */ }
    finally { setBusy(false); }
  };
  const loadImports = async () => {
    try { const { data } = await api.get('/career/import/history'); setImports(Array.isArray(data) ? data : []); }
    catch { /* */ }
  };
  useEffect(() => { loadSnapshots(); loadImports(); }, []);

  const latestAnalysis  = snapshots.find((s) => s.kind === 'analysis');
  const latestBenchmark = snapshots.find((s) => s.kind === 'benchmark');
  const latestInterview = snapshots.find((s) => s.kind === 'interview');
  const latestMatch     = snapshots.find((s) => s.kind === 'job-match');

  // Phase 42.6 — inline toast (replaces window.alert).
  const [toast, setToast] = useState<{ tone: 'error' | 'success'; msg: string } | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const deleteSnapshot = async (id: string) => {
    if (!(await confirm({ title: 'Delete snapshot?', message: 'This entry will be removed from your analysis history.', confirmLabel: 'Delete', tone: 'danger' }))) return;
    try {
      await api.delete(`/career/analyze/snapshots/${id}`);
      loadSnapshots();
      setToast({ tone: 'success', msg: 'Snapshot deleted.' });
    } catch (e: any) { setToast({ tone: 'error', msg: e?.response?.data?.message || e?.message || 'Delete failed' }); }
  };

  const wipeHistory = async () => {
    if (!(await confirm({ title: 'Delete all history?', message: 'Every analysis snapshot will be permanently removed. This cannot be undone.', confirmLabel: 'Delete all', tone: 'danger' }))) return;
    try {
      await api.delete('/career/analyze/snapshots');
      loadSnapshots();
      setToast({ tone: 'success', msg: 'Analysis history cleared.' });
    } catch (e: any) { setToast({ tone: 'error', msg: e?.response?.data?.message || e?.message || 'Delete failed' }); }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 max-w-sm border rounded-lg shadow-lg px-3 py-2 text-xs ${
          toast.tone === 'error' ? 'bg-red-50 border-red-200 text-red-900' : 'bg-green-50 border-green-200 text-green-900'
        }`}>
          {toast.msg}
        </div>
      )}
      <header className="bg-white border-b border-slate-200 px-6 h-14 flex items-center gap-3">
        <Link href="/career" className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" /> Career
        </Link>
        <div className="h-5 w-px bg-slate-200" />
        <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-purple-600" /> Career Intelligence Dashboard
        </h1>
        <Link href="/career/dashboard/compare"
          className="ml-auto inline-flex items-center gap-1.5 h-8 px-3 text-xs font-semibold border border-purple-300 text-purple-700 hover:bg-purple-50 rounded">
          <GitCompare className="w-3.5 h-3.5" /> Compare snapshots
        </Link>
        <Link href="/career/analyze"
          className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded">
          <Sparkles className="w-3.5 h-3.5" /> Analyze CV
        </Link>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        {/* Top score band */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <ScoreTile label="Overall CV"          value={latestAnalysis?.score} tone="auto" />
          <ScoreTile label="ATS"                 value={latestAnalysis?.atsScore} tone="auto" />
          <ScoreTile label="Interview readiness" value={latestInterview?.analysisJson?.score} tone="auto" />
          <ScoreTile label="Job alignment"       value={latestMatch?.analysisJson?.alignment} tone="auto" />
        </div>

        {/* Benchmark + Variants */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card title="Benchmark vs industry" icon={<Award className="w-4 h-4 text-purple-600" />}>
            {latestBenchmark?.analysisJson ? (
              <BenchmarkPanel report={latestBenchmark.analysisJson} />
            ) : (
              <EmptyHint text="Run Analyze CV → Benchmark to populate this card." />
            )}
          </Card>

          <Card title="Recent CV documents" icon={<FileText className="w-4 h-4 text-purple-600" />}>
            {docs.length === 0 ? (
              <EmptyHint text="No CV documents yet. Create one from /career or run a variant batch." />
            ) : (
              <ul className="space-y-1">
                {docs.slice(0, 6).map((d: any) => (
                  <li key={d.id} className="flex items-center gap-2 text-xs border border-slate-200 rounded px-2 py-1.5">
                    <Briefcase className="w-3 h-3 text-slate-400" />
                    <span className="flex-1 truncate">{d.title}</span>
                    {d.variant && <span className="text-[10px] bg-purple-100 text-purple-800 px-1 py-0.5 rounded">{d.variant}</span>}
                    <Link href={`/career/builder/${d.id}`} className="text-[11px] text-blue-600 hover:underline">Open →</Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* Analysis history */}
        <Card
          title="Analysis history"
          icon={<Clock className="w-4 h-4 text-purple-600" />}
          action={
            <div className="flex items-center gap-2">
              <button onClick={loadSnapshots} disabled={busy}
                className="text-[11px] text-blue-600 hover:underline disabled:opacity-50 inline-flex items-center gap-1">
                {busy && <Loader2 className="w-3 h-3 animate-spin" />} Refresh
              </button>
              {snapshots.length > 0 && (
                <button onClick={wipeHistory}
                  className="text-[11px] text-red-600 hover:underline inline-flex items-center gap-1">
                  <Trash2 className="w-3 h-3" /> Delete all
                </button>
              )}
            </div>
          }
        >
          {snapshots.length === 0 ? (
            <EmptyHint text="No snapshots yet. Snapshots are created automatically when you analyze or benchmark from the wizard." />
          ) : (
            <ul className="space-y-1">
              {snapshots.map((s) => (
                <li key={s.id} className="flex items-center gap-2 text-xs border border-slate-200 rounded px-2 py-1.5">
                  <span className="font-mono text-[10px] uppercase bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{s.kind}</span>
                  <span className="flex-1 truncate">{s.label || `Snapshot ${new Date(s.createdAt).toLocaleString()}`}</span>
                  {s.score    != null && <span className="text-[10px] bg-blue-100 text-blue-800 px-1 py-0.5 rounded">CV {s.score}</span>}
                  {s.atsScore != null && <span className="text-[10px] bg-green-100 text-green-800 px-1 py-0.5 rounded">ATS {s.atsScore}</span>}
                  <span className="text-[10px] text-slate-400">{new Date(s.createdAt).toLocaleDateString()}</span>
                  <Link href={`/career/analyze?restore=${s.id}`} className="text-[11px] text-blue-600 hover:underline">Restore →</Link>
                  <button onClick={() => deleteSnapshot(s.id)}
                    className="text-[11px] text-red-600 hover:underline inline-flex items-center gap-1">
                    <Trash2 className="w-3 h-3" /> Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Phase 42.8G — Import history card */}
        <Card title="Import history" icon={<FileText className="w-4 h-4 text-purple-600" />}>
          {imports.length === 0 ? (
            <EmptyHint text="No CV imports yet. Each upload from /career creates a record here." />
          ) : (
            <ul className="space-y-1">
              {imports.slice(0, 15).map((s: any) => {
                const ev = s.analysisJson || {};
                const tone = ev.confidenceBand === 'excellent' ? 'bg-green-100 text-green-800'
                  : ev.confidenceBand === 'good'     ? 'bg-blue-100 text-blue-800'
                  : ev.confidenceBand === 'partial'  ? 'bg-amber-100 text-amber-800'
                                                     : 'bg-red-100 text-red-800';
                return (
                  <li key={s.id} className="flex items-center gap-2 text-xs border border-slate-200 rounded px-2 py-1.5">
                    <span className="font-mono text-[10px] uppercase bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{(ev.mimetype || '').split('/')[1] || 'file'}</span>
                    <span className="flex-1 truncate">{s.label}</span>
                    {s.score != null && <span className={`text-[10px] px-1 py-0.5 rounded ${tone}`}>{s.score} · {ev.confidenceBand || ''}</span>}
                    {ev.ocrUsed && <span className="text-[10px] bg-blue-100 text-blue-800 px-1 py-0.5 rounded">OCR</span>}
                    <span className="text-[10px] text-slate-400">{ev.durationMs ? `${(ev.durationMs/1000).toFixed(1)}s` : ''}</span>
                    <span className="text-[10px] text-slate-400">{new Date(s.createdAt).toLocaleDateString()}</span>
                    <button onClick={async () => {
                      try { await api.delete(`/career/import/history/${s.id}`); setImports((x) => x.filter((y) => y.id !== s.id)); }
                      catch (e: any) { setToast({ tone: 'error', msg: e?.response?.data?.message || 'Delete failed' }); }
                    }}
                      className="text-[11px] text-red-600 hover:underline inline-flex items-center gap-1">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* Quick links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <Link href="/career/analyze" className="block p-3 bg-white border border-slate-200 rounded hover:border-purple-400 hover:bg-purple-50/30">
            <div className="flex items-center gap-2 font-semibold">
              <Sparkles className="w-4 h-4 text-purple-600" /> Improve Existing CV
              <ChevronRight className="w-3 h-3 ml-auto text-slate-400" />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Upload → analyze → apply fixes → choose template → export.</p>
          </Link>
          <Link href="/career?create=cv" className="block p-3 bg-white border border-slate-200 rounded hover:border-purple-400 hover:bg-purple-50/30">
            <div className="flex items-center gap-2 font-semibold">
              <FileText className="w-4 h-4 text-purple-600" /> Create new CV
              <ChevronRight className="w-3 h-3 ml-auto text-slate-400" />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Blank document, pick a template, fill in the builder.</p>
          </Link>
          <Link href="/career" className="block p-3 bg-white border border-slate-200 rounded hover:border-purple-400 hover:bg-purple-50/30">
            <div className="flex items-center gap-2 font-semibold">
              <TrendingUp className="w-4 h-4 text-purple-600" /> All career docs
              <ChevronRight className="w-3 h-3 ml-auto text-slate-400" />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">CV / Resume / Cover Letter / Portfolio workspace.</p>
          </Link>
          <Link href="/settings/cv-import-mappings" className="block p-3 bg-white border border-slate-200 rounded hover:border-purple-400 hover:bg-purple-50/30">
            <div className="flex items-center gap-2 font-semibold">
              <FileText className="w-4 h-4 text-purple-600" /> Import mappings
              <ChevronRight className="w-3 h-3 ml-auto text-slate-400" />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Manage saved "Career Highlights → Experience" mappings.</p>
          </Link>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
//  Atoms
// =============================================================================

const ScoreTile: React.FC<{ label: string; value?: number; tone: 'auto' | 'green' | 'amber' | 'red' }> = ({ label, value }) => {
  const v = typeof value === 'number' ? value : null;
  const t = v == null ? 'gray' : v >= 80 ? 'green' : v >= 60 ? 'amber' : 'red';
  const colour = t === 'green' ? 'bg-green-50 border-green-200 text-green-700'
              : t === 'amber' ? 'bg-amber-50 border-amber-200 text-amber-700'
              : t === 'red'   ? 'bg-red-50 border-red-200 text-red-700'
                              : 'bg-slate-50 border-slate-200 text-slate-500';
  return (
    <div className={`border rounded p-3 ${colour}`}>
      <div className="text-[10px] uppercase tracking-wide opacity-80">{label}</div>
      <div className="text-2xl font-bold">
        {v == null ? '—' : <>{v}<span className="text-[10px] opacity-70">/100</span></>}
      </div>
    </div>
  );
};

const Card: React.FC<{ title: string; icon?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode }> = ({ title, icon, action, children }) => (
  <section className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-sm font-bold text-slate-900">{title}</h2>
      </div>
      <div>{action}</div>
    </div>
    {children}
  </section>
);

const EmptyHint: React.FC<{ text: string }> = ({ text }) => (
  <p className="text-[11px] text-slate-500 italic">{text}</p>
);

const BenchmarkPanel: React.FC<{ report: any }> = ({ report }) => {
  const bands = report?.bands || {};
  return (
    <div className="space-y-1.5">
      {(Object.values(bands) as any[]).map((b, i) => {
        const v = Math.max(0, Math.min(100, b.value));
        const fill = b.band === 'top10' ? 'bg-green-500'
                  : b.band === 'aboveAvg' ? 'bg-blue-500'
                  : b.band === 'average' ? 'bg-amber-500'
                                          : 'bg-red-500';
        return (
          <div key={i}>
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-slate-700">{b.metric}</span>
              <span className="text-slate-500">{v}{b.unit === 'percent' ? '%' : ''} <span className="text-[10px] opacity-70">/ industry {b.industry} · top10 {b.top10}</span></span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden mt-0.5">
              <div className={`h-full ${fill}`} style={{ width: `${v}%` }} />
            </div>
          </div>
        );
      })}
      {(report?.notes || []).map((n: string, i: number) => (
        <p key={i} className="text-[11px] text-slate-500 italic mt-1">{n}</p>
      ))}
    </div>
  );
};
