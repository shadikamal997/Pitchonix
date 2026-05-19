'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { PlacedImage } from './types';

interface DragState {
  id: string;
  startMouseX: number;
  startMouseY: number;
  origX: number;
  origY: number;
}

interface ResizeState {
  id: string;
  corner: 'nw' | 'ne' | 'sw' | 'se';
  startMouseX: number;
  startMouseY: number;
  origX: number;
  origY: number;
  origW: number;
  origH: number;
}

interface Props {
  images: PlacedImage[];
  onUpdate: (id: string, updates: Partial<PlacedImage>) => void;
  onDelete: (id: string) => void;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export function PageImageOverlay({ images, onUpdate, onDelete, selectedId, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 595, h: 842 });
  const drag = useRef<DragState | null>(null);
  const resize = useRef<ResizeState | null>(null);

  // Measure the parent A4 canvas so percentage ↔ pixel conversion is accurate
  useEffect(() => {
    const parent = containerRef.current?.parentElement;
    if (!parent) return;
    const obs = new ResizeObserver(([e]) => {
      setSize({ w: e.contentRect.width, h: e.contentRect.height });
    });
    obs.observe(parent);
    setSize({ w: parent.clientWidth, h: parent.clientHeight });
    return () => obs.disconnect();
  }, []);

  // Global mouse-move / mouse-up while dragging or resizing
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (drag.current) {
        const d = drag.current;
        const dx = ((e.clientX - d.startMouseX) / size.w) * 100;
        const dy = ((e.clientY - d.startMouseY) / size.h) * 100;
        const img = images.find(i => i.id === d.id);
        if (!img) return;
        const newX = Math.max(0, Math.min(100 - img.width, d.origX + dx));
        const newY = Math.max(0, Math.min(100 - img.height, d.origY + dy));
        onUpdate(d.id, { x: newX, y: newY });
      }

      if (resize.current) {
        const r = resize.current;
        const dx = ((e.clientX - r.startMouseX) / size.w) * 100;
        const dy = ((e.clientY - r.startMouseY) / size.h) * 100;

        let x = r.origX, y = r.origY, w = r.origW, h = r.origH;
        const MIN_W = 8, MIN_H = 5;

        if (r.corner === 'se') {
          w = Math.max(MIN_W, r.origW + dx);
          h = Math.max(MIN_H, r.origH + dy);
        } else if (r.corner === 'sw') {
          const newW = Math.max(MIN_W, r.origW - dx);
          x = r.origX + (r.origW - newW);
          w = newW;
          h = Math.max(MIN_H, r.origH + dy);
        } else if (r.corner === 'ne') {
          w = Math.max(MIN_W, r.origW + dx);
          const newH = Math.max(MIN_H, r.origH - dy);
          y = r.origY + (r.origH - newH);
          h = newH;
        } else {
          // nw
          const newW = Math.max(MIN_W, r.origW - dx);
          const newH = Math.max(MIN_H, r.origH - dy);
          x = r.origX + (r.origW - newW);
          y = r.origY + (r.origH - newH);
          w = newW;
          h = newH;
        }

        // Clamp to page
        x = Math.max(0, x);
        y = Math.max(0, y);
        w = Math.min(100 - x, w);
        h = Math.min(100 - y, h);
        onUpdate(r.id, { x, y, width: w, height: h });
      }
    };

    const onUp = () => {
      drag.current = null;
      resize.current = null;
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [images, onUpdate, size]);

  const startDrag = (e: React.MouseEvent, img: PlacedImage) => {
    e.preventDefault();
    e.stopPropagation();
    onSelect(img.id);
    drag.current = {
      id: img.id,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      origX: img.x,
      origY: img.y,
    };
  };

  const startResize = (e: React.MouseEvent, img: PlacedImage, corner: 'nw' | 'ne' | 'sw' | 'se') => {
    e.preventDefault();
    e.stopPropagation();
    resize.current = {
      id: img.id,
      corner,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      origX: img.x,
      origY: img.y,
      origW: img.width,
      origH: img.height,
    };
  };

  const CORNER_CURSORS: Record<string, string> = {
    nw: 'nw-resize', ne: 'ne-resize', sw: 'sw-resize', se: 'se-resize',
  };
  const CORNER_POS: Record<string, React.CSSProperties> = {
    nw: { top: -5, left: -5 },
    ne: { top: -5, right: -5 },
    sw: { bottom: -5, left: -5 },
    se: { bottom: -5, right: -5 },
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 10,
        pointerEvents: 'none',
      }}
      onClick={() => onSelect(null)}
    >
      {images.map(img => {
        const selected = selectedId === img.id;
        return (
          <div
            key={img.id}
            style={{
              position: 'absolute',
              left: `${img.x}%`,
              top: `${img.y}%`,
              width: `${img.width}%`,
              height: `${img.height}%`,
              zIndex: img.zIndex ?? 2,
              pointerEvents: 'all',
              cursor: 'grab',
              userSelect: 'none',
              boxSizing: 'border-box',
              border: selected ? '2px solid #3B82F6' : '2px solid transparent',
              borderRadius: 3,
              outline: selected ? '1px solid rgba(59,130,246,.35)' : 'none',
              outlineOffset: 2,
            }}
            onMouseDown={e => startDrag(e, img)}
            onClick={e => { e.stopPropagation(); onSelect(img.id); }}
          >
            {/* The image itself */}
            <img
              src={img.url}
              alt=""
              draggable={false}
              style={{
                width: '100%',
                height: '100%',
                objectFit: img.fit || 'cover',
                opacity: img.opacity ?? 1,
                display: 'block',
                pointerEvents: 'none',
                borderRadius: 2,
              }}
            />

            {selected && (
              <>
                {/* Delete button */}
                <button
                  onMouseDown={e => e.stopPropagation()}
                  onClick={e => { e.stopPropagation(); onDelete(img.id); }}
                  style={{
                    position: 'absolute',
                    top: -12,
                    right: -12,
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: '#EF4444',
                    color: 'white',
                    border: '2px solid white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 30,
                    pointerEvents: 'all',
                    boxShadow: '0 1px 4px rgba(0,0,0,.25)',
                  }}
                >
                  <X size={11} />
                </button>

                {/* Resize corner handles */}
                {(['nw', 'ne', 'sw', 'se'] as const).map(corner => (
                  <div
                    key={corner}
                    onMouseDown={e => startResize(e, img, corner)}
                    style={{
                      position: 'absolute',
                      width: 10,
                      height: 10,
                      background: 'white',
                      border: '2px solid #3B82F6',
                      borderRadius: 2,
                      cursor: CORNER_CURSORS[corner],
                      zIndex: 30,
                      pointerEvents: 'all',
                      ...CORNER_POS[corner],
                    }}
                  />
                ))}

                {/* Move indicator label */}
                <div
                  style={{
                    position: 'absolute',
                    top: -24,
                    left: 0,
                    background: '#3B82F6',
                    color: 'white',
                    fontSize: 9,
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: 4,
                    whiteSpace: 'nowrap',
                    pointerEvents: 'none',
                    letterSpacing: '.3px',
                  }}
                >
                  Drag to move · corners to resize
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
