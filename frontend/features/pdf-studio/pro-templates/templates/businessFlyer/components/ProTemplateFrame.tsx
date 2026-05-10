import React from 'react';
import { businessFlyerTokens as tokens } from '../../../tokens/businessFlyer.tokens';

export function ProTemplateFrame({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-lg border shadow-sm ${className}`}
      style={{ background: tokens.colors.paper, borderColor: tokens.colors.line }}
    >
      {children}
    </div>
  );
}
