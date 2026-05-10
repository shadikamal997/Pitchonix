import React from 'react';
import { ProTemplateFrame } from '../components/ProTemplateFrame';
import { ProHeader } from '../components/ProHeader';
import { ProFooter } from '../components/ProFooter';
import { ImagePanel } from '../components/ImagePanel';
import { businessFlyerTokens as tokens } from '../../../tokens/businessFlyer.tokens';

export function CoverPage() {
  return (
    <ProTemplateFrame className="h-40 p-4">
      <div className="grid h-full grid-cols-[1.1fr_0.9fr] gap-3">
        <div className="flex flex-col justify-between">
          <div>
            <ProHeader label="Business flyer" />
            <div className="mt-3 text-2xl font-black leading-[0.95]" style={{ color: tokens.colors.ink }}>
              Modern<br />Business<br />Flyer
            </div>
          </div>
          <ProFooter />
        </div>
        <ImagePanel />
      </div>
    </ProTemplateFrame>
  );
}
