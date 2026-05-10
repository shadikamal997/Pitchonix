import React from 'react';
import { businessFlyerTokens as tokens } from '../../../tokens/businessFlyer.tokens';

export function ImagePanel() {
  return (
    <div className="relative h-full min-h-[72px] overflow-hidden rounded-bl-[38px] rounded-tl-xl rounded-tr-xl" style={{ background: tokens.colors.charcoal }}>
      <div className="absolute inset-0 opacity-80" style={{ background: `linear-gradient(135deg, ${tokens.colors.charcoal}, ${tokens.colors.accent})` }} />
      <div className="absolute right-3 top-3 h-10 w-10 rounded-full border border-white/30" />
      <div className="absolute bottom-3 left-3 h-2 w-16 rounded-full bg-white/60" />
    </div>
  );
}
