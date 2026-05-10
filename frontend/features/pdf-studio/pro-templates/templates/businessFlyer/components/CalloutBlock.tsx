import React from 'react';
import { businessFlyerTokens as tokens } from '../../../tokens/businessFlyer.tokens';

export function CalloutBlock({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border p-2 text-[9px] font-semibold" style={{ borderColor: tokens.colors.line, background: tokens.colors.accentSoft, color: tokens.colors.ink }}>
      {children}
    </div>
  );
}
