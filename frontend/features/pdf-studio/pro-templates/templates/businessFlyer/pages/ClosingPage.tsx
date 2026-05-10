import React from 'react';
import { ProTemplateFrame } from '../components/ProTemplateFrame';
import { ProFooter } from '../components/ProFooter';
import { CalloutBlock } from '../components/CalloutBlock';
import { businessFlyerTokens as tokens } from '../../../tokens/businessFlyer.tokens';

export function ClosingPage() {
  return (
    <ProTemplateFrame className="h-40 p-4">
      <div className="flex h-full flex-col justify-between">
        <div>
          <div className="text-2xl font-black leading-tight" style={{ color: tokens.colors.ink }}>Ready for<br />the next move?</div>
          <div className="mt-3">
            <CalloutBlock>Closing summary, contact details, and final call-to-action.</CalloutBlock>
          </div>
        </div>
        <ProFooter page={10} />
      </div>
    </ProTemplateFrame>
  );
}
