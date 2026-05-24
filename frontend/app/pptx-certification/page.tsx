'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, ShieldCheck, RefreshCw, Loader2, ChevronRight, Award,
} from 'lucide-react';
import api from '@/lib/api';

// =============================================================================
//  Phase 38.5I — PPTX Certification Dashboard
//
//  Single-pane view of the certification suite running against the real
//  fixture drop directory (backend/scripts/fixtures-pptx/).
//
//  Pulls:
//    GET /pptx-import/diagnostics/renderer  → renderer status banner
//    GET /pptx-import/fixtures/real         → known fixtures + count
//    GET /pptx-import/fixtures/real/certify → batch certification result
//
//  Renders:
//    - Renderer-availability banner (with install hint when missing)
//    - Aggregate average + band histogram
//    - Per-fixture table with import/export/round-trip/visual scores + band
//    - Drift sparkline per fixture
// =============================================================================

interface RendererStatus {
  ready: boolean;
  soffice:  { available: boolean; version?: string; error?: string };
  pdftoppm: { available: boolean; version?: string; error?: string };
  installHint: string;
}

interface FixtureRecord {
  fixture: { filename: string; kind: string; bytes: number };
  certified?: {
    scores: { import: number; export: number; roundTrip: number; visual: number };
    overall: number;
    band: 'platinum' | 'gold' | 'silver' | 'bronze' | 'basic';
  };
  positionDrift?: number;
  error?: string;
}

interface BatchResult {
  fixturesFound: number;
  averageOverall: number;
  bandsHistogram: Record<string, number>;
  reports: FixtureRecord[];
}

const BAND_STYLES: Record<string, string> = {
  platinum: 'bg-blue-100 text-blue-800 ring-blue-300',
  gold:     'bg-amber-100 text-amber-800 ring-amber-300',
  silver:   'bg-slate-100 text-slate-700 ring-slate-300',
  bronze:   'bg-orange-100 text-orange-800 ring-orange-300',
  basic:    'bg-red-100 text-red-800 ring-red-300',
  error:    'bg-red-100 text-red-800 ring-red-300',
};

