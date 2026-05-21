'use client';

import React, { useMemo, useState } from 'react';
import {
  Eye, EyeOff, Lock, Unlock, ChevronRight, ChevronDown,
  Search, ArrowUp, ArrowDown, Pencil, Check, X,
  Type, BarChart3, Image as ImageIcon, Square, Boxes, Table as TableIcon,
  AlignLeft, Target,
} from 'lucide-react';
import type { SlideElementDTO, ElementType } from '@/types/slide-element';
import { groupIdOf, groupMembers } from '../smart/group-utils';

// =============================================================================
//  Phase 32C — Layers panel
//
//  A right-rail tree view of every element on the current slide, with:
//    - search by name / type
//    - rename (inline)
//    - hide / show
//    - lock / unlock  (master lock — granular sub-locks live on Inspector)
//    - reorder via ↑ / ↓ buttons (bump zIndex)
//    - group-aware nested hierarchy (group node → member children)
//    - click to select; shift / cmd extends selection
//
//  No backend changes — every mutation goes through onPatch which the editor
//  routes to `api.updateMany`.
// =============================================================================

interface Props {
  elements:    SlideElementDTO[];
  selectedIds: string[];
  onSelect:    (ids: string[]) => void;
  /** Apply patches (zIndex / visible / locked / name) via api.updateMany */
  onPatch:     (updates: Array<{ id: string; patch: Partial<SlideElementDTO> }>) => void;
}

interface Row {
  /** Stable key — element id for leaves, groupId for groups. */
  key:       string;
  /** 0 = top-level, 1 = group child. */
  depth:     number;
  /** Either a single element or a group of them. */
  kind:      'element' | 'group';
  element?:  SlideElementDTO;
  groupId?:  string;
  children?: SlideElementDTO[];
}

