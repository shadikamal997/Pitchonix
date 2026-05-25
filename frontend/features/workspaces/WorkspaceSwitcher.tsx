'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Check, ChevronDown, Plus, Settings2, Building2 } from 'lucide-react';
import { useWorkspaceContext } from './WorkspaceContext';

// =============================================================================
//  Phase 39N — WorkspaceSwitcher
//
//  Dropdown placed in the top navigation. Shows the current workspace and
//  lists every workspace the user belongs to. Includes inline actions for
//  "Create workspace" and "Workspace settings". Selection updates the
//  context (and the persisted localStorage key).
// =============================================================================

interface Props {
  /** Optional href for the "Workspace settings" link — host owns the route. */
  settingsHref?: (workspaceId: string) => string;
  /** Optional click handler for "Create workspace" (host opens a modal). */
  onCreate?:    () => void;
}

const ROLE_LABEL: Record<string, string> = {
  owner: 'Owner', admin: 'Admin', editor: 'Editor', reviewer: 'Reviewer', viewer: 'Viewer',
};

export const WorkspaceSwitcher: React.FC<Props> = ({ settingsHref, onCreate }) => {
  const { workspaces, currentMembership, setCurrentWorkspaceId } = useWorkspaceContext();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  if (workspaces.length === 0) {
    return (
      <button
        type="button"
        onClick={onCreate}
        className="h-7 px-2.5 text-xs font-semibold bg-[#EEF5F1] text-[#355846] border border-[#DDE8E1] hover:bg-[#DDE8E1] rounded inline-flex items-center gap-1.5"
      >
        <Plus className="w-3 h-3" /> Create workspace
      </button>
    );
  }

  const current = currentMembership;
  const currentName = current?.workspace?.name || 'Workspace';
  const currentRole = current?.role;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="h-7 px-2.5 text-xs font-semibold bg-white border border-[#E3E1DA] hover:border-[#A8B9AE] hover:bg-[#EEF5F1] rounded inline-flex items-center gap-1.5 max-w-[200px]"
      >
        <Building2 className="w-3 h-3 text-[#4F7563] flex-shrink-0" />
        <span className="truncate text-[#111111]">{currentName}</span>
        {currentRole && (
          <span className="text-[9px] uppercase tracking-wide text-[#C9C6BD] font-mono">
            {ROLE_LABEL[currentRole] || currentRole}
          </span>
        )}
        <ChevronDown className={`w-3 h-3 text-[#C9C6BD] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 mt-1 w-72 bg-white border border-[#E3E1DA] rounded-lg shadow-2xl z-50 overflow-hidden">
          <div className="px-3 py-2 border-b border-[#F1F0EC]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#9A9A9A]">Your workspaces</p>
          </div>
          <div className="max-h-80 overflow-auto py-1">
            {workspaces.map((m) => {
              const selected = m.workspace.id === currentMembership?.workspace.id;
              return (
                <button
                  key={m.workspace.id}
                  type="button"
                  onClick={() => { setCurrentWorkspaceId(m.workspace.id); setOpen(false); }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors ${
                    selected ? 'bg-[#EEF5F1]' : 'hover:bg-[#EDEBE6]'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5 text-[#4F7563] flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-[#111111] truncate">{m.workspace.name}</div>
                    <div className="text-[10px] text-[#9A9A9A] truncate">
                      {m.memberCount} member{m.memberCount === 1 ? '' : 's'} · {m.projectCount} project{m.projectCount === 1 ? '' : 's'} · {ROLE_LABEL[m.role] || m.role}
                    </div>
                  </div>
                  {selected && <Check className="w-3.5 h-3.5 text-[#4F7563] flex-shrink-0" />}
                </button>
              );
            })}
          </div>
          <div className="border-t border-[#F1F0EC]">
            {onCreate && (
              <button
                type="button"
                onClick={() => { setOpen(false); onCreate(); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#111111] hover:bg-[#EDEBE6]"
              >
                <Plus className="w-3 h-3 text-[#4F7563]" /> Create workspace
              </button>
            )}
            {currentMembership && settingsHref && (
              <Link
                href={settingsHref(currentMembership.workspace.id)}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-xs text-[#111111] hover:bg-[#EDEBE6]"
              >
                <Settings2 className="w-3 h-3 text-[#9A9A9A]" /> Workspace settings
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
