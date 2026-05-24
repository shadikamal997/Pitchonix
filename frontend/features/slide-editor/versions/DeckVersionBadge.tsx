'use client';

import React, { useMemo } from 'react';
import { CheckCircle2, History, Sparkles } from 'lucide-react';
import type { DeckVersionDTO } from '@/types/deck-version';
import { VERSION_TYPE_LABEL } from '@/types/deck-version';

// =============================================================================
//  DeckVersionBadge — Phase 35.1G
//
//  Small top-right indicator showing the most recent version + how many
//  total versions the deck has. Lives in the editor toolbar.
//
//  Consumes the same `useVersionHistory().versions` list the panel uses, so
//  it auto-updates when a new snapshot is created.
// =============================================================================

interface Props {
  versions: DeckVersionDTO[];
  /** Optional click handler — typically opens the VersionHistoryPanel. */
  onClick?: () => void;
}

export const DeckVersionBadge: React.FC<Props> = ({ versions, onClick }) => {
  const latest = versions[0] || null;
  const count = versions.length;
  const summary = useMemo(() => {
    if (!latest) return { tone: 'bg-slate-100 text-slate-600', icon: <History className="w-3 h-3" />, label: 'No versions' };
    switch (latest.type) {
      case 'MANUAL_SNAPSHOT':
        return { tone: 'bg-blue-50 text-blue-700',     icon: <CheckCircle2 className="w-3 h-3" />, label: 'Saved' };
      case 'GENERATED':
      case 'REGENERATED':
        return { tone: 'bg-green-50 text-green-700',   icon: <Sparkles    className="w-3 h-3" />, label: VERSION_TYPE_LABEL[latest.type] };
      case 'AUTO_SAVE':
      case 'SAFETY':
        return { tone: 'bg-slate-100 text-slate-600',  icon: <CheckCircle2 className="w-3 h-3" />, label: 'Auto-saved' };
      default:
        return { tone: 'bg-slate-100 text-slate-700',  icon: <History     className="w-3 h-3" />, label: VERSION_TYPE_LABEL[latest.type] };
    }
  }, [latest]);

  const lastSavedLabel = latest ? relativeTime(latest.createdAt) : '—';

  return (
    <button
      type="button"
      onClick={onClick}
      title={latest ? `${latest.name} · ${new Date(latest.createdAt).toLocaleString()}` : 'No versions yet'}
      className={`h-7 inline-flex items-center gap-1.5 px-2 rounded border border-slate-200 hover:border-slate-300 text-[11px] ${summary.tone}`}
    >
      {summary.icon}
      <span className="font-medium">{summary.label}</span>
      <span className="text-slate-400">·</span>
      <span className="text-[10px]">{lastSavedLabel}</span>
      {count > 0 && (
        <>
          <span className="text-slate-400">·</span>
          <span className="text-[10px] text-slate-500">{count}</span>
        </>
      )}
    </button>
  );
};

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000)         return 'just now';
  if (ms < 3600_000)       return `${Math.round(ms / 60_000)} min ago`;
  if (ms < 86_400_000)     return `${Math.round(ms / 3600_000)} h ago`;
  if (ms < 7 * 86_400_000) return `${Math.round(ms / 86_400_000)} d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