export default function PptxCertificationPage() {
  const [renderer, setRenderer] = useState<RendererStatus | null>(null);
  const [batch, setBatch] = useState<BatchResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setBusy(true); setError(null);
    try {
      const [diag, certify] = await Promise.all([
        api.get<RendererStatus>('/pptx-import/diagnostics/renderer'),
        api.get<BatchResult>('/pptx-import/fixtures/real/certify'),
      ]);
      setRenderer(diag.data);
      setBatch(certify.data);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to load certification data');
    } finally { setBusy(false); }
  };

  useEffect(() => { refresh(); }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 h-14 flex items-center gap-3">
        <Link href="/dashboard" className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" /> Back
        </Link>
        <div className="h-5 w-px bg-slate-200" />
        <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-slate-500" /> PPTX Certification
        </h1>
        <button onClick={refresh} disabled={busy}
          className="ml-auto h-7 px-2 text-xs font-semibold bg-blue-600 text-white rounded hover:bg-blue-700 inline-flex items-center gap-1 disabled:opacity-40">
          {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          Refresh
        </button>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-6 space-y-5">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 text-xs rounded p-3">{error}</div>
        )}

        {/* Renderer banner */}
        {renderer && (
          <section className={`p-4 rounded-lg border ${renderer.ready ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
            <div className="text-xs font-bold flex items-center gap-2">
              {renderer.ready ? '✅ Ground-truth renderer ready' : '⚠ Renderer not installed — visual scores are internal-mode only'}
            </div>
            <div className="text-[11px] text-slate-700 mt-1 space-y-0.5">
              <div>soffice:  {renderer.soffice.available ? `OK ${renderer.soffice.version ?? ''}` : 'MISSING'}</div>
              <div>pdftoppm: {renderer.pdftoppm.available ? `OK ${renderer.pdftoppm.version ?? ''}` : 'MISSING'}</div>
              {!renderer.ready && (
                <div className="mt-1 font-mono text-[10px] bg-white border border-slate-200 rounded p-1.5">
                  {renderer.installHint}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Summary */}
        {batch && (
          <section className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <SummaryCard label="Fixtures"   value={batch.fixturesFound} />
            <SummaryCard label="Avg overall" value={batch.averageOverall} primary />
            <SummaryCard label="Platinum"   value={batch.bandsHistogram.platinum ?? 0} />
            <SummaryCard label="Gold"       value={batch.bandsHistogram.gold ?? 0} />
            <SummaryCard label="Silver"     value={batch.bandsHistogram.silver ?? 0} />
          </section>
        )}

        {/* Per-fixture table */}
        {batch && batch.fixturesFound === 0 ? (
          <section className="bg-white border border-slate-200 rounded-lg p-6 text-center">
            <Award className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <div className="text-sm font-semibold text-slate-700 mb-1">No fixtures dropped yet</div>
            <div className="text-xs text-slate-500">
              Drop <code className="bg-slate-100 px-1 py-0.5 rounded">.pptx</code> files into
              <code className="bg-slate-100 px-1 py-0.5 rounded ml-1">backend/scripts/fixtures-pptx/</code>
              then click Refresh.
            </div>
          </section>
        ) : (
          batch && (
            <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="text-left px-3 py-2">Fixture</th>
                    <th className="text-left px-3 py-2">Kind</th>
                    <th className="text-right px-3 py-2">Import</th>
                    <th className="text-right px-3 py-2">Export</th>
                    <th className="text-right px-3 py-2">Round-trip</th>
                    <th className="text-right px-3 py-2">Visual</th>
                    <th className="text-right px-3 py-2">Overall</th>
                    <th className="text-center px-3 py-2">Band</th>
                    <th className="text-right px-3 py-2">Drift</th>
                  </tr>
                </thead>
                <tbody>
                  {batch.reports.map((r, i) => {
                    if (r.error) {
                      return (
                        <tr key={i} className="border-t border-slate-100">
                          <td className="px-3 py-2 font-mono text-[11px]">{r.fixture.filename}</td>
                          <td className="px-3 py-2">{r.fixture.kind}</td>
                          <td colSpan={5} className="px-3 py-2 text-red-700">{r.error}</td>
                          <td colSpan={2} className="text-center">
                            <span className="bg-red-100 text-red-800 px-1.5 py-0.5 rounded text-[10px] font-bold">ERROR</span>
                          </td>
                        </tr>
                      );
                    }
                    const c = r.certified!;
                    return (
                      <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="px-3 py-2 font-mono text-[11px]">{r.fixture.filename}</td>
                        <td className="px-3 py-2">{r.fixture.kind}</td>
                        <td className="px-3 py-2 text-right font-mono">{c.scores.import}</td>
                        <td className="px-3 py-2 text-right font-mono">{c.scores.export}</td>
                        <td className="px-3 py-2 text-right font-mono">{c.scores.roundTrip}</td>
                        <td className="px-3 py-2 text-right font-mono">{c.scores.visual}</td>
                        <td className="px-3 py-2 text-right font-mono font-bold">{c.overall}</td>
                        <td className="px-3 py-2 text-center">
                          <span className={`px-1.5 py-0.5 rounded ring-1 text-[10px] font-bold uppercase ${BAND_STYLES[c.band] ?? BAND_STYLES.basic}`}>
                            {c.band}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-slate-500">
                          {typeof r.positionDrift === 'number' ? r.positionDrift.toFixed(2) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          )
        )}
      </div>
    </div>
  );
}

const SummaryCard: React.FC<{ label: string; value: number; primary?: boolean }> = ({ label, value, primary }) => (
  <div className={`p-3 rounded border ${primary ? 'bg-blue-50 border-blue-200 text-blue-800' : 'bg-white border-slate-200 text-slate-700'}`}>
    <div className="text-[9px] uppercase tracking-wider">{label}</div>
    <div className="text-2xl font-bold">{value}</div>
  </div>
);
