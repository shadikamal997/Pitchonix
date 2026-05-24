'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2, Move, RefreshCw, Layers } from 'lucide-react';
import api from '@/lib/api';

// =============================================================================
//  Phase 38.3C — SmartArtEditor
//
//  Edit a slide's SmartArt element via the backend node CRUD API. Shows the
//  node tree on the left and the deterministic shape preview on the right.
//
//    - Add root node
//    - Add child / sibling
//    - Rename
//    - Delete
//    - Reorder (drag up / drag down)
//    - Change layout kind (process / cycle / hierarchy / pyramid / matrix / …)
// =============================================================================

interface SmartArtNode {
  id:       string;
  text:     string;
  level:    number;
  children?: SmartArtNode[];
}

interface SmartArtShape {
  kind:    string;
  x: number; y: number; w: number; h: number;
  text?:   string;
  fill?:   string;
}

interface SmartArtContent {
  kind:    string;
  nodes:   SmartArtNode[];
  shapes:  SmartArtShape[];
  preserved?: any;
}

const KIND_OPTIONS: { value: string; label: string }[] = [
  { value: 'process',     label: 'Process'     },
  { value: 'cycle',       label: 'Cycle'       },
  { value: 'hierarchy',   label: 'Hierarchy'   },
  { value: 'orgchart',    label: 'Org chart'   },
  { value: 'pyramid',     label: 'Pyramid'     },
  { value: 'matrix',      label: 'Matrix'      },
  { value: 'list',        label: 'List'        },
  { value: 'relationship',label: 'Relationship'},
];

interface Props { elementId: string }

export const SmartArtEditor: React.FC<Props> = ({ elementId }) => {
  const [content, setContent] = useState<SmartArtContent | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setError(null);
    try {
      const { data } = await api.get<SmartArtContent>(`/smartart/${elementId}`);
      setContent(data);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to load SmartArt');
    }
  }, [elementId]);

  useEffect(() => { reload(); }, [reload]);

  const op = useCallback(async (fn: () => Promise<any>) => {
    setBusy(true);
    try { const { data } = await fn(); setContent(data); }
    catch (e: any) { setError(e?.response?.data?.message || e?.message || 'Operation failed'); }
    finally { setBusy(false); }
  }, []);

  const addRoot   = () => op(() => api.post(`/smartart/${elementId}/nodes`, { parentId: null, text: 'New node' }));
  const addChild  = (parentId: string) => op(() => api.post(`/smartart/${elementId}/nodes`, { parentId, text: 'New node' }));
  const rename    = (nodeId: string, text: string) => op(() => api.patch(`/smartart/${elementId}/nodes/${nodeId}`, { text }));
  const remove    = (nodeId: string) => op(() => api.delete(`/smartart/${elementId}/nodes/${nodeId}`));
  const move      = (nodeId: string, dir: -1 | 1) => {
    if (!content) return;
    const i = content.nodes.findIndex((n) => n.id === nodeId);
    if (i < 0) return;
    return op(() => api.post(`/smartart/${elementId}/nodes/${nodeId}/move`, { index: Math.max(0, i + dir) }));
  };
  const changeKind = (kind: string) => op(() => api.post(`/smartart/${elementId}/layout`, { kind }));

  if (!content) return <div className="p-3 text-xs text-slate-500 italic">{error || 'Loading SmartArt…'}</div>;

  return (
    <div className="p-3 space-y-3">
      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-600">
        <Layers className="w-3 h-3" /> SmartArt
        <select
          value={content.kind}
          onChange={(e) => changeKind(e.target.value)}
          disabled={busy}
          className="ml-auto h-6 px-1.5 text-[10px] border border-slate-300 rounded"
        >
          {KIND_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <button onClick={reload} disabled={busy} title="Refresh"
          className="p-1 text-slate-500 hover:bg-slate-100 rounded">
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>

      {error && <div className="text-[10px] text-red-600">{error}</div>}

      <div className="grid grid-cols-2 gap-3">
        {/* Node list */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
            <span>Nodes ({content.nodes.length})</span>
            <button onClick={addRoot} disabled={busy}
              className="h-5 px-1.5 text-[9px] font-semibold bg-blue-600 text-white rounded hover:bg-blue-700 inline-flex items-center gap-0.5">
              <Plus className="w-2.5 h-2.5" /> Root
            </button>
          </div>
          <ul className="space-y-1">
            {content.nodes.map((n, i) => (
              <li key={n.id} className="border border-slate-200 rounded p-1.5 space-y-1">
                <div className="flex items-center gap-1">
                  <input
                    value={n.text}
                    onChange={(e) => rename(n.id, e.target.value)}
                    disabled={busy}
                    className="flex-1 h-6 px-1 text-[11px] border-0 bg-transparent border-b border-transparent focus:border-slate-300 outline-none"
                  />
                  <button onClick={() => move(n.id, -1)} disabled={busy || i === 0} title="Move up"
                    className="p-0.5 text-slate-500 hover:bg-slate-100 rounded disabled:opacity-30">
                    <Move className="w-2.5 h-2.5 rotate-180" />
                  </button>
                  <button onClick={() => move(n.id, 1)} disabled={busy || i === content.nodes.length - 1} title="Move down"
                    className="p-0.5 text-slate-500 hover:bg-slate-100 rounded disabled:opacity-30">
                    <Move className="w-2.5 h-2.5" />
                  </button>
                  <button onClick={() => addChild(n.id)} disabled={busy} title="Add child"
                    className="p-0.5 text-blue-600 hover:bg-blue-50 rounded">
                    <Plus className="w-2.5 h-2.5" />
                  </button>
                  <button onClick={() => remove(n.id)} disabled={busy} title="Remove"
                    className="p-0.5 text-red-600 hover:bg-red-50 rounded">
                    <Trash2 className="w-2.5 h-2.5" />
                  </button>
                </div>
                {n.children && n.children.length > 0 && (
                  <ul className="ml-3 space-y-1">
                    {n.children.map((c) => (
                      <li key={c.id} className="flex items-center gap-1">
                        <input
                          value={c.text}
                          onChange={(e) => rename(c.id, e.target.value)}
                          disabled={busy}
                          className="flex-1 h-5 px-1 text-[10px] border-0 bg-transparent border-b border-transparent focus:border-slate-300 outline-none"
                        />
                        <button onClick={() => remove(c.id)} disabled={busy}
                          className="p-0.5 text-red-600 hover:bg-red-50 rounded">
                          <Trash2 className="w-2.5 h-2.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* Live shape preview */}
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Preview</div>
          <svg viewBox="0 0 100 56.25" className="w-full aspect-video bg-slate-50 border border-slate-200 rounded">
            {content.shapes.map((s, i) => (
              <g key={i}>
                <rect
                  x={s.x} y={s.y * 0.5625} width={s.w} height={s.h * 0.5625}
                  rx="1" fill={s.fill || '#94A3B8'} opacity="0.85"
                />
                <text
                  x={s.x + s.w / 2} y={s.y * 0.5625 + (s.h * 0.5625) / 2 + 1}
                  fontSize="2" fill="white" textAnchor="middle"
                >{(s.text || '').slice(0, 14)}</text>
              </g>
            ))}
          </svg>
          <div className="text-[9px] text-slate-400 italic mt-1">
            Deterministic layout — change kind to re-flow.
            {content.preserved && (
              <span className="block text-amber-600">Preserved OOXML attached (round-trip safe).</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
