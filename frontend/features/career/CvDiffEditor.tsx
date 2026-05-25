'use client';

import React, { useMemo, useState } from 'react';
import { CheckCircle2, X, Eye, Columns, AlignLeft, FilePlus, FileMinus, FileEdit } from 'lucide-react';

// =============================================================================
//  Phase 42.4A — Full Before / After Diff Editor.
//
//  Compares the original (pre-fix) and improved (post-fix) CvProfile JSONs
//  field-by-field. Each row renders as added / removed / modified / unchanged
//  with explicit Accept / Reject buttons.
//
//  Modes:
//    side-by-side  — two columns, original | improved
//    unified       — single column with + / - markers
//
//  Honors the spec rule: "No silent modifications. Every change must be visible."
// =============================================================================

interface CvProfileLike {
  personal?:       Record<string, any>;
  experience?:     Array<any>;
  education?:      Array<any>;
  skills?:         Array<any>;
  languages?:      Array<any>;
  projects?:       Array<any>;
  certifications?: Array<any>;
}

type DiffStatus = 'added' | 'removed' | 'modified' | 'unchanged';

interface DiffRow {
  id:       string;
  section:  string;
  field:    string;
  status:   DiffStatus;
  original: any;
  improved: any;
}

interface Props {
  original: CvProfileLike;
  improved: CvProfileLike;
  // When the user clicks Accept on a row, this callback is invoked with
  // the new profile that has the change applied. When they Reject, the
  // original value is used.
  onChange?: (next: CvProfileLike) => void;
}

export const CvDiffEditor: React.FC<Props> = ({ original, improved, onChange }) => {
  const [mode, setMode] = useState<'side' | 'unified'>('side');
  // The "working" profile starts as the improved version (user's preview).
  // Accept = keep improved value (no-op); Reject = revert to original value.
  const [working, setWorking] = useState<CvProfileLike>(improved);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const rows = useMemo(() => buildDiff(original, working), [original, working]);

  const bySection = useMemo(() => groupBy(rows, (r) => r.section), [rows]);

  const acceptRow = (row: DiffRow) => {
    // "Accept" — keep improved (already in working). No-op besides toast.
  };

  const rejectRow = (row: DiffRow) => {
    const next = setNestedValue(working, row.section, row.field, row.original);
    setWorking(next);
    onChange?.(next);
  };

  const acceptSection = (section: string) => {
    // No-op — improved values are already in working.
  };

  const rejectSection = (section: string) => {
    let next = working;
    for (const r of bySection[section] || []) {
      next = setNestedValue(next, r.section, r.field, r.original);
    }
    setWorking(next);
    onChange?.(next);
  };

  const acceptAll = () => onChange?.(improved);
  const rejectAll = () => { setWorking(original); onChange?.(original); };

  const summary = useMemo(() => {
    const s = { added: 0, removed: 0, modified: 0, unchanged: 0 };
    for (const r of rows) s[r.status]++;
    return s;
  }, [rows]);

  return (
    <div className="bg-white border border-slate-200 rounded-lg">
      {/* Toolbar */}
      <div className="px-4 py-2 border-b border-slate-100 flex items-center gap-3 bg-slate-50/60">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-700">Before / After</div>
        <div className="flex items-center gap-3 text-[11px] text-slate-600">
          <span className="inline-flex items-center gap-1"><FilePlus  className="w-3 h-3 text-green-600" /> {summary.added} added</span>
          <span className="inline-flex items-center gap-1"><FileMinus className="w-3 h-3 text-red-600"   /> {summary.removed} removed</span>
          <span className="inline-flex items-center gap-1"><FileEdit  className="w-3 h-3 text-amber-600" /> {summary.modified} modified</span>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <button onClick={() => setMode('side')}
            className={`h-7 px-2 text-[11px] rounded inline-flex items-center gap-1 ${mode === 'side' ? 'bg-blue-600 text-white' : 'border border-slate-300 text-slate-600 hover:bg-slate-100'}`}>
            <Columns className="w-3 h-3" /> Side-by-side
          </button>
          <button onClick={() => setMode('unified')}
            className={`h-7 px-2 text-[11px] rounded inline-flex items-center gap-1 ${mode === 'unified' ? 'bg-blue-600 text-white' : 'border border-slate-300 text-slate-600 hover:bg-slate-100'}`}>
            <AlignLeft className="w-3 h-3" /> Unified
          </button>
          <span className="h-5 w-px bg-slate-200 mx-1" />
          <button onClick={acceptAll}
            className="h-7 px-2 text-[11px] font-semibold bg-green-600 hover:bg-green-700 text-white rounded inline-flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Accept all
          </button>
          <button onClick={rejectAll}
            className="h-7 px-2 text-[11px] font-semibold border border-red-300 text-red-700 hover:bg-red-50 rounded inline-flex items-center gap-1">
            <X className="w-3 h-3" /> Reject all
          </button>
        </div>
      </div>

      {/* Diff body */}
      <div className="max-h-[600px] overflow-y-auto p-3 space-y-3">
        {Object.entries(bySection).map(([section, rows]) => (
          <SectionBlock
            key={section}
            section={section}
            rows={rows}
            collapsed={collapsed.has(section)}
            onToggle={() => setCollapsed((s) => {
              const n = new Set(s); n.has(section) ? n.delete(section) : n.add(section); return n;
            })}
            mode={mode}
            onAccept={acceptRow} onReject={rejectRow}
            onAcceptSection={() => acceptSection(section)}
            onRejectSection={() => rejectSection(section)}
          />
        ))}
        {rows.length === 0 && (
          <div className="text-center py-12 text-xs text-slate-500 italic">No differences.</div>
        )}
      </div>
    </div>
  );
};

