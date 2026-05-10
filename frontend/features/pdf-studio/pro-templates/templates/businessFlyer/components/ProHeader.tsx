import React from 'react';
import { businessFlyerTokens as tokens } from '../../../tokens/businessFlyer.tokens';

export function ProHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-[0.18em]" style={{ color: tokens.colors.accent }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: tokens.colors.accent }} />
      {label}
    </div>
  );
}
