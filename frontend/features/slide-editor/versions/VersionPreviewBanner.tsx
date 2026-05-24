'use client';

import React from 'react';
import { Eye, RotateCcw, X } from 'lucide-react';
import type { DeckVersionDTO } from '@/types/deck-version';
import { VERSION_TYPE_LABEL } from '@/types/deck-version';

// =============================================================================
//  VersionPreviewBanner — Phase 35.1C
//
//  Sticky banner displayed across the top of the editor whenever
//  `useVersionPreview().isPreviewing` is true. Tells the user they're
//  viewing a historical version and offers the two valid exits: restore
//  this version, or return to the live deck.
//
//  Drop it inside the editor shell:
//
//    {preview.isPreviewing && preview.meta && (
//      <VersionPreviewBanner
//        meta={preview.meta}
//        onRestore={() => versions.restore(preview.versionId!)}
//        onExit={preview.exit}
//      />
//    )}
// =============================================================================

interface Props {
  meta:      DeckVersionDTO;
  onRestore: () => void;
  onExit:    () => void;
}

export const VersionPreviewBanner: React.FC<Props> = ({ meta, onRestore, onExit }) => {
  const date = new Date(meta.createdAt).toLocaleString(
    undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' },
  );
  return (
    <div
      role="status"
      className="sticky top-0 z-30 w-full bg-violet-600 text-white px-4 py-2 flex items-center gap-3 shadow"
    >
      <Eye className="w-4 h-4 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-[12px] font-semibold flex items-center gap-2 truncate">
          Viewing historical version
          <span className="px-1.5 py-0.5 bg-white/15 rounded text-[10px] font-medium uppercase tracking-wide">
            {VERSION_TYPE_LABEL[meta.type]}
          </span>
        </div>
        <div className="text-[11px] opacity-80 truncate">
          {meta.name}  ·  {date}  ·  {meta.slideCount} slides
        </div>
      </div>
      <button
        type="button"
        onClick={onRestore}
        className="h-7 px-3 text-[11px] bg-white text-violet-700 hover:bg-violet-50 rounded font-semibold flex items-center gap-1.5 flex-shrink-0"
      >
        <RotateCcw className="w-3 h-3" />
        Restore this version
      </button>
      <button
        type="button"
        onClick={onExit}
        title="Exit preview (Esc)"
        className="h-7 px-3 text-[11px] bg-white/15 hover:bg-white/25 rounded flex items-center gap-1.5 flex-shrink-0"
      >
        <X className="w-3 h-3" />
        Exit preview
      </button>
    </div>
  );
};