// =============================================================================
//  Section block + row renderers
// =============================================================================

const SectionBlock: React.FC<{
  section: string;
  rows: DiffRow[];
  collapsed: boolean; onToggle: () => void;
  mode: 'side' | 'unified';
  onAccept: (r: DiffRow) => void;
  onReject: (r: DiffRow) => void;
  onAcceptSection: () => void;
  onRejectSection: () => void;
}> = ({ section, rows, collapsed, onToggle, mode, onAccept, onReject, onAcceptSection, onRejectSection }) => {
  const changed = rows.filter((r) => r.status !== 'unchanged');
  const hasChanges = changed.length > 0;

  return (
    <section className="border border-slate-200 rounded">
      <header className="flex items-center justify-between px-3 py-1.5 bg-slate-50 border-b border-slate-200">
        <button onClick={onToggle} className="text-xs font-bold text-slate-800 inline-flex items-center gap-2">
          <span className="w-3 inline-block text-center">{collapsed ? '▸' : '▾'}</span>
          {section}
          <span className="text-[10px] text-slate-500 font-normal">({changed.length} changed)</span>
        </button>
        {hasChanges && (
          <div className="flex items-center gap-1">
            <button onClick={onAcceptSection} className="h-6 px-1.5 text-[10px] font-semibold text-green-700 hover:bg-green-50 rounded">Accept section</button>
            <button onClick={onRejectSection} className="h-6 px-1.5 text-[10px] font-semibold text-red-700 hover:bg-red-50 rounded">Reject section</button>
          </div>
        )}
      </header>
      {!collapsed && (
        <div>
          {changed.length === 0 ? (
            <div className="px-3 py-2 text-[11px] text-slate-400 italic">no changes</div>
          ) : changed.map((r) =>
            mode === 'side'
              ? <SideRow key={r.id} row={r} onAccept={onAccept} onReject={onReject} />
              : <UnifiedRow key={r.id} row={r} onAccept={onAccept} onReject={onReject} />
          )}
        </div>
      )}
    </section>
  );
};

const SideRow: React.FC<{ row: DiffRow; onAccept: (r: DiffRow) => void; onReject: (r: DiffRow) => void }> = ({ row, onAccept, onReject }) => (
  <div className="grid grid-cols-[120px_1fr_1fr_80px] gap-2 px-3 py-2 border-b border-slate-100 text-[11px]">
    <div className="text-slate-500 font-mono">{row.field}</div>
    <div className={`p-1.5 rounded ${row.status === 'added' ? 'bg-slate-100 text-slate-400 italic' : 'bg-red-50 text-red-900'}`}>
      {renderValue(row.original) || <span className="italic opacity-50">—</span>}
    </div>
    <div className={`p-1.5 rounded ${row.status === 'removed' ? 'bg-slate-100 text-slate-400 italic' : 'bg-green-50 text-green-900'}`}>
      {renderValue(row.improved) || <span className="italic opacity-50">—</span>}
    </div>
    <div className="flex items-center justify-end gap-0.5">
      <button title="Accept" onClick={() => onAccept(row)} className="h-6 w-6 inline-flex items-center justify-center text-green-700 hover:bg-green-50 rounded">
        <CheckCircle2 className="w-3.5 h-3.5" />
      </button>
      <button title="Reject" onClick={() => onReject(row)} className="h-6 w-6 inline-flex items-center justify-center text-red-700 hover:bg-red-50 rounded">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  </div>
);

const UnifiedRow: React.FC<{ row: DiffRow; onAccept: (r: DiffRow) => void; onReject: (r: DiffRow) => void }> = ({ row, onAccept, onReject }) => (
  <div className="px-3 py-1.5 border-b border-slate-100 text-[11px] font-mono">
    <div className="text-slate-500 mb-1">{row.section}.{row.field}</div>
    {row.status !== 'added' && (
      <div className="pl-3 border-l-2 border-red-400 text-red-800 bg-red-50/60 py-1 pr-2">- {renderValue(row.original) || '∅'}</div>
    )}
    {row.status !== 'removed' && (
      <div className="pl-3 border-l-2 border-green-400 text-green-800 bg-green-50/60 py-1 pr-2">+ {renderValue(row.improved) || '∅'}</div>
    )}
    <div className="flex items-center justify-end gap-0.5 mt-1">
      <button onClick={() => onAccept(row)} className="h-5 px-1 text-[10px] text-green-700 hover:bg-green-50 rounded inline-flex items-center gap-1">
        <CheckCircle2 className="w-3 h-3" /> Accept
      </button>
      <button onClick={() => onReject(row)} className="h-5 px-1 text-[10px] text-red-700 hover:bg-red-50 rounded inline-flex items-center gap-1">
        <X className="w-3 h-3" /> Reject
      </button>
    </div>
  </div>
);

