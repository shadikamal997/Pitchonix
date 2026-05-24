'use client';

import React, { useRef, useState } from 'react';
import { Spline, Trash2, Pencil } from 'lucide-react';

// =============================================================================
//  Phase 38.2E — MotionPathEditor
//
//  Visual editor for a motion-path animation's path string. Two modes:
//
//    - line:  drag a single end point; the path is "M0,0 L<x>,<y>"
//    - curve: drag both control + end points; quadratic Bézier "M0,0 Q<cx>,<cy> <ex>,<ey>"
//    - custom: free-paint by clicking to drop polyline points
//
//  Path values are in slide-percent coords (0..100). The OOXML writer
//  re-projects to PowerPoint's relative coordinate space at export time.
// =============================================================================

interface Props {
  value: string;
  onChange: (path: string) => void;
}

type Pt = { x: number; y: number };

export const MotionPathEditor: React.FC<Props> = ({ value, onChange }) => {
  const [mode, setMode] = useState<'line' | 'curve' | 'custom'>(detectMode(value));
  const [pts, setPts]   = useState<Pt[]>(() => parsePath(value));
  const svgRef = useRef<SVGSVGElement | null>(null);

  const toLocal = (e: React.PointerEvent | React.MouseEvent): Pt => {
    const r = svgRef.current!.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100;
    const y = ((e.clientY - r.top)  / r.height) * 100;
    return { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) };
  };

  const commit = (next: Pt[]) => {
    setPts(next);
    onChange(buildPath(mode, next));
  };

  const onClickCanvas = (e: React.MouseEvent) => {
    const p = toLocal(e);
    if (mode === 'line')  commit([pts[0] || { x: 0, y: 0 }, p]);
    if (mode === 'curve') {
      if (pts.length < 2) commit([{ x: 0, y: 0 }, p]);
      else if (pts.length < 3) commit([pts[0], p, pts[1]]);
      else commit([pts[0], p, pts[2]]);
    }
    if (mode === 'custom') commit([...pts, p]);
  };

  const drag = (i: number) => (e: React.PointerEvent<SVGElement>) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    const onMove = (mv: PointerEvent) => {
      const r = svgRef.current!.getBoundingClientRect();
      const x = ((mv.clientX - r.left) / r.width)  * 100;
      const y = ((mv.clientY - r.top)  / r.height) * 100;
      const next = [...pts];
      next[i] = { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) };
      commit(next);
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const reset = () => commit([{ x: 0, y: 0 }]);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-600">
        <Spline className="w-3 h-3" /> Motion path
        <div className="ml-auto flex gap-0.5">
          {(['line', 'curve', 'custom'] as const).map((m) => (
            <button key={m} onClick={() => { setMode(m); commit(pts.length ? pts : [{ x: 0, y: 0 }]); }}
              className={`px-1.5 h-6 text-[10px] font-semibold rounded ${
                mode === m ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >{m}</button>
          ))}
          <button onClick={reset} title="Reset path" className="p-1 text-red-600 hover:bg-red-50 rounded">
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      <svg
        ref={svgRef}
        viewBox="0 0 100 56.25"
        onClick={onClickCanvas}
        className="w-full aspect-video bg-slate-50 border border-slate-200 rounded cursor-crosshair"
      >
        {/* Grid */}
        {[10, 20, 30, 40, 50, 60, 70, 80, 90].map((g) => (
          <line key={`v${g}`} x1={g} y1={0} x2={g} y2={56.25} stroke="#E2E8F0" strokeWidth="0.1" />
        ))}
        {[10, 20, 30, 40, 50].map((g) => (
          <line key={`h${g}`} x1={0} y1={g} x2={100} y2={g} stroke="#E2E8F0" strokeWidth="0.1" />
        ))}

        {/* Path preview */}
        <path d={pathToSvg(mode, pts, 0.5625)} fill="none" stroke="#2563EB" strokeWidth="0.5" />

        {/* Points (draggable) */}
        {pts.map((p, i) => (
          <circle
            key={i}
            cx={p.x} cy={p.y * 0.5625}
            r="1.2"
            className="cursor-grab active:cursor-grabbing"
            fill={i === 0 ? '#16A34A' : i === pts.length - 1 ? '#DC2626' : '#2563EB'}
            stroke="white" strokeWidth="0.3"
            onPointerDown={drag(i)}
          />
        ))}
      </svg>

      <div className="flex items-center gap-1 text-[9px] text-slate-500 font-mono">
        <Pencil className="w-2.5 h-2.5" />
        <span>{value || buildPath(mode, pts)}</span>
      </div>
    </div>
  );
};

// -----------------------------------------------------------------------------

function detectMode(path: string): 'line' | 'curve' | 'custom' {
  if (!path) return 'line';
  if (path.includes('Q') || path.includes('C')) return 'curve';
  const Ls = (path.match(/L/g) || []).length;
  return Ls > 1 ? 'custom' : 'line';
}

function parsePath(path: string): Pt[] {
  if (!path) return [{ x: 0, y: 0 }];
  const tokens = path.match(/[MLQC][\s,\d.\-+eE]*/g) || [];
  const out: Pt[] = [];
  for (const t of tokens) {
    const nums = (t.match(/-?\d+(\.\d+)?/g) || []).map(Number);
    for (let i = 0; i + 1 < nums.length; i += 2) out.push({ x: nums[i], y: nums[i + 1] });
  }
  return out.length ? out : [{ x: 0, y: 0 }];
}

function buildPath(mode: 'line' | 'curve' | 'custom', pts: Pt[]): string {
  if (pts.length === 0) return '';
  const fmt = (p: Pt) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
  if (mode === 'line') {
    return `M${fmt(pts[0])} L${fmt(pts[1] || pts[0])}`;
  }
  if (mode === 'curve' && pts.length >= 3) {
    return `M${fmt(pts[0])} Q${fmt(pts[2])} ${fmt(pts[1])}`;
  }
  if (mode === 'curve') {
    return `M${fmt(pts[0])} L${fmt(pts[1] || pts[0])}`;
  }
  return 'M' + pts.map(fmt).map((s, i) => i === 0 ? s : `L${s}`).join(' ');
}

function pathToSvg(mode: 'line' | 'curve' | 'custom', pts: Pt[], yScale: number): string {
  if (pts.length === 0) return '';
  const scaled = pts.map((p) => ({ x: p.x, y: p.y * yScale }));
  const fmt = (p: Pt) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
  if (mode === 'line') return `M${fmt(scaled[0])} L${fmt(scaled[1] || scaled[0])}`;
  if (mode === 'curve' && scaled.length >= 3) return `M${fmt(scaled[0])} Q${fmt(scaled[2])} ${fmt(scaled[1])}`;
  if (mode === 'curve') return `M${fmt(scaled[0])} L${fmt(scaled[1] || scaled[0])}`;
  return 'M' + scaled.map(fmt).map((s, i) => i === 0 ? s : `L${s}`).join(' ');
}
