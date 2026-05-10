import React from 'react';
import { businessFlyerTokens as tokens } from '../../../tokens/businessFlyer.tokens';

export function DarkInfoPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-3 text-white" style={{ background: tokens.colors.charcoal }}>
      {children}
    </div>
  );
}
