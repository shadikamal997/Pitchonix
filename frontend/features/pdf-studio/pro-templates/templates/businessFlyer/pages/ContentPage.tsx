import React from 'react';
import { ProTemplateFrame } from '../components/ProTemplateFrame';
import { ProHeader } from '../components/ProHeader';
import { DarkInfoPanel } from '../components/DarkInfoPanel';
import { NumberedList } from '../components/NumberedList';
import { businessFlyerTokens as tokens } from '../../../tokens/businessFlyer.tokens';

export function ContentPage() {
  return (
    <ProTemplateFrame className="h-40 p-4">
      <ProHeader label="Editorial page" />
      <div className="mt-3 grid grid-cols-[0.85fr_1.15fr] gap-3">
        <DarkInfoPanel>
          <div className="text-xl font-black leading-none">01</div>
          <div className="mt-2 h-1 w-10 rounded-full" style={{ background: tokens.colors.accent }} />
          <p className="mt-2 text-[9px] leading-snug text-white/75">Structured narrative with a premium dark callout panel.</p>
        </DarkInfoPanel>
        <div>
          <div className="text-sm font-black" style={{ color: tokens.colors.ink }}>Strategy Overview</div>
          <p className="mt-1 text-[9px] leading-relaxed" style={{ color: tokens.colors.muted }}>Paragraphs become concise editorial blocks with strong hierarchy and balanced spacing.</p>
          <div className="mt-3">
            <NumberedList items={['Market context', 'Business value', 'Next action']} />
          </div>
        </div>
      </div>
    </ProTemplateFrame>
  );
}
