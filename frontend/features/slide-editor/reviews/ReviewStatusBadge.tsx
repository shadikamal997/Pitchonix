'use client';

import React from 'react';
import { Send, CheckCircle2, AlertTriangle, FileText } from 'lucide-react';
import type { DeckReviewStatus, DeckReviewStatusDTO } from './useDeckReviews';

// =============================================================================
//  Phase 36I — Review status badge
//
//  Compact pill in the toolbar. Click → opens the Request Review modal.
//
//  draft              → grey   "Draft"
//  in_review          → amber  "In review"
//  approved           → green  "Approved"
//  changes_requested  → red    "Changes requested"
// =============================================================================

interface Props {
  status:  DeckReviewStatusDTO | null;
  onClick: () => void;
}

const VARIANT: Record<DeckReviewStatus, { label: string; cls: string; Icon: React.ComponentType<any> }> = {
  draft:              { label: 'Draft',             cls: 'bg-[#F1F0EC] text-[#111111] border-[#E3E1DA] hover:border-slate-400',         Icon: FileText },
  in_review:          { label: 'In review',         cls: 'bg-[#FAEEDB] text-[#735008] border-amber-300 hover:border-amber-500',          Icon: Send },
  approved:           { label: 'Approved',          cls: 'bg-[#EEF5F1] text-green-800 border-[#A8B9AE] hover:border-[#4F7563]',          Icon: CheckCircle2 },
  changes_requested:  { label: 'Changes requested', cls: 'bg-[#FCF1F1] text-[#7a2929] border-[#F1D2D2] hover:border-red-500',                  Icon: AlertTriangle },
};

export const ReviewStatusBadge: React.FC<Props> = ({ status, onClick }) => {
  const key  = (status?.deckReviewStatus || 'draft') as DeckReviewStatus;
  const v    = VARIANT[key];
  const Icon = v.Icon;
  const reviewerName = status?.activeRequest?.reviewer?.name
    || status?.activeRequest?.reviewer?.email
    || null;
  const title = key === 'draft'
    ? 'Request a review'
    : reviewerName
      ? `${v.label} · ${reviewerName}`
      : v.label;

  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`relative h-7 px-2.5 text-xs font-semibold rounded border flex items-center gap-1.5 transition-colors ${v.cls}`}
    >
      <Icon className="w-3.5 h-3.5" />
      {v.label}
    </button>
  );
};
