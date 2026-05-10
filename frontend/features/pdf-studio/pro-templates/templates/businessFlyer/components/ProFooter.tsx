import React from 'react';
import { businessFlyerTokens as tokens } from '../../../tokens/businessFlyer.tokens';

export function ProFooter({ page = 1 }: { page?: number }) {
  return (
    <div className="flex items-center justify-between text-[7px] font-semibold uppercase tracking-[0.16em]" style={{ color: tokens.colors.muted }}>
      <span>Pitchonix Studio</span>
      <span>{String(page).padStart(2, '0')}</span>
    </div>
  );
}
