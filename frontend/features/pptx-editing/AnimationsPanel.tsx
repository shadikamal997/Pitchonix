'use client';

import React from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown, Sparkles, Repeat, AlignLeft } from 'lucide-react';
import { useElementAnimations, ElementAnimation } from './hooks';
import { MotionPathEditor } from './MotionPathEditor';

// =============================================================================
//  Phase 38H — AnimationsPanel
//
//  Per-element animation editor mounted in the Inspector. Manages the ordered
//  list on SlideElement.animations (id, effect, duration, delay, trigger).
//  Each animation is editable in-place; reorder with the arrow buttons.
// =============================================================================

// Phase 38.2D — class-keyed effect options.
const EFFECTS_BY_CLASS: Record<NonNullable<ElementAnimation['class']>, { value: ElementAnimation['effect']; label: string }[]> = {
  entr: [
    { value: 'fade',   label: 'Fade'    },
    { value: 'appear', label: 'Appear'  },
    { value: 'flyIn',  label: 'Fly In'  },
    { value: 'zoom',   label: 'Zoom'    },
    { value: 'grow',   label: 'Grow'    },
    { value: 'wipe',   label: 'Wipe'    },
  ],
  exit: [
    { value: 'fade',    label: 'Fade'     },
    { value: 'flyOut',  label: 'Fly Out'  },
    { value: 'zoomOut', label: 'Zoom Out' },
    { value: 'wipeOut', label: 'Wipe Out' },
  ],
  emph: [
    { value: 'pulse',       label: 'Pulse'        },
    { value: 'colorChange', label: 'Color Change' },
    { value: 'spin',        label: 'Spin'         },
  ],
  path: [
    { value: 'motionPath',  label: 'Motion Path'  },
  ],
};

const CLASS_LABELS: Record<NonNullable<ElementAnimation['class']>, string> = {
  entr: 'Entry',
  exit: 'Exit',
  emph: 'Emphasis',
  path: 'Motion path',
};

const TRIGGER_OPTIONS: { value: NonNullable<ElementAnimation['trigger']>; label: string }[] = [
  { value: 'click',          label: 'On click'      },
  { value: 'auto',           label: 'Auto'          },
  { value: 'with_previous',  label: 'With previous' },
  { value: 'after_previous', label: 'After previous'},
];

interface Props {
  elementId: string | null | undefined;
}

