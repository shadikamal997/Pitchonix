'use client';

import React from 'react';
import { WifiOff, Loader2, ShieldOff } from 'lucide-react';
import type { ConnectionState } from './types';

// =============================================================================
//  Phase 34O/P — ConnectionBanner
//
//  Tiny sticky banner shown when the collaboration socket isn't healthy.
//  Editing keeps working locally; changes flush after reconnect.
//  Hidden when state is 'connected' or 'idle'.
// =============================================================================

interface Props { state: ConnectionState }

export const ConnectionBanner: React.FC<Props> = ({ state }) => {
  if (state === 'connected' || state === 'idle') return null;

  if (state === 'forbidden') {
    return (
      <div className="flex-shrink-0 bg-[#FCF1F1] border-b border-[#F7E3E3] px-4 py-1.5 flex items-center gap-2 text-xs text-[#7a2929]">
        <ShieldOff className="w-3.5 h-3.5" />
        <span className="font-semibold">Live collaboration unavailable</span>
        <span className="text-[#9a3737]">— you don't have access to this deck.</span>
      </div>
    );
  }

  const reconnecting = state === 'reconnecting' || state === 'connecting';
  return (
    <div className="flex-shrink-0 bg-[#FAEEDB] border-b border-[#F2DCAE] px-4 py-1.5 flex items-center gap-2 text-xs text-[#735008]">
      {reconnecting
        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
        : <WifiOff className="w-3.5 h-3.5" />}
      <span className="font-semibold">
        {reconnecting ? 'Reconnecting…' : 'Disconnected'}
      </span>
      <span className="text-[#735008]">
        Editing continues locally; changes will sync when the connection returns.
      </span>
    </div>
  );
};
