import React from 'react';
import { ProTemplateFrame } from '../components/ProTemplateFrame';
import { ProHeader } from '../components/ProHeader';
import { businessFlyerTokens as tokens } from '../../../tokens/businessFlyer.tokens';

export function StatsPage() {
  return (
    <ProTemplateFrame className="h-40 p-4">
      <ProHeader label="Metrics" />
      <div className="mt-4 grid grid-cols-3 gap-2">
        {['78%', '3.4x', '12k'].map((value, index) => (
          <div key={value} className="rounded-2xl p-3 text-center" style={{ background: index === 1 ? tokens.colors.charcoal : tokens.colors.accentSoft }}>
            <div className="text-lg font-black" style={{ color: index === 1 ? '#fff' : tokens.colors.ink }}>{value}</div>
            <div className="mt-1 text-[7px] font-bold uppercase tracking-wider" style={{ color: index === 1 ? 'rgba(255,255,255,.65)' : tokens.colors.muted }}>Insight</div>
          </div>
        ))}
      </div>
      <div className="mt-4 h-2 rounded-full" style={{ background: `linear-gradient(90deg, ${tokens.colors.accent} 70%, ${tokens.colors.line} 70%)` }} />
    </ProTemplateFrame>
  );
}
