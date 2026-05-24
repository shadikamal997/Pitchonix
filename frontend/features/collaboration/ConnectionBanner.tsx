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
      <div className="flex-shrink-0 bg-red-50 border-b border-red-200 px-4 py-1.5 flex items-center gap-2 text-xs text-red-800">
        <ShieldOff className="w-3.5 h-3.5" />
        <span className="font-semibold">Live collaboration unavailable</span>
        <span className="text-red-600">— you don't have access to this deck.</span>
      </div>
    );
  }

  const reconnecting = state === 'reconnecting' || state === 'connecting';
  return (
    <div className="flex-shrink-0 bg-amber-50 border-b border-amber-200 px-4 py-1.5 flex items-center gap-2 text-xs text-amber-800">
      {reconnecting
        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
        : <WifiOff className="w-3.5 h-3.5" />}
      <span className="font-semibold">
        {reconnecting ? 'Reconnecting…' : 'Disconnected'}
      </span>
      <span className="text-amber-700">
        Editing continues locally; changes will sync when the connection returns.
      </span>
    </div>
  );
};