// =============================================================================
//  Diff computation
// =============================================================================

const FLAT_PERSONAL_KEYS = ['fullName','headline','email','phone','location','website','linkedin','github','summary'];

function buildDiff(a: CvProfileLike, b: CvProfileLike): DiffRow[] {
  const out: DiffRow[] = [];

  // Personal — scalar fields.
  for (const k of FLAT_PERSONAL_KEYS) {
    const av = (a.personal || {})[k];
    const bv = (b.personal || {})[k];
    if (av === bv) continue;
    out.push({
      id: `personal.${k}`, section: 'personal', field: k,
      status: !av && bv ? 'added' : av && !bv ? 'removed' : 'modified',
      original: av, improved: bv,
    });
  }

  // Array-like sections: experience.bullets, skills, education entries, etc.
  pushArrayDiff(out, 'experience', a.experience || [], b.experience || [], (e) => `${e?.role || ''} @ ${e?.company || ''}`, (e) => (e?.bullets || []).join('\n'));
  pushArrayDiff(out, 'education',  a.education  || [], b.education  || [], (e) => `${e?.degree || ''} @ ${e?.institution || ''}`, (e) => `${e?.start || ''}–${e?.end || ''}`);
  pushArrayDiff(out, 'skills',     a.skills     || [], b.skills     || [], (s) => s?.name || '', (s) => s?.category || '');
  pushArrayDiff(out, 'languages',  a.languages  || [], b.languages  || [], (l) => l?.name || '', (l) => l?.proficiency || '');
  pushArrayDiff(out, 'projects',   a.projects   || [], b.projects   || [], (p) => p?.name || '', (p) => p?.description || '');
  pushArrayDiff(out, 'certifications', a.certifications || [], b.certifications || [], (c) => c?.name || '', (c) => c?.issuer || '');

  return out;
}

function pushArrayDiff(out: DiffRow[], section: string, a: any[], b: any[],
  labelFn: (x: any) => string, valueFn: (x: any) => string) {
  const aMap = new Map(a.map((x) => [x?.id ?? labelFn(x), x]));
  const bMap = new Map(b.map((x) => [x?.id ?? labelFn(x), x]));
  const keys = new Set<string>([...aMap.keys(), ...bMap.keys()] as string[]);
  for (const k of keys) {
    const av = aMap.get(k);
    const bv = bMap.get(k);
    if (!av && bv) {
      out.push({ id: `${section}:${k}`, section, field: labelFn(bv), status: 'added',    original: '', improved: valueFn(bv) });
    } else if (av && !bv) {
      out.push({ id: `${section}:${k}`, section, field: labelFn(av), status: 'removed', original: valueFn(av), improved: '' });
    } else if (av && bv) {
      const av2 = valueFn(av); const bv2 = valueFn(bv);
      if (av2 !== bv2) {
        out.push({ id: `${section}:${k}`, section, field: labelFn(bv), status: 'modified', original: av2, improved: bv2 });
      }
    }
  }
}

function setNestedValue(p: CvProfileLike, section: string, field: string, value: any): CvProfileLike {
  const next: any = JSON.parse(JSON.stringify(p));
  if (section === 'personal') {
    next.personal = { ...(next.personal || {}), [field]: value };
    return next;
  }
  // Array sections — find by id-or-label; replace the entire string value.
  // For simplicity in this Phase, we re-serialize the original value back.
  // (A future version can patch sub-fields like bullets[i].)
  const arr = (next as any)[section] as any[] | undefined;
  if (!arr) return next;
  const idx = arr.findIndex((x) => (x?.role && x?.company && `${x.role} @ ${x.company}` === field) ||
                                   (x?.degree && x?.institution && `${x.degree} @ ${x.institution}` === field) ||
                                   (x?.name === field));
  if (idx >= 0) {
    if (section === 'experience') {
      arr[idx] = { ...arr[idx], bullets: String(value || '').split('\n').filter(Boolean) };
    } else if (section === 'education') {
      const [s, e] = String(value || '').split('–');
      arr[idx] = { ...arr[idx], start: s?.trim(), end: e?.trim() };
    } else {
      arr[idx] = { ...arr[idx], [section === 'skills' ? 'category' : 'description']: value };
    }
  }
  return next;
}

function renderValue(v: any): string {
  if (v == null) return '';
  if (typeof v === 'string') return v.length > 200 ? v.slice(0, 200) + '…' : v;
  if (Array.isArray(v)) return v.join(', ');
  return JSON.stringify(v);
}

function groupBy<T>(arr: T[], k: (x: T) => string): Record<string, T[]> {
  const out: Record<string, T[]> = {};
  for (const x of arr) {
    const key = k(x);
    (out[key] ||= []).push(x);
  }
  return out;
}
