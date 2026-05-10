import React from 'react';
import { businessFlyerTokens as tokens } from '../../../tokens/businessFlyer.tokens';

export function NumberedList({ items }: { items: string[] }) {
  return (
    <div className="space-y-1.5">
      {items.slice(0, 3).map((item, index) => (
        <div key={item} className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-black text-white" style={{ background: tokens.colors.accent }}>
            {index + 1}
          </span>
          <span className="truncate text-[9px] font-semibold" style={{ color: tokens.colors.ink }}>{item}</span>
        </div>
      ))}
    </div>
  );
}
