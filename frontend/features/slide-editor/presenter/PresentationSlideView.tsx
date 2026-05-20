'use client';

import React from 'react';
import type { SlideElementDTO } from '@/types/slide-element';
import { renderElement } from '../renderers';

// =============================================================================
//  PresentationSlideView — a non-editable 16:9 slide stage used by the
//  presenter overlay (and by next-slide previews).
//
//  Pure visual layer: positions every element by % of the stage, renders via
//  the existing renderer registry (so the slide looks identical to the
//  editor canvas), and applies the slide-level background / theme tokens.
// =============================================================================

interface Props {
  index:        number;                  // 0-based
  total:        number;
  elements:     SlideElementDTO[];
  background?:  any | null;
  themeTokens?: any | null;
  /** Pixel width of the stage. Height is derived from the 16:9 ratio. */
  width:        number;
  className?:   string;
}

export const PresentationSlideView: React.FC<Props> = ({
  index, total, elements, background, themeTokens, width, className,
}) => {
  const height = (width * 9) / 16;
  const bg = backgroundStyle(background, themeTokens);
  const sorted = [...(elements || [])].filter((e) => e.visible !== false).sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));

  return (
    <div
      className={`relative overflow-hidden ${className || ''}`}
      style={{ width, height, ...bg }}
    >
      {sorted.map((el) => (
        <div
          key={el.id}
          style={{
            position: 'absolute',
            left:   `${el.x}%`,
            top:    `${el.y}%`,
            width:  `${el.width}%`,
            height: `${el.height}%`,
            transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
            transformOrigin: 'center',
            opacity: (el.style as any)?.opacity ?? 1,
          }}
        >
          {renderElement(el, { pageNumber: index + 1, total })}
        </div>
      ))}
    </div>
  );
};

// =============================================================================
//  Background helper — mirrors backend element-html-renderer logic so the
//  presenter view matches the export.
// =============================================================================

function backgroundStyle(bg?: any | null, theme?: any | null): React.CSSProperties {
  if (bg) {
    if (bg.type === 'solid' && bg.color)         return { background: bg.color };
    if (bg.type === 'gradient' && bg.gradient)   return { background: gradientCss(bg.gradient) };
    if (bg.type === 'image' && bg.image?.src)    return {
      background: `url('${bg.image.src}') center/${bg.image.fit || 'cover'} no-repeat`,
    };
  }
  if (theme?.background) return { background: theme.background };
  return { background: '#ffffff' };
}

function gradientCss(g: any): string {
  if (!g?.stops?.length) return '#ffffff';
  const stops = g.stops.map((s: any) => `${s.color} ${Math.round((s.offset || 0) * 100)}%`).join(', ');
  if (g.kind === 'radial') return `radial-gradient(circle, ${stops})`;
  return `linear-gradient(${g.angle ?? 180}deg, ${stops})`;
}