export const LayersPanel: React.FC<Props> = ({ elements, selectedIds, onSelect, onPatch }) => {
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const sortedDesc = useMemo(
    () => [...elements].sort((a, b) => (b.zIndex ?? 0) - (a.zIndex ?? 0)),
    [elements],
  );

  // Build rows: group siblings appear once (as a group row) with their members
  // listed underneath. Loose elements show as a single row.
  const rows: Row[] = useMemo(() => {
    const out: Row[] = [];
    const seenGroups = new Set<string>();
    for (const el of sortedDesc) {
      const gid = groupIdOf(el);
      if (gid) {
        if (seenGroups.has(gid)) continue;
        seenGroups.add(gid);
        const members = groupMembers(elements, gid)
          .slice()
          .sort((a, b) => (b.zIndex ?? 0) - (a.zIndex ?? 0));
        out.push({ key: `g:${gid}`, depth: 0, kind: 'group', groupId: gid, children: members });
        if (!collapsed.has(`g:${gid}`)) {
          for (const m of members) {
            out.push({ key: m.id, depth: 1, kind: 'element', element: m });
          }
        }
      } else {
        out.push({ key: el.id, depth: 0, kind: 'element', element: el });
      }
    }
    return out;
  }, [sortedDesc, elements, collapsed]);

  // Apply the search filter — keep matched rows + their parent groups.
  const visibleRows: Row[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    const matchesEl = (el: SlideElementDTO) =>
      (el.name?.toLowerCase() ?? '').includes(q) || el.type.toLowerCase().includes(q);
    const keep: Row[] = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (r.kind === 'group') {
        const hit = (r.children ?? []).some(matchesEl);
        if (hit) keep.push(r);
      } else if (r.element && matchesEl(r.element)) {
        keep.push(r);
      }
    }
    return keep;
  }, [rows, query]);

  // ── Mutations ────────────────────────────────────────────────────────────
  const toggleVisible = (el: SlideElementDTO) => {
    onPatch([{ id: el.id, patch: { visible: !el.visible } }]);
  };
  const toggleLocked = (el: SlideElementDTO) => {
    onPatch([{ id: el.id, patch: { locked: !el.locked } }]);
  };
  const bumpZ = (el: SlideElementDTO, delta: number) => {
    const next = (el.zIndex ?? 0) + delta;
    onPatch([{ id: el.id, patch: { zIndex: next } }]);
  };
  const commitRename = (el: SlideElementDTO) => {
    const v = renameValue.trim();
    onPatch([{ id: el.id, patch: { name: v.length > 0 ? v : null } }]);
    setRenaming(null);
  };
  const handleRowClick = (el: SlideElementDTO, e: React.MouseEvent) => {
    if (e.shiftKey || e.metaKey || e.ctrlKey) {
      if (selectedIds.includes(el.id)) onSelect(selectedIds.filter((x) => x !== el.id));
      else                              onSelect([...selectedIds, el.id]);
    } else {
      onSelect([el.id]);
    }
  };
  const handleGroupClick = (gid: string, members: SlideElementDTO[], e: React.MouseEvent) => {
    const ids = members.map((m) => m.id);
    if (e.shiftKey || e.metaKey || e.ctrlKey) {
      const next = new Set(selectedIds);
      const allIn = ids.every((id) => next.has(id));
      if (allIn) ids.forEach((id) => next.delete(id));
      else       ids.forEach((id) => next.add(id));
      onSelect(Array.from(next));
    } else {
      onSelect(ids);
    }
  };
  const toggleCollapsed = (key: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="px-3 py-2 border-b border-slate-200 flex items-center justify-between">
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
          Layers <span className="text-slate-400 font-medium">· {elements.length}</span>
        </div>
        <div className="text-[10px] text-slate-400">Top → bottom = front → back</div>
      </div>

      {/* Search */}
      <div className="px-2 py-2 border-b border-slate-200">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search layers"
            className="w-full pl-7 pr-2 py-1 text-xs rounded border border-slate-200 bg-white text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-blue-400"
          />
        </div>
      </div>

      {/* Rows */}
      <div className="flex-1 overflow-y-auto">
        {visibleRows.length === 0 && (
          <div className="px-4 py-6 text-center text-xs text-slate-400">
            {query ? 'No layers match' : 'No elements on this slide'}
          </div>
        )}
        {visibleRows.map((row) => {
          if (row.kind === 'group') {
            const isCollapsed = collapsed.has(row.key);
            const members = row.children ?? [];
            const allSelected = members.length > 0 && members.every((m) => selectedIds.includes(m.id));
            const someHidden = members.some((m) => m.visible === false);
            const someLocked = members.some((m) => m.locked);
            return (
              <div
                key={row.key}
                onClick={(e) => handleGroupClick(row.groupId!, members, e)}
                className={`flex items-center gap-1 px-2 py-1.5 text-xs border-b border-slate-100 cursor-pointer ${
                  allSelected ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-slate-50'
                }`}
              >
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); toggleCollapsed(row.key); }}
                  className="p-0.5 text-slate-500 hover:text-slate-900"
                >
                  {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
                <Boxes className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />
                <span className="flex-1 truncate font-semibold text-slate-700">
                  Group · {members.length} items
                </span>
                {someHidden && <EyeOff className="w-3 h-3 text-slate-400" />}
                {someLocked && <Lock className="w-3 h-3 text-slate-400" />}
              </div>
            );
          }

          const el = row.element!;
          const isSelected = selectedIds.includes(el.id);
          const isRenaming = renaming === el.id;
          const display = el.name?.trim() ? el.name : defaultLabel(el);
          return (
            <div
              key={row.key}
              onClick={(e) => !isRenaming && handleRowClick(el, e)}
              className={`group flex items-center gap-1 px-2 py-1.5 text-xs border-b border-slate-100 cursor-pointer ${
                isSelected ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-slate-50'
              }`}
              style={{ paddingLeft: 8 + row.depth * 16 }}
            >
              {iconFor(el.type)}
              {isRenaming ? (
                <input
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitRename(el);
                    if (e.key === 'Escape') setRenaming(null);
                  }}
                  onBlur={() => commitRename(el)}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 px-1.5 py-0.5 text-xs rounded border border-blue-400 outline-none"
                />
              ) : (
                <span
                  className="flex-1 truncate text-slate-700"
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setRenameValue(el.name ?? '');
                    setRenaming(el.id);
                  }}
                  title="Double-click to rename"
                >
                  {display}
                </span>
              )}

              {/* Row actions — visible on hover or always when modified */}
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <IconBtn title="Move up" onClick={(e) => { e.stopPropagation(); bumpZ(el, 1); }}>
                  <ArrowUp className="w-3 h-3" />
                </IconBtn>
                <IconBtn title="Move down" onClick={(e) => { e.stopPropagation(); bumpZ(el, -1); }}>
                  <ArrowDown className="w-3 h-3" />
                </IconBtn>
                <IconBtn
                  title="Rename"
                  onClick={(e) => {
                    e.stopPropagation();
                    setRenameValue(el.name ?? '');
                    setRenaming(el.id);
                  }}
                >
                  <Pencil className="w-3 h-3" />
                </IconBtn>
              </div>

              {/* Visibility */}
              <IconBtn
                title={el.visible === false ? 'Show' : 'Hide'}
                onClick={(e) => { e.stopPropagation(); toggleVisible(el); }}
                active={el.visible === false}
              >
                {el.visible === false
                  ? <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                  : <Eye className="w-3.5 h-3.5 text-slate-500" />}
              </IconBtn>

              {/* Lock */}
              <IconBtn
                title={el.locked ? 'Unlock' : 'Lock'}
                onClick={(e) => { e.stopPropagation(); toggleLocked(el); }}
                active={el.locked}
              >
                {el.locked
                  ? <Lock className="w-3.5 h-3.5 text-amber-600" />
                  : <Unlock className="w-3.5 h-3.5 text-slate-500" />}
              </IconBtn>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// =============================================================================
//  Sub-components
// =============================================================================

function IconBtn({ title, onClick, active, children }: {
  title: string;
  onClick: (e: React.MouseEvent) => void;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`p-1 rounded hover:bg-slate-200 ${active ? 'bg-slate-100' : ''}`}
    >
      {children}
    </button>
  );
}

function iconFor(type: ElementType): React.ReactNode {
  if (type === 'chart')                                     return <BarChart3   className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />;
  if (type === 'image' || type === 'logo')                  return <ImageIcon   className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />;
  if (type === 'table')                                     return <TableIcon   className="w-3.5 h-3.5 text-orange-600 flex-shrink-0" />;
  if (type === 'shape' || type === 'line' || type === 'divider') return <Square className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />;
  if (type === 'metric' || type === 'kpi')                  return <Target      className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />;
  if (['heading','subheading','paragraph','quote','caption','label','cta','footer','bulletList','numberedList'].includes(type))
                                                            return <AlignLeft   className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />;
  return <Type className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />;
}

function defaultLabel(el: SlideElementDTO): string {
  const titleish = el.content?.text || el.content?.title || el.content?.label;
  if (typeof titleish === 'string' && titleish.trim().length > 0) {
    const t = titleish.trim();
    return t.length > 32 ? `${t.slice(0, 30)}…` : t;
  }
  return prettyType(el.type);
}

function prettyType(type: ElementType): string {
  // camelCase → "Camel Case"
  return type.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
}

// Unused — kept as a hint for future extension. The check icon is wired
// via the inline rename keyboard handler today.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _unusedIcons = { Check, X };
