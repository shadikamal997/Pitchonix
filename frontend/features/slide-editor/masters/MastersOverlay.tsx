'use client';

import React, { useMemo } from 'react';
import type { MasterElementDTO, DeckMasterSettings } from '@/types/master-element';
import { renderElement } from '../renderers';
import { buildMasterElementsForSlide } from './master-merge';

// =============================================================================
//  MastersOverlay — Phase 32.75
//
//  Renders the deck's master elements on a slide using the existing element
//  renderers, so the editor canvas matches what the export pipeline will
//  produce. Drop this inside the slide stage and absolute-positioned masters
//  will lay out into the same 0..100% coordinate space the canvas already
//  uses for slide elements.
//
//  Layout:
//    <div style="position:relative; width:100%; height:100%">
//      <MastersOverlay … />     ← masters layer
//      <SlideElements …  />     ← real elements layer (existing canvas code)
//    </div>
//
//  Masters with sendToFront=true land on top because of their zIndex;
//  everything else sits behind slide content thanks to negative zIndex.
// =============================================================================

interface Props {
  masters:     MasterElementDTO[];
  settings?:   DeckMasterSettings | null;
  slideId:     string;
  slideIndex:  number;
  slideTotal:  number;
  /** Hide the overlay during certain editor modes (e.g. "isolate slide"). */
  hidden?: boolean;
}

export const MastersOverlay: React.FC<Props> = ({
  masters, settings, slideId, slideIndex, slideTotal, hidden,
}) => {
  const merged = useMemo(
    () => buildMasterElementsForSlide(masters, { slideId, slideIndex, slideTotal }, settings),
    [masters, settings, slideId, slideIndex, slideTotal],
  );

  if (hidden || merged.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
      {merged.map((el) => (
        <div
          key={el.id}
          className="absolute"
          style={{
            left:   `${el.x}%`,
            top:    `${el.y}%`,
            width:  `${el.width}%`,
            height: `${el.height}%`,
            transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
            transformOrigin: 'center center',
            zIndex: el.zIndex,
          }}
        >
          {renderElement(el, { pageNumber: slideIndex + 1, total: slideTotal })}
        </div>
      ))}
    </div>
  );
};
