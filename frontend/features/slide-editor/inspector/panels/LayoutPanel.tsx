'use client';

import React from 'react';
import { Lock, Unlock, Eye, EyeOff, RotateCw } from 'lucide-react';
import type { SlideElementDTO } from '@/types/slide-element';
import { PanelSection, Row, NumberField, Toggle, SliderField } from '../Primitives';
import { getLocks, withLock, type ElementLocks } from '../../smart/lock-utils';

interface Props {
  element: SlideElementDTO;
  onPatch: (patch: Partial<SlideElementDTO>) => void;
}

export const LayoutPanel: React.FC<Props> = ({ element, onPatch }) => {
  const align = (kind: 'left' | 'center-h' | 'right' | 'top' | 'center-v' | 'bottom') => {
    switch (kind) {
      case 'left':     return onPatch({ x: 0 });
      case 'right':    return onPatch({ x: 100 - element.width });
      case 'center-h': return onPatch({ x: (100 - element.width) / 2 });
      case 'top':      return onPatch({ y: 0 });
      case 'bottom':   return onPatch({ y: 100 - element.height });
      case 'center-v': return onPatch({ y: (100 - element.height) / 2 });
    }
  };

  return (
    <>
      <PanelSection title="Position">
        <Row label="X / Y">
          <NumberField value={element.x} onChange={(v) => onPatch({ x: v })} suffix="%" />
          <NumberField value={element.y} onChange={(v) => onPatch({ y: v })} suffix="%" />
        </Row>
        <Row label="W / H">
          <NumberField value={element.width}  onChange={(v) => onPatch({ width:  v })} suffix="%" />
          <NumberField value={element.height} onChange={(v) => onPatch({ height: v })} suffix="%" />
        </Row>
        <Row label="Rotate">
          <SliderField value={element.rotation || 0} min={-180} max={180} step={1} suffix="°"
            onChange={(v) => onPatch({ rotation: v })} />
          <button
            type="button"
            title="Reset rotation"
            onClick={() => onPatch({ rotation: 0 })}
            className="text-slate-500 hover:text-slate-900 flex-shrink-0"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </Row>
      </PanelSection>

      <PanelSection title="Alignment (in slide)">
        <Row label="Horiz">
          <div className="flex gap-1 flex-1">
            <AlignBtn onClick={() => align('left')}     title="Snap left">⟸</AlignBtn>
            <AlignBtn onClick={() => align('center-h')} title="Center horizontally">↔</AlignBtn>
            <AlignBtn onClick={() => align('right')}    title="Snap right">⟹</AlignBtn>
          </div>
        </Row>
        <Row label="Vert">
          <div className="flex gap-1 flex-1">
            <AlignBtn onClick={() => align('top')}      title="Snap top">⇧</AlignBtn>
            <AlignBtn onClick={() => align('center-v')} title="Center vertically">↕</AlignBtn>
            <AlignBtn onClick={() => align('bottom')}   title="Snap bottom">⇩</AlignBtn>
          </div>
        </Row>
      </PanelSection>

      <PanelSection title="Stack">
        <Row label="Z-index">
          <NumberField value={element.zIndex} onChange={(v) => onPatch({ zIndex: Math.round(v) })} step={1} />
        </Row>
      </PanelSection>

      <PanelSection title="State">
        <Toggle value={!!element.locked}
                onChange={(v) => onPatch({ locked: v })}
                label="Lock everything" />
        <Toggle value={element.visible !== false}
                onChange={(v) => onPatch({ visible: v })}
                label="Visible in export" />
      </PanelSection>

      {/* Phase 32H — granular sub-locks. The master `locked` flag above already
          forbids everything; these toggles let users lock only a subset (e.g.
          lock position while leaving inline-text editing open). */}
      {!element.locked && (
        <PanelSection title="Lock parts">
          <SubLockRow label="Position"  k="position" element={element} onPatch={onPatch} />
          <SubLockRow label="Size"      k="size"     element={element} onPatch={onPatch} />
          <SubLockRow label="Style"     k="style"    element={element} onPatch={onPatch} />
          <SubLockRow label="Content"   k="content"  element={element} onPatch={onPatch} />
        </PanelSection>
      )}
    </>
  );
};

const SubLockRow: React.FC<{
  label:   string;
  k:       keyof ElementLocks;
  element: SlideElementDTO;
  onPatch: (patch: Partial<SlideElementDTO>) => void;
}> = ({ label, k, element, onPatch }) => {
  const locks = getLocks(element);
  const isOn = !!locks[k];
  return (
    <Toggle
      value={isOn}
      onChange={(v) => onPatch(withLock(element, k, v))}
      label={label}
    />
  );
};

const AlignBtn: React.FC<{ onClick: () => void; title: string; children: React.ReactNode }> = ({ onClick, title, children }) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    className="flex-1 h-6 bg-slate-100 hover:bg-green-100 hover:text-green-800 text-slate-600 rounded text-[11px] font-semibold transition-colors"
  >
    {children}
  </button>
);
