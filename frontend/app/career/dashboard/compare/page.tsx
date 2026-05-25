'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, GitCompare, Loader2, RotateCcw } from 'lucide-react';
import api from '@/lib/api';
import { CvDiffEditor } from '@/features/career/CvDiffEditor';

// =============================================================================
//  Phase 42.5B — Snapshot vs Snapshot comparison.
//
//  Pick two snapshots from the user's history → diff their profileJson
//  payloads via the existing CvDiffEditor + show side-by-side score deltas.
//  Either snapshot can be restored (its profileJson replaces the current
//  saved profile via the existing analyze/save endpoint).
// =============================================================================

interface SnapshotListItem {
  id:        string;
  kind:      string;
  score?:    number | null;
  atsScore?: number | null;
  label?:    string | null;
  createdAt: string;
}

interface SnapshotFull extends SnapshotListItem {
  profileJson?:  any;
  analysisJson?: any;
}

export default function SnapshotComparePage() {
  const [snapshots, setSnapshots] = useState<SnapshotListItem[]>([]);
  const [aId, setAId] = useState<string>('');
  const [bId, setBId] = useState<string>('');
  const [a, setA] = useState<SnapshotFull | null>(null);
  const [b, setB] = useState<SnapshotFull | null>(null);
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState<string | null>(null);

  // List on mount.
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/career/analyze/snapshots');
        setSnapshots(Array.isArray(data) ? data : []);
        // Auto-pick most recent two.
        if (Array.isArray(data) && data.length >= 2) {
          setAId(data[1].id); setBId(data[0].id);
        }
      } catch (e: any) { setErr(e?.response?.data?.message || e?.message); }
    })();
  }, []);

  // Fetch full payloads whenever a / b ids change.
  useEffect(() => {
    if (!aId) { setA(null); return; }
    (async () => {
      try { const { data } = await api.get(`/career/analyze/snapshots/${aId}`); setA(data); }
      catch (e: any) { setErr(e?.response?.data?.message || e?.message); }
    })();
  }, [aId]);
  useEffect(() => {
    if (!bId) { setB(null); return; }
    (async () => {
      try { const { data } = await api.get(`/career/analyze/snapshots/${bId}`); setB(data); }
      catch (e: any) { setErr(e?.response?.data?.message || e?.message); }
    })();
  }, [bId]);

  const [info, setInfo] = useState<string | null>(null);

  const restore = async (snap: SnapshotFull) => {
    if (!snap?.profileJson) {
      setInfo('Snapshot has no profile payload to restore.');
      return;
    }
    if (!window.confirm(`Restore profile from snapshot "${snap.label || snap.id}"? This will overwrite the saved profile.`)) return;
    setBusy(true); setErr(null); setInfo(null);
    try {
      await api.post('/career/analyze/save', { profile: snap.profileJson, doctype: 'cv', title: 'Restored CV' });
      setInfo('Restored. Open the builder to see the result.');
    } catch (e: any) { setErr(e?.response?.data?.message || e?.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 h-14 flex items-center gap-3">
        <Link href="/career/dashboard" className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" /> Career dashboard
        </Link>
        <div className="h-5 w-px bg-slate-200" />
        <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <GitCompare className="w-4 h-4 text-purple-600" /> Snapshot comparison
        </h1>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-6 space-y-5">
        {err  && <div className="bg-red-50  border border-red-200  text-red-800  text-xs rounded p-3">{err}</div>}
        {info && <div className="bg-green-50 border border-green-200 text-green-900 text-xs rounded p-3 flex items-center gap-2">{info}
          <Link href="/career" className="underline ml-1">go to career →</Link>
        </div>}

        {/* Pickers + side-by-side score row */}
        <section className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Picker label="Snapshot A (original)" value={aId} onChange={setAId} snapshots={snapshots} colour="red" />
            <Picker label="Snapshot B (improved)" value={bId} onChange={setBId} snapshots={snapshots} colour="green" />
          </div>

          {a && b && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
              <ScoreBox snap={a} other={b} colour="red"   onRestore={() => restore(a)} busy={busy} />
              <ScoreBox snap={b} other={a} colour="green" onRestore={() => restore(b)} busy={busy} />
            </div>
          )}
        </section>

        {/* Diff editor */}
        {a?.profileJson && b?.profileJson && (
          <CvDiffEditor original={a.profileJson} improved={b.profileJson} />
        )}
        {(!a?.profileJson || !b?.profileJson) && (a || b) && (
          <p className="text-xs text-slate-500 italic">
            One or both snapshots have no profileJson payload (older analyses, or non-profile snapshot kinds). The diff editor only shows when both have a captured profile.
          </p>
        )}
      </div>
    </div>
  );
}

