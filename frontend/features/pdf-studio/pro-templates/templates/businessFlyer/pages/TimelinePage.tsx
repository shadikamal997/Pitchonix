import React from 'react';
import { ProTemplateFrame } from '../components/ProTemplateFrame';
import { ProHeader } from '../components/ProHeader';
import { businessFlyerTokens as tokens } from '../../../tokens/businessFlyer.tokens';

export function TimelinePage() {
  return (
    <ProTemplateFrame className="h-40 p-4">
      <ProHeader label="Process" />
      <div className="mt-5 space-y-3">
        {[1, 2, 3].map(step => (
          <div key={step} className="grid grid-cols-[24px_1fr] items-center gap-3">
            <div className="flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-black text-white" style={{ background: tokens.colors.charcoal }}>{step}</div>
            <div className="rounded-full px-3 py-1.5 text-[9px] font-bold" style={{ background: tokens.colors.accentSoft, color: tokens.colors.ink }}>Milestone and execution step</div>
          </div>
        ))}
      </div>
    </ProTemplateFrame>
  );
}
