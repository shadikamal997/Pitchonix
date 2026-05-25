'use client';

import React, { useRef } from 'react';

// =============================================================================
//  FocalPointPicker
//
//  Renders the image preview at the chosen fit + focal coordinates, and lets
//  the user drag the focal target (a small bullseye) anywhere on the preview
//  to set `focalX` / `focalY` in element.content. Values are 0..1.
// =============================================================================

interface Props {
  src:    string;
  fit:    'cover' | 'contain' | 'fill' | 'none';
  focalX: number;       // 0..1
  focalY: number;       // 0..1
  onChange: (focal: { focalX: number; focalY: number }) => void;
}

export const FocalPointPicker: React.FC<Props> = ({ src, fit, focalX, focalY, onChange }) => {
  const boxRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const update = (e: React.MouseEvent | MouseEvent) => {
    const box = boxRef.current?.getBoundingClientRect();
    if (!box) return;
    const x = (e.clientX - box.left) / box.width;
    const y = (e.clientY - box.top)  / box.height;
    onChange({ focalX: clamp01(x), focalY: clamp01(y) });
  };

  const onDown = (e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    update(e);
    const onMove = (ev: MouseEvent) => { if (dragging.current) update(ev); };
    const onUp = () => {
      dragging.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  if (!src) return null;

  return (
    <div className="space-y-1.5">
      <div
        ref={boxRef}
        onMouseDown={onDown}
        className="relative w-full h-32 bg-[#EDEBE6] border border-[#E3E1DA] rounded overflow-hidden cursor-crosshair select-none"
      >
        <img
          src={src} alt=""
          draggable={false}
          style={{
            width: '100%', height: '100%',
            objectFit: fit,
            objectPosition: `${(focalX * 100).toFixed(0)}% ${(focalY * 100).toFixed(0)}%`,
            pointerEvents: 'none',
          }}
        />
        {/* Bullseye target */}
        <div
          style={{
            position: 'absolute',
            left: `${(focalX * 100).toFixed(1)}%`,
            top:  `${(focalY * 100).toFixed(1)}%`,
            width: 24, height: 24,
            transform: 'translate(-50%, -50%)',
            border: '2px solid white',
            borderRadius: '50%',
            boxShadow: '0 0 0 2px rgba(0,0,0,0.6)',
            pointerEvents: 'none',
          }}
        >
          <div style={{
            position: 'absolute', inset: 4, borderRadius: '50%',
            background: 'rgba(255,255,255,0.5)',
            border: '1px solid rgba(0,0,0,0.5)',
          }} />
        </div>
      </div>
      <div className="flex justify-between text-[10px] text-[#9A9A9A]">
        <span>Focal X: {(focalX * 100).toFixed(0)}%</span>
        <span>Focal Y: {(focalY * 100).toFixed(0)}%</span>
      </div>
    </div>
  );
};

function clamp01(v: number) { return Math.max(0, Math.min(1, v)); }
