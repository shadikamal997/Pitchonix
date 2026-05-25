'use client';

import React, { useEffect, useRef, useState } from 'react';
import api from '@/lib/api';
import { Search, X } from 'lucide-react';
import { useCurrentWorkspace } from '@/features/workspaces/WorkspaceContext';

// =============================================================================
//  Phase 36.1H — AssignMenu
//
//  Dropdown for assigning / reassigning / unassigning a comment thread.
//  Reuses the GET /users/search?q= endpoint (also used by MentionAutocomplete
//  and the reviewer picker).
// =============================================================================

interface User { id: string; name: string | null; email: string }

interface Props {
  current: User | null;
  onPick:  (user: User | null) => void;
  onClose: () => void;
}

export const AssignMenu: React.FC<Props> = ({ current, onPick, onClose }) => {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Phase 39.1B — scope assign picker to workspace members.
  const { workspaceId } = useCurrentWorkspace();

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const params: Record<string, any> = { q, limit: 8 };
        if (workspaceId) params.workspaceId = workspaceId;
        const { data } = await api.get<User[]>(`/users/search`, { params });
        setResults(data || []);
      } finally { setLoading(false); }
    }, 120);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [q, workspaceId]);

  // Close on outside click
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute right-0 mt-1 w-60 bg-white border border-[#E3E1DA] rounded-lg shadow-xl z-[80]"
    >
      <div className="p-2 border-b border-[#F1F0EC]">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#C9C6BD] pointer-events-none" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search people…"
            autoFocus
            className="w-full h-7 pl-7 pr-2 text-xs bg-[#EDEBE6] border border-[#E3E1DA] rounded outline-none focus:border-[#4F7563] focus:bg-white"
          />
        </div>
      </div>
      <div className="max-h-56 overflow-auto py-1">
        {current && (
          <button
            type="button"
            onClick={() => onPick(null)}
            className="w-full text-left px-2.5 py-1.5 flex items-center gap-2 text-xs text-[#9a3737] hover:bg-[#FCF1F1]"
          >
            <X className="w-3 h-3" /> Unassign{current.name ? ` ${current.name}` : ''}
          </button>
        )}
        {loading ? (
          <div className="px-2.5 py-2 text-[10px] text-[#C9C6BD]">Searching…</div>
        ) : results.length === 0 ? (
          <div className="px-2.5 py-2 text-[10px] text-[#C9C6BD]">
            {q.trim() ? 'No matches.' : 'Type a name or email.'}
          </div>
        ) : (
          results.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => onPick(u)}
              className="w-full text-left px-2.5 py-1.5 flex items-center gap-2 hover:bg-[#EDEBE6]"
            >
              <div className="w-6 h-6 rounded-full bg-[#4F7563] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                {(u.name || u.email).charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-[#111111] truncate">{u.name || u.email}</div>
                {u.name && <div className="text-[10px] text-[#9A9A9A] truncate">{u.email}</div>}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
};