const Picker: React.FC<{
  label: string; value: string; onChange: (v: string) => void;
  snapshots: SnapshotListItem[]; colour: 'red' | 'green';
}> = ({ label, value, onChange, snapshots, colour }) => {
  const c = colour === 'red'   ? 'border-red-200 bg-red-50/40'   : 'border-green-200 bg-green-50/40';
  return (
    <div className={`border rounded p-2.5 ${c}`}>
      <div className="text-[10px] uppercase tracking-wider font-bold text-slate-600 mb-1">{label}</div>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full h-8 px-2 text-xs border border-slate-300 rounded bg-white">
        <option value="">— pick a snapshot —</option>
        {snapshots.map((s) => (
          <option key={s.id} value={s.id}>
            [{s.kind}] {s.label || new Date(s.createdAt).toLocaleString()}
            {s.score != null ? ` · CV ${s.score}` : ''}
            {s.atsScore != null ? ` · ATS ${s.atsScore}` : ''}
          </option>
        ))}
      </select>
    </div>
  );
};

const ScoreBox: React.FC<{
  snap: SnapshotFull; other: SnapshotFull; colour: 'red' | 'green';
  onRestore: () => void; busy: boolean;
}> = ({ snap, other, colour, onRestore, busy }) => {
  const c = colour === 'red' ? 'text-red-700' : 'text-green-700';
  const delta = (a?: number | null, b?: number | null) => {
    if (a == null || b == null) return '—';
    const d = (a as number) - (b as number);
    if (d === 0) return '±0';
    return d > 0 ? `+${d}` : `${d}`;
  };
  return (
    <div className="border border-slate-200 rounded p-2.5">
      <div className="flex items-center justify-between mb-1.5">
        <div className={`text-xs font-bold ${c}`}>{snap.label || `Snapshot ${new Date(snap.createdAt).toLocaleString()}`}</div>
        <button onClick={onRestore} disabled={busy || !snap.profileJson}
          className="h-7 px-2 text-[11px] font-semibold border border-slate-300 hover:bg-slate-50 rounded inline-flex items-center gap-1 disabled:opacity-40"
          title={!snap.profileJson ? 'No profile payload captured' : 'Restore this profile snapshot'}>
          {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />} Restore
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <ScoreCell label="CV"          v={snap.score}    d={delta(snap.score, other.score)} />
        <ScoreCell label="ATS"         v={snap.atsScore} d={delta(snap.atsScore, other.atsScore)} />
        <div className="col-span-2 text-[10px] text-slate-500 font-mono truncate">
          kind: {snap.kind} · {new Date(snap.createdAt).toLocaleString()}
        </div>
      </div>
    </div>
  );
};

const ScoreCell: React.FC<{ label: string; v: number | null | undefined; d: string }> = ({ label, v, d }) => (
  <div className="border border-slate-200 rounded px-1.5 py-1 bg-slate-50">
    <div className="text-[9px] uppercase tracking-wide text-slate-500">{label}</div>
    <div className="text-base font-bold text-slate-900">
      {v == null ? '—' : v}
      <span className={`ml-1.5 text-[10px] ${d.startsWith('+') ? 'text-green-700' : d.startsWith('-') ? 'text-red-700' : 'text-slate-500'}`}>{d}</span>
    </div>
  </div>
);
