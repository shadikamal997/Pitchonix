'use client';

import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import type { SlideElementDTO } from '@/types/slide-element';
import { renderElement } from '../renderers';

// =============================================================================
//  SlideThumbnail
//
//  Tiny preview of a slide that reuses the same DOM-based element renderers as
//  the canvas. We render the elements inside a 1280×720 stage then CSS-scale
//  the whole thing into the thumbnail box. This guarantees fidelity without
//  duplicating renderers.
//
//  Each thumb fetches the slide's elements lazily on mount and caches them in
//  a module-level Map keyed by slideId. When the user edits a slide and comes
//  back, the cache version bumps and we refresh.
// =============================================================================

interface CacheEntry { elements: SlideElementDTO[]; background?: any; themeTokens?: any; ts: number }
const ELEMENT_CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 30_000;

function backgroundStyle(bg: any | null | undefined, theme: any | null | undefined): React.CSSProperties {
  if (bg) {
    if (bg.type === 'solid' && bg.color)        return { background: bg.color };
    if (bg.type === 'gradient' && bg.gradient) {
      const g = bg.gradient;
      const stops = (g.stops || []).map((s: any) => `${s.color} ${Math.round((s.offset || 0) * 100)}%`).join(', ');
      return { background: g.kind === 'radial' ? `radial-gradient(circle, ${stops})` : `linear-gradient(${g.angle ?? 180}deg, ${stops})` };
    }
    if (bg.type === 'image' && bg.image?.src)   return { background: `url('${bg.image.src}') center/${bg.image.fit || 'cover'} no-repeat` };
  }
  if (theme?.background) return { background: theme.background };
  return { background: '#ffffff' };
}

// Bump this externally to force refresh of a slide's thumbnail.
const REFRESH_BUMP = new Map<string, number>();
export function bumpSlideThumbnail(slideId: string) {
  REFRESH_BUMP.set(slideId, Date.now());
  ELEMENT_CACHE.delete(slideId);
}

/** Bust every thumbnail's cache — used after a deck-wide change like template apply. */
export function bumpAllSlideThumbnails() {
  const t = Date.now();
  for (const k of Array.from(ELEMENT_CACHE.keys())) {
    REFRESH_BUMP.set(k, t);
    ELEMENT_CACHE.delete(k);
  }
}

interface Props {
  slideId:    string;
  width:      number;            // pixels
  pageNumber?: number;
  totalPages?: number;
  /** Optional pre-loaded elements (skips API fetch). */
  elements?:  SlideElementDTO[];
}

export const SlideThumbnail: React.FC<Props> = ({ slideId, width, pageNumber, totalPages, elements: preloaded }) => {
  const [elements, setElements] = useState<SlideElementDTO[] | null>(preloaded || null);
  const [background, setBackground] = useState<any | null>(null);
  const [themeTokens, setThemeTokens] = useState<any | null>(null);
  const [error, setError] = useState(false);
  const bump = REFRESH_BUMP.get(slideId);

  useEffect(() => {
    let cancelled = false;

    const cached = ELEMENT_CACHE.get(slideId);
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS && !bump) {
      if (!preloaded) setElements(cached.elements);
      setBackground(cached.background || null);
      setThemeTokens(cached.themeTokens || null);
      return;
    }

    (async () => {
      try {
        // Fetch elements (unless preloaded) AND the slide row (for background/theme).
        const [elsRes, slideRes] = await Promise.all([
          preloaded ? Promise.resolve({ data: preloaded }) : api.get<SlideElementDTO[]>(`/slides/${slideId}/elements`),
          api.get(`/slides/${slideId}`),
        ]);
        if (cancelled) return;
        const els = elsRes.data;
        const bg  = (slideRes.data as any)?.background  ?? null;
        const tt  = (slideRes.data as any)?.themeTokens ?? null;
        ELEMENT_CACHE.set(slideId, { elements: els, background: bg, themeTokens: tt, ts: Date.now() });
        setElements(els);
        setBackground(bg);
        setThemeTokens(tt);
      } catch {
        if (!cancelled) setError(true);
      }
    })();
    return () => { cancelled = true; };
  }, [slideId, bump, preloaded]);

  // 16:9 thumb sized by parent
  const height = (width * 9) / 16;
  const scale  = width / 1280;

  if (error) {
    return (
      <div style={{ width, height }} className="bg-[#FCF1F1] border border-[#F7E3E3] rounded flex items-center justify-center text-[10px] text-[#9a3737]">
        Error
      </div>
    );
  }

  if (!elements) {
    return (
      <div style={{ width, height }} className="bg-[#F1F0EC] border border-[#E3E1DA] rounded animate-pulse" />
    );
  }

  // Render the full 1280×720 stage then scale it into our box
  const sorted = [...elements].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));

  return (
    <div
      className="border border-[#E3E1DA] rounded shadow-sm overflow-hidden"
      style={{ width, height, position: 'relative', ...backgroundStyle(background, themeTokens) }}
    >
      <div
        style={{
          width: 1280,
          height: 720,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          position: 'absolute',
          top: 0,
          left: 0,
          pointerEvents: 'none',
        }}
      >
        {sorted.map((el) => {
          if (!el.visible) return null;
          return (
            <div
              key={el.id}
              style={{
                position: 'absolute',
                left:   `${el.x}%`,
                top:    `${el.y}%`,
                width:  `${el.width}%`,
                height: `${el.height}%`,
                transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
                zIndex: el.zIndex,
                pointerEvents: 'none',
              }}
            >
              {renderElement(el, { pageNumber, total: totalPages })}
            </div>
          );
        })}
      </div>
    </div>
  );
};