export const AnimationsPanel: React.FC<Props> = ({ elementId }) => {
  const { items, loading, add, update, remove, reorder } = useElementAnimations(elementId);

  const onAdd = () =>
    add({ effect: 'fade', class: 'entr', duration: 500, delay: 0, order: items.length, trigger: 'click' });

  const move = (i: number, dir: -1 | 1) => {
    const next = [...items];
    const t = i + dir;
    if (t < 0 || t >= next.length) return;
    [next[i], next[t]] = [next[t], next[i]];
    reorder(next.map((a) => a.id));
  };

  if (!elementId) return <div className="p-3 text-xs text-slate-500 italic">Select an element first.</div>;

  return (
    <div className="p-3 space-y-2">
      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-600">
        <Sparkles className="w-3 h-3" /> Animations
        <button
          onClick={onAdd}
          className="ml-auto h-6 px-2 text-[10px] font-semibold bg-blue-600 text-white rounded inline-flex items-center gap-0.5 hover:bg-blue-700"
        >
          <Plus className="w-3 h-3" /> Add
        </button>
      </div>

      {loading && items.length === 0 && <div className="text-[10px] text-slate-400">Loading…</div>}
      {!loading && items.length === 0 && (
        <div className="text-[11px] text-slate-500 italic py-2">
          No animations yet. Add one to animate this element on the slide.
        </div>
      )}

      <ul className="space-y-2">
        {items.map((a, i) => {
          const cls = (a.class ?? 'entr') as NonNullable<ElementAnimation['class']>;
          const effects = EFFECTS_BY_CLASS[cls];
          return (
            <li key={a.id} className="border border-slate-200 rounded p-2 space-y-1.5">
              <div className="flex items-center gap-1 text-[10px] text-slate-500">
                <span className="font-mono">#{i + 1}</span>
                <span className="ml-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">
                  {CLASS_LABELS[cls]}
                </span>
                <div className="ml-auto flex items-center gap-0.5">
                  <button onClick={() => move(i, -1)} disabled={i === 0} title="Move up"
                    className="p-1 text-slate-500 hover:bg-slate-100 rounded disabled:opacity-30"
                  ><ArrowUp className="w-3 h-3" /></button>
                  <button onClick={() => move(i, 1)} disabled={i === items.length - 1} title="Move down"
                    className="p-1 text-slate-500 hover:bg-slate-100 rounded disabled:opacity-30"
                  ><ArrowDown className="w-3 h-3" /></button>
                  <button onClick={() => remove(a.id)} title="Remove"
                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                  ><Trash2 className="w-3 h-3" /></button>
                </div>
              </div>

              {/* Class selector (Phase 38.2D) */}
              <div className="grid grid-cols-4 gap-0.5">
                {(['entr', 'exit', 'emph', 'path'] as const).map((c) => (
                  <button key={c}
                    onClick={() => update(a.id, { class: c, effect: EFFECTS_BY_CLASS[c][0].value })}
                    className={`h-6 text-[10px] font-semibold rounded ${
                      cls === c ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >{CLASS_LABELS[c]}</button>
                ))}
              </div>

              <select
                value={a.effect}
                onChange={(e) => update(a.id, { effect: e.target.value })}
                className="w-full h-7 text-xs px-1.5 border border-slate-300 rounded"
              >
                {effects.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <select
                value={a.trigger ?? 'click'}
                onChange={(e) => update(a.id, { trigger: e.target.value })}
                className="w-full h-7 text-xs px-1.5 border border-slate-300 rounded"
              >
                {TRIGGER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-1.5">
                <label className="text-[10px] text-slate-500">
                  Duration (ms)
                  <input type="number" min={0} step={50} value={a.duration}
                    onChange={(e) => update(a.id, { duration: Math.max(0, Number(e.target.value) || 0) })}
                    className="mt-0.5 w-full h-7 text-xs px-1.5 border border-slate-300 rounded font-mono"
                  />
                </label>
                <label className="text-[10px] text-slate-500">
                  Delay (ms)
                  <input type="number" min={0} step={50} value={a.delay}
                    onChange={(e) => update(a.id, { delay: Math.max(0, Number(e.target.value) || 0) })}
                    className="mt-0.5 w-full h-7 text-xs px-1.5 border border-slate-300 rounded font-mono"
                  />
                </label>
              </div>

              {/* Phase 38.2D — repeat + byParagraph */}
              <div className="flex items-center gap-2">
                <label className="flex-1 text-[10px] text-slate-500 inline-flex items-center gap-1">
                  <Repeat className="w-3 h-3" />
                  Repeat
                  <input
                    type="number" min={0} max={20} step={1}
                    value={typeof a.repeat === 'number' ? a.repeat : 0}
                    onChange={(e) => update(a.id, { repeat: Math.max(0, Number(e.target.value) || 0) })}
                    className="ml-1 w-10 h-6 text-[10px] px-1 border border-slate-300 rounded font-mono"
                  />
                </label>
                <label className="text-[10px] text-slate-500 inline-flex items-center gap-1">
                  <AlignLeft className="w-3 h-3" />
                  By paragraph
                  <input type="checkbox" checked={!!a.byParagraph}
                    onChange={(e) => update(a.id, { byParagraph: e.target.checked })}
                  />
                </label>
              </div>

              {/* Phase 38.2E — motion path editor (only when class=path) */}
              {cls === 'path' && (
                <MotionPathEditor
                  value={a.motionPath || ''}
                  onChange={(p) => update(a.id, { motionPath: p })}
                />
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};
